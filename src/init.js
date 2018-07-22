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
    const {setBackgroundStylesFromMode, getNextBgInCycle, getBgImageFromDB, loadImage,
        sleep, loadData, loadUserBackgrounds, getBackgroundImage} = app.util;

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

    const currentBG = data.background;
    app.loadingSpinner = document.getElementById('loading');

    const loadBG = async () => {
        if (!currentBG.default) {
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
