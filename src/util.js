/* global app */
{
    const util = app.util;

    util.GUTTER = 20;
    util.ICON_SPACING = 20;
    util.ICON_WIDTH = 80;
    util.ICON_HEIGHT = 90;

    util.folderImage = 'icons/folder.svg';

    const imageTypes = ['.jpg', '.jpeg', '.png', '.apng', '.gif', '.bmp', '.webp', '.ico', '.svg'];
    const fileInput = document.createElement('input');
    fileInput.className = 'hidden';
    fileInput.type = 'file';
    fileInput.setAttribute('accept', imageTypes.join(','));
    document.body.appendChild(fileInput);

    util.selectImageFromDisk = () => {
        fileInput.click();
        return new Promise((res) => {
            const onSelect = async (e) => {
                //util.show(app.loadingSpinner);
                //await util.sleep(300);
                const file = e.target.files && e.target.files[0];
                if (file && file.type.includes('image/')) {
                    const fr = new FileReader();
                    fr.onload = (e) => {
                        //util.hide(app.loadingSpinner);
                        res(new Blob([new Uint8Array(e.target.result)]));
                    };
                    fr.readAsArrayBuffer(file);
                }
                fileInput.value = '';
            };
            fileInput.onchange = onSelect;
        });
    };

    util.promisify = (fn, that = null) => {
        return function(...args) {
            return new Promise((res) => {
                args.push(res);
                fn.apply(that, args);
            });
        };
    };

    util.getParentElementWithClass = (el, classes) => {
        if (typeof classes === 'string') {
            classes = [classes];
        }
        const classesLen = classes.length;
        while (el && el.classList) {
            for (let x = 0; x < classesLen; x++) {
                if (el.classList.contains(classes[x])) {
                    return el;
                }
            }
            el = el.parentElement;
        }
        return false;
    };

    util.show = (el) => {
        el.style.display = el.dataset.display || 'block';
    };

    util.hide = (el) => {
        el.style.display = 'none';
    };

    util.getUiElements = (parentElement) => {
        const ui = {};
        parentElement.querySelectorAll('[data-id]').forEach((item) => {
            ui[item.dataset.id] = item;
        });
        return ui;
    };

    util.clampText = (el, text, ellipsis = ' ...') => {
        el.textContent = text;
        if (el.clientHeight === el.scrollHeight) {
            return text;
        }

        const range = [0, text.length];
        while (range[1] - range[0] > 1) {
            const tryIdx = Math.floor((range[1] + range[0]) / 2);
            el.textContent = text.substring(0, tryIdx) + ellipsis;
            if (el.clientHeight === el.scrollHeight) {
                range[0] = tryIdx; // still good.
            } else {
                range[1] = tryIdx; // overflow.
            }
        }
        const str = text.substring(0, range[0]) + ellipsis;
        el.textContent = str;
        return str;
    };

    util.getFaviconImageUrl = (url, size = 32) => {
        return `chrome://favicon/size/${size}/${url}`;
    };

    util.randomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    util.pad = (str, length, pad = '0') => {
        while (str.length < length) {
            str = pad + str;
        }
        return str;
    };

    util.setBackgroundStylesFromMode = (el, mode) => {
        if (mode === 'fill') {
            el.style.backgroundSize = 'cover';
            el.style.backgroundRepeat = 'no-repeat';
        } else if (mode === 'fit') {
            el.style.backgroundSize = 'contain';
            el.style.backgroundRepeat = 'no-repeat';
        } else if (mode === 'stretch') {
            el.style.backgroundSize = '100% 100%';
            el.style.backgroundRepeat = 'no-repeat';
        } else if (mode === 'tile') {
            el.style.backgroundSize = 'initial';
            el.style.backgroundRepeat = 'repeat';
        } else if (mode === 'center') {
            el.style.backgroundSize = 'initial';
            el.style.backgroundRepeat = 'no-repeat';
        }
    };

    util.updateBackground = (bg) => {
        app.desktop.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image})`;
        document.body.style.background = bg.color;
        util.setBackgroundStylesFromMode(app.desktop, bg.mode);
        app.data.background = bg;
        localStorage.lastRotation = Date.now();
        localStorage.lastBgId = bg.id;
    };

    util.fixBackgroundSize = () => {
        app.desktop.style.width = 'auto';
        app.desktop.style.height = 'auto';
        app.desktop.style.width = document.body.scrollWidth + 'px';
        app.desktop.style.height = document.body.scrollHeight + 'px';
    };

    util.debounce = (fn, time) => {
        let timeout;
        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                fn();
            }, time);
        };
    };

    const markupToElementDiv = document.createElement('div');
    util.markupToElement = (html) => {
        markupToElementDiv.innerHTML = html;
        return markupToElementDiv.children[0];
    };
}
