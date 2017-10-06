/* global chrome, idbKeyval, app */
{
    const {openBookmarkProperties, openDesktopProperties} = app;
    const {getUiElements, show, hide, getParentElementWithClass, getDataset, addNewNodeId, deselectAll} = app.util;

    const contextMenu = document.createElement('div');
    contextMenu.className = 'contextMenu';
    contextMenu.innerHTML = `
        <div class="contextMenuItem" data-id="newTab">Open link in new tab</div>
        <div class="contextMenuItem" data-id="newWindow">Open link in new window</div>
        <div class="contextMenuItem" data-id="incog">Open link in incognito window</div>
        <div class="contextMenuSeperator" data-id="sep1"></div>
        <div class="contextMenuItem" data-id="createBookmark">Create Bookmark</div>
        <div class="contextMenuItem" data-id="createFolder">Create Folder</div>
        <div class="contextMenuItem" data-id="createDocument">Create Document</div>
        <div class="contextMenuItem" data-id="delete">Delete</div>
        <div class="contextMenuSeperator" data-id="sep2"></div>
        <div class="contextMenuItem" data-id="options">Options</div>
        <div class="contextMenuItem" data-id="properties">Properties</div>
    `;

    const ui = getUiElements(contextMenu);
    let context;

    ui.newTab.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.tabs.create({url});
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

    const recordNewBookmarkNode = (newNode) => {
        addNewNodeId(newNode.id);
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

    ui.delete.addEventListener('click', async () => {
        hide(contextMenu);
        if (context.classList.contains('userBg')) {
            app.deleteBackground(context.dataset.bgid);
            return;
        }
        const confirmBtns = [
            'Do It!',
            {text: 'No Way!', value: false, default: true}
        ];
        const icon = getDataset(context);
        const iconId = icon.id + ''; // must be string
        const thing = icon.folder ? 'folder' : 'bookmark';
        if (await app.confirm(`Really? Delete this ${thing}?`, confirmBtns)) {
            if (icon.folder) {
                chrome.bookmarks.removeTree(iconId);
            } else {
                chrome.bookmarks.remove(iconId);
            }
            idbKeyval.delete(iconId);
            context.parentElement.removeChild(context);
            app.saveData();
        }
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
            const icon = getDataset(targetEl);
            context = targetEl;
            ui.properties.textContent = 'Bookmark Properties';
            if (icon.document) {
                ui.properties.textContent = 'Document Properties';
            } else if (icon.folder) {
                ui.properties.textContent = 'Folder Properties';
            }
            if (!icon.folder) {
                show(ui.newTab);
                show(ui.newWindow);
                show(ui.incog);
                show(ui.sep1);
            }
            show(ui.delete);
            deselectAll();
            targetEl.classList.add('selected');
        } else if (targetEl.classList.contains('userBg')) {
            context = targetEl;
            show(ui.delete);
            return;
        } else {
            context = getParentElementWithClass(targetEl, ['desktop', 'window']);
            show(ui.createBookmark);
            show(ui.createFolder);
            show(ui.createDocument);
            show(ui.sep2);
            show(ui.options);
            ui.properties.textContent = 'Desktop Properties';
        }
        show(ui.properties);
    };

    window.addEventListener('contextmenu', (e) => {
        const targetEl = getParentElementWithClass(e.target, ['bookmark', 'desktop', 'userBg', 'window']);
        // weird case is a document window. It should not get a special context menu.
        if (targetEl && (!targetEl.dataset.document || targetEl.classList.contains('bookmark'))) {
            e.preventDefault();
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

    document.body.appendChild(contextMenu);
}
