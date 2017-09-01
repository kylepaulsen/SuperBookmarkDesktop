/* global idbKeyval */
{
    (['forEach', 'map', 'find']).forEach((func) => {
        NodeList.prototype[func] = Array.prototype[func];
        HTMLCollection.prototype[func] = Array.prototype[func];
    });

    // These are special utils that need to exist right away.
    window.util = {
        sleep(ms) {
            return new Promise((res) => setTimeout(res, ms));
        },
        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        },
        setBackgroundStylesFromMode(el, mode) {
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
        },
        getNextBgInCycle(currentId, arr, random = false) {
            const selectedBgs = arr.filter((bg) => bg.selected);
            if (selectedBgs.length === 0) {
                return false;
            }
            const idx = Math.max(selectedBgs.findIndex((el) => currentId === el.id), 0);
            if (random) {
                let randIndex;
                do {
                    randIndex = window.util.randomInt(0, selectedBgs.length - 1);
                } while (randIndex === idx);
                return selectedBgs[randIndex];
            }
            return selectedBgs[(idx + 1) % selectedBgs.length];
        },
        createBG(id, url, isDefault = false) {
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
        },
        loadImage(src, mustLoad = true) {
            return new Promise((res, rej) => {
                const img = new Image();
                img.onload = res;
                img.onerror = mustLoad ? rej : res;
                img.src = src;
            });
        },
        async getBgImageFromDB(bg) {
            const blob = await idbKeyval.get(bg.id);
            bg.image = URL.createObjectURL(blob);
            return bg.image;
        }
    };
}
