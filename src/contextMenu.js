/* global chrome, idbKeyval, app */
{
    const {openBookmarkProperties, openDesktopProperties} = app;
    const { getUiElements, show, hide, getParentElementWithClass, getDataset, addNewNodeId, deselectAll,
        pointToGrid, findFreeSpotNear, markupToElement, isUserInteractingWithForm, triggerBackgroundChange } = app.util;

    const contextMenu = document.createElement('div');
    contextMenu.className = 'contextMenu';
    contextMenu.innerHTML = `
        <div class="contextMenuItem" data-id="newTab">Open link in new tab</div>
        <div class="contextMenuItem" data-id="newWindow">Open link in new window</div>
        <div class="contextMenuItem" data-id="incog">Open link in incognito window</div>
        <div class="contextMenuItem" data-id="allNewTab">Open all bookmarks</div>
        <div class="contextMenuItem" data-id="allNewWindow">Open all bookmarks in new window</div>
        <div class="contextMenuItem" data-id="selectedNewTab">Open selected</div>
        <div class="contextMenuItem" data-id="selectedNewWindow">Open selected in new window</div>
        <div class="contextMenuSeperator" data-id="sep1"></div>
        <div class="contextMenuItem" data-id="createBookmark">Create Bookmark</div>
        <div class="contextMenuItem" data-id="createDocument">Create Document</div>
        <div class="contextMenuItem" data-id="createFolder">Create Folder</div>
        <div class="contextMenuItem" data-id="addWidget">Add Widget</div>
        <div class="contextMenuItem" data-id="delete">Delete</div>
        <div class="contextMenuSeperator" data-id="sep2"></div>
        <div class="contextMenuItem" data-id="nextBackground">Next Background</div>
        <div class="contextMenuItem" data-id="options">Options</div>
        <div class="contextMenuItem" data-id="properties">Properties</div>
    `;

    const ui = getUiElements(contextMenu);
    let context;
    let mousePoint;

    ui.newTab.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.tabs.create({url, active: false});
        hide(contextMenu);
    });

    ui.newWindow.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.windows.create({url, state: 'maximized'});
        hide(contextMenu);
    });

    ui.incog.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.windows.create({url, state: 'maximized', incognito: true});
        hide(contextMenu);
    });

    const openBookmarksInNewTab = (bookmarks) => {
        bookmarks.forEach((bookmark) => {
            chrome.tabs.create({url: bookmark.dataset.url, active: false});
        });
    };

    const openBookmarksInNewWindow = (bookmarks) => {
        const first = bookmarks.shift();
        if (first) {
            chrome.windows.create({url: first.dataset.url, state: 'maximized'}, (win) => {
                bookmarks.forEach((bookmark) => {
                    chrome.tabs.create({url: bookmark.dataset.url, windowId: win.id});
                });
            });
        }
    };

    ui.allNewTab.addEventListener('click', () => {
        const bookmarks = context.querySelectorAll('.bookmark').filter((item) => item.dataset.type === 'bookmark');
        openBookmarksInNewTab(bookmarks);
        hide(contextMenu);
    });

    ui.allNewWindow.addEventListener('click', () => {
        const bookmarks = context.querySelectorAll('.bookmark').filter((item) => item.dataset.type === 'bookmark');
        openBookmarksInNewWindow(bookmarks);
        hide(contextMenu);
    });

    ui.selectedNewTab.addEventListener('click', () => {
        openBookmarksInNewTab(context);
        hide(contextMenu);
    });

    ui.selectedNewWindow.addEventListener('click', () => {
        openBookmarksInNewWindow(context);
        hide(contextMenu);
    });

    const recordNewBookmarkNode = async (newNode) => {
        if (context === app.desktop) {
            const gridPoint = pointToGrid(mousePoint.x, mousePoint.y);
            app.newIcon = {pos: findFreeSpotNear(gridPoint.x, gridPoint.y), id: newNode.id};
            chrome.runtime.sendMessage({action: 'newIcon', data: app.newIcon});
        }
        addNewNodeId(newNode.id);
        openBookmarkProperties(await app.makeIconElement(newNode), true);
    };
    ui.createBookmark.addEventListener('click', () => {
        chrome.bookmarks.create({
            parentId: context.dataset.id,
            title: 'New Bookmark',
            url: 'about:blank'
        }, recordNewBookmarkNode);
        app.saveData();
        hide(contextMenu);
    });

    ui.createFolder.addEventListener('click', () => {
        chrome.bookmarks.create({
            parentId: context.dataset.id,
            title: 'New Folder'
        }, recordNewBookmarkNode);
        app.saveData();
        hide(contextMenu);
    });

    ui.createDocument.addEventListener('click', () => {
        chrome.bookmarks.create({
            parentId: context.dataset.id,
            title: 'New Document',
            //btoa(unescape(encodeURIComponent('<!--sbd-doc-->')))
            url: 'data:text/html;charset=UTF-8;base64,PCEtLXNiZC1kb2MtLT4='
        }, recordNewBookmarkNode);
        app.saveData();
        hide(contextMenu);
    });

    ui.addWidget.addEventListener('click', async () => {
        hide(contextMenu);
        const descEl = markupToElement(app.widgetPromptMarkup);
        descEl.addEventListener('click', (e) => {
            if (e.target.dataset.url) {
                app.closePrompt(e.target.dataset.url);
            }
        });
        const widgetUrl = await app.prompt(
            'Add a Widget',
            descEl,
            {
                placeholder: 'Add Custom Widget with URL...'
            }
        );
        if (widgetUrl) {
            app.createWidget(widgetUrl, mousePoint.x, mousePoint.y);
        }
    });

    const deleteBookmark = (element) => {
        const icon = getDataset(element);
        const iconId = icon.id + ''; // must be string
        if (icon.type === 'folder') {
            chrome.bookmarks.removeTree(iconId);
        } else {
            chrome.bookmarks.remove(iconId);
        }
        idbKeyval.delete(iconId);
        element.parentElement.removeChild(element);
    };

    async function del(context) {
        const confirmBtns = [
            'Do It!',
            {text: 'No Way!', value: false, default: true}
        ];
        if (!context.length) {
            const icon = getDataset(context);
            let thing = icon.type === 'folder' ? 'folder and all its contents?' : 'bookmark?';
            thing = icon.type === 'document' ? 'document?' : thing;
            if (await app.confirm(`Really? Delete this ${thing}`, confirmBtns)) {
                deleteBookmark(context);
                app.saveData();
            }
        } else {
            if (await app.confirm('Really? Delete selected icons?', confirmBtns)) {
                context.forEach((element) => {
                    deleteBookmark(element);
                });
                app.saveData();
            }
        }
    }

    ui.delete.addEventListener('click', async () => {
        hide(contextMenu);
        if (context.classList && context.classList.contains('userBg')) {
            app.deleteBackground(context.dataset.bgid);
            return;
        }
        del(context);
    });

    ui.nextBackground.addEventListener('click', () => {
        triggerBackgroundChange();
        hide(contextMenu);
    });

    ui.properties.addEventListener('click', () => {
        if (context.classList.contains('bookmark')) {
            openBookmarkProperties(context);
        } else {
            openDesktopProperties();
        }
        hide(contextMenu);
    });

    ui.options.addEventListener('click', () => {
        app.openOptions();
        hide(contextMenu);
    });

    const populateMenu = (targetEl) => {
        Object.keys(ui).forEach((key) => hide(ui[key]));
        if (targetEl.classList.contains('bookmark')) {
            const selected = targetEl.parentElement.querySelectorAll('.bookmark.selected');
            if (selected.length < 2) {
                const icon = getDataset(targetEl);
                context = targetEl;
                ui.properties.textContent = 'Bookmark Properties';
                if (icon.type === 'document') {
                    ui.properties.textContent = 'Document Properties';
                } else if (icon.type === 'folder') {
                    ui.properties.textContent = 'Folder Properties';
                }
                if (icon.type !== 'folder') {
                    show(ui.newTab);
                    show(ui.newWindow);
                    show(ui.incog);
                    show(ui.sep1);
                }
                show(ui.properties);
            } else {
                context = selected.slice();
                const selectedFoldersOrDocuments = selected.find((node) => node.dataset.type !== 'bookmark');
                if (!selectedFoldersOrDocuments) {
                    show(ui.selectedNewTab);
                    show(ui.selectedNewWindow);
                    show(ui.sep1);
                }
            }
            show(ui.delete);
        } else if (targetEl.classList.contains('userBg')) {
            // this is a BG square in the desktop props.
            context = targetEl;
            show(ui.delete);
        } else {
            // on empty space.
            deselectAll();
            context = getParentElementWithClass(targetEl, ['desktop', 'window']);
            show(ui.allNewTab);
            show(ui.allNewWindow);
            show(ui.createBookmark);
            show(ui.createFolder);
            show(ui.createDocument);
            if (context.id === 'desktop') {
                show(ui.addWidget);
            }
            show(ui.sep1);
            show(ui.sep2);
            show(ui.nextBackground);
            show(ui.options);
            show(ui.properties);
            ui.properties.textContent = 'Desktop Properties';
        }
    };

    window.addEventListener('contextmenu', (e) => {
        const targetEl = getParentElementWithClass(e.target, ['bookmark', 'desktop', 'userBg', 'window']);
        // weird case is a document window. It should not get a special context menu.
        if (targetEl && (targetEl.dataset.type !== 'document' || targetEl.classList.contains('bookmark'))) {
            e.preventDefault();
            mousePoint = {x: e.pageX, y: e.pageY};
            populateMenu(targetEl);
            show(contextMenu);
            let x = e.pageX;
            let y = e.pageY;
            if (e.clientX + contextMenu.offsetWidth > window.innerWidth) {
                x -= contextMenu.offsetWidth;
            }
            if (e.clientY + contextMenu.offsetHeight > window.innerHeight) {
                y -= contextMenu.offsetHeight;
            }
            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
            return false;
        } else if (getParentElementWithClass(e.target, 'contextMenu')) {
            e.preventDefault();
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (!getParentElementWithClass(e.target, 'contextMenu')) {
            hide(contextMenu);
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 46 && !isUserInteractingWithForm()) { // delete key
            const selected = document.querySelectorAll('.bookmark.selected');
            if (selected.length > 1) {
                del(selected);
            } else if (selected.length === 1) {
                del(selected[0]);
            }
        }
    });

    document.body.appendChild(contextMenu);
}
