/* global app */
{
    const {getUiElements} = app.util;
    const {saveBrowserSyncData} = app.backup;

    const rememberWidgets = () => {
        let windowEls = document.querySelectorAll('.window.widget');
        const activeWin = document.querySelector('.window.widget.active');
        if (activeWin) {
            // make the active window last so it shows up in front.
            windowEls = windowEls.filter((win) => !win.classList.contains('active'));
            windowEls.push(activeWin);
        }
        const windows = windowEls.map((win) => {
            return {
                url: win.querySelector('iframe').src,
                x: win.offsetLeft,
                y: win.offsetTop,
                width: win.offsetWidth,
                height: win.offsetHeight
            };
        });
        localStorage.widgets = JSON.stringify(windows);
        saveBrowserSyncData();
    };

    const createWidget = (url, x, y, width = 400, height = 412, remember = true) => {
        if (!url.match(/.+\:\/\//) && !url.startsWith('./')) {
            url = 'http://' + url;
        }
        const win = app.makeWindow('', x, y, width, height);
        win.dataset.type = 'widget';
        win.classList.add('widget');

        const winUi = getUiElements(win);

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loadingWidget';
        loadingDiv.textContent = 'Loading Widget...';
        winUi.content.appendChild(loadingDiv);

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 0;
        iframe.style.opacity = 0;
        iframe.style.position = 'absolute';
        iframe.onload = () => {
            iframe.style.opacity = 1;
            winUi.content.removeChild(loadingDiv);
            iframe.style.position = 'static';
            iframe.onload = null;
        };

        winUi.content.appendChild(iframe);
        winUi.navContainer.style.display = 'none';

        if (remember) {
            rememberWidgets();
        }
    };

    const reopenWidgets = () => {
        const widgets = JSON.parse(localStorage.widgets || '[]');
        widgets.forEach((widget) => {
            createWidget(widget.url, widget.x, widget.y, widget.width, widget.height, false);
        });
    };

    let mouseDown = false;
    let lockedIframes = false;
    window.addEventListener('mousedown', () => {
        mouseDown = true;
    });

    window.addEventListener('mousemove', () => {
        if (mouseDown && !lockedIframes) {
            document.querySelectorAll('iframe').forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });
            lockedIframes = true;
        }
    });

    window.addEventListener('mouseup', () => {
        mouseDown = false;
        if (lockedIframes) {
            document.querySelectorAll('iframe').forEach(iframe => {
                iframe.style.pointerEvents = 'all';
            });
            lockedIframes = false;
        }
    });

    app.createWidget = createWidget;
    app.rememberWidgets = rememberWidgets;
    app.reopenWidgets = reopenWidgets;
    app.widgetPromptMarkup = `
        <div>
            <div>A widget is a webpage that shows up on the desktop.</div>
            <p>Default Widgets:</p>
            <div class="defaultWidgets">
                <img src="widgets/clock/icon.png" data-url="./widgets/clock/index.html" title="Clock">
                <img src="widgets/reddit/icon.png" data-url="./widgets/reddit/index.html" title="Reddit">
            </div>
        </div>
    `;
}
