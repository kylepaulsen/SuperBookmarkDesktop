/* global app */
{
    const listen = (el, type, func) => {
        el.addEventListener(type, func, false);
    };

    const instanceTemplate = (template) => {
        const container = document.createElement('div');
        container.innerHTML = template;
        return container.children[0];
    };

    const makeWindow = (title, x = 0, y = 0, width = 550, height = 400, options = {}) => {
        const minWidth = 150;
        const minHeight = 150;
        const template = `
            <div class="window">
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
                <div class="window-top-nav" data-id="navContainer">
                    <div class="w-resize top-resize"></div>
                    <div class="nav-bar" data-id="navBar"></div>
                    <div class="e-resize top-resize"></div>
                </div>
                <div class="window-middle">
                    <div class="w-resize"></div>
                    <div class="content" data-id="content"></div>
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

        x = Math.max(x, 0);
        y = Math.max(y, 0);
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.left = x + 'px';
        win.style.top = y + 'px';

        const offset = {};
        const firstPoint = {};
        let mouseDown = false;
        let updatedWindow = false;
        let target;
        listen(win, 'mousedown', (e) => {
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
            if (mouseDown) {
                win.style.left = Math.max(win.offsetLeft, 0) + 'px';
                win.style.top = Math.max(win.offsetTop, 0) + 'px';
                if (updatedWindow) {
                    app.rememberOpenWindows();
                    if (win.dataset.type === 'widget') {
                        app.rememberWidgets();
                    }
                }
            }
            mouseDown = false;
            updatedWindow = false;
        });

        listen(window, 'mousemove', (e) => {
            if (mouseDown) {
                if (titleBar.contains(target)) {
                    win.style.left = e.pageX - offset.x + 'px';
                    win.style.top = e.pageY - offset.y + 'px';
                    updatedWindow = true;
                }

                let newWidth = width;
                let newHeight = height;
                let updatedSize = true;
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
                } else {
                    updatedSize = false;
                }
                updatedWindow = updatedWindow || updatedSize;
                win.style.width = newWidth + 'px';
                win.style.height = newHeight + 'px';
            }
        });
        const removeWindow = () => {
            const closeFunc = () => {
                win.parentNode.removeChild(win);
                app.rememberOpenWindows();
                if (win.dataset.type === 'widget') {
                    app.rememberWidgets();
                }
            };
            if (options.beforeClose) {
                options.beforeClose(closeFunc);
            } else {
                closeFunc();
            }
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
