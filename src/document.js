/* global chrome, app, pell */
{
    const {getParentElementWithClass, getDataset, getUiElements} = app.util;

    const dataUriStartString = 'data:text/html;charset=UTF-8;base64,';
    const dataStartString = '<!--sbd-doc-->';

    const positionWindow = (iconEl, win) => {
        const width = Math.max(Math.floor(window.innerWidth * 0.45), 550);
        const height = Math.max(Math.floor(window.innerHeight * 0.5), 400);
        let x = iconEl.offsetLeft + iconEl.offsetWidth;
        let y = iconEl.offsetTop;
        if (x + width > window.innerWidth) {
            x = iconEl.offsetLeft - width;
        }
        if (y + height > window.innerHeight) {
            y = iconEl.offsetTop - height + iconEl.offsetHeight;
        }
        if (win) {
            win.style.left = x + 'px';
            win.style.top = y + 'px';
        }
        return {x, y, width, height};
    };

    const renderEditor = async (iconEl) => {
        const bookmarks = await app.getBookmarks(iconEl.dataset.id);
        const doc = bookmarks[0];
        const docData = getDocumentData(doc.url);

        if (docData !== null) {
            const {x, y, width, height} = positionWindow(iconEl);
            let documentChanged = false;
            const beforeClose = async (close) => {
                const confirmBtns = [
                    'Do It!',
                    {text: 'No Way!', value: false, default: true}
                ];
                if (!documentChanged || await app.confirm('Close without saving?', confirmBtns)) {
                    close();
                }
            };
            const win = app.makeWindow(iconEl.dataset.name, x, y, width, height, {beforeClose});
            win.dataset.document = 'true';
            win.dataset.id = iconEl.dataset.id;

            const winUi = getUiElements(win);
            const editor = document.createElement('div');
            editor.className = 'text-editor';
            winUi.content.appendChild(editor);
            winUi.navContainer.style.display = 'none';

            pell.init({
                element: editor,
                onChange: () => { documentChanged = true; }
            });

            editor.content.innerHTML = docData;

            const closeButtonContainer = document.createElement('div');
            closeButtonContainer.className = 'close-btns';
            closeButtonContainer.innerHTML = '<button class="btn" data-id="saveClose">Save & Close</button>';
            editor.appendChild(closeButtonContainer);

            const closeButtonContainerUi = getUiElements(closeButtonContainer);
            closeButtonContainerUi.saveClose.addEventListener('click', () => {
                const newDocUrl = dataUriStartString +
                    btoa(unescape(encodeURIComponent(dataStartString + editor.content.innerHTML)));
                chrome.bookmarks.update(iconEl.dataset.id, {url: newDocUrl});
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

    window.addEventListener('click', (e) => {
        const iconEl = getParentElementWithClass(e.target, 'bookmark');
        if (iconEl) {
            const icon = getDataset(iconEl);
            const specialKeysDown = e.metaKey || e.ctrlKey || e.shiftKey;
            if (icon.document && !specialKeysDown) {
                e.preventDefault();
                const currentWindow = document.querySelector(`.window[data-id="${icon.id}"]`);
                if (!currentWindow) {
                    renderEditor(iconEl);
                } else {
                    positionWindow(iconEl, currentWindow);
                }
            }
        }
    });

    app.isValidDocument = isValidDocument;
}
