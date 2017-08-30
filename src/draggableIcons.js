/* global getParentElementWithClass, saveData, ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER */
{
    const disableNav = (e) => {
        e.preventDefault();
        return false;
    };

    let lastX;
    let lastY;
    const checkForSwap = (x, y) => {
        const data = window.data;
        const existing = data.locations[`${x},${y}`] || {};
        const existingEl = existing.element;
        if (lastX !== undefined && existingEl && target !== existingEl) {
            existing.element.style.left = lastX * (ICON_WIDTH + ICON_SPACING) + GUTTER + 'px';
            existing.element.style.top = lastY * (ICON_HEIGHT + ICON_SPACING) + GUTTER + 'px';
            data.locations[`${lastX},${lastY}`] = existing;
            data.locations[`${x},${y}`] = undefined;
        }
    };

    let mouseDown = false;
    let target;
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
            const iconW = ICON_WIDTH + ICON_SPACING;
            const iconH = ICON_HEIGHT + ICON_SPACING;
            lastX = Math.max(Math.floor((e.pageX - GUTTER) / iconW), 0);
            lastY = Math.max(Math.floor((e.pageY - GUTTER) / iconH), 0);
            target.querySelector('a').removeEventListener('click', disableNav);
        }
    });

    window.addEventListener('mousemove', function(e) {
        if (mouseDown && target) {
            e.preventDefault();

            // chrome bug firing mousemove on down.
            const deltaTime = Date.now() - timeDown;
            if (deltaTime > 100) {
                target.querySelector('a').addEventListener('click', disableNav);
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

    window.addEventListener('mouseup', function(e) {
        target = undefined;
        mouseDown = false;
        if (moved) {
            saveData();
            moved = false;
            return false;
        }
    });
}
