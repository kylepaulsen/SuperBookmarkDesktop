/* global app, chrome */
{
    const { openModal, closeModal, getBookmarkTree, modalOverlay } = app;
    const { getUiElements, getBookmarkIcon, getFaviconImageUrl,
        getBookmarkHistory, addToBookmarkHistory, isUserInteractingWithForm } = app.util;

    let allBookmarks = [];
    let keyboardIndex = 0;
    let searchResultElements = [];
    let modalOpen = false;

    const getAllBookmarks = async () => {
        const tree = await getBookmarkTree();
        allBookmarks = [];
        const recurse = node => {
            if (node.children) {
                node.children.forEach(nextNode => {
                    recurse(nextNode);
                });
            } else if (node.url && node.url.indexOf('data:') !== 0) {
                allBookmarks.push(node);
            }
        };
        tree.forEach(node => {
            recurse(node);
        });
        allBookmarks.sort((a, b) => a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1);
    };

    const bookmarkSearch = document.createElement('div');
    bookmarkSearch.innerHTML = `
        <div>
            <input class="bookmarkSearchInput" type="text" data-id="searchInput" placeholder="Search for a Bookmark">
            <div class="searchResults" data-id="searchResults"></div>
        </div>
    `;
    const ui = getUiElements(bookmarkSearch);

    const createSearchResultItem = bookmark => {
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.className = 'searchResult';
        link.title = bookmark.url;
        link.innerHTML = `
            <img src="" alt="">
            <div class="bookmarkTitle"></div>
        `;
        link.dataset.name = bookmark.title;
        link.querySelector('img').src = getFaviconImageUrl(bookmark.url);
        link.querySelector('.bookmarkTitle').textContent = bookmark.title;
        return link;
    };

    const filterAndRenderResults = (filter = '') => {
        const filterLower = filter.toLowerCase();
        ui.searchResults.innerHTML = '';

        let filterdBookmarks = allBookmarks;
        if (filter !== '') {
            const matchedBookmarkInfo = [];
            allBookmarks.forEach(bookmark => {
                let pos = bookmark.title.toLowerCase().indexOf(filterLower);
                if (pos > -1) {
                    // adding 1 to avoid 0 being converted to bool.
                    matchedBookmarkInfo.push({ titlePos: pos + 1, bookmark });
                    return;
                }
                pos = bookmark.url.toLowerCase().indexOf(filterLower);
                if (pos > -1) {
                    // adding 1 to avoid 0 being converted to bool.
                    matchedBookmarkInfo.push({ urlPos: pos + 1, bookmark });
                }
            });
            matchedBookmarkInfo.sort((a, b) => {
                if (a.titlePos && !b.titlePos) {
                    return -1;
                }
                if (!a.titlePos && b.titlePos) {
                    return 1;
                }
                return (a.titlePos || a.urlPos) - (b.titlePos || b.urlPos);
            });
            filterdBookmarks = matchedBookmarkInfo.map(obj => obj.bookmark);
        } else {
            const bookmarkHistory = getBookmarkHistory();
            const allBookmarksWithoutHistory = allBookmarks.filter(bm1 =>
                !bookmarkHistory.some(bm2 => bm1.url === bm2.url && bm1.title === bm2.title));
            filterdBookmarks = bookmarkHistory.concat(allBookmarksWithoutHistory);
        }

        const topResults = filterdBookmarks.slice(0, 10);
        if (topResults.length === 0) {
            ui.searchResults.innerHTML = '<div class="notFound">No bookmarks found.</div>';
        }

        searchResultElements = [];
        topResults.forEach((bookmark, idx) => {
            const result = createSearchResultItem(bookmark);
            if (idx === keyboardIndex) {
                result.classList.add('selected');
            }
            searchResultElements.push(result);
            getBookmarkIcon(bookmark).then(icon => {
                result.querySelector('img').src = icon;
            });
            ui.searchResults.appendChild(result);
        });
    };

    const openSearchModal = async () => {
        await getAllBookmarks();
        filterAndRenderResults();
        openModal(bookmarkSearch, {
            overlayClose: true,
            onClose: () => {
                modalOpen = false;
            }
        });
        modalOpen = true;
        ui.searchInput.value = '';
        ui.searchInput.focus();
    };

    const searchButton = document.createElement('button');
    searchButton.className = 'quickSearchButton';
    searchButton.innerHTML = `
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
            stroke="#000" fill="none" stroke-width="5" stroke-linecap="round">

            <circle cx="23" cy="23" r="20" />
            <line x1="38" y1="38" x2="60" y2="60" />
        </svg>
    `;
    searchButton.title = 'Quick Search';
    searchButton.addEventListener('click', openSearchModal);

    document.body.appendChild(searchButton);

    const nearButtonRadius = 30;
    let isNear = false;

    let buttonRect;
    const recalcButtonRect = () => {
        buttonRect = searchButton.getBoundingClientRect();
    };
    recalcButtonRect();
    app.updateQuickSearchButton = recalcButtonRect;

    const isMouseNearButton = e => {
        const x = e.clientX;
        const y = e.clientY;
        if (
            x > buttonRect.left - nearButtonRadius &&
            x < buttonRect.right + nearButtonRadius &&
            y < buttonRect.height
        ) {
            if (modalOpen || modalOverlay.style.display !== 'none') {
                return;
            }
            if (!isNear) {
                searchButton.classList.add('show');
            }
            isNear = true;
        } else {
            if (isNear) {
                searchButton.classList.remove('show');
            }
            isNear = false;
        }
    };

    ui.searchInput.addEventListener('input', () => {
        keyboardIndex = 0;
        filterAndRenderResults(ui.searchInput.value);
    });

    ui.searchInput.addEventListener('keydown', e => {
        const prevIndex = keyboardIndex;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            keyboardIndex = Math.max(keyboardIndex - 1, 0);
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            keyboardIndex = Math.min(keyboardIndex + 1, searchResultElements.length - 1);
        }
        if (prevIndex !== keyboardIndex) {
            document.querySelector('.searchResult.selected').classList.remove('selected');
            searchResultElements[keyboardIndex].classList.add('selected');
        }
    });

    // This var tracks if the first key pressed on the page was tab. If so, open the search.
    let firstKeyTabChance = true;
    window.addEventListener('keydown', e => {
        if (e.key !== 'Tab') {
            firstKeyTabChance = false;
        }
        if (modalOpen) {
            if (e.key === 'Enter') {
                const currentLink = searchResultElements[keyboardIndex];
                if (currentLink && currentLink.href) {
                    const title = currentLink.querySelector('.bookmarkTitle').textContent;
                    addToBookmarkHistory({ title, url: currentLink.href });
                    if (e.ctrlKey) {
                        chrome.tabs.create({url: currentLink.href, active: false});
                    } else {
                        window.location.href = currentLink.href;
                    }
                }
            } else if (e.key === 'Escape') {
                closeModal();
            }
        } else if (e.key === ' ' && !isUserInteractingWithForm()) {
            // spacebar is main key to open search.
            openSearchModal();
        }
    });
    window.addEventListener('keyup', e => {
        // first tab into page (from url bar) will open search.
        if (firstKeyTabChance && e.key === 'Tab') {
            openSearchModal();
        }
        firstKeyTabChance = false;
    });
    window.addEventListener('mousemove', isMouseNearButton);
    window.addEventListener('resize', recalcButtonRect);
}
