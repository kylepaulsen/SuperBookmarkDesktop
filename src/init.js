/* global chrome, idbKeyval */
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
    const {ICON_WIDTH, ICON_HEIGHT, ICON_SPACING, GUTTER, setBackgroundStylesFromMode, updateBackground, getBackground,
        getNextBgInCycle, getBgImageFromDB, loadImage, sleep, loadData, debounce, loadUserBackgrounds,
        getBackgroundImage, promisify, diffRender, remoteApiBGFunctions, markupToElement, getUiElements} = app.util;

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
    };

    let firstRender = true;
    const render = async () => {
        if (app.ignoreNextRender) {
            app.ignoreNextRender = false;
            return;
        }
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
    };
    app.render = render;

    app.debouncedRender = debounce(app.render, 100);
    ['onCreated', 'onImportEnded', 'onMoved', 'onRemoved', 'onChanged'].forEach((eventName) => {
        chrome.bookmarks[eventName].addListener(app.debouncedRender);
    });

    const messageActions = {
        async reload() {
            const lastBG = app.data.background;
            app.data = await loadData();
            app.render();
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
    app.messageActions = messageActions;

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

    const checkOriginPermissions = async () => {
        const wallhavenOrigin = 'https://wallhaven.cc/';
        const hasEnabledWallhavenBG = data.backgrounds.some(bg => bg.subType === 'wallhavenRandomizer' && bg.selected);
        if (hasEnabledWallhavenBG) {
            const hasWallhavenApiAccess = await chrome.permissions.contains({
                origins: [wallhavenOrigin]
            });
            if (!hasWallhavenApiAccess) {
                const msgContainer = markupToElement(`<div>You are using a wallhaven randomizer background, but this ` +
                    `browser doesn't have permission to access the wallhaven API.<br>` +
                    `<span style="color: #4D90FE; font-weight: 500">Click here to grant permission.</span></div>`);
                msgContainer.style.cursor = 'pointer';
                let toast;
                msgContainer.addEventListener('click', async () => {
                    toast.remove();
                    const granted = await chrome.permissions.request({
                        origins: [wallhavenOrigin]
                    });
                    if (!granted) {
                        app.confirm(`Failed to get permission. Your wallhaven backgrounds won't reroll properly.`);
                    }
                });
                toast = app.toast(msgContainer, { duration: 15000 });
            }
        }
    };

    const checkForLegacyBackground = () => {
        if (currentBG.subType === 'subredditRandomizer' && !localStorage.ignoreSubredditRandomizerWarning) {
            const msgContainer = markupToElement(`<div>This background won't reroll properly anymore.<br><br><span style="color: #4D90FE; font-weight: 500">Click here to learn more.</span></div>`);
            msgContainer.style.cursor = 'pointer';
            let toast;
            msgContainer.addEventListener('click', async () => {
                toast.remove();
                const modalContent = markupToElement(`<div><h2>Why are subreddit randomizer backgrounds not rerolling?</h2>Reddit recently removed open access to their JSON APIs. As a result, subreddit randomizer backgrounds won't reroll properly anymore causing you to see the same background indefinitely. If this doesn't bother you, then click "Permanently Dismiss" below. Otherwise it's recommended that you delete all subreddit randomizer backgrounds in <button class="linkBtn" data-id="openBackgroundPropertiesBtn">background properties</button>.<br>On the bright side, you can now make Wallhaven randomizers which behave similarly.</div>`);
                const modalUi = getUiElements(modalContent);
                modalUi.openBackgroundPropertiesBtn.addEventListener('click', () => {
                    modalContent.closest('.modal').querySelector('[data-value="close"]').click();
                    app.openDesktopProperties();
                });
                const result = await app.confirm(
                    modalContent,
                    [{ text: 'Permanently Dismiss', value: 'permaDismiss' }, { text: 'Close', default: true, value: 'close' }],
                    { large: true }
                );
                if (result === 'permaDismiss') {
                    localStorage.ignoreSubredditRandomizerWarning = true;
                }
            });
            toast = app.toast(msgContainer, { duration: 10000 });
        }
    };

    const loadBG = async () => {
        currentBG = data.background;
        if (currentBG.type === 'remoteApi' && didBgRotation) {
            const rerollFunc = remoteApiBGFunctions[currentBG.subType]?.rerollBg;
            if (rerollFunc) {
                await rerollFunc(currentBG);
            } else {
                console.warn('No reroll function for', currentBG.subType);
            }
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
        checkOriginPermissions();
        checkForLegacyBackground();
    };
    // get that bg loadin'
    loadBG();

    // it's possible for bookmarks to be deleted outside of SBD, so custom icons can be orphaned.
    const cleanOrphanedCustomIcons = async () => {
        const bookmarkTree = await app.getBookmarkTree();
        const allBookmarkIds = { 0: true };
        const traverseBookmarkTree = (node) => {
            if (node.children) {
                node.children.forEach((child) => {
                    allBookmarkIds[child.id] = true;
                    traverseBookmarkTree(child);
                });
            }
        };
        traverseBookmarkTree(bookmarkTree[0]);

        const dbKeys = await idbKeyval.keys();
        dbKeys.forEach((key) => {
            if (!key.startsWith('b') && !allBookmarkIds[key]) {
                idbKeyval.delete(key);
            }
        });
    };
    setTimeout(cleanOrphanedCustomIcons, 100);
}
