/* global app */
{
    const {getParentElementWithClass} = app.util;

    const listen = (el, type, func) => {
        el.addEventListener(type, func, false);
    };

    const instanceTemplate = (template) => {
        const container = document.createElement('div');
        container.innerHTML = template;
        return container.children[0];
    };

    const makeWindow = (title, x = 0, y = 0, width = 550, height = 400) => {
        const minWidth = 150;
        const minHeight = 150;
        const template = `
            <div class="window" data-folder="true">
                <div class="window-top">
                    <div class="nw-resize top-resize"></div>
                    <div class="n-resize top-resize"></div>
                    <div class="ne-resize top-resize"></div>
                </div>
                <div class="window-top-middle">
                    <div class="w-resize top-resize"></div>
                    <div class="title-bar">
                        <div class="close"></div>
                        <div class="title" data-id="title">Some Title</div>
                    </div>
                    <div class="e-resize top-resize"></div>
                </div>
                <div class="window-top-nav">
                    <div class="w-resize top-resize"></div>
                    <div class="nav-bar" data-id="navBar"></div>
                    <div class="e-resize top-resize"></div>
                </div>
                <div class="window-middle">
                    <div class="w-resize"></div>
                    <div class="content">
                        <div class="nav" data-id="nav"></div>
                        <div class="iconArea" data-id="iconArea"></div>
                    </div>
                    <div class="e-resize"></div>
                </div>
                <div class="window-bottom">
                    <div class="sw-resize"></div>
                    <div class="s-resize"></div>
                    <div class="se-resize"></div>
                </div>
            </div>
        `;

        const win = instanceTemplate(template);
        const titleBar = win.querySelector('.title-bar');
        titleBar.querySelector('.title').textContent = title;

        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.left = x + 'px';
        win.style.top = y + 'px';

        const offset = {};
        const firstPoint = {};
        let mouseDown = false;
        let target;
        listen(win, 'mousedown', (e) => {
            if (!getParentElementWithClass(e.target, 'bookmark')) {
                e.preventDefault();
            }
            offset.x = e.pageX - win.offsetLeft;
            offset.y = e.pageY - win.offsetTop;
            width = win.offsetWidth;
            height = win.offsetHeight;
            firstPoint.x = e.pageX;
            firstPoint.y = e.pageY;
            mouseDown = true;
            target = e.target;
            const currentActive = document.querySelector('.window.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            win.classList.add('active');
        });

        listen(window, 'mouseup', () => {
            mouseDown = false;
        });

        listen(window, 'mousemove', (e) => {
            if (mouseDown) {
                if (titleBar.contains(target)) {
                    win.style.left = e.pageX - offset.x + 'px';
                    win.style.top = e.pageY - offset.y + 'px';
                }

                let newWidth = width;
                let newHeight = height;
                if (target.classList.contains('nw-resize')) {
                    newWidth = Math.max(firstPoint.x - e.pageX + width, minWidth);
                    newHeight = Math.max(firstPoint.y - e.pageY + height, minHeight);
                    const currentX = width - newWidth + firstPoint.x;
                    const currentY = height - newHeight + firstPoint.y;
                    win.style.left = (currentX - offset.x) + 'px';
                    win.style.top = (currentY - offset.y) + 'px';
                } else if (target.classList.contains('n-resize')) {
                    newHeight = Math.max(firstPoint.y - e.pageY + height, minHeight);
                    const currentY = height - newHeight + firstPoint.y;
                    win.style.top = (currentY - offset.y) + 'px';
                } else if (target.classList.contains('ne-resize')) {
                    newWidth = Math.max(e.pageX - firstPoint.x + width, minWidth);
                    newHeight = Math.max(firstPoint.y - e.pageY + height, minHeight);
                    const currentY = height - newHeight + firstPoint.y;
                    win.style.top = (currentY - offset.y) + 'px';
                } else if (target.classList.contains('w-resize')) {
                    newWidth = Math.max(firstPoint.x - e.pageX + width, minWidth);
                    const currentX = width - newWidth + firstPoint.x;
                    win.style.left = (currentX - offset.x) + 'px';
                } else if (target.classList.contains('e-resize')) {
                    newWidth = Math.max(e.pageX - firstPoint.x + width, minWidth);
                } else if (target.classList.contains('sw-resize')) {
                    newWidth = Math.max(firstPoint.x - e.pageX + width, minWidth);
                    newHeight = Math.max(e.pageY - firstPoint.y + height, minHeight);
                    const currentX = width - newWidth + firstPoint.x;
                    win.style.left = (currentX - offset.x) + 'px';
                } else if (target.classList.contains('s-resize')) {
                    newHeight = Math.max(e.pageY - firstPoint.y + height, minHeight);
                } else if (target.classList.contains('se-resize')) {
                    newHeight = Math.max(e.pageY - firstPoint.y + height, minHeight);
                    newWidth = Math.max(e.pageX - firstPoint.x + width, minWidth);
                }
                win.style.width = newWidth + 'px';
                win.style.height = newHeight + 'px';
            }
        });
        const removeWindow = () => {
            win.parentNode.removeChild(win);
        };
        listen(win.querySelector('.close'), 'click', removeWindow);

        const currentActive = document.querySelector('.window.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }
        win.classList.add('active');
        document.body.appendChild(win);

        return win;
    };

    app.makeWindow = makeWindow;
}
