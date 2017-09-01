{
    window.app = {
        defaultBackgrounds: [
            'beach.png',
            'clouds.png',
            'fish.png',
            'kitten.png',
            'lizard.png',
            'mountain.png',
            'plant.png'
        ]
    };
    const app = window.app;
    app.util = window.util;
    const {randomInt, setBackgroundStylesFromMode, getNextBgInCycle, createBG,
        getBgImageFromDB, loadImage, sleep} = app.util;

    // load in localStorage data...
    let data;
    try {
        data = JSON.parse(localStorage.data);
    } catch (e) {
        const backgrounds = app.defaultBackgrounds.map((bg, idx) => createBG(idx, bg, true));
        data = {
            icons: {},
            locations: {},
            backgrounds,
            background: undefined,
            rotateMinutes: 20,
            random: false
        };
    }
    // Seems pointless but This makes sure data.background points at one of our backgrounds in the list.
    const lastId = localStorage.lastBgId || data.backgrounds[randomInt(0, data.backgrounds.length - 1)].id;
    data.background = data.backgrounds.find((bg) => lastId === bg.id);
    app.data = data;

    const now = Date.now();
    if (!localStorage.lastRotation) {
        localStorage.lastRotation = now;
    }
    if (!localStorage.lastBgId) {
        localStorage.lastBgId = data.background.id;
    }
    if (!localStorage.desktopBgsCollapsed) {
        localStorage.desktopBgsCollapsed = false;
    }
    if (!localStorage.userBgsCollapsed) {
        localStorage.userBgsCollapsed = false;
    }

    const lastRotation = localStorage.lastRotation;
    if ((now - lastRotation) > data.rotateMinutes * 60 * 1000) {
        const nextBg = getNextBgInCycle(localStorage.lastBgId, data.backgrounds, data.random);
        if (nextBg) {
            data.background = nextBg;
            localStorage.lastBgId = nextBg.id;
        }
        localStorage.lastRotation = now;
    }

    let userImagesDidLoad;
    app.afterUserImagesLoaded = new Promise((res) => {
        userImagesDidLoad = res;
    });

    const bg = data.background;
    app.loadingSpinner = document.getElementById('loading');

    const loadBG = async (bg) => {
        if (!bg.default) {
            await getBgImageFromDB(bg);
        }

        const desktop = document.getElementById('desktop');
        desktop.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}),` +
            ` url(${bg.image})`;
        setBackgroundStylesFromMode(desktop, bg.mode);
        document.body.style.background = bg.color;

        // wait till the image is loaded before we reveil
        await loadImage(bg.image, false);
        const fadeIn = document.getElementById('loadFadeIn');
        fadeIn.style.opacity = 0;

        await sleep(500);
        fadeIn.parentNode.removeChild(fadeIn);

        // load all other images
        Promise.all(data.backgrounds.filter((bg1) => {
            return !bg1.default && bg1 !== bg;
        }).map((bg) => {
            return getBgImageFromDB(bg).then(() => loadImage(bg.image, false));
        })).then(userImagesDidLoad);
    };
    // get that bg loadin'
    loadBG(bg);
}
