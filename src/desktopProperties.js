/* global chrome, app, idbKeyval, makeColorPicker */
{
    const {openModal, closeModal, saveData, prompt} = app;
    const {getUiElements, selectImageFromDisk, getParentElementWithClass, pad, updateBackground,
        setBackgroundStylesFromMode, debounce, createBG, markupToElement, getNextBgInCycle,
        loadImage, getBackground, getBackgroundImage, getBgImageFromDB, htmlEscape,
        fetchRedditImages, randomInt, rerollSubredditRandomizerBG} = app.util;

    const makeSubredditInfo = bg => `
        <div class="bgInfoTitle">Subreddit Randomizer</div>
        <div class="bgInfoDesc">${bg.subreddits.map(s => 'r/' + s).join(', ')}</div>
    `;

    const makeBgTile = (bg) => {
        const imgUrl = getBackgroundImage(bg.id);
        let bgImageStyle = `url(${htmlEscape(imgUrl)})`;
        if (bg.type === 'subredditRandomizer') {
            bgImageStyle = 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.5)), ' + bgImageStyle;
        }
        return `
            <div class="bgTile${bg.selected ? ' selected' : ''}${bg.default ? '' : ' userBg'}" data-bgid="${bg.id}">
                <div class="aspect16-9">
                    <div class="aspect-container">
                        <div class="bgTileImage" style="background-image: ${bgImageStyle};" draggable="false">
                            ${bg.type === 'subredditRandomizer' && makeSubredditInfo(bg)}
                        </div>
                        <input type="checkbox" class="bgCheckbox" ${bg.selected ? 'checked="checked"' : ''}>
                    </div>
                </div>
            </div>
        `;
    };

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="desktopProperties">
            <div class="backgroundUi">
                <div class="backgroundProperties">
                    <div data-id="backgroundPreviewSizeRef">
                        <div class="preview">
                            <div class="previewPageBG" data-id="previewPageBG">
                                <div class="previewBG" data-id="previewBG">
                                    <div class="pageSizeRatio" data-id="pageSizeRatio">
                                        <a href="" data-id="bgLink" target="_blank" rel="noopener noreferrer"></a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="topBgOptions">
                            <div>
                                <div class="label">Page Color</div>
                                <div class="colorBtn" data-id="bgColor"></div>
                            </div>
                            <div>
                                <div class="label">Filter Color</div>
                                <div class="colorBtn" data-id="filterColor"></div>
                            </div>
                            <div class="center">
                                <div class="label">In Rotation?</div>
                                <input type="checkbox" class="inRotation" data-id="inRotation">
                            </div>
                        </div>
                        <div class="fitModes">
                            <div class="label">Background Fit:</div>
                            <select data-id="bgMode">
                                <option value="fill">Fill</option>
                                <option value="fit">Fit</option>
                                <option value="stretch">Stretch</option>
                                <option value="tile">Tile</option>
                                <option value="center">Center</option>
                            </select>
                        </div>
                        <div class="subredditOptions spaceVert" data-id="subredditOptions">
                            <div class="subredditOptionsTitle">Subreddit Randomizer Options:</div>
                            <div class="flex spaceHori">
                                <button class="btn" data-id="editSubredditsBtn">Edit Subreddits</button>
                                <div class="center">
                                    <div class="label">Auto fit backgrounds?</div>
                                    <input type="checkbox" data-id="redditSmartFit">
                                </div>
                                <div class="center">
                                    <div class="label">Allow NSFW?</div>
                                    <input type="checkbox" data-id="redditNSFW">
                                </div>
                            </div>
                            <div>
                                <div class="label">Section:</div>
                                <select data-id="redditSection">
                                    <option value="hot">Hot</option>
                                    <option value="new">New</option>
                                    <option value="rising">Rising</option>
                                    <option value="controversial">Controversial</option>
                                    <option value="top">Top</option>
                                    <option value="gilded">Gilded</option>
                                </select>
                            </div>
                            <div>
                                <div class="label">Find images in last:</div>
                                <select data-id="redditTime">
                                    <option value="hour">Hour</option>
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                    <option value="year">Year</option>
                                    <option value="all">Forever</option>
                                </select>
                            </div>
                            <div>
                                <div class="label">Prefer Image Orientation:</div>
                                <select data-id="imageOrientation">
                                    <option value="any">Any</option>
                                    <option value="landscape">Landscape</option>
                                    <option value="portrait">Portrait</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="bottomButtons">
                        <button class="btn" data-id="deleteBackgroundBtn">Delete Background</button>
                        <button class="btn" data-id="subredditRerollBtn">Reroll Background</button>
                    </div>
                </div>
                <div class="backgroundSelector" data-id="backgroundSelector">
                    <div class="backgroundSectionTitle" data-id="collapseDefaultBgs">
                        <div>
                            Default Backgrounds<span class="arrow"></span>
                        </div>
                        <div>
                            <button data-check="true">Check All</button> <button>Uncheck All</button>
                        </div>
                    </div>
                    <div class="defaultBackgrounds backgroundSection" data-id="defaultBackgroundsSection"></div>
                    <div class="backgroundSectionTitle" data-id="collapseUserBgs">
                        <div>
                            Your Backgrounds<span class="arrow"></span>
                        </div>
                        <div>
                            <button data-check="true">Check All</button> <button>Uncheck All</button>
                        </div>
                    </div>
                    <div class="userBackgrounds backgroundSection" data-id="userBackgroundsSection"></div>
                </div>
            </div>
        </div>
        <div class="buttons">
            <div class="desktopUiLeft">
                <div class="rotateOptions">
                    <div>
                        <div class="label">Change background after:</div>
                        <input class="input bgRotateTime" type="number" value="20" data-id="bgRotateTime" min="1"> minutes.
                    </div>
                    <div class="shuffleDiv">
                        <div class="label">Shuffle?</div>
                        <input class="input bgShuffle" type="checkbox" data-id="bgShuffle">
                    </div>
                </div>
            </div>
            <div class="desktopUiRight">
                <div class="flex spaceHori">
                    <button class="btn" data-id="addBackgroundBtn">Add Background</button>
                    <button class="btn" data-id="addSubredditRandomizerBtn">Add Subreddit Randomizer</button>
                </div>
                <button class="applyBtn btn" data-id="applyBtn">Close</button>
            </div>
        </div>
    `;
    const ui = getUiElements(content);

    let modalOpen;
    let currentBgId;

    const loadDesktopFromDisk = async () => {
        const blobToSave = await selectImageFromDisk();
        const newBg = createBG();
        await idbKeyval.set('b' + newBg.id, blobToSave);
        const imgUrl = await getBgImageFromDB(newBg.id);
        app.data.backgrounds.push(newBg);
        saveData();

        chrome.runtime.sendMessage({action: 'reload'});

        const newBgTile = markupToElement(makeBgTile(newBg));
        await loadImage(imgUrl, false);
        ui.userBackgroundsSection.appendChild(newBgTile);
    };

    const createSubredditRandomizer = async () => {
        const subreddits = await prompt(
            'Subreddit Randomizer',
            'This is a special background that randomly selects images from subreddits of your choice. Type a ' +
            'comma separated list of one or more subreddits.<br>' +
            '<a href="https://www.reddit.com/r/sfwpornnetwork/wiki/network" target="_blank" rel="noopener noreferrer">Subreddit Suggestions</a>',
            {
                placeholder: 'Wallpaper, EarthPorn'
            }
        );
        if (subreddits) {
            const newBg = createBG();
            newBg.type = 'subredditRandomizer';
            newBg.subreddits = subreddits.split(',').map(sub => sub.trim().replace(/^r\//i, ''));
            newBg.redditOptions = {
                time: 'week',
                section: 'top',
                nsfw: false,
                imageOrientation: 'any'
            };
            newBg.smartFit = true;

            let imageUrls = await fetchRedditImages(newBg.subreddits, newBg.redditOptions);

            const pickRandomImage = async () => {
                const imageObj = imageUrls[randomInt(0, imageUrls.length - 1)];
                newBg.image = imageObj.url;
                newBg.redditOptions.title = imageObj.title;
                newBg.redditOptions.link = imageObj.link;
                const img = await loadImage(newBg.image);
                const screenIsWide = window.innerWidth > window.innerHeight;
                const imageIsWide = img.width > img.height;
                newBg.mode = screenIsWide !== imageIsWide ? 'fit' : 'fill';
            };

            if (imageUrls.length > 0) {
                await pickRandomImage();
            } else {
                const allowNSFW = await app.confirm(
                    "No backgrounds were found. Do you want to allow NSFW (mature) content and try again? Otherwise, check spelling or your internet connection.",
                    [{text: "Allow NSFW", value: true}, {text: "Cancel", value: false, default: true}]
                );
                if (allowNSFW) {
                    newBg.redditOptions.nsfw = true;
                    imageUrls = await fetchRedditImages(newBg.subreddits, newBg.redditOptions);
                    if (imageUrls.length > 0) {
                        await pickRandomImage();
                    } else {
                        app.confirm("No backgrounds were found. Check spelling or your internet connection.", [{text: "OK", default: true}]);
                    }
                }
            }
            app.data.backgrounds.push(newBg);
            saveData();
            chrome.runtime.sendMessage({action: 'reload'});
            const newBgTile = markupToElement(makeBgTile(newBg));
            ui.userBackgroundsSection.appendChild(newBgTile);
        }
    };

    const populateDefaultImages = () => {
        let defaultBgsMarkup = [];
        app.data.backgrounds.forEach((bg) => {
            if (bg.default) {
                defaultBgsMarkup.push(makeBgTile(bg));
            }
        });
        defaultBgsMarkup = defaultBgsMarkup.join('');
        ui.defaultBackgroundsSection.innerHTML = defaultBgsMarkup;
    };

    const updateUserImages = () => {
        let userBgs = [];
        app.data.backgrounds.forEach((bg) => {
            if (!bg.default) {
                userBgs.push(makeBgTile(bg));
            }
        });
        userBgs = userBgs.join('');
        ui.userBackgroundsSection.innerHTML = userBgs;
    };

    const changeBackgroundPreview = (bgid = currentBgId) => {
        const bg = getBackground(bgid);
        const imgUrl = getBackgroundImage(bgid);
        const maxHeight = 250;
        let previewWidth = ui.backgroundPreviewSizeRef.offsetWidth;
        let previewHeight = window.innerHeight * previewWidth / window.innerWidth;
        if (previewHeight > maxHeight) {
            previewHeight = maxHeight;
            previewWidth = window.innerWidth * maxHeight / window.innerHeight;
        }
        ui.pageSizeRatio.style.width = previewWidth + 'px';
        ui.pageSizeRatio.style.height = previewHeight + 'px';

        if (bg.redditOptions) {
            ui.bgLink.href = bg.redditOptions.link;
            ui.bgLink.textContent = bg.redditOptions.title;
        } else {
            ui.bgLink.textContent = '';
        }

        ui.previewPageBG.style.backgroundColor = bg.color;
        ui.previewBG.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${imgUrl})`;
        setBackgroundStylesFromMode(ui.previewBG, bg.mode);
        if (bg.mode === 'tile') {
            ui.previewBG.style.backgroundSize = previewWidth * 0.7 + 'px';
        } else if (bg.mode === 'center') {
            const tempImg = new Image();
            tempImg.src = imgUrl;
            const ratio = previewWidth / window.innerWidth;
            ui.previewBG.style.backgroundSize = `${ratio * tempImg.width}px ${ratio * tempImg.height}px`;
        }
        updateBackground(bg, bg.type === 'subredditRandomizer');
    };

    const updateInputs = (bgid = currentBgId) => {
        const bg = getBackground(bgid);
        ui.bgColor.style.background = bg.color;
        ui.filterColor.style.background = bg.filter;
        ui.inRotation.checked = bg.selected;
        ui.bgMode.value = bg.mode;
        ui.bgRotateTime.value = app.data.rotateMinutes;
        ui.bgShuffle.checked = app.data.random;
        ui.deleteBackgroundBtn.disabled = bg.default;

        if (bg.type === 'subredditRandomizer') {
            ui.subredditOptions.style.display = 'block';
            ui.subredditRerollBtn.style.display = 'block';
            ui.redditSmartFit.checked = bg.smartFit;
            ui.redditNSFW.checked = bg.redditOptions.nsfw;
            ui.redditSection.value = bg.redditOptions.section;
            ui.redditTime.value = bg.redditOptions.time;
            ui.imageOrientation.value = bg.redditOptions.imageOrientation;
        } else {
            ui.subredditOptions.style.display = 'none';
            ui.subredditRerollBtn.style.display = 'none';
        }
    };

    const changeCheckmarks = (container, checked = false) => {
        const bgTiles = container.querySelectorAll('.bgTile');
        bgTiles.forEach((bgTile) => {
            const bg = getBackground(bgTile.dataset.bgid);
            bgTile.querySelector('.bgCheckbox').checked = checked;
            bg.selected = checked;
            updateSelected(bgTile, bg);
            updateInputs();
        });
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    };

    const updateSelected = (el, bg) => {
        if (bg.selected) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    };

    const close = () => {
        if (closeModal()) {
            removeColorPickers({target: document.body});
        }
        modalOpen = false;
    };
    const apply = () => {
        saveData();
        close();
    };
    ui.addBackgroundBtn.addEventListener('click', loadDesktopFromDisk);
    ui.addSubredditRandomizerBtn.addEventListener('click', createSubredditRandomizer);
    ui.applyBtn.addEventListener('click', apply);
    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 27) { // esc
                const focusedEl = document.activeElement;
                if (focusedEl.tagName === 'INPUT') {
                    focusedEl.blur();
                } else {
                    apply();
                }
            }
        }
    });

    ui.backgroundSelector.addEventListener('click', (e) => {
        const bgTile = getParentElementWithClass(e.target, 'bgTile');
        if (bgTile) {
            const bg = getBackground(bgTile.dataset.bgid);
            if (e.target.classList.contains('bgCheckbox')) {
                bg.selected = e.target.checked;
                updateSelected(bgTile, bg);
                updateInputs();
                saveData();
            } else {
                currentBgId = bg.id;
                updateInputs();
                changeBackgroundPreview();
            }
            chrome.runtime.sendMessage({action: 'reload'});
        }
    });

    const removeColorPickers = (e) => {
        const colorPicker = getParentElementWithClass(e.target, 'color-picker');
        if (!colorPicker) {
            document.querySelectorAll('.color-picker').forEach((el) => {
                el.parentElement.removeChild(el);
            });
            window.removeEventListener('mousedown', removeColorPickers);
            saveData();
            chrome.runtime.sendMessage({action: 'reload'});
        }
    };

    const setupColorPicker = (e, btn, alpha = false) => {
        const colorPicker = makeColorPicker(alpha);
        colorPicker.container.style.left = btn.offsetLeft + window.scrollX + 'px';
        colorPicker.container.style.top = btn.offsetTop + window.scrollY + 'px';
        document.body.appendChild(colorPicker.container);

        window.addEventListener('mousedown', removeColorPickers);
        return colorPicker;
    };

    ui.bgColor.addEventListener('click', (e) => {
        const colorPicker = setupColorPicker(e, ui.bgColor, false);
        const rgb = ui.bgColor.style.background.match(/[0-9]+/g);
        colorPicker.setColor(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
        const currentBg = getBackground(currentBgId);

        colorPicker.onChange((color) => {
            const hex = '#' + pad(color.r.toString(16), 2) + pad(color.g.toString(16), 2) +
                pad(color.b.toString(16), 2);
            ui.bgColor.style.background = hex;
            currentBg.color = hex;
            changeBackgroundPreview();
        });
    });

    ui.filterColor.addEventListener('click', (e) => {
        const colorPicker = setupColorPicker(e, ui.filterColor, true);
        const rgb = ui.filterColor.style.background.match(/[0-9\.]+/g);
        colorPicker.setColor(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]), parseFloat(rgb[3]));
        const currentBg = getBackground(currentBgId);

        colorPicker.onChange((color) => {
            const colorStr = `rgba(${color.r},${color.g},${color.b},${color.a})`;
            ui.filterColor.style.background = colorStr;
            currentBg.filter = colorStr;
            changeBackgroundPreview();
        });
    });

    ui.inRotation.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.selected = ui.inRotation.checked;
        const bgel = ui.backgroundSelector.querySelectorAll('.bgTile').find((el) => el.dataset.bgid === currentBg.id);
        bgel.querySelector('.bgCheckbox').checked = currentBg.selected;
        updateSelected(bgel, currentBg);
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.bgMode.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.mode = ui.bgMode.value;
        changeBackgroundPreview();
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.editSubredditsBtn.addEventListener('click', async () => {
        const currentBg = getBackground(currentBgId);
        const subreddits = await prompt(
            'Edit Subreddits',
            'This is a special background that randomly selects images from subreddits of your choice. Type a ' +
            'comma separated list of one or more subreddits.<br>' +
            '<a href="https://www.reddit.com/r/sfwpornnetwork/wiki/network" target="_blank" rel="noopener noreferrer">Subreddit Suggestions</a>',
            {
                placeholder: 'Wallpaper, EarthPorn',
                value: currentBg.subreddits.join(', ')
            }
        );
        if (subreddits) {
            currentBg.subreddits = subreddits.split(',').map(sub => sub.trim().replace(/^r\//i, ''));
            const imageUrls = await fetchRedditImages(currentBg.subreddits, currentBg.redditOptions);
            if (imageUrls.length === 0) {
                app.confirm("No backgrounds found. Check spelling or change filtering options when editing background.", [{text: "OK", default: true}]);
            }
            saveData();
            chrome.runtime.sendMessage({action: 'reload'});
            app.rerenderDesktopProperties();
        }
    });

    ui.redditSmartFit.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.smartFit = ui.redditSmartFit.checked;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.redditNSFW.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.redditOptions.nsfw = ui.redditNSFW.checked;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.redditSection.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.redditOptions.section = ui.redditSection.value;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.redditTime.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.redditOptions.time = ui.redditTime.value;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.imageOrientation.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.redditOptions.imageOrientation = ui.imageOrientation.value;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.subredditRerollBtn.addEventListener('click', async () => {
        const currentBg = getBackground(currentBgId);
        await rerollSubredditRandomizerBG(currentBg);
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
        app.rerenderDesktopProperties();
    });

    const deleteBackground = async (idToDelete = currentBgId) => {
        const confirmBtns = [
            'Do It!',
            {text: 'No Way!', value: false, default: true}
        ];
        if (await app.confirm('Really? Delete this backgound?', confirmBtns)) {
            localStorage.lastRotation = Date.now();
            idbKeyval.delete('b' + idToDelete);
            const bgTile = ui.backgroundSelector.querySelectorAll('.bgTile').find((el) => {
                return el.dataset.bgid === idToDelete;
            });
            bgTile.parentElement.removeChild(bgTile);
            app.data.backgrounds = app.data.backgrounds.filter((bg) => bg.id !== idToDelete);

            let nextBg;
            if (idToDelete === currentBgId) {
                nextBg = getNextBgInCycle(localStorage.lastBgId, app.data.backgrounds, app.data.random, true);
            }

            if (nextBg) {
                currentBgId = nextBg.id;
                updateBackground(getBackground(currentBgId));
                changeBackgroundPreview();
                updateInputs();
            }
            saveData();
            chrome.runtime.sendMessage({action: 'reload'});
        }
    };
    app.deleteBackground = deleteBackground;
    ui.deleteBackgroundBtn.addEventListener('click', () => deleteBackground());

    ui.bgRotateTime.addEventListener('change', () => {
        app.data.rotateMinutes = Math.max(Math.floor(ui.bgRotateTime.value), 1);
        localStorage.lastRotation = Date.now();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.bgShuffle.addEventListener('change', () => {
        app.data.random = ui.bgShuffle.checked;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    const toggleBackgroundSection = (e, section) => {
        const isCollapsed = section.classList.contains('collapsed');
        if (isCollapsed) {
            e.currentTarget.querySelector('.arrow').classList.remove('right');
            section.classList.remove('collapsed');
            section.style.maxHeight = section.scrollHeight + 'px';
            return false;
        } else {
            section.style.maxHeight = section.scrollHeight + 'px';
            e.currentTarget.querySelector('.arrow').classList.add('right');
            section.classList.add('collapsed');
            setTimeout(() => {
                section.style.maxHeight = 0;
            }, 0);
            return true;
        }
    };
    ui.collapseDefaultBgs.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            localStorage.defaultBgsCollapsed = toggleBackgroundSection(e, ui.defaultBackgroundsSection);
        } else {
            changeCheckmarks(ui.defaultBackgroundsSection, !!e.target.dataset.check);
        }
    });
    ui.collapseUserBgs.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            localStorage.userBgsCollapsed = toggleBackgroundSection(e, ui.userBackgroundsSection);
        } else {
            changeCheckmarks(ui.userBackgroundsSection, !!e.target.dataset.check);
        }
    });
    ui.defaultBackgroundsSection.addEventListener('transitionend', () => {
        if (!ui.defaultBackgroundsSection.classList.contains('collapsed')) {
            ui.defaultBackgroundsSection.style.maxHeight = 'none';
        }
    });
    ui.userBackgroundsSection.addEventListener('transitionend', () => {
        if (!ui.userBackgroundsSection.classList.contains('collapsed')) {
            ui.userBackgroundsSection.style.maxHeight = 'none';
        }
    });

    const changePreview = debounce(changeBackgroundPreview, 100);
    window.addEventListener('resize', () => {
        if (modalOpen) {
            changePreview();
        }
    });

    chrome.runtime.onMessage.addListener((msgObj) => {
        if (msgObj.action === 'closeDesktopProps') {
            close();
        }
    });

    app.openDesktopProperties = async () => {
        app.data = await app.util.loadData();
        openModal(content);
        modalOpen = true;
        app.modalOverlay.style.background = 'transparent';
        app.modal.style.background = 'rgba(255, 255, 255, 0.8)';

        await app.afterUserImagesLoaded;
        populateDefaultImages();
        updateUserImages();
        if (localStorage.defaultBgsCollapsed === 'false') {
            ui.defaultBackgroundsSection.style.maxHeight = 'none';
        } else {
            ui.collapseDefaultBgs.querySelector('.arrow').classList.add('right');
            ui.defaultBackgroundsSection.classList.add('collapsed');
            ui.defaultBackgroundsSection.style.maxHeight = 0;
        }

        // disabling this code for now... I dunno if it's useful.
        // if (localStorage.userBgsCollapsed === 'false') {
        //     ui.userBackgroundsSection.style.maxHeight = 'none';
        // } else {
        //     ui.collapseUserBgs.querySelector('.arrow').classList.add('right');
        //     ui.userBackgroundsSection.classList.add('collapsed');
        //     ui.userBackgroundsSection.style.maxHeight = 0;
        // }
        ui.collapseUserBgs.querySelector('.arrow').classList.remove('right');
        ui.userBackgroundsSection.classList.remove('collapsed');
        ui.userBackgroundsSection.style.maxHeight = 'none';

        currentBgId = app.data.background.id;
        updateInputs();
        changeBackgroundPreview();
        chrome.runtime.sendMessage({action: 'closeDesktopProps'});
    };

    app.rerenderDesktopProperties = () => {
        if (modalOpen) {
            app.openDesktopProperties();
        }
    };
}

