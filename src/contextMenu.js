/* global chrome, idbKeyval, app */
{
    const {openBookmarkProperties, openDesktopProperties} = app;
    const {getUiElements, show, hide, getParentElementWithClass} = app.util;

    const contextMenu = document.createElement('div');
    contextMenu.className = 'contextMenu';
    contextMenu.innerHTML = `
        <div class="contextMenuItem" data-id="newTab">Open link in new tab</div>
        <div class="contextMenuItem" data-id="newWindow">Open link in new window</div>
        <div class="contextMenuItem" data-id="incog">Open link in incognito window</div>
        <div class="contextMenuSeperator" data-id="sep"></div>
        <div class="contextMenuItem" data-id="createFolder">Create Folder</div>
        <div class="contextMenuItem" data-id="delete">Delete</div>
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

    ui.createFolder.addEventListener('click', () => {
        chrome.bookmarks.create({title: 'New Folder'});
        hide(contextMenu);
    });

    ui.delete.addEventListener('click', async () => {
        hide(contextMenu);
        const confirmBtns = [
            'Yes',
            {text: 'No Way!', value: 'false', default: true}
        ];
        const icon = app.data.icons[context.dataset.id];
        const thing = icon.folder ? 'folder' : 'bookmark';
        if (await app.confirm(`Really? Delete this ${thing}?`, confirmBtns) === 'false') {
            return;
        }
        if (icon.folder) {
            chrome.bookmarks.removeTree(context.dataset.id);
        } else {
            chrome.bookmarks.remove(context.dataset.id);
        }
        idbKeyval.delete(context.dataset.id);
    });

    ui.properties.addEventListener('click', () => {
        if (context) {
            openBookmarkProperties(context);
        } else {
            openDesktopProperties();
        }
        hide(contextMenu);
    });

    const populateMenu = (e) => {
        Object.keys(ui).forEach((key) => hide(ui[key]));
        const iconEl = getParentElementWithClass(e.target, 'bookmark');
        if (iconEl) {
            const icon = app.data.icons[iconEl.dataset.id];
            context = iconEl;
            if (!icon.folder) {
                show(ui.newTab);
                show(ui.newWindow);
                show(ui.incog);
                show(ui.sep);
            }
            show(ui.delete);
        } else {
            context = undefined;
            show(ui.createFolder);
        }
        show(ui.properties);
    };

    window.addEventListener('contextmenu', (e) => {
        if (getParentElementWithClass(e.target, ['bookmark', 'desktop'])) {
            e.preventDefault();
            populateMenu(e);
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
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (!getParentElementWithClass(e.target, 'contextMenu')) {
            hide(contextMenu);
        }
    });

    document.body.appendChild(contextMenu);
}
