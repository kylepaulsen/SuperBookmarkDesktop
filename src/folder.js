/* global app */
{
    const {getParentElementWithClass, getDataset, getUiElements} = app.util;

    const getAncestors = async (id) => {
        id = id.toString();
        const nodes = [];
        let currentNode;
        while (!currentNode || currentNode.id !== '0') {
            try {
                currentNode = (await app.getBookmarks((currentNode && currentNode.parentId) || id))[0];
            } catch (e) {
                return;
            }
            if (currentNode.id !== '0') {
                nodes.unshift(currentNode);
            }
        }
        return nodes;
    };

    async function renderFolder(id, iconEl, options) {
        const ancestors = await getAncestors(id);
        if (!ancestors) {
            // invalid id. Bail.
            return;
        }
        const targetNode = ancestors[ancestors.length - 1];
        const children = await app.getBookmarkChildren(targetNode.id);
        let currentWindow;
        if (iconEl) {
            currentWindow = getParentElementWithClass(iconEl, 'window');
        } else if (options.window) {
            currentWindow = options.window;
        }
        if (!currentWindow) {
            let width = 0;
            let height = 0;
            let x = 0;
            let y = 0;
            if (iconEl) {
                width = 550;
                height = 400;
                x = iconEl.offsetLeft + iconEl.offsetWidth;
                y = iconEl.offsetTop;
                if (x + width > window.innerWidth) {
                    x = iconEl.offsetLeft - width;
                }
                if (y + height > window.innerHeight) {
                    y = iconEl.offsetTop - height + iconEl.offsetHeight;
                }
            }
            if (options) {
                width = options.width;
                height = options.height;
                x = options.x;
                y = options.y;
            }
            currentWindow = app.makeWindow(targetNode.title, x, y, width, height);
            currentWindow.dataset.folder = 'true';
        }

        const navBarMarkup = [];
        const winUi = getUiElements(currentWindow);
        currentWindow.dataset.id = targetNode.id;
        app.rememberOpenWindows();
        winUi.navBar.innerHTML = '';
        for (let x = 0; x < ancestors.length; x++) {
            const nextNav = ancestors[x];
            navBarMarkup.push(`
                <div class="navButton" data-folder="true" data-id="${nextNav.id}">
                    ${nextNav.title}
                </div>
            `);
        }
        winUi.navBar.innerHTML = navBarMarkup.join('<div class="navSep">/</div>');

        winUi.title.textContent = targetNode.title;

        const iconArea = document.createElement('div');
        iconArea.className = 'iconArea';
        iconArea.dataset.id = 'iconArea';
        winUi.content.innerHTML = '';
        winUi.content.appendChild(iconArea);
        winUi.iconArea = iconArea;

        const folders = [];
        const bookmarks = [];
        children.forEach((node) => {
            if (node.url) {
                bookmarks.push(node);
            } else {
                folders.push(node);
            }
        });
        const sort = (a, b) => a.title > b.title;
        folders.sort(sort);
        bookmarks.sort(sort);
        const allNodes = folders.concat(bookmarks);
        allNodes.forEach((node) => {
            app.makeBookmarkIcon(node, !node.url, winUi.iconArea);
        });
    }
    app.openFolder = renderFolder;

    window.addEventListener('click', (e) => {
        const iconEl = getParentElementWithClass(e.target, 'bookmark');
        if (iconEl) {
            const icon = getDataset(iconEl);
            const specialKeysDown = e.metaKey || e.ctrlKey || e.shiftKey;
            if (icon.folder && !specialKeysDown) {
                e.preventDefault();
                renderFolder(icon.id, iconEl);
            }
        }
        const navButton = getParentElementWithClass(e.target, 'navButton');
        if (navButton) {
            const currentWindow = getParentElementWithClass(navButton, 'window');
            renderFolder(navButton.dataset.id, null, {window: currentWindow});
        }
    });
}
