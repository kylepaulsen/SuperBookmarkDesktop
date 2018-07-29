/* global chrome, app, idbKeyval */
{
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, DOUBLE_CLICK_SPEED, getFaviconImageUrl, loadData,
           getParentElementWithClass, clampText, promisify, updateBackground, getNextBgInCycle, debounce, throttle,
           folderImage, documentImage, removeNewNodeId, getBackground, attachClickHandler,
           findNextOpenSpot, diffRender, htmlEscape} = app.util;

    const measuringDiv = document.createElement('div');
    measuringDiv.className = 'measuringDiv';
    document.body.appendChild(measuringDiv);

    async function makeIconElement(bookmark) {
        const isDocument = app.isValidDocument(bookmark.url);
        const folder = bookmark.url === undefined;
        let icon = getFaviconImageUrl(bookmark.url);
        let type = 'bookmark';
        if (folder) {
            icon = folderImage;
            type = 'folder';
        }
        if (isDocument) {
            icon = documentImage;
            type = 'document';
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
        bookmarkIcon.dataset.type = type;
        bookmarkIcon.title = bookmark.title;
        if (newNodeIds[bookmark.id]) {
            bookmarkIcon.classList.add('strobeHighlight');
        }
        bookmarkIcon.setAttribute('draggable', 'true');
        const tag = folder || isDocument ? 'div' : 'a';
        bookmarkIcon.innerHTML = `
            <${tag} class="bookmarkLink" data-id="link" draggable="false" href="${htmlEscape(bookmark.url)}">
                <div class="iconContainer">
                    <img class="icon" data-id="image" draggable="false" src="${htmlEscape(icon)}" alt="">
                </div>
                <div class="name" data-id="name">${htmlEscape(bookmark.title)}</div>
            </${tag}>
        `;
        return bookmarkIcon;
    }
    app.makeIconElement = makeIconElement;

    async function makeBookmarkIcon(bookmark, desktop = false) {
        const bookmarkIcon = await makeIconElement(bookmark);
        const isDocument = bookmarkIcon.dataset.type === 'document';
        if (!isDocument && bookmark.url && (bookmark.url.startsWith('data:') || bookmark.url.startsWith('file:'))) {
            attachClickHandler(bookmarkIcon.children[0], (e, isDoubleClick) => {
                if (!localStorage.useDoubleClicks || isDoubleClick) {
                    chrome.tabs.update({url: bookmark.url});
                }
            });
        }
        const nameDiv = bookmarkIcon.querySelector('.name');
        let positionData;
        if (app.newIcon && app.newIcon.id === bookmark.id) {
            // this is when a tab made a new bookmark and this tab is just getting the update
            positionData = app.newIcon.pos;
            app.newIcon = undefined;
        } else {
            positionData = app.data.icons[bookmark.id] || findNextOpenSpot();
        }

        if (desktop) {
            bookmarkIcon.style.position = 'absolute';
            bookmarkIcon.style.left = positionData.x * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
            bookmarkIcon.style.top = positionData.y * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
            app.data.locations[`${positionData.x},${positionData.y}`] = true;
        } else {
            bookmarkIcon.style.zIndex = 'auto';
        }

        measuringDiv.appendChild(bookmarkIcon);
        clampText(nameDiv, bookmark.title);
        measuringDiv.removeChild(bookmarkIcon);
        return bookmarkIcon;
    }
    app.makeBookmarkIcon = makeBookmarkIcon;

    app.saveData = () => {
        app.data.icons = {};
        app.data.locations = {};
        app.desktop.children.forEach((child) => {
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

    let firstRender = true;
    async function render() {
        const bookmarkTree = await app.getBookmarkTree();
        const root = bookmarkTree[0];
        const rootChildren = root.children;

        const promises = [];
        const rootChildrenIds = [];
        // Create top level icons on "desktop"
        rootChildren.forEach((rNode) => {
            if (rNode.id === '1' && localStorage.hideBookmarksBarBookmarks === '1') {
                return; // don't render "bookmarks bar" bookmarks.
            }
            rNode.children.forEach((node) => {
                promises.push(makeBookmarkIcon(node, true));
            });
            rootChildrenIds.push(rNode.id);
        });
        app.rootChildrenIds = rootChildrenIds;
        Promise.all(promises).then((bookmarks) => {
            diffRender(bookmarks, app.desktop, !firstRender);
            app.saveData();
            firstRender = false;
        });
        const windows = document.querySelectorAll('.window');
        windows.forEach((win) => {
            if (win.dataset.type === 'folder') {
                app.openFolder(win.dataset.id, null, {window: win});
            }
            if (win.dataset.type === 'document') {
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

    const openJSLink = (bookmark) => {
        if (bookmark && bookmark.dataset && bookmark.dataset.url) {
            const url = bookmark.dataset.url;
            // If the user tries to open a js bookmarklet, this helps with that.
            if (url.startsWith('javascript:')) {
                chrome.tabs.create({url: url, active: false});
            }
        }
    };

    { // double click option for all normal bookmarks.
        let lastTime = 0;
        let lastTarget;
        window.addEventListener('click', (e) => {
            const target = getParentElementWithClass(e.target, 'bookmark');
            const now = Date.now();
            if (now - lastTime > DOUBLE_CLICK_SPEED || lastTarget !== target) {
                // single click
                if (target && localStorage.useDoubleClicks) {
                    e.preventDefault();
                    lastTime = now;
                } else {
                    openJSLink(target);
                    lastTime = 0;
                }
            } else {
                // double click!
                openJSLink(target);
                lastTime = 0;
            }
            lastTarget = target;
        });
    }

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
            const lastBG = app.data.background;
            app.data = await loadData();
            app.debouncedRender();
            // if there is a bg swap, pretend we didnt switch yet.
            app.data.background = lastBG;
            const newBg = getBackground(localStorage.lastBgId);
            if (newBg) {
                updateBackground(newBg);
            }
        } else if (msgObj.action === 'newIcon') {
            // some tab added a new icon... when this tab renders it for the first time, place it in the right spot.
            app.newIcon = msgObj.data;
            app.debouncedRender();
        }
    });
}
