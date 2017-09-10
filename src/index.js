/* global chrome, app, idbKeyval */
{
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, getFaviconImageUrl,
           clampText, promisify, fixBackgroundSize, updateBackground, getNextBgInCycle, debounce} = app.util;
    const desktop = document.querySelector('#desktop');
    app.desktop = desktop;

    const data = app.data;

    function findNextOpenSpot() {
        for (let x = 0; x < 12; x++) {
            for (let y = 0; y < 6; y++) {
                if (!data.locations[`${x},${y}`]) {
                    return {x, y};
                }
            }
        }
        let y = 6;
        while (y < 99999) {
            for (let x = 0; x < 12; x++) {
                if (!data.locations[`${x},${y}`]) {
                    return {x, y};
                }
            }
            y++;
        }
    }

    async function makeBookmarkIcon(bookmark, currentPath, folder = false, container = desktop) {
        let icon = folder ? 'icons/folder.svg' : getFaviconImageUrl(bookmark.url);
        try {
            const iconBlob = await idbKeyval.get(bookmark.id);
            if (iconBlob) {
                icon = URL.createObjectURL(iconBlob);
            }
        } catch (e) {}
        const bookmarkIcon = document.createElement('div');
        bookmarkIcon.className = folder ? 'bookmark folder' : 'bookmark';
        bookmarkIcon.dataset.url = bookmark.url;
        bookmarkIcon.dataset.name = bookmark.title;
        bookmarkIcon.dataset.id = bookmark.id;
        bookmarkIcon.dataset.path = currentPath + '/' + bookmark.id;
        bookmarkIcon.dataset.folder = folder;
        bookmarkIcon.title = bookmark.title;
        bookmarkIcon.setAttribute('draggable', 'true');
        const tag = folder ? 'div' : 'a';
        bookmarkIcon.innerHTML = `
            <${tag} class="bookmarkLink" data-id="link" draggable="false" href="${bookmark.url}">
                <div class="iconContainer">
                    <img class="icon" data-id="image" draggable="false" src="${icon}" alt="">
                </div>
                <div class="name" data-id="name">${bookmark.title}</div>
            </${tag}>
        `;
        const nameDiv = bookmarkIcon.querySelector('.name');
        const positionData = data.icons[bookmark.id] || findNextOpenSpot();
        if (container === desktop) {
            bookmarkIcon.style.position = 'absolute';
            bookmarkIcon.style.left = positionData.x * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
            bookmarkIcon.style.top = positionData.y * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
            data.locations[`${positionData.x},${positionData.y}`] = true;
        } else {
            bookmarkIcon.style.zIndex = 'auto';
        }
        container.appendChild(bookmarkIcon);
        clampText(nameDiv, bookmark.title);
    }
    app.makeBookmarkIcon = makeBookmarkIcon;

    app.saveData = () => {
        // side task to update background.
        fixBackgroundSize();

        data.icons = {};
        data.locations = {};
        desktop.children.forEach((child) => {
            if (child.classList.contains('bookmark')) {
                const left = parseInt(child.style.left);
                const top = parseInt(child.style.top);
                const x = (left - GUTTER) / (ICON_WIDTH + ICON_SPACING);
                const y = (top - GUTTER) / (ICON_HEIGHT + ICON_SPACING);
                data.icons[child.dataset.id] = {x, y};
                data.locations[`${x},${y}`] = child.dataset.id;
            }
        });
        localStorage.data = JSON.stringify(data);
    };

    app.getBookmarkTree = promisify(chrome.bookmarks.getTree);

    async function render() {
        const bookmarkTree = await app.getBookmarkTree();
        desktop.innerHTML = '';
        const root = bookmarkTree[0];
        const rootChildren = root.children;

        const promises = [];
        // Create top level icons on "desktop"
        rootChildren.forEach((rNode) => {
            rNode.children.forEach((node) => {
                if (node.url) {
                    // this is a bookmark node
                    promises.push(makeBookmarkIcon(node, rNode.id));
                } else {
                    // this is a folder node
                    promises.push(makeBookmarkIcon(node, rNode.id, true));
                }
            });
        });
        Promise.all(promises).then(app.saveData);
        const windows = document.querySelectorAll('.window');
        windows.forEach((win) => {
            app.renderFolder(win.dataset.path, win);
        });
    }
    render();

    // Start checking if we need to switch backgrounds.
    setInterval(() => {
        const lastRotation = localStorage.lastRotation;
        const now = Date.now();
        if ((now - lastRotation) > data.rotateMinutes * 60 * 1000) {
            const nextBg = getNextBgInCycle(localStorage.lastBgId, data.backgrounds, data.random);
            if (nextBg) {
                updateBackground(nextBg);
                app.saveData();
            }
            localStorage.lastRotation = now;
        }
        if (localStorage.lastBgId !== data.background.id) {
            const newBg = data.backgrounds.find((bg) => bg.id === localStorage.lastBgId);
            if (newBg) {
                updateBackground(newBg);
            }
        }
    }, 3000);

    window.addEventListener('resize', () => {
        fixBackgroundSize();
    });

    app.debouncedRender = debounce(() => {
        if (!app.ignoreNextRender) {
            render();
        }
        app.ignoreNextRender = false;
    }, 100);
    ['onCreated', 'onImportEnded', 'onMoved', 'onRemoved', 'onChanged'].forEach((eventName) => {
        chrome.bookmarks[eventName].addListener(app.debouncedRender);
    });

    /*
    { // root folder node
        "children": [{ // folder node
            "children": [{ // bookmark node
                "dateAdded": 1425441500109,
                "id": "5",
                "index": 0,
                "parentId": "1",
                "title": "Inbox - krazykylep@gmail.com - Gmail",
                "url": "https://mail.google.com/mail/u/0/?pli=1#inbox"
            }],
            "dateAdded": 1398133602091,
            "dateGroupModified": 1503811743189,
            "id": "1",
            "index": 0,
            "parentId": "0",
            "title": "Bookmarks bar"
        }, { // folder node
            "children": [],
            "dateAdded": 1398133602091,
            "id": "2",
            "index": 1,
            "parentId": "0",
            "title": "Other bookmarks"
        }],
        "dateAdded": 1503694544274,
        "id": "0",
        "title": ""
    }
    */
}
