/* global app */
{
    const {getParentElementWithClass, getDataset, getUiElements, attachClickHandler, diffRender, htmlEscape} = app.util;

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
            if (options.window) {
                options.window.parentElement.removeChild(options.window);
            }
            return;
        }
        const targetNode = ancestors[ancestors.length - 1];
        const children = await app.getBookmarkChildren(targetNode.id);
        let highlightNewNodes = true;
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

                // move window a little bit if it will be exactly on top of another window.
                const existingWindowPositions = {};
                document.querySelectorAll('.window').forEach((win) => {
                    existingWindowPositions[`${win.offsetLeft},${win.offsetTop}`] = true;
                });
                let currentPos = `${x},${y}`;
                while (existingWindowPositions[currentPos]) {
                    x += 10;
                    y += 10;
                    currentPos = `${x},${y}`;
                }
            }
            if (options) {
                width = options.width;
                height = options.height;
                x = options.x;
                y = options.y;
            }
            currentWindow = app.makeWindow(targetNode.title, x, y, width, height);
            currentWindow.dataset.type = 'folder';
            highlightNewNodes = false;
        }

        const navBarMarkup = [];
        const winUi = getUiElements(currentWindow);
        if (currentWindow.dataset.id && currentWindow.dataset.id !== targetNode.id) {
            highlightNewNodes = false;
        }
        currentWindow.dataset.id = targetNode.id;
        app.rememberOpenWindows();

        winUi.navBar.innerHTML = '';
        for (let x = 0; x < ancestors.length; x++) {
            const nextNav = ancestors[x];
            const title = nextNav.id === '2' ? 'Desktop' : nextNav.title;
            navBarMarkup.push(`
                <div class="navButton" data-type="folder" data-id="${htmlEscape(nextNav.id)}">
                    ${htmlEscape(title)}
                </div>
            `);
        }
        winUi.navBar.innerHTML = navBarMarkup.join('<div class="navSep">/</div>');

        winUi.title.textContent = targetNode.id === '2' ? 'Desktop' : targetNode.title;

        let iconArea = winUi.content.querySelector('.iconArea');
        if (!iconArea) {
            iconArea = document.createElement('div');
            iconArea.className = 'iconArea';
            iconArea.dataset.id = 'iconArea';
            winUi.content.appendChild(iconArea);
        }
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
        const sort = (a, b) => (a.title || '').toLowerCase() > (b.title || '').toLowerCase() ? 1 : -1;
        folders.sort(sort);
        bookmarks.sort(sort);
        const allNodes = folders.concat(bookmarks);
        const icons = await Promise.all(allNodes.map((node) => app.makeBookmarkIcon(node)));
        diffRender(icons, winUi.iconArea, highlightNewNodes);
    }
    app.openFolder = renderFolder;

    attachClickHandler(window, (e, isDoubleClick) => {
        const iconEl = getParentElementWithClass(e.target, 'bookmark');
        if (iconEl) {
            const icon = getDataset(iconEl);
            const specialKeysDown = e.metaKey || e.ctrlKey || e.shiftKey;
            if (icon.type === 'folder' && !specialKeysDown && (!localStorage.useDoubleClicks || isDoubleClick)) {
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
