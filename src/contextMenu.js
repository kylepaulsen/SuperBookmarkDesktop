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
        console.log('create folder');
        hide(contextMenu);
    });

    ui.delete.addEventListener('click', () => {
        chrome.bookmarks.remove(context.dataset.id);
        context.parentNode.removeChild(context);
        idbKeyval.delete(context.dataset.id);
        hide(contextMenu);
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
        const isIcon = getParentElementWithClass(e.target, 'bookmark');
        if (isIcon) {
            context = isIcon;
            show(ui.newTab);
            show(ui.newWindow);
            show(ui.incog);
            show(ui.sep);
            show(ui.delete);
            hide(ui.createFolder);
        } else {
            context = undefined;
            hide(ui.newTab);
            hide(ui.newWindow);
            hide(ui.incog);
            hide(ui.sep);
            hide(ui.delete);
            show(ui.createFolder);
        }
    };

    window.addEventListener('contextmenu', (e) => {
        if (getParentElementWithClass(e.target, ['bookmark', 'desktop'])) {
            e.preventDefault();
            populateMenu(e);
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            show(contextMenu);
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
