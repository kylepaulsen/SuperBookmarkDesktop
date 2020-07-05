/* global chrome, app */
{
    const { deselectAll, pointToGrid, isUserInteractingWithForm, addToBookmarkHistory } = app.util;

    const arrowKeysToDir = {
        ArrowUp: true,
        ArrowRight: true,
        ArrowDown: true,
        ArrowLeft: true
    };

    const findTopLeftMostBookmark = () => {
        let bestTopLeftDist = Infinity;
        let bestId;
        const icons = app.data.icons;
        Object.keys(icons).forEach(id => {
            const location = icons[id];
            const dist = location.x + location.y;
            if (dist < bestTopLeftDist) {
                bestTopLeftDist = dist;
                bestId = id;
            }
        });
        return app.desktop.querySelector(`.bookmark[data-id="${bestId}"]`);
    };

    let fullIconWidth;
    // eslint-disable-next-line max-statements
    const arrowKeysHandler = e => {
        e.preventDefault();
        const activeWindowIconArea = document.querySelector('.window.active .iconArea');

        let firstSelected = (activeWindowIconArea || app.desktop).querySelector('.bookmark.selected');
        deselectAll();
        if (!firstSelected) {
            if (activeWindowIconArea) {
                firstSelected = activeWindowIconArea.querySelector('.bookmark');
            }
            if (!firstSelected) {
                firstSelected = findTopLeftMostBookmark();
            }
            if (!firstSelected) {
                return;
            }
            firstSelected.classList.add('selected');
            firstSelected.scrollIntoView();
            return;
        }

        if (activeWindowIconArea) {
            const iconAreaWidth = activeWindowIconArea.offsetWidth;
            if (!fullIconWidth) {
                const computedStyle = window.getComputedStyle(firstSelected);
                fullIconWidth = firstSelected.offsetWidth + parseFloat(computedStyle['margin-left']) +
                    parseFloat(computedStyle['margin-right']);
            }
            const iconsPerRow = Math.floor(iconAreaWidth / fullIconWidth);

            const activeWindowIconAreaChildren = activeWindowIconArea.children;
            const selectedIndex = activeWindowIconAreaChildren.findIndex(bookmark => bookmark === firstSelected);
            let nextBookmark;
            if (e.key === 'ArrowRight') {
                nextBookmark = activeWindowIconAreaChildren[Math.min(selectedIndex + 1,
                    activeWindowIconAreaChildren.length - 1)];
            } else if (e.key === 'ArrowLeft') {
                nextBookmark = activeWindowIconAreaChildren[Math.max(selectedIndex - 1, 0)];
            } else if (e.key === 'ArrowUp') {
                nextBookmark = activeWindowIconAreaChildren[Math.max(selectedIndex - iconsPerRow, 0)];
            } else if (e.key === 'ArrowDown') {
                nextBookmark = activeWindowIconAreaChildren[Math.min(selectedIndex + iconsPerRow,
                    activeWindowIconAreaChildren.length - 1)];
            }
            nextBookmark.classList.add('selected');
            nextBookmark.scrollIntoView();
            return;
        }

        const gridLocation = pointToGrid(firstSelected.offsetLeft, firstSelected.offsetTop);

        const icons = app.data.icons;
        let bestDist = Infinity;
        let bestId;
        Object.keys(icons).forEach(id => {
            const loc = icons[id];
            const dist = Math.abs(gridLocation.x - loc.x) + Math.abs(gridLocation.y - loc.y);
            if (dist < bestDist) {
                if ((e.key === 'ArrowRight' && gridLocation.x < loc.x) ||
                    (e.key === 'ArrowLeft' && gridLocation.x > loc.x) ||
                    (e.key === 'ArrowUp' && gridLocation.y > loc.y) ||
                    (e.key === 'ArrowDown' && gridLocation.y < loc.y)) {

                    bestDist = dist;
                    bestId = id;
                }
            }
        });
        let nextBookmark = app.desktop.querySelector(`.bookmark[data-id="${bestId}"]`);

        if (!nextBookmark) {
            nextBookmark = firstSelected;
        }
        nextBookmark.classList.add('selected');
        nextBookmark.scrollIntoView();
    };

    const selectFirstWindowElement = () => {
        deselectAll();
        const firstBookmarkInActiveWindow = document.querySelector('.window.active .iconArea .bookmark');
        if (firstBookmarkInActiveWindow) {
            firstBookmarkInActiveWindow.classList.add('selected');
            firstBookmarkInActiveWindow.scrollIntoView();
            return;
        }
        const textEditor = document.querySelector('.window.active .pell-content');
        if (textEditor) {
            textEditor.focus();
        }
    };

    const keyHandlers = {
        Enter() {
            const bookmarks = document.querySelectorAll('.bookmark.selected');
            if (bookmarks.length === 0) {
                return;
            }
            let first = true;
            const urlBookmarks = bookmarks.filter(bookmark => !!bookmark.dataset.url &&
                bookmark.dataset.url !== 'undefined' && !bookmark.dataset.url.startsWith('data'));
            urlBookmarks.forEach(bookmark => {
                const url = bookmark.dataset.url;
                if (first) {
                    window.location.href = url;
                    first = false;
                    addToBookmarkHistory({ title: bookmark.dataset.name, url });
                } else {
                    chrome.tabs.create({url: bookmark.dataset.url, active: false});
                    addToBookmarkHistory({ title: bookmark.dataset.name, url });
                }
            });
            if (!first) {
                return;
            }
            let openFolderOrDocProm = Promise.resolve();
            bookmarks.forEach(bookmark => {
                if (bookmark.dataset.type === 'folder') {
                    openFolderOrDocProm = app.openFolder(bookmark.dataset.id, bookmark);
                } else if (bookmark.dataset.type === 'document') {
                    openFolderOrDocProm = app.openDocument(bookmark.dataset.id);
                }
            });
            openFolderOrDocProm.then(selectFirstWindowElement);
        },
        Backspace() {
            const activeWindow = document.querySelector('.window.active');
            if (activeWindow) {
                const activeWindowNavBar = activeWindow.querySelector('.nav-bar');
                if (activeWindowNavBar) {
                    const navButtons = activeWindowNavBar.querySelectorAll('.navButton');
                    if (navButtons[navButtons.length - 2]) {
                        app.openFolder(navButtons[navButtons.length - 2].dataset.id, null,
                            {window: activeWindow}).then(selectFirstWindowElement);
                    }
                }
            }
        },
        Escape() {
            const selected = document.querySelectorAll('.bookmark.selected');
            if (selected.length) {
                deselectAll();
                return;
            }
            const activeWindowCloseBtn = document.querySelector('.window.active .close');
            if (activeWindowCloseBtn) {
                activeWindowCloseBtn.click();
            }
        },
        Tab(e) {
            e.preventDefault();
            const activeWindow = document.querySelector('.window.active');
            const windows = document.querySelectorAll('.window');
            const activeWindowIndex = windows.findIndex(win => win === activeWindow);
            if (activeWindow) {
                activeWindow.classList.remove('active');
            } else {
                arrowKeysHandler({ key: 'ArrowRight', preventDefault: () => {} });
            }
            if (activeWindowIndex !== windows.length - 1) {
                const nextWindow = windows[activeWindowIndex + 1];
                if (nextWindow) {
                    nextWindow.classList.add('active');
                    selectFirstWindowElement();
                }
            } else if (windows.length) {
                arrowKeysHandler({ key: 'ArrowRight', preventDefault: () => {} });
            }
        }
    };

    document.addEventListener('keydown', e => {
        const modalOpen = document.querySelectorAll('.modalOverlay').find((a) =>
            a.style.display && a.style.display !== 'none');
        if (modalOpen) {
            return;
        }
        if (e.key === 'Escape') {
            setTimeout(keyHandlers.Escape, 0);
            return;
        }
        if (isUserInteractingWithForm()) {
            return;
        }
        const keyHandler = keyHandlers[e.key];
        if (arrowKeysToDir[e.key]) {
            arrowKeysHandler(e);
        } else if (keyHandler) {
            keyHandler(e);
        }
    }, true);

    window.addEventListener('focus', () => {
        document.activeElement.blur();
    });
}
