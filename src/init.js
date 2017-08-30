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
    const {randomInt, setBackgroundStylesFromMode, getNextBgInCycle} = app.util;

    // load in localStorage data...
    let data;
    try {
        data = JSON.parse(localStorage.data);
    } catch (e) {
        const backgrounds = app.defaultBackgrounds.map((bg, idx) => {
            return {
                id: `_bg${idx}`,
                image: `backgrounds/${bg}`,
                mode: 'fill',
                color: '#000000',
                filter: 'rgba(0,0,0,0)',
                default: true,
                selected: true
            };
        });
        const bg = backgrounds[randomInt(0, backgrounds.length - 1)];
        data = {
            icons: {},
            locations: {},
            backgrounds,
            background: bg,
            rotateMinutes: 20,
            random: false
        };
    }
    // Seems pointless but This makes sure data.background points at one of our backgrounds in the list.
    data.background = data.backgrounds.find((bg) => data.background.id === bg.id);
    app.data = data;

    const now = Date.now();
    if (!localStorage.lastRotation) {
        localStorage.lastRotation = now;
    }
    if (!localStorage.lastBgId) {
        localStorage.lastBgId = data.background.id;
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

    const bg = data.background;

    // get that bg loadin'
    const img = new Image();
    img.onload = () => {
        // initial fade in to avoid an ugly image load screen tear.
        const fadeIn = document.getElementById('loadFadeIn');
        fadeIn.style.opacity = 0;
        setTimeout(() => {
            fadeIn.parentNode.removeChild(fadeIn);
        }, 500);
    };
    img.src = bg.image;

    const desktop = document.getElementById('desktop');
    desktop.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}),` +
        ` url(${bg.image})`;
    setBackgroundStylesFromMode(desktop, bg.mode);

    document.body.style.background = bg.color;
}
