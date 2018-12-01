const tempEl = document.createElement('div');
const markupToElement = (html) => {
    tempEl.innerHTML = html;
    return tempEl.children[0];
};

const getUiElements = (parentElement) => {
    const ui = {};
    const els = parentElement.querySelectorAll('[data-ui]');
    for (let item of els) {
        ui[item.dataset.ui] = item;
    }
    return ui;
};

const fetchFeed = (subs = {all: true}, after) => new Promise(res => {
    const enabledSubs = Object.keys(subs).filter(sub => subs[sub]);
    let feedUrl = `https://www.reddit.com/r/${enabledSubs.join('+')}.json`;
    if (after) {
        feedUrl += '?after=' + after;
    }
    fetch(feedUrl).then(r => r.json()).then(res).catch(() => res(null));
});

const formatUpvotes = (upvotes) => {
    if (upvotes > 1000000) {
        return (upvotes / 1000000).toFixed(1) + 'M';
    } else if (upvotes > 100000) {
        return (upvotes / 1000).toFixed(0) + 'K';
    } else if (upvotes > 10000) {
        return (upvotes / 1000).toFixed(1) + 'K';
    }
    return upvotes;
};

const formatAge = (createdUTC) => {
    const diff = Date.now() - (createdUTC * 1000);
    const hours = Math.floor(diff / 1000 / 60 / 60);
    if (hours < 1) {
        return Math.floor(diff / 1000 / 60) + ' minutes old';
    } else if (hours < 24) {
        return hours + (hours === 1 ? ' hour old' : ' hours old');
    } else if (hours < 730) {
        const d = Math.floor(hours / 24);
        return d + (d === 1 ? ' day old' : ' days old');
    } else if (hours < 8760) {
        const m = Math.floor(hours / 730);
        return m + (m === 1 ? ' month old' : ' months old');
    }
    const y = Math.floor(hours / 8760);
    return y + (y === 1 ? ' year old' : ' years old');
};

const getUrl = (itemData) => {
    if (itemData.url.startsWith('https://v.redd.it')) {
        if (itemData.media) {
            const mediaSrcs = Object.keys(itemData.media);
            for (let x = 0; x < mediaSrcs.length; x++) {
                const url = itemData.media[mediaSrcs[x]].fallback_url;
                if (url) {
                    return url;
                }
            }
        }
        return `https://reddit.com/${itemData.permalink}`;
    }
    return itemData.url;
};

const ui = getUiElements(document);

const feedItemTemplate = `
    <div class="feedItem">
        <div class="img">
            <a href="" data-ui="imgLink" target="_blank">
                <img src="" data-ui="img">
            </a>
        </div>
        <div class="content">
            <div class="title">
                <a href="" data-ui="titleLink" target="_blank"></a>
            </div>
            <div class="info1">
                <div class="upvotes" data-ui="upvotes"></div>
                <div class="sub">
                    <a href="" data-ui="sub" target="_blank"></a>
                </div>
            </div>
            <div class="info2">
                <div class="comments">
                    <a href="" data-ui="comments" target="_blank"></a>
                </div>
                <div class="postAge" data-ui="postAge"></div>
            </div>
        </div>
    </div>
`;

const subs = JSON.parse(localStorage.subs || '{"all": true}');
let after;
const render = async (loadMoreAfter) => {
    if (Object.keys(subs).filter(s => subs[s]).length === 0) {
        ui.feed.innerHTML = '<div class="notice">You have no enabled subs.<br>Click "subs" above to fix that.</div>';
        return;
    }
    if (!loadMoreAfter) {
        ui.feed.innerHTML = '';
    }
    ui.feed.appendChild(markupToElement('<div class="notice">Loading...</div>'));
    const feedData = await fetchFeed(subs, loadMoreAfter);
    if (feedData && feedData.data && feedData.data.children) {
        after = feedData.data.after;
        const items = feedData.data.children;
        items.forEach(item => {
            const itemData = item.data;
            if (itemData.stickied) {
                return;
            }
            const newItemEl = markupToElement(feedItemTemplate);
            const itemUI = getUiElements(newItemEl);

            const url = getUrl(itemData);

            itemUI.upvotes.textContent = formatUpvotes(itemData.ups);

            itemUI.img.src = (itemData.thumbnail || '').startsWith('http') ? itemData.thumbnail : 'defaultThumb.jpg';
            itemUI.imgLink.href = url;

            itemUI.titleLink.innerHTML = itemData.title;
            itemUI.titleLink.title = itemUI.titleLink.textContent;
            itemUI.titleLink.href = url;

            itemUI.sub.textContent = itemData.subreddit_name_prefixed;
            itemUI.sub.href = `https://reddit.com/${itemData.subreddit_name_prefixed}`;

            itemUI.comments.textContent = `${itemData.num_comments} comments`;
            itemUI.comments.href = `https://reddit.com${itemData.permalink}`;

            itemUI.postAge.textContent = formatAge(itemData.created_utc);
            ui.feed.appendChild(newItemEl);
        });

        const notices = document.querySelectorAll('.notice');
        for (let notice of notices) {
            notice.remove();
        }
    } else {
        if (!loadMoreAfter) {
            ui.feed.innerHTML = '';
        }
        ui.feed.appendChild(markupToElement('<div class="notice">Failed to get data...</div>'));
    }
};

let isLoading = false;
const loadMore = async (after) => {
    if (!isLoading) {
        isLoading = true;
        await render(after);
        isLoading = false;
    }
};

loadMore();

const subTemplate = `
    <div class="subRow">
        <input type="checkbox" data-ui="subEnabled">
        <div class="subName" data-ui="subName"></div>
        <div class="removeSub" data-ui="removeSub">X</div>
    </div>
`;

let needsRerender = false;
const renderSubs = () => {
    ui.subList.innerHTML = '';
    Object.keys(subs).forEach(sub => {
        const subEl = markupToElement(subTemplate);
        const subUI = getUiElements(subEl);
        subUI.subEnabled.checked = subs[sub];
        subUI.subName.textContent = 'r/' + sub;

        subUI.subEnabled.addEventListener('change', () => {
            subs[sub] = subUI.subEnabled.checked;
            localStorage.subs = JSON.stringify(subs);
            needsRerender = true;
        });

        subUI.subName.addEventListener('click', () => {
            subs[sub] = !subs[sub];
            subUI.subEnabled.checked = subs[sub];
            localStorage.subs = JSON.stringify(subs);
            needsRerender = true;
        });

        subUI.removeSub.addEventListener('click', () => {
            delete subs[sub];
            localStorage.subs = JSON.stringify(subs);
            renderSubs();
            needsRerender = true;
        });

        ui.subList.appendChild(subEl);
    });
};

renderSubs();

const addSub = (sub) => {
    const realSub = sub.trim().replace(/^r\//i, '');
    ui.subInput.value = '';
    subs[realSub] = true;
    localStorage.subs = JSON.stringify(subs);
    needsRerender = true;
    renderSubs();
};

let inSubsUi = false;
ui.subs.addEventListener('click', () => {
    inSubsUi = true;
    ui.feedModal.style.display = 'none';
    ui.subsModal.style.display = 'block';
    needsRerender = false;
    renderSubs();
});

ui.subInput.addEventListener('keydown', (e) => {
    if (e.keyCode === 13 && ui.subInput.value) {
        addSub(ui.subInput.value);
    }
});

ui.subAddBtn.addEventListener('click', () => addSub(ui.subInput.value));

ui.subsBack.addEventListener('click', () => {
    inSubsUi = false;
    ui.feedModal.style.display = 'block';
    ui.subsModal.style.display = 'none';
    if (needsRerender) {
        loadMore();
        needsRerender = false;
    }
});

window.addEventListener('scroll', () => {
    if (!inSubsUi && document.body.scrollHeight > 1000 &&
        window.scrollY + window.innerHeight > document.body.scrollHeight - 400) {

        loadMore(after);
    }
});
