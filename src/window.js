HTMLElement.prototype.$ = HTMLElement.prototype.querySelector;

{
    const listen = (el, type, func) => {
        el.addEventListener(type, func, false);
    };

    const instanceTemplate = (template) => {
        const container = document.createElement('div');
        container.innerHTML = template;
        return container.children[0];
    };

    const makeWindow = (title) => {
        const minWidth = 150;
        const minHeight = 150;
        let width = 550;
        let height = 400;
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
                        <div class="title">Some Title</div>
                    </div>
                    <div class="e-resize top-resize"></div>
                </div>
                <div class="window-middle">
                    <div class="w-resize"></div>
                    <div class="content"></div>
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
        const titleBar = win.$('.title-bar');
        titleBar.$('.title').textContent = title;

        win.style.width = width + 'px';
        win.style.height = height + 'px';

        const offset = {};
        const firstPoint = {};
        let mouseDown = false;
        let target;
        listen(win, 'mousedown', (e) => {
            e.preventDefault();
            offset.x = e.pageX - win.offsetLeft;
            offset.y = e.pageY - win.offsetTop;
            width = win.offsetWidth - 2;
            height = win.offsetHeight - 2;
            firstPoint.x = e.pageX;
            firstPoint.y = e.pageY;
            mouseDown = true;
            target = e.target;
            const currentActive = $('.window.active');
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
                }
                if (target.classList.contains('n-resize')) {
                    newHeight = Math.max(firstPoint.y - e.pageY + height, minHeight);
                    const currentY = height - newHeight + firstPoint.y;
                    win.style.top = (currentY - offset.y) + 'px';
                }
                if (target.classList.contains('ne-resize')) {
                    newWidth = Math.max(e.pageX - firstPoint.x + width, minWidth);
                    newHeight = Math.max(firstPoint.y - e.pageY + height, minHeight);
                    const currentY = height - newHeight + firstPoint.y;
                    win.style.top = (currentY - offset.y) + 'px';
                }
                if (target.classList.contains('w-resize')) {
                    newWidth = Math.max(firstPoint.x - e.pageX + width, minWidth);
                    const currentX = width - newWidth + firstPoint.x;
                    win.style.left = (currentX - offset.x) + 'px';
                }
                if (target.classList.contains('e-resize')) {
                    newWidth = Math.max(e.pageX - firstPoint.x + width, minWidth);
                }
                if (target.classList.contains('sw-resize')) {
                    newWidth = Math.max(firstPoint.x - e.pageX + width, minWidth);
                    newHeight = Math.max(e.pageY - firstPoint.y + height, minHeight);
                    const currentX = width - newWidth + firstPoint.x;
                    win.style.left = (currentX - offset.x) + 'px';
                }
                if (target.classList.contains('s-resize')) {
                    newHeight = Math.max(e.pageY - firstPoint.y + height, minHeight);
                }
                if (target.classList.contains('se-resize')) {
                    newHeight = Math.max(e.pageY - firstPoint.y + height, minHeight);
                    newWidth = Math.max(e.pageX - firstPoint.x + width, minWidth);
                }

                win.style.width = newWidth + 'px';
                win.style.height = newHeight + 'px';
            }
        });
        listen(win.$('.close'), 'click', () => {
            win.parentNode.removeChild(win);
        });

        document.body.appendChild(win);
    };

    window.makeWindow = makeWindow;
}

// makeWindow('Some Window');
// makeWindow('Some Other Window');
