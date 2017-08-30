/* global chrome, app, idbKeyval */
{
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, getFaviconImageUrl, clampText, promisify} = app.util;
    const desktop = document.querySelector('#desktop');

    let data;
    try {
        data = JSON.parse(localStorage.data);
    } catch (e) {
        data = {
            icons: {},
            locations: {}
        };
    }
    app.data = data;

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

    async function makeBookmarkIcon(bookmark) {
        let icon = getFaviconImageUrl(bookmark.url);
        try {
            const iconBlob = await idbKeyval.get(bookmark.id);
            if (iconBlob) {
                icon = URL.createObjectURL(iconBlob);
            }
        } catch (e) {}
        const bookmarkIcon = document.createElement('div');
        bookmarkIcon.className = 'bookmark';
        bookmarkIcon.dataset.url = bookmark.url;
        bookmarkIcon.dataset.name = bookmark.title;
        bookmarkIcon.dataset.id = bookmark.id;
        bookmarkIcon.title = bookmark.title;
        bookmarkIcon.innerHTML = `
            <a class="bookmarkLink" draggable="false" href="${bookmark.url}">
                <img class="icon" src="${icon}" alt="">
                <div class="name">${bookmark.title}</div>
            </a>
        `;
        const nameDiv = bookmarkIcon.querySelector('.name');
        const positionData = data.icons[bookmark.id] || findNextOpenSpot();
        positionData.url = bookmark.url;
        bookmarkIcon.style.left = positionData.x * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
        bookmarkIcon.style.top = positionData.y * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
        desktop.appendChild(bookmarkIcon);
        clampText(nameDiv, bookmark.title);
        data.locations[`${positionData.x},${positionData.y}`] = positionData;
    }

    app.saveData = () => {
        data.icons = {};
        data.locations = {};
        desktop.children.forEach((child) => {
            if (child.classList.contains('bookmark')) {
                const left = parseInt(child.style.left);
                const top = parseInt(child.style.top);
                const x = (left - GUTTER) / (ICON_WIDTH + ICON_SPACING);
                const y = (top - GUTTER) / (ICON_HEIGHT + ICON_SPACING);
                const bookmarkObj = {
                    x,
                    y,
                    url: child.dataset.url,
                    name: child.dataset.name
                };
                data.icons[child.dataset.id] = bookmarkObj;
                data.locations[`${x},${y}`] = bookmarkObj;
            }
        });
        localStorage.data = JSON.stringify(data);
        desktop.children.forEach((child) => {
            if (child.classList.contains('bookmark')) {
                const obj = data.icons[child.dataset.id];
                const iconImg = child.querySelector('.icon');
                if (!iconImg.src.startsWith('chrome')) {
                    obj.image = iconImg.src;
                }
                obj.element = child;
            }
        });
    };

    async function init() {
        const bookmarkTree = await promisify(chrome.bookmarks.getTree)();
        const root = bookmarkTree[0];
        const rootChildren = root.children;

        const bookmarkSet = {};
        const promises = [];
        // Create top level icons on "desktop"
        rootChildren.forEach((node) => {
            node.children.forEach((node) => {
                if (node.url && !bookmarkSet[node.url]) {
                    // this is a real bookmark node
                    bookmarkSet[node.url] = 1;
                    promises.push(makeBookmarkIcon(node));
                }
            });
        });
        Promise.all(promises).then(app.saveData);
    }

    init();
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
