/* global chrome, app, pell */
{
    const {getParentElementWithClass, getDataset, getUiElements, attachClickHandler} = app.util;

    const dataUriStartString = 'data:text/html;charset=UTF-8;base64,';
    const dataStartString = '<!--sbd-doc-->';

    const positionWindow = (win) => {
        const width = Math.max(Math.floor(window.innerWidth * 0.7), 550);
        const height = Math.max(Math.floor(window.innerHeight * 0.7), 400);
        const x = Math.max((window.innerWidth - width) / 2, 10) + document.documentElement.scrollLeft;
        const y = Math.max((window.innerHeight - height) / 2, 10) + document.documentElement.scrollTop;
        if (win) {
            win.style.left = x + 'px';
            win.style.top = y + 'px';
        }
        return {x, y, width, height};
    };

    const syncEditorData = async (id, win) => {
        const bookmarks = await app.getBookmarks(id.toString());
        const doc = bookmarks[0];
        const docData = getDocumentData(doc.url);
        if (docData !== null && win) {
            win.querySelector('.pell-content').innerHTML = docData;
        }
    };

    const renderEditor = async (id, options) => {
        const bookmarks = await app.getBookmarks(id.toString());
        const doc = bookmarks[0];
        const docData = getDocumentData(doc.url);

        if (docData !== null) {
            let {x, y, width, height} = positionWindow();
            if (options) {
                width = options.width;
                height = options.height;
                x = options.x;
                y = options.y;
            }
            let documentChanged = false;
            const beforeClose = async (close) => {
                const confirmBtns = [
                    'Do It!',
                    {text: 'No Way!', value: false, default: true}
                ];
                if (!documentChanged || await app.confirm('Close without saving?', confirmBtns)) {
                    close();
                    window.onbeforeunload = null;
                }
            };
            const win = app.makeWindow(doc.title, x, y, width, height, {beforeClose});
            win.dataset.document = 'true';
            win.dataset.id = doc.id;
            app.rememberOpenWindows();

            const winUi = getUiElements(win);
            const editor = document.createElement('div');
            editor.className = 'text-editor';
            winUi.content.appendChild(editor);
            winUi.navContainer.style.display = 'none';

            const unsavedRegex = / \(unsaved\)$/;
            pell.init({
                element: editor,
                onChange: () => {
                    if (!unsavedRegex.test(winUi.title.textContent)) {
                        winUi.title.textContent += ' (unsaved)';
                        window.onbeforeunload = () => '';
                    }
                    documentChanged = true;
                }
            });

            editor.content.innerHTML = docData;

            const closeButtonContainer = document.createElement('div');
            closeButtonContainer.className = 'close-btns';
            closeButtonContainer.innerHTML = `
                <button class="btn" data-id="save">Save (&#8984;S, ^S)</button>
                <button class="btn" data-id="saveClose">Save & Close</button>
            `;
            editor.appendChild(closeButtonContainer);

            const closeButtonContainerUi = getUiElements(closeButtonContainer);
            const save = () => {
                window.onbeforeunload = null;
                const newDocUrl = dataUriStartString +
                    btoa(unescape(encodeURIComponent(dataStartString + editor.content.innerHTML)));
                app.ignoreNextRender = true;
                chrome.bookmarks.update(doc.id, {url: newDocUrl});
                documentChanged = false;
                winUi.title.textContent = winUi.title.textContent.replace(unsavedRegex, '');
            };
            editor.addEventListener('keydown', (e) => {
                if (e.keyCode === 83 && (e.metaKey || e.ctrlKey)) { // ctrl+s or meta+s
                    e.preventDefault();
                    save();
                }
            });
            closeButtonContainerUi.save.addEventListener('click', save);
            closeButtonContainerUi.saveClose.addEventListener('click', () => {
                save();
                win.parentElement.removeChild(win);
            });
        }
    };

    const getDocumentData = (dataUri = '') => {
        if (dataUri.startsWith(dataUriStartString)) {
            const base64Data = dataUri.replace(dataUriStartString, '');
            let actualData = '';
            try {
                actualData = decodeURIComponent(escape(atob(base64Data)));
            } catch (e) {}
            if (actualData.startsWith(dataStartString)) {
                return actualData.replace(dataStartString, '');
            }
        }
        return null;
    };

    const isValidDocument = (dataUri) => {
        return getDocumentData(dataUri) !== null;
    };

    attachClickHandler(window, (e, isDoubleClick) => {
        const iconEl = getParentElementWithClass(e.target, 'bookmark');
        if (iconEl) {
            const icon = getDataset(iconEl);
            const specialKeysDown = e.metaKey || e.ctrlKey || e.shiftKey;
            if (icon.document && !specialKeysDown && (!localStorage.useDoubleClicks || isDoubleClick)) {
                e.preventDefault();
                const currentWindow = document.querySelector(`.window[data-id="${icon.id}"]`);
                if (!currentWindow) {
                    renderEditor(icon.id);
                } else {
                    positionWindow(currentWindow);
                }
            }
        }
    });

    app.editDocument = renderEditor;
    app.isValidDocument = isValidDocument;
    app.syncEditorData = syncEditorData;
}
