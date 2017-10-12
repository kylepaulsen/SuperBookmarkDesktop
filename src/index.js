/* global chrome, app, idbKeyval */
{
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, getFaviconImageUrl, loadData, getParentElementWithClass,
           clampText, promisify, updateBackground, getNextBgInCycle, debounce, throttle,
           folderImage, documentImage, removeNewNodeId, getBackground} = app.util;

    const desktop = app.desktop;

    function findNextOpenSpot() {
        for (let x = 0; x < 12; x++) {
            for (let y = 0; y < 6; y++) {
                if (!app.data.locations[`${x},${y}`]) {
                    return {x, y};
                }
            }
        }
        let y = 6;
        while (y < 99999) {
            for (let x = 0; x < 12; x++) {
                if (!app.data.locations[`${x},${y}`]) {
                    return {x, y};
                }
            }
            y++;
        }
    }

    async function makeBookmarkIcon(bookmark, folder = false, container = desktop) {
        const isDocument = app.isValidDocument(bookmark.url);
        let icon = getFaviconImageUrl(bookmark.url);
        if (folder) {
            icon = folderImage;
        }
        if (isDocument) {
            icon = documentImage;
        }
        try {
            const iconBlob = await idbKeyval.get(bookmark.id);
            if (iconBlob) {
                icon = URL.createObjectURL(iconBlob);
            }
        } catch (e) {}
        const newNodeIds = JSON.parse(localStorage.newNodeIds || '{}');
        const bookmarkIcon = document.createElement('div');
        bookmarkIcon.className = 'bookmark';
        bookmarkIcon.dataset.url = bookmark.url;
        bookmarkIcon.dataset.name = bookmark.title;
        bookmarkIcon.dataset.id = bookmark.id;
        bookmarkIcon.dataset.parentId = bookmark.parentId;
        bookmarkIcon.dataset.folder = folder;
        bookmarkIcon.title = bookmark.title;
        if (newNodeIds[bookmark.id]) {
            bookmarkIcon.classList.add('strobeHighlight');
        }
        if (isDocument) {
            bookmarkIcon.dataset.document = 'true';
        }
        bookmarkIcon.setAttribute('draggable', 'true');
        const tag = folder || isDocument ? 'div' : 'a';
        bookmarkIcon.innerHTML = `
            <${tag} class="bookmarkLink" data-id="link" draggable="false" href="${bookmark.url}">
                <div class="iconContainer">
                    <img class="icon" data-id="image" draggable="false" src="${icon}" alt="">
                </div>
                <div class="name" data-id="name">${bookmark.title}</div>
            </${tag}>
        `;
        if (!isDocument && bookmark.url && (bookmark.url.startsWith('data:') || bookmark.url.startsWith('file:'))) {
            bookmarkIcon.children[0].addEventListener('click', () => {
                chrome.tabs.update({url: bookmark.url});
            });
        }
        const nameDiv = bookmarkIcon.querySelector('.name');
        const positionData = app.data.icons[bookmark.id] || findNextOpenSpot();
        if (container === desktop) {
            bookmarkIcon.style.position = 'absolute';
            bookmarkIcon.style.left = positionData.x * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
            bookmarkIcon.style.top = positionData.y * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
            app.data.locations[`${positionData.x},${positionData.y}`] = true;
        } else {
            bookmarkIcon.style.zIndex = 'auto';
        }
        container.appendChild(bookmarkIcon);
        clampText(nameDiv, bookmark.title);
    }
    app.makeBookmarkIcon = makeBookmarkIcon;

    app.saveData = () => {
        app.data.icons = {};
        app.data.locations = {};
        desktop.children.forEach((child) => {
            if (child.classList.contains('bookmark')) {
                const left = parseInt(child.style.left);
                const top = parseInt(child.style.top);
                const x = (left - GUTTER) / (ICON_WIDTH + ICON_SPACING);
                const y = (top - GUTTER) / (ICON_HEIGHT + ICON_SPACING);
                app.data.icons[child.dataset.id] = {x, y};
                app.data.locations[`${x},${y}`] = child.dataset.id;
            }
        });
        localStorage.data = JSON.stringify(app.data);
        if (app.sendSyncEventAfterSave) {
            app.sendSyncEventAfterSave = false;
            chrome.runtime.sendMessage({action: 'reload'});
        }
    };

    app.getBookmarkTree = promisify(chrome.bookmarks.getTree);
    app.getBookmarks = promisify(chrome.bookmarks.get);
    app.getBookmarkChildren = promisify(chrome.bookmarks.getChildren);

    async function render() {
        const bookmarkTree = await app.getBookmarkTree();
        desktop.innerHTML = '';
        const root = bookmarkTree[0];
        const rootChildren = root.children;

        const promises = [];
        const rootChildrenIds = [];
        // Create top level icons on "desktop"
        rootChildren.forEach((rNode) => {
            rNode.children.forEach((node) => {
                if (node.url) {
                    // this is a bookmark node
                    promises.push(makeBookmarkIcon(node));
                } else {
                    // this is a folder node
                    promises.push(makeBookmarkIcon(node, true));
                }
            });
            rootChildrenIds.push(rNode.id);
        });
        app.rootChildrenIds = rootChildrenIds;
        Promise.all(promises).then(app.saveData);
        const windows = document.querySelectorAll('.window');
        windows.forEach((win) => {
            if (win.dataset.folder) {
                app.openFolder(win.dataset.id, null, {window: win});
            }
            if (win.dataset.document) {
                app.syncEditorData(win.dataset.id, win);
            }
        });
    }
    app.makeHelpDocument().then(render);

    // Start checking if we need to switch backgrounds.
    setInterval(() => {
        const lastRotation = localStorage.lastRotation;
        const now = Date.now();
        if ((now - lastRotation) > app.data.rotateMinutes * 60 * 1000) {
            const nextBg = getNextBgInCycle(localStorage.lastBgId, app.data.backgrounds, app.data.random);
            if (nextBg) {
                updateBackground(nextBg);
                app.saveData();
            }
            localStorage.lastRotation = now;
        }
        if (localStorage.lastBgId !== app.data.background.id) {
            const newBg = getBackground(localStorage.lastBgId);
            if (newBg) {
                updateBackground(newBg);
            }
        }
    }, 3000);

    window.addEventListener('mousemove', throttle((e) => {
        const strobingBookmark = getParentElementWithClass(e.target, 'strobeHighlight', 4);
        if (strobingBookmark) {
            strobingBookmark.classList.remove('strobeHighlight');
            removeNewNodeId(strobingBookmark.dataset.id);
        }
    }, 200));

    app.debouncedRender = debounce(() => {
        if (!app.ignoreNextRender) {
            render();
        }
        app.ignoreNextRender = false;
    }, 100);
    ['onCreated', 'onImportEnded', 'onMoved', 'onRemoved', 'onChanged'].forEach((eventName) => {
        chrome.bookmarks[eventName].addListener(app.debouncedRender);
    });

    chrome.runtime.onMessage.addListener(async (msgObj) => {
        if (msgObj.action === 'reload') {
            app.data = await loadData();
            app.debouncedRender();
            const newBg = getBackground(localStorage.lastBgId);
            if (newBg) {
                updateBackground(newBg);
            }
        }
    });
}
