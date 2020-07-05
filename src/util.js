/* global idbKeyval, app */
{
    (['forEach', 'map', 'find', 'findIndex', 'includes', 'filter', 'slice']).forEach((func) => {
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

        data.backgrounds.forEach(bg => {
            bg.type = bg.type || 'image';
        });

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
            type: 'image',
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
            img.onload = () => res(img);
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
            return bg.image || backgroundId2ObjectUrl[bgId];
        }
    };

    util.loadUserBackgrounds = (data = app.data) => {
        return Promise.all(data.backgrounds.map((bg) => {
            if (bg.default || bg.type === 'subredditRandomizer' || backgroundId2ObjectUrl[bg.id]) {
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
        const targetDisplay = el.dataset.display || 'block';
        if (el.style.display !== targetDisplay) {
            el.style.display = targetDisplay;
            return true;
        }
        return false;
    };

    util.hide = (el) => {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
            return true;
        }
        return false;
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

    const iconObjectUrlCache = {};
    util.getIconObjectUrl = async bookmark => {
        if (iconObjectUrlCache[bookmark.id]) {
            return iconObjectUrlCache[bookmark.id];
        }
        let icon;
        try {
            const iconBlob = await idbKeyval.get(bookmark.id);
            if (iconBlob) {
                icon = URL.createObjectURL(iconBlob);
            }
        } catch (e) {
            return null;
        }
        iconObjectUrlCache[bookmark.id] = icon;
        return icon;
    };

    util.clearIconObjectUrlCacheForId = id => {
        delete iconObjectUrlCache[id];
    };

    util.getBookmarkIcon = async bookmark => {
        const isDocument = app.isValidDocument(bookmark.url);
        const folder = bookmark.url === undefined;
        let icon = util.getFaviconImageUrl(bookmark.url);
        if (folder) {
            icon = util.folderImage;
        }
        if (isDocument) {
            icon = util.documentImage;
        }
        icon = await util.getIconObjectUrl(bookmark) || icon;
        return icon;
    };

    let bookmarkHistory = JSON.parse(localStorage.bookmarkHistory || '[]');
    util.addToBookmarkHistory = bookmark => {
        bookmarkHistory = bookmarkHistory.filter(bm => bm.url !== bookmark.url || bm.title !== bookmark.title);
        bookmarkHistory.unshift({ title: bookmark.title, url: bookmark.url });
        while (bookmarkHistory.length > 10) {
            bookmarkHistory.pop();
        }
        localStorage.bookmarkHistory = JSON.stringify(bookmarkHistory);
    };

    util.getBookmarkHistory = () => bookmarkHistory;

    util.pad = (str, length, pad = '0') => {
        while (str.length < length) {
            str = pad + str;
        }
        return str;
    };

    util.triggerBackgroundChange = async () => {
        localStorage.lastRotation = Date.now();
        const nextBg = util.getNextBgInCycle(localStorage.lastBgId, app.data.backgrounds, app.data.random);
        if (nextBg) {
            const isSubredditRandomizer = nextBg.type === 'subredditRandomizer';
            if (isSubredditRandomizer) {
                await util.rerollSubredditRandomizerBG(nextBg);
            }
            await util.updateBackground(nextBg, isSubredditRandomizer);
            app.saveData();
            if (isSubredditRandomizer && app.rerenderDesktopProperties) {
                app.rerenderDesktopProperties();
            }
        }
    };

    util.updateBackground = async (bg, forceFadeIn = false) => {
        const imgUrl = util.getBackgroundImage(bg.id);
        if (!imgUrl) {
            return;
        }
        localStorage.lastBgSrc = imgUrl;
        if (app.data.background.id !== bg.id || forceFadeIn) {
            app.data.background = util.getBackground(bg);
            localStorage.lastRotation = Date.now();
            localStorage.lastBgId = bg.id;

            const temp = document.createElement('div');
            temp.className = 'tempBG';
            await util.loadImage(imgUrl); // not sure this is helping...
            temp.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${imgUrl}), linear-gradient(${bg.color}, ${bg.color})`;
            util.setBackgroundStylesFromMode(temp, bg.mode);

            document.body.insertBefore(temp, app.desktopBackground);
            temp.offsetWidth; // wait till next bg is fully ready to fade in.
            temp.style.opacity = 1;
            await util.sleep(400);

            // Replace the old background element. This prevents some flickering.
            app.desktopBackground.remove();
            temp.id = 'desktopBackground';
            temp.className = 'desktopBackground';
            app.desktopBackground = temp;
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
            } catch (e) {}
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
        element.addEventListener('keydown', (e) => {
            if (e.keyCode === 13) {
                fn(e);
            }
        });
    };

    util.isUserInteractingWithForm = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement.nodeName) ||
        document.activeElement.contentEditable === 'true';

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

    util.semverIsBigger = (verA, verB) => {
        verA = verA.split('.');
        verB = verB.split('.');
        const majorEqual = verA[0] === verB[0];
        return verA[0] > verB[0] || (majorEqual && verA[1] > verB[1]) ||
            (majorEqual && verA[1] === verB[1] && verA[2] > verB[2]);
    };

    util.htmlEscape = (str) => {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return String(str).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
    };

    const markupToElementDiv = document.createElement('div');
    util.markupToElement = (html) => {
        markupToElementDiv.innerHTML = html;
        return markupToElementDiv.children[0];
    };

    util.fetchRedditImages = async (subreddits, options = {}) => {
        const section = options.section || 'hot'; // 'hot', 'new', 'rising', 'controversial', 'top', 'gilded'
        const limit = options.limit || 100;
        const time = options.time || 'day'; // 'hour', 'day', 'week', 'month', 'year', 'all'
        const sort = options.sort || 'top';
        const imageOrientation = options.imageOrientation || 'any';
        const redditData = await fetch(`https://www.reddit.com/r/${subreddits.join('+')}/${section}.json?sort=${sort}&t=${time}&limit=${limit}`)
            .then(r => r.json()).catch(() => null);
        const identity = a => a;
        const domainMapFunctions = {
            'https://i.redd.it': identity,
            'https://i.imgur.com': identity,
            'https://imgur.com': url => url.replace('https://imgur.com/', 'https://i.imgur.com/') + '.jpg'
        };
        const allowedDomains = Object.keys(domainMapFunctions);

        if (redditData && redditData.data) {
            const allImages = (redditData.data.children || []).filter(c => {
                const data = c.data || {};
                const url = data.url || '';
                const allowed = allowedDomains.some(d => {
                    if (url.startsWith(d)) {
                        data.url = domainMapFunctions[d](url);
                        return true;
                    }
                    return false;
                });
                return allowed && (options.nsfw || (!data.over_18 && data.thumbnail !== 'nsfw'));
            });
            let filteredImages = allImages;
            if (imageOrientation === 'landscape') {
                filteredImages = allImages.filter(c => {
                    const imageInfo = util.get(c, 'data.preview.images.0.source');
                    return imageInfo && imageInfo.width >= imageInfo.height;
                });
            } else if (imageOrientation === 'portrait') {
                filteredImages = allImages.filter(c => {
                    const imageInfo = util.get(c, 'data.preview.images.0.source');
                    return imageInfo && imageInfo.width <= imageInfo.height;
                });
            }
            if (filteredImages.length === 0) {
                filteredImages = allImages;
            }
            return filteredImages.map(c => {
                const data = c.data || {};
                return {
                    url: data.url || '',
                    title: data.title || '',
                    link: `https://reddit.com${data.permalink}`
                };
            });
        }
        return [];
    };

    util.rerollSubredditRandomizerBG = async bgOrId => {
        const bg = util.getBackground(bgOrId.id || bgOrId);
        if (bg.type !== "subredditRandomizer" || !bg.subreddits) {
            return;
        }
        const images = await util.fetchRedditImages(bg.subreddits, bg.redditOptions);

        if (images.length) {
            const randomImage = images[util.randomInt(0, images.length - 1)];
            bg.image = randomImage.url;
            bg.redditOptions.title = randomImage.title;
            bg.redditOptions.link = randomImage.link;
            localStorage.lastBgSrc = bg.image;
            if (bg.smartFit) {
                const img = await util.loadImage(bg.image);
                const screenIsWide = window.innerWidth > window.innerHeight;
                const imageIsWide = img.width > img.height;
                bg.mode = screenIsWide !== imageIsWide ? 'fit' : 'fill';
            }
        }
    };

    util.get = (obj, path, def) => {
        const pathParts = path.split('.');
        let current = obj;
        for (let x = 0; x < pathParts.length && current; x++) {
            current = current[pathParts[x]];
        }
        return current !== undefined ? current : def;
    };

    window.util = util;
}
