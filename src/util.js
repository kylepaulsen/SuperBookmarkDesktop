/* global idbKeyval, app */
{
    (['forEach', 'map', 'find', 'includes']).forEach((func) => {
        NodeList.prototype[func] = Array.prototype[func];
        HTMLCollection.prototype[func] = Array.prototype[func];
    });

    const util = {};

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

    util.sleep = (ms) => {
        return new Promise((res) => setTimeout(res, ms));
    };

    util.randomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
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

    util.getNextBgInCycle = (currentId, arr, random = false) => {
        const selectedBgs = arr.filter((bg) => bg.selected);
        if (selectedBgs.length === 0) {
            return false;
        }
        const idx = Math.max(selectedBgs.findIndex((el) => currentId === el.id), 0);
        if (random) {
            let randIndex;
            do {
                randIndex = util.randomInt(0, selectedBgs.length - 1);
            } while (randIndex === idx);
            return selectedBgs[randIndex];
        }
        return selectedBgs[(idx + 1) % selectedBgs.length];
    };

    util.createBG = (id, url, isDefault = false) => {
        let image = url;
        let realId = `bg${id}`;
        if (isDefault) {
            image = `backgrounds/${url}`;
            realId = `_bg${id}`;
        }
        return {
            id: realId,
            image,
            mode: 'fill',
            color: '#000000',
            filter: 'rgba(0,0,0,0)',
            default: isDefault,
            selected: true
        };
    };

    util.loadImage = (src, mustLoad = true) => {
        return new Promise((res, rej) => {
            const img = new Image();
            img.onload = res;
            img.onerror = mustLoad ? rej : res;
            img.src = src;
        });
    };

    util.getBgImageFromDB = async (bg) => {
        const blob = await idbKeyval.get(bg.id);
        bg.image = URL.createObjectURL(blob);
        return bg.image;
    };

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

    util.getDataset = (el) => {
        const obj = {};
        Object.keys(el.dataset).forEach((key) => {
            obj[key] = el.dataset[key];
            try {
                obj[key] = JSON.parse(el.dataset[key]);
            } catch(e) {}
        });
        return obj;
    };

    util.deselectAll = () => {
        document.querySelectorAll('.bookmark.selected').forEach((bookmark) => {
            bookmark.classList.remove('selected');
        });
    };

    util.findFreeSpotNear = (x, y, acceptableCollisions = {}) => {
        // does a spiral search starting from the center, then right, then down, then left, then up... etc.
        let dx = 1;
        let dy = 0;
        let stepsTillChange = 1;
        let currentStep = 0;
        while (x < 0 || y < 0 || (app.data.locations[`${x},${y}`] && !acceptableCollisions[`${x},${y}`])) {
            x += dx;
            y += dy;
            currentStep++;
            if (currentStep >= stepsTillChange) {
                currentStep = 0;
                if (dx === 1) {
                    dx = 0;
                    dy = 1;
                } else if (dy === 1) {
                    stepsTillChange++;
                    dx = -1;
                    dy = 0;
                } else if (dx === -1) {
                    dx = 0;
                    dy = -1;
                } else {
                    stepsTillChange++;
                    dx = 1;
                    dy = 0;
                }
            }
        }
        return {x, y};
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

    window.util = util;
}
