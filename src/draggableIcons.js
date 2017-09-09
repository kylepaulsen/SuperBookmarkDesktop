/* global app */
{
    const {saveData} = app;
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, getParentElementWithClass} = app.util;

    const disableNav = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    let target;
    let lastX;
    let lastY;
    const checkForSwap = (x, y) => {
        const checkX = x * (ICON_WIDTH + ICON_SPACING) + GUTTER + 10;
        const checkY = y * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 10;
        const existingEl = getParentElementWithClass(document.elementFromPoint(checkX, checkY), 'bookmark');
        if (lastX !== undefined && existingEl && target !== existingEl) {
            existingEl.style.left = lastX * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
            existingEl.style.top = lastY * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
        }
    };

    let mouseDown = false;
    let moved = false;
    let timeDown;
    window.addEventListener('mousedown', function(e) {
        if (e.button !== 0) {
            return;
        }
        timeDown = Date.now();
        mouseDown = true;
        target = getParentElementWithClass(e.target, 'bookmark');
        if (target) {
            const inWindow = getParentElementWithClass(target, 'window');
            if (inWindow) {
                target = undefined;
                return;
            }
            const iconW = ICON_WIDTH + ICON_SPACING;
            const iconH = ICON_HEIGHT + ICON_SPACING;
            lastX = Math.max(Math.floor((e.pageX - GUTTER) / iconW), 0);
            lastY = Math.max(Math.floor((e.pageY - GUTTER) / iconH), 0);
            target.querySelector('.bookmarkLink').removeEventListener('click', disableNav);
        }
    });

    window.addEventListener('mousemove', function(e) {
        if (mouseDown && target) {
            e.preventDefault();

            // chrome bug firing mousemove on down.
            const deltaTime = Date.now() - timeDown;
            if (deltaTime > 100) {
                target.querySelector('.bookmarkLink').addEventListener('click', disableNav);
                const iconW = ICON_WIDTH + ICON_SPACING;
                const iconH = ICON_HEIGHT + ICON_SPACING;
                const x = Math.max(Math.floor((e.pageX - GUTTER) / iconW), 0);
                const y = Math.max(Math.floor((e.pageY - GUTTER) / iconH), 0);
                if (x !== lastX || y !== lastY) {
                    checkForSwap(x, y);
                }
                lastX = x;
                lastY = y;
                const newLeft = x * iconW + GUTTER;
                const newTop = y * iconH + GUTTER;
                target.style.left = newLeft + 'px';
                target.style.top = newTop + 'px';
                moved = true;
            }
        }
    });

    window.addEventListener('mouseup', function() {
        target = undefined;
        mouseDown = false;
        if (moved) {
            saveData();
            moved = false;
            return false;
        }
    });
}
