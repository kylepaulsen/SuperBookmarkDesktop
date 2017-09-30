{
    window.app = {
        defaultBackgrounds: [
            'aurora-borealis.png',
            'beach.png',
            'clouds.png',
            'kitten.png',
            'lizard.png',
            'micro.png',
            'mountain.png',
            'plant.png'
        ]
    };
    const app = window.app;
    app.util = window.util;
    const {setBackgroundStylesFromMode, getNextBgInCycle, getBgImageFromDB, loadImage,
        sleep, loadData} = app.util;

    app.desktop = document.getElementById('desktop');
    app.desktopBackground = document.getElementById('desktopBackground');

    // load in localStorage data...
    const data = loadData();
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

        app.desktopBackground.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image}),` +
            ` linear-gradient(${bg.color}, ${bg.color})`;
        setBackgroundStylesFromMode(app.desktopBackground, bg.mode);

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
