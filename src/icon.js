/* global app, chrome */
{
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, clampText,
        getBookmarkIcon, attachClickHandler, findNextOpenSpot, htmlEscape} = app.util;

    const measuringDiv = document.createElement('div');
    measuringDiv.className = 'measuringDiv';
    document.body.appendChild(measuringDiv);

    async function makeIconElement(bookmark) {
        const isDocument = app.isValidDocument(bookmark.url);
        const folder = bookmark.url === undefined;
        let icon = await getBookmarkIcon(bookmark);
        let type = 'bookmark';
        if (folder) {
            type = 'folder';
        }
        if (isDocument) {
            type = 'document';
        }
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
}
