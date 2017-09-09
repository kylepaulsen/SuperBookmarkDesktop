/* global app */
{
    const {getParentElementWithClass, getDataset, getUiElements} = app.util;

    function getNodeFromPath(path, bookmarkTreeRoot) {
        const pathParts = path.split('/');

        let currentNode = bookmarkTreeRoot[0];
        let currentPathPart = 0;
        let nextId = pathParts[currentPathPart];
        while (nextId !== undefined) {
            const nextNode = currentNode.children.find((node) => nextId === node.id);
            if (nextNode) {
                currentPathPart++;
                nextId = pathParts[currentPathPart];
                currentNode = nextNode;
            } else {
                return null;
            }
        }
        return currentNode;
    }

    function getParentPaths(path, bookmarkTreeRoot) {
        const parentPaths = [];
        const pathParts = path.split('/');

        while (pathParts.length) {
            const nextPath = pathParts.join('/');
            const nextNode = getNodeFromPath(nextPath, bookmarkTreeRoot);
            if (!nextNode) {
                return null;
            }
            parentPaths.unshift({
                path: nextPath,
                name: nextNode.title
            });
            pathParts.pop();
        }
        return parentPaths;
    }

    async function renderFolder(path, win) {
        const bookmarkTree = await app.getBookmarkTree();
        const navBarMarkup = [];
        const winUi = getUiElements(win);
        const navPaths = getParentPaths(path, bookmarkTree);
        if (!navPaths) {
            // invalid path. Bail.
            win.parentElement.removeChild(win);
            return;
        }
        win.dataset.path = path;
        winUi.navBar.innerHTML = '';
        for (let x = 1; x < navPaths.length; x++) {
            const nextNav = navPaths[x];
            navBarMarkup.push(`
                <div class="navButton" data-path="${nextNav.path}">
                    ${nextNav.name}
                </div>
            `);
        }
        winUi.navBar.innerHTML = navBarMarkup.join('<div class="navSep">/</div>');

        const pNode = getNodeFromPath(path, bookmarkTree);
        winUi.title.textContent = pNode.title;
        winUi.iconArea.innerHTML = '';

        const folders = [];
        const bookmarks = [];
        pNode.children.forEach((node) => {
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
            app.makeBookmarkIcon(node, path, !node.url, winUi.iconArea);
        });
    }
    app.renderFolder = renderFolder;

    window.addEventListener('click', (e) => {
        const iconEl = getParentElementWithClass(e.target, 'bookmark');
        if (iconEl) {
            const icon = getDataset(iconEl);
            if (icon.folder) {
                e.preventDefault();
                const currentWindow = getParentElementWithClass(iconEl, 'window');
                if (!currentWindow) {
                    const width = 550;
                    const height = 400;
                    let x = iconEl.offsetLeft + iconEl.offsetWidth;
                    let y = iconEl.offsetTop;
                    if (x + width > window.innerWidth) {
                        x = iconEl.offsetLeft - width;
                    }
                    if (y + height > window.innerHeight) {
                        y = iconEl.offsetTop - height + iconEl.offsetHeight;
                    }
                    const win = app.makeWindow(icon.name, x, y, width, height);
                    renderFolder(icon.path, win);
                } else {
                    renderFolder(icon.path, currentWindow);
                }
            }
        }
        const navButton = getParentElementWithClass(e.target, 'navButton');
        if (navButton) {
            const currentWindow = getParentElementWithClass(navButton, 'window');
            renderFolder(navButton.dataset.path, currentWindow);
        }
    });
}
