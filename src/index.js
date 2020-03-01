/* global chrome, app */
{
    const { DOUBLE_CLICK_SPEED, getParentElementWithClass, updateBackground, throttle, removeNewNodeId,
        getBackground, triggerBackgroundChange } = app.util;

    // Start checking if we need to switch backgrounds.
    setInterval(async () => {
        const now = Date.now();
        const rotateMs = app.data.rotateMinutes * 60 * 1000;
        const lastRotation = localStorage.lastRotation;
        if ((now - lastRotation) > rotateMs) {
            triggerBackgroundChange();
            return;
        }
        const lastId = localStorage.lastBgId;
        const lastBgSrc = localStorage.lastBgSrc;
        const lastBg = getBackground(lastId);
        const isSubredditRandomizer = (lastBg || {}).type === 'subredditRandomizer';
        if (lastId !== app.data.background.id || (isSubredditRandomizer && lastBg.image !== lastBgSrc)) {
            if (isSubredditRandomizer) {
                lastBg.image = lastBgSrc;
            }
            // as tabs race to update their background, (hopefully) the losers end up here.
            if (lastBg) {
                updateBackground(lastBg, isSubredditRandomizer);
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
