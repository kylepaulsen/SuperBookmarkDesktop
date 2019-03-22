/* global chrome, app */
{
    const { DOUBLE_CLICK_SPEED, getParentElementWithClass, updateBackground, getNextBgInCycle,
        throttle, removeNewNodeId, getBackground} = app.util;

    // Start checking if we need to switch backgrounds.
    setInterval(() => {
        const lastRotation = localStorage.lastRotation;
        const now = Date.now();
        if ((now - lastRotation) > app.data.rotateMinutes * 60 * 1000) {
            const nextBg = getNextBgInCycle(localStorage.lastBgId, app.data.backgrounds, app.data.random);
            if (nextBg) {
                updateBackground(nextBg);
                app.saveData();
            }
            localStorage.lastRotation = now;
        }
        if (localStorage.lastBgId !== app.data.background.id) {
            const newBg = getBackground(localStorage.lastBgId);
            if (newBg) {
                updateBackground(newBg);
            }
        }
    }, 3000);

    window.addEventListener('mousemove', throttle((e) => {
        const strobingBookmark = getParentElementWithClass(e.target, 'strobeHighlight', 4);
        if (strobingBookmark) {
            strobingBookmark.classList.remove('strobeHighlight');
            removeNewNodeId(strobingBookmark.dataset.id);
        }
    }, 200));

    const openJSLink = (bookmark) => {
        if (bookmark && bookmark.dataset && bookmark.dataset.url) {
            const url = bookmark.dataset.url;
            // If the user tries to open a js bookmarklet, this helps with that.
            if (url.startsWith('javascript:')) {
                chrome.tabs.create({url: url, active: false});
            }
        }
    };

    { // double click option for all normal bookmarks.
        let lastTime = 0;
        let lastTarget;
        window.addEventListener('click', (e) => {
            const target = getParentElementWithClass(e.target, 'bookmark');
            const now = Date.now();
            if (now - lastTime > DOUBLE_CLICK_SPEED || lastTarget !== target) {
                // single click
                if (target && localStorage.useDoubleClicks) {
                    e.preventDefault();
                    lastTime = now;
                } else {
                    openJSLink(target);
                    lastTime = 0;
                }
            } else {
                // double click!
                openJSLink(target);
                lastTime = 0;
            }
            lastTarget = target;
        });
    }

    // start rendering icons!
    app.makeHelpDocument().then(app.render);
}
