/* global chrome */
{
    window.app = {
        defaultBackgrounds: [
            'backgrounds/aurora-borealis.png',
            'backgrounds/beach.png',
            'backgrounds/clouds.png',
            'backgrounds/kitten.png',
            'backgrounds/lizard.png',
            'backgrounds/micro.png',
            'backgrounds/mountain.png',
            'backgrounds/plant.png'
        ]
    };
    const app = window.app;
    app.util = window.util;
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, setBackgroundStylesFromMode, updateBackground,
        getBackground, getNextBgInCycle, getBgImageFromDB, loadImage, sleep, loadData, debounce,
        loadUserBackgrounds, getBackgroundImage, promisify, diffRender, rerollSubredditRandomizerBG} = app.util;

    app.getBookmarkTree = promisify(chrome.bookmarks.getTree);
    app.getBookmarks = promisify(chrome.bookmarks.get);
    app.getBookmarkChildren = promisify(chrome.bookmarks.getChildren);

    // for debugging
    // {
    //     const oldSend = chrome.runtime.sendMessage;
    //     chrome.runtime.sendMessage = (...args) => {
    //         console.log('sending message!', args);
    //         oldSend(...args);
    //     };
    // }

    app.desktop = document.getElementById('desktop');
    app.desktopBackground = document.getElementById('desktopBackground');

    // load in localStorage data...
    const data = loadData(false);
    app.data = data;

    const now = Date.now();
    if (!localStorage.lastRotation) {
        localStorage.lastRotation = now;
    }
    if (!localStorage.lastBgId) {
        localStorage.lastBgId = data.background.id;
    }
    if (!localStorage.defaultBgsCollapsed) {
        localStorage.defaultBgsCollapsed = false;
    }
    if (!localStorage.userBgsCollapsed) {
        localStorage.userBgsCollapsed = false;
    }

    const rotateMs = data.rotateMinutes * 60 * 1000;
    const lastRotation = localStorage.lastRotation;
    let didBgRotation = false;
    if ((now - lastRotation) > rotateMs) {
        localStorage.lastRotation = now;
        const nextBg = getNextBgInCycle(localStorage.lastBgId, data.backgrounds, data.random);
        if (nextBg) {
            didBgRotation = true;
            data.background = nextBg;
            localStorage.lastBgId = nextBg.id;
        }
    }

    let userImagesDidLoad;
    app.afterUserImagesLoaded = new Promise((res) => {
        userImagesDidLoad = res;
    });

    app.loadingSpinner = document.getElementById('loading');

    app.saveData = () => {
        app.data.icons = {};
        app.data.locations = {};
        app.desktop.children.forEach((child) => {
            if (child.classList.contains('bookmark')) {
                const left = parseInt(child.style.left);
                const top = parseInt(child.style.top);
                const x = (left - GUTTER) / (ICON_WIDTH + ICON_SPACING);
                const y = (top - GUTTER) / (ICON_HEIGHT + ICON_SPACING);
                app.data.icons[child.dataset.id] = {x, y};
                app.data.locations[`${x},${y}`] = child.dataset.id;
            }
        });
        localStorage.data = JSON.stringify(app.data);
        if (app.sendSyncEventAfterSave) {
            app.sendSyncEventAfterSave = false;
            chrome.runtime.sendMessage({action: 'reload'});
        }
    };

    let firstRender = true;
    async function render() {
        const bookmarkTree = await app.getBookmarkTree();
        const root = bookmarkTree[0];
        const rootChildren = root.children;

        const promises = [];
        const rootChildrenIds = [];
        // Create top level icons on "desktop"
        rootChildren.forEach((rNode) => {
            if (rNode.id === '1' && localStorage.hideBookmarksBarBookmarks === '1') {
                return; // don't render "bookmarks bar" bookmarks.
            }
            rNode.children.forEach((node) => {
                promises.push(app.makeBookmarkIcon(node, true));
            });
            rootChildrenIds.push(rNode.id);
        });
        app.rootChildrenIds = rootChildrenIds;
        Promise.all(promises).then((bookmarks) => {
            diffRender(bookmarks, app.desktop, !firstRender);
            app.saveData();
            firstRender = false;
        });
        const windows = document.querySelectorAll('.window');
        windows.forEach((win) => {
            if (win.dataset.type === 'folder') {
                app.openFolder(win.dataset.id, null, {window: win});
            }
        });
    }
    app.render = render;

    app.debouncedRender = debounce(() => {
        if (!app.ignoreNextRender) {
            app.render();
        }
        app.ignoreNextRender = false;
    }, 100);
    ['onCreated', 'onImportEnded', 'onMoved', 'onRemoved', 'onChanged'].forEach((eventName) => {
        chrome.bookmarks[eventName].addListener(app.debouncedRender);
    });

    const messageActions = {
        async reload() {
            const lastBG = app.data.background;
            app.data = await loadData();
            app.debouncedRender();
            // if there is a bg swap, pretend we didnt switch yet.
            app.data.background = lastBG;
            const newBg = getBackground(localStorage.lastBgId);
            if (newBg) {
                updateBackground(newBg);
            }
        },
        newIcon(msgObj) {
            // some tab added a new icon... when this tab renders it for the first time, place it in the right spot.
            app.newIcon = msgObj.data;
            app.debouncedRender();
        },
        syncDoc(msgObj) {
            const win = document.querySelector(`.window[data-id="${msgObj.id}"]`);
            if (win.dataset.type === 'document') {
                app.syncEditorData(msgObj.id, win);
            }
        }
    };

    chrome.runtime.onMessage.addListener(async (msgObj) => {
        const actionFunc = messageActions[msgObj.action];
        if (actionFunc) {
            actionFunc(msgObj);
        }
    });

    let currentBG = data.background;
    if (currentBG && currentBG.color) {
        document.getElementById('loadFadeIn').style.background = currentBG.color;
    }

    const loadBG = async () => {
        currentBG = data.background;
        if (currentBG.type === 'subredditRandomizer' && didBgRotation) {
            await rerollSubredditRandomizerBG(currentBG);
            localStorage.lastBgSrc = currentBG.image;
            localStorage.data = JSON.stringify(app.data);
        }
        if (!currentBG.default && currentBG.type === 'image') {
            await getBgImageFromDB(currentBG.id);
        }
        const imgUrl = getBackgroundImage(currentBG.id);

        app.desktopBackground.style.backgroundImage = `linear-gradient(${currentBG.filter}, ${currentBG.filter}), ` +
            `url(${imgUrl}), linear-gradient(${currentBG.color}, ${currentBG.color})`;
        setBackgroundStylesFromMode(app.desktopBackground, currentBG.mode);

        // wait till the image is loaded before we reveil
        await loadImage(imgUrl, false);
        const fadeIn = document.getElementById('loadFadeIn');
        fadeIn.style.opacity = 0;

        await sleep(500);
        fadeIn.parentNode.removeChild(fadeIn);

        // load all other images
        await loadUserBackgrounds();
        userImagesDidLoad();
        app.reopenWidgets();
    };
    // get that bg loadin'
    loadBG();
}
