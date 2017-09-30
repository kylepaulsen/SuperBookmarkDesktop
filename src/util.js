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
    util.documentImage = 'icons/document.svg';

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

    util.loadData = () => {
        let data;
        try {
            data = JSON.parse(localStorage.data);
        } catch (e) {
            const backgrounds = app.defaultBackgrounds.map((bg, idx) => util.createBG(bg, idx, true));
            data = {
                icons: {},
                locations: {},
                backgrounds,
                background: undefined,
                rotateMinutes: 20,
                random: false
            };
        }
        const newNodeIds = JSON.parse(localStorage.newNodeIds || '{}');
        localStorage.newNodeIds = JSON.stringify(newNodeIds);

        // Just make sure default bgs are there.
        const userBgs = data.backgrounds.filter((bg) => !bg.id.startsWith('_'));
        data.backgrounds = app.defaultBackgrounds.map((bg, idx) => util.createBG(bg, idx, true)).concat(userBgs);

        // Seems pointless but This makes sure data.background points at one of our backgrounds in the list.
        const lastId = localStorage.lastBgId || data.backgrounds[util.randomInt(0, data.backgrounds.length - 1)].id;
        data.background = data.backgrounds.find((bg) => lastId === bg.id);
        return data;
    };

    let nextId;
    util.createBG = (url, id = 0, isDefault = false) => {
        if (app.data && nextId === undefined) {
            // get max id.
            app.data.backgrounds.forEach((bg) => {
                nextId = Math.max(bg.idNum + 1, nextId || 0);
            });
        }
        let image;
        let realId;
        if (isDefault) {
            image = `backgrounds/${url}`;
            realId = `_bg${id}`;
        } else {
            id = nextId;
            nextId++;
            image = url;
            realId = `bg${id}`;
        }
        return {
            id: realId,
            idNum: id,
            image,
            mode: 'fill',
            color: '#000000',
            filter: 'rgba(0,0,0,0)',
            default: isDefault,
            selected: true
        };
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
        if (random && selectedBgs.length > 1) {
            let randIndex;
            do {
                randIndex = util.randomInt(0, selectedBgs.length - 1);
            } while (randIndex === idx);
            return selectedBgs[randIndex];
        }
        return selectedBgs[(idx + 1) % selectedBgs.length];
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

    util.getParentElementWithClass = (el, classes, stepLimit = Infinity) => {
        if (typeof classes === 'string') {
            classes = [classes];
        }
        let steps = 0;
        const classesLen = classes.length;
        while (el && el.classList && steps < stepLimit) {
            for (let x = 0; x < classesLen; x++) {
                if (el.classList.contains(classes[x])) {
                    return el;
                }
            }
            el = el.parentElement;
            steps++;
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

    util.pad = (str, length, pad = '0') => {
        while (str.length < length) {
            str = pad + str;
        }
        return str;
    };

    util.updateBackground = async (bg) => {
        if (app.data.background.id !== bg.id) {
            app.data.background = bg;
            localStorage.lastRotation = Date.now();
            localStorage.lastBgId = bg.id;

            const temp = document.createElement('div');
            temp.className = 'tempBG';
            temp.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image}), linear-gradient(${bg.color}, ${bg.color})`;
            util.setBackgroundStylesFromMode(temp, bg.mode);

            await util.loadImage(bg.image);
            document.body.appendChild(temp);
            await util.sleep(0);
            temp.style.opacity = 1;
            await util.sleep(400);
            app.desktopBackground.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image}), linear-gradient(${bg.color}, ${bg.color})`;
            util.setBackgroundStylesFromMode(app.desktopBackground, bg.mode);
            temp.parentElement.removeChild(temp);
        } else {
            app.data.background = bg;
            app.desktopBackground.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image}), linear-gradient(${bg.color}, ${bg.color})`;
            util.setBackgroundStylesFromMode(app.desktopBackground, bg.mode);
        }
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
        if (acceptableCollisions[`${x},${y}`]) {
            acceptableCollisions[`${x},${y}`] = false;
        }
        return {x, y};
    };

    util.addNewNodeId = (id) => {
        const nodes = JSON.parse(localStorage.newNodeIds || '{}');
        nodes[id] = 1;
        localStorage.newNodeIds = JSON.stringify(nodes);
    };

    util.removeNewNodeId = (id) => {
        const nodes = JSON.parse(localStorage.newNodeIds || '{}');
        delete nodes[id];
        localStorage.newNodeIds = JSON.stringify(nodes);
    };

    util.debounce = (fn, time) => {
        let timeout;
        return (...args) => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                fn.apply(null, args);
            }, time);
        };
    };

    util.throttle = (fn, time) => {
        let lastTime = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastTime > time) {
                lastTime = now;
                fn.apply(null, args);
            }
        };
    };

    const markupToElementDiv = document.createElement('div');
    util.markupToElement = (html) => {
        markupToElementDiv.innerHTML = html;
        return markupToElementDiv.children[0];
    };

    window.util = util;
}
