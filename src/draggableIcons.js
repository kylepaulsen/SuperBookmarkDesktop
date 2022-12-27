/* global chrome, app */
{
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, pointToGrid, getParentElementWithClass,
        getDataset, deselectAll, findFreeSpotNear, debounce} = app.util;
    const {saveBrowserSyncData} = app.backup;

    let lastHovered;
    let selected = [];
    let dragStartElement;

    // A counter to see if you are dragging inside the current window...
    // ... Yes, we have to do this insanity just to know that.
    let dragInsideLevel = 0;
    window.addEventListener('dragenter', () => {
        dragInsideLevel++;
    });

    window.addEventListener('dragleave', () => {
        dragInsideLevel--;
    });

    window.addEventListener('dragstart', (e) => {
        dragInsideLevel = 0;
        if (e.target.classList.contains('bookmark')) {
            dragStartElement = e.target;
            if (dragStartElement.dataset.url) {
                e.dataTransfer.setData('text/plain', dragStartElement.dataset.url);
            }
            let container = getParentElementWithClass(dragStartElement, ['window', 'desktop', 'desktopBackground']);
            if (container.classList.contains('desktopBackground')) {
                container = app.desktop;
            }
            selected = Array.prototype.slice.call(container.querySelectorAll('.bookmark.selected'));
            selected = selected.filter((item) => item !== dragStartElement);
            selected.unshift(dragStartElement);
        }
    });

    let mouseGridPos;
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        // collecting mouse grid pos here because there is a weird AF bug in mac chrome with bad mouse coords.
        mouseGridPos = pointToGrid(e.pageX, e.pageY);
        const potentialDropTarget = document.elementFromPoint(e.clientX, e.clientY);
        let dropTarget = getParentElementWithClass(potentialDropTarget,
            ['bookmark', 'navButton', 'window', 'desktop', 'desktopBackground']);
        if (dropTarget.classList.contains('desktopBackground')) {
            dropTarget = app.desktop;
        }
        if (lastHovered) {
            lastHovered.classList.remove('dragHover');
            lastHovered = undefined;
        }
        if (dropTarget && !selected.includes(dropTarget)) {
            const icon = getDataset(dropTarget);
            if (icon.type === 'folder') {
                lastHovered = dropTarget;
                lastHovered.classList.add('dragHover');
            }
        }
    });

    window.addEventListener('dragend', () => {
        let dropTarget = lastHovered;
        if (!dropTarget && dragStartElement.parentElement === app.desktop) {
            dropTarget = app.desktop;
        }
        // dragInsideLevel is a weird way to tell if you are dragging inside the browser window when > 0.
        if (dropTarget && !selected.includes(dropTarget) && dragInsideLevel > 0) {
            let gridOffset;
            let acceptableCollisions = {};
            let shouldSave = false;
            if (dropTarget === app.desktop) {
                if (dragStartElement.parentElement === app.desktop) {
                    // set up stuff for moving icons just on the desktop.
                    shouldSave = true;
                    selected.forEach((item) => {
                        const gridPos = pointToGrid(item.offsetLeft, item.offsetTop);
                        acceptableCollisions[`${gridPos.x},${gridPos.y}`] = true;
                    });
                    const gridAnchorPoint = pointToGrid(dragStartElement.offsetLeft, dragStartElement.offsetTop);
                    gridOffset = {
                        x: mouseGridPos.x - gridAnchorPoint.x,
                        y: mouseGridPos.y - gridAnchorPoint.y
                    };
                }
            }
            let sendSyncAfterSave = false;
            selected.forEach((item) => {
                if (dropTarget === app.desktop) {
                    if (dragStartElement.parentElement === app.desktop) {
                        // just moving items on desktop
                        const gridPos = pointToGrid(item.offsetLeft, item.offsetTop);
                        const gridPosAfterMove = {
                            x: gridPos.x + gridOffset.x,
                            y: gridPos.y + gridOffset.y
                        };
                        const newSpot = findFreeSpotNear(gridPosAfterMove.x, gridPosAfterMove.y, acceptableCollisions);
                        delete app.data.locations[`${gridPos.x},${gridPos.y}`];
                        app.data.locations[`${newSpot.x},${newSpot.y}`] = item.dataset.id;
                        item.style.left = newSpot.x * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
                        item.style.top = newSpot.y * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
                        debouncedSync();
                    } else {
                        // moving items from folder to desktop.
                        const newSpot = findFreeSpotNear(mouseGridPos.x, mouseGridPos.y);
                        app.data.locations[`${newSpot.x},${newSpot.y}`] = item.dataset.id;
                        app.data.icons[item.dataset.id] = newSpot;
                        sendSyncAfterSave = true;
                    }
                }
                // the root children are all treated as being children of id 2
                const pidCheck = app.rootChildrenIds.includes(item.dataset.parentId) ? '2' : item.dataset.parentId;
                if (pidCheck !== dropTarget.dataset.id) {
                    chrome.bookmarks.move(item.dataset.id, {parentId: dropTarget.dataset.id});
                }
            });
            if (shouldSave) {
                app.saveData();
                if (sendSyncAfterSave) {
                    chrome.runtime.sendMessage({action: 'reload'});
                }
            }
            selected = [];
        }
        if (lastHovered) {
            lastHovered.classList.remove('dragHover');
        }
        lastHovered = undefined;
    });

    const debouncedSync = debounce(() => {
        chrome.runtime.sendMessage({action: 'reload'});
        saveBrowserSyncData();
    }, 100);

    let changeSelection = false;
    let lastSelected = [];
    const highlightSelected = (container, box) => {
        container.querySelectorAll('.bookmark').forEach((bookmark) => {
            if (!changeSelection || (changeSelection && !lastSelected.includes(bookmark))) {
                bookmark.classList.remove('selected');
            }
            const rect = bookmark.getBoundingClientRect();
            // origin centered box.
            const bookmarkBox = {
                x: rect.width / 2 + rect.left,
                y: rect.height / 2 + rect.top,
                width: rect.width,
                height: rect.height
            };
            if (Math.abs(box.x - bookmarkBox.x) * 2 < (box.width + bookmarkBox.width) &&
                Math.abs(box.y - bookmarkBox.y) * 2 < (box.height + bookmarkBox.height)) {
                bookmark.classList.add('selected');
            }
        });
    };

    const selectBox = document.createElement('div');
    selectBox.className = 'selectBox';

    let selectContainer;
    const firstPoint = {x: 0, y: 0};
    window.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
            e.preventDefault();
        }
    });

    window.addEventListener('mousedown', (e) => {
        changeSelection = e.metaKey || e.ctrlKey || e.shiftKey;
        if (changeSelection) {
            lastSelected = document.querySelectorAll('.bookmark.selected');
        }
        selectContainer = undefined;
        const bookmark = getParentElementWithClass(e.target, 'bookmark');
        const editorContent = getParentElementWithClass(e.target, 'text-editor');
        const folderContent = getParentElementWithClass(e.target, 'content');
        if (bookmark) {
            if (e.button === 2) {
                if (!bookmark.classList.contains('selected')) {
                    if (!changeSelection) {
                        deselectAll();
                    }
                    bookmark.classList.add('selected');
                }
                return;
            }

            if (!bookmark.classList.contains('selected')) {
                if (!changeSelection) {
                    deselectAll();
                } else {
                    bookmark.classList.add('selected');
                }
                if (localStorage.useDoubleClicks) {
                    bookmark.classList.add('selected');
                }
            } else {
                if (changeSelection) {
                    bookmark.classList.remove('selected');
                }
            }
        } else if (e.target === app.desktop || e.target === app.desktopBackground) {
            selectContainer = app.desktop;
            selectBox.style.zIndex = 7;
        } else if (!editorContent && folderContent) {
            selectContainer = folderContent;
            selectBox.style.zIndex = 300;
        }
        if (selectContainer) {
            firstPoint.x = e.pageX;
            firstPoint.y = e.pageY;
            if (!changeSelection) {
                deselectAll();
            }
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (selectContainer) {
            e.preventDefault();
            if (!selectBox.parentElement) {
                document.body.appendChild(selectBox);
            }
            if (e.pageX < firstPoint.x) {
                if (e.pageY < firstPoint.y) {
                    selectBox.style.left = e.pageX + 'px';
                    selectBox.style.top = e.pageY + 'px';
                    selectBox.style.width = firstPoint.x - e.pageX + 'px';
                    selectBox.style.height = firstPoint.y - e.pageY + 'px';
                } else {
                    selectBox.style.left = e.pageX + 'px';
                    selectBox.style.top = firstPoint.y + 'px';
                    selectBox.style.width = firstPoint.x - e.pageX + 'px';
                    selectBox.style.height = e.pageY - firstPoint.y + 'px';
                }
            } else {
                if (e.pageY < firstPoint.y) {
                    selectBox.style.left = firstPoint.x + 'px';
                    selectBox.style.top = e.pageY + 'px';
                    selectBox.style.width = e.pageX - firstPoint.x + 'px';
                    selectBox.style.height = firstPoint.y - e.pageY + 'px';
                } else {
                    selectBox.style.left = firstPoint.x + 'px';
                    selectBox.style.top = firstPoint.y + 'px';
                    selectBox.style.width = e.pageX - firstPoint.x + 'px';
                    selectBox.style.height = e.pageY - firstPoint.y + 'px';
                }
            }
            const rect = selectBox.getBoundingClientRect();
            // origin centered box.
            const box = {
                x: rect.width / 2 + rect.left,
                y: rect.height / 2 + rect.top,
                width: rect.width,
                height: rect.height
            };
            highlightSelected(selectContainer, box);
        }
    });

    window.addEventListener('mouseup', () => {
        if (selectBox.parentElement) {
            document.body.removeChild(selectBox);
        }
        selectContainer = undefined;
        changeSelection = false;
        lastSelected = [];
    });
}
