/* global idbKeyval, app */
{
    (['forEach', 'map', 'find', 'includes', 'filter', 'slice']).forEach((func) => {
        NodeList.prototype[func] = Array.prototype[func];
        HTMLCollection.prototype[func] = Array.prototype[func];
    });

    const util = {};

    util.GUTTER = 20;
    util.ICON_SPACING = 20;
    util.ICON_WIDTH = 80;
    util.ICON_HEIGHT = 90;

    util.DOUBLE_CLICK_SPEED = 500;

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

    let nextBgId = localStorage.nextBgId ? parseInt(localStorage.nextBgId) : undefined;
    const backgroundId2ObjectUrl = {};
    util.loadData = (loadImages = true) => {
        let data;
        try {
            data = JSON.parse(localStorage.data);
        } catch (e) {
            const backgrounds = app.defaultBackgrounds.map((bg) => util.createBG(bg, true));
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

        if (nextBgId === undefined) {
            // get max id
            let maxBgId = 0;
            data.backgrounds.forEach((bg) => {
                maxBgId = Math.max(parseInt(bg.id) + 1, maxBgId);
            });
            nextBgId = maxBgId;
            localStorage.nextBgId = nextBgId;
        }
        nextBgId = parseInt(localStorage.nextBgId);

        // Make sure all the default BGs are there, remove any that shouldnt be.
        const defaultBgs = data.backgrounds.filter((bg) => bg.default && app.defaultBackgrounds.includes(bg.image));
        const defaultBgsPaths = defaultBgs.map((bg) => bg.image);
        const defaultMissing = app.defaultBackgrounds.filter((bgPath) => !defaultBgsPaths.includes(bgPath)).map((bgPath) => {
            return util.createBG(bgPath, true);
        });
        const userBgs = data.backgrounds.filter((bg) => !bg.default);
        data.backgrounds = defaultBgs.concat(defaultMissing).concat(userBgs);

        // Seems pointless but This makes sure data.background points at one of our backgrounds in the list.
        const lastId = localStorage.lastBgId || (data.backgrounds[util.randomInt(0, data.backgrounds.length - 1)].id).toString();
        data.background = data.backgrounds.find((bg) => lastId === bg.id);
        if (!data.background) {
            const randIdx = util.randomInt(0, data.backgrounds.length - 1);
            localStorage.lastBgId = randIdx;
            data.background = data.backgrounds[randIdx];
        }

        if (loadImages) {
            return new Promise((res) => {
                util.loadUserBackgrounds(data).then(() => {
                    res(data);
                });
            });
        }

        return data;
    };

    util.createBG = (url, isDefault = false) => {
        const id = nextBgId !== undefined ? nextBgId : 0;
        nextBgId = id + 1;
        localStorage.nextBgId = nextBgId;
        return {
            id: id.toString(),
            image: url,
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

    util.getNextBgInCycle = (currentId, arr, random = false, mustReturnBg = false) => {
        const selectedBgs = arr.filter((bg) => bg.selected);
        if (selectedBgs.length === 0) {
            if (mustReturnBg) {
                return arr[util.randomInt(0, arr.length - 1)];
            } else {
                return false;
            }
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

    util.getBgImageFromDB = async (bgId) => {
        const blob = await idbKeyval.get('b' + bgId);
        const url = URL.createObjectURL(blob);
        backgroundId2ObjectUrl[bgId] = url;
        return url;
    };

    util.getBackgroundImage = (bgId) => {
        const bg = util.getBackground(bgId);
        if (bg.default) {
            return bg.image;
        } else {
            return backgroundId2ObjectUrl[bgId];
        }
    };

    util.loadUserBackgrounds = (data = app.data) => {
        return Promise.all(data.backgrounds.map((bg) => {
            if (bg.default || backgroundId2ObjectUrl[bg.id]) {
                return Promise.resolve();
            } else {
                return util.getBgImageFromDB(bg.id)
                    .then((url) => util.loadImage(url, false))
                    .catch(() => {
                        console.log('failed to load image!');
                        return Promise.resolve();
                    });
            }
        }));
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
        const imgUrl = util.getBackgroundImage(bg.id);
        if (app.data.background.id !== bg.id) {
            app.data.background = util.getBackground(bg);
            localStorage.lastRotation = Date.now();
            localStorage.lastBgId = bg.id;

            const temp = document.createElement('div');
            temp.className = 'tempBG';
            temp.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${imgUrl}), linear-gradient(${bg.color}, ${bg.color})`;
            util.setBackgroundStylesFromMode(temp, bg.mode);

            await util.loadImage(imgUrl);
            document.body.appendChild(temp);
            await util.sleep(0);
            temp.style.opacity = 1;
            await util.sleep(400);
            app.desktopBackground.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${imgUrl}), linear-gradient(${bg.color}, ${bg.color})`;
            util.setBackgroundStylesFromMode(app.desktopBackground, bg.mode);
            temp.parentElement.removeChild(temp);
        } else {
            app.data.background = util.getBackground(bg);
            app.desktopBackground.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${imgUrl}), linear-gradient(${bg.color}, ${bg.color})`;
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

    util.applyStylesheet = (css, id) => {
        let styleTag = document.getElementById(id);
        if (!styleTag) {
            styleTag = document.createElement('style');
            if (id) {
                styleTag.id = id;
            }
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = css;
    };

    util.getBackground = (idOrBack = '') => {
        const id = (idOrBack.id ? idOrBack.id : idOrBack).toString();
        return app.data.backgrounds.find((bg) => bg.id === id);
    };

    util.pointToGrid = (x, y) => {
        const iconW = util.ICON_WIDTH + util.ICON_SPACING;
        const iconH = util.ICON_HEIGHT + util.ICON_SPACING;
        return {
            x: Math.max(Math.floor((x - util.GUTTER) / iconW), 0),
            y: Math.max(Math.floor((y - util.GUTTER) / iconH), 0)
        };
    };

    util.findNextOpenSpot = () => {
        for (let x = 0; x < 12; x++) {
            for (let y = 0; y < 6; y++) {
                if (!app.data.locations[`${x},${y}`]) {
                    return {x, y};
                }
            }
        }
        let y = 6;
        while (y < 99999) {
            for (let x = 0; x < 12; x++) {
                if (!app.data.locations[`${x},${y}`]) {
                    return {x, y};
                }
            }
            y++;
        }
    };

    const insertAfter = (container, refNode, newNode) => {
        let realRef = refNode.nextSibling;
        if (!realRef) {
            container.appendChild(newNode);
        } else {
            container.insertBefore(newNode, realRef);
        }
    };

    // This function will only work on containers that have children with unique ids.
    util.diffRender = (topLevelChildren, container, select = false) => {
        const topLevelChildrenIdMap = {};
        topLevelChildren.forEach((child) => {
            topLevelChildrenIdMap[child.dataset.id] = child;
        });
        const containerChildren = container.children.slice();
        const containerChildrenIdMap = {};
        const putInOrder = (child, idx) => {
            let lastChild = topLevelChildren[idx - 1];
            if (lastChild) {
                lastChild = containerChildrenIdMap[lastChild.dataset.id];
                insertAfter(container, lastChild, child);
            } else {
                container.insertBefore(child, container.firstElementChild);
            }
            containerChildrenIdMap[child.dataset.id] = child;
        };

        containerChildren.forEach((child) => {
            const id = child.dataset.id;
            containerChildrenIdMap[id] = child;
            if (!topLevelChildrenIdMap[id]) {
                // remove nodes that don't show up in the new list
                container.removeChild(child);
            }
        });

        // update nodes that are dirty or add new nodes
        topLevelChildren.forEach((child, idx) => {
            const id = child.dataset.id;
            const existingChild = containerChildrenIdMap[id];
            if (existingChild) {
                if (child.outerHTML !== existingChild.outerHTML) {
                    // update dirty
                    putInOrder(child, idx);
                    container.removeChild(existingChild);
                }
            } else {
                // add new node
                putInOrder(child, idx);
                if (select) {
                    child.classList.add('selected');
                }
            }
        });
    };

    util.attachClickHandler = (element, fn) => {
        let lastTime = 0;
        let lastTarget;
        element.addEventListener('click', (e) => {
            const target = util.getParentElementWithClass(e.target, 'bookmark');
            const now = Date.now();
            if (now - lastTime > util.DOUBLE_CLICK_SPEED || lastTarget !== target) {
                // single click
                fn(e, false);
                lastTime = now;
            } else {
                // double click!
                fn(e, true);
                lastTime = 0;
            }
            lastTarget = target;
        });
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
