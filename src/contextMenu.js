/* global idbKeyval, show, hide, chrome, showModal, getParentElementWithClass */
{
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
    const menuUi = {};
    contextMenu.querySelectorAll('[data-id]').forEach((item) => {
        menuUi[item.dataset.id] = item;
    });
    let context;

    menuUi.newTab.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.tabs.create({url});
        hide(contextMenu);
    });

    menuUi.newWindow.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.windows.create({url, state: 'maximized'});
        hide(contextMenu);
    });

    menuUi.incog.addEventListener('click', () => {
        const url = context.dataset.url;
        chrome.windows.create({url, state: 'maximized', incognito: true});
        hide(contextMenu);
    });

    menuUi.createFolder.addEventListener('click', () => {
        console.log('create folder');
        hide(contextMenu);
    });

    menuUi.delete.addEventListener('click', () => {
        chrome.bookmarks.remove(context.dataset.id);
        context.parentNode.removeChild(context);
        idbKeyval.delete(context.dataset.id);
        hide(contextMenu);
    });

    menuUi.properties.addEventListener('click', () => {
        if (context) {
            showModal('bookmarkProperties', context);
        } else {
            showModal('desktopProperties');
        }
        hide(contextMenu);
    });

    const populateMenu = (e) => {
        const isIcon = getParentElementWithClass(e.target, 'bookmark');
        if (isIcon) {
            context = isIcon;
            show(menuUi.newTab);
            show(menuUi.newWindow);
            show(menuUi.incog);
            show(menuUi.sep);
            show(menuUi.delete);
            hide(menuUi.createFolder);
        } else {
            context = undefined;
            hide(menuUi.newTab);
            hide(menuUi.newWindow);
            hide(menuUi.incog);
            hide(menuUi.sep);
            hide(menuUi.delete);
            show(menuUi.createFolder);
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
