/* global chrome, app, idbKeyval, makeColorPicker */
{
    const {openModal, closeModal, prompt} = app;
    const {getUiElements, selectImageFromDisk, getParentElementWithClass, pad, updateBackground,
        setBackgroundStylesFromMode, debounce, createBG, markupToElement, getNextBgInCycle, loadImage,
        getBackground, getBackgroundImage, getBgImageFromDB, htmlEscape, fetchWallhavenImages, randomInt,
        createWallhavenRandomizerBg, remoteApiBGFunctions, requestOriginPermission} = app.util;
    const {saveBrowserSyncData} = app.backup;

    const saveData = () => {
        app.saveData();
        saveBrowserSyncData();
    };

    const makeBgTile = (bg) => {
        const imgUrl = getBackgroundImage(bg.id);
        let bgImageStyle = `url(${htmlEscape(imgUrl)})`;
        if (bg.type === 'remoteApi') {
            bgImageStyle = 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.5)), ' + bgImageStyle;
        }
        const bgInfo = remoteApiBGFunctions[bg.subType]?.renderBgInfo?.(bg) ?? "";
        return `
            <div class="bgTile${bg.selected ? ' selected' : ''}${bg.default ? '' : ' userBg'}" data-bgid="${bg.id}">
                <div class="aspect16-9">
                    <div class="aspect-container">
                        <div class="bgTileImage" style="background-image: ${bgImageStyle};" draggable="false">
                            ${bgInfo}
                        </div>
                        <input type="checkbox" class="bgCheckbox" ${bg.selected ? 'checked="checked"' : ''}>
                    </div>
                </div>
                ${bg.subType === 'subredditRandomizer' ? `<div class="unsupportedBg">⚠️ No longer supported</div>` : ''}
            </div>
        `;
    };

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="desktopProperties">
            <div class="backgroundUi">
                <div class="backgroundProperties">
                    <div class="backgroundPropertiesScroll" data-id="backgroundPreviewSizeRef">
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
                                <option value="auto">Auto</option>
                                <option value="fill">Fill</option>
                                <option value="fit">Fit</option>
                                <option value="stretch">Stretch</option>
                                <option value="tile">Tile</option>
                                <option value="center">Center</option>
                            </select>
                        </div>
                        <div class="remoteApiOptions spaceVert" data-id="subredditRandomizerOptions">
                            <h2 style="color: #b00">This background is no longer supported</h2>
                            <span style="font-size: 14px">
                                Reddit recently removed open access to their JSON APIs. As a result, subreddit
                                randomizer backgrounds won't reroll properly anymore causing you to see the same
                                background indefinitely. If this doesn't bother you, then you can ignore this warning.
                                Otherwise it's recommended that you delete this background using the button below.
                                <br><br>
                                On the bright side, you can make Wallhaven randomizers.
                                Look for the "Add Wallhaven Randomizer" button below to do this.
                            </span>
                        </div>
                        <div class="remoteApiOptions spaceVert" data-id="wallhavenRandomizerOptions">
                            <div class="remoteApiOptionsTitle">Wallhaven Randomizer Options:</div>
                            <div>
                                <div class="label">Query: <button class="infoBtn" data-id="wallhavenQueryInfo">?</button></div>
                                <input type="text" data-id="wallhavenQuery" placeholder="nature" style="width: 100%;">
                            </div>
                            <div>
                                <div class="label">Categories:</div>
                                <div class="flex spaceHori wrap">
                                    <div class="flex spaceHori flexCenter"><div>General:</div><input type="checkbox" data-id="wallhavenCategoryGeneral" data-bitidx="0"></div>
                                    <div class="flex spaceHori flexCenter"><div>Anime:</div><input type="checkbox" data-id="wallhavenCategoryAnime" data-bitidx="1"></div>
                                    <div class="flex spaceHori flexCenter"><div>People:</div><input type="checkbox" data-id="wallhavenCategoryPeople" data-bitidx="2"></div>
                                </div>
                            </div>
                            <div>
                                <div class="label">Purity:</div>
                                <div class="flex spaceHori wrap">
                                    <div class="flex spaceHori flexCenter"><div>Safe (sfw):</div><input type="checkbox" data-id="wallhavenPuritySfw" data-bitIdx="0"></div>
                                    <div class="flex spaceHori flexCenter"><div>Sketchy:</div><input type="checkbox" data-id="wallhavenPuritySketchy" data-bitIdx="1"></div>
                                    <div class="flex spaceHori flexCenter"><div>Not Safe (nsfw):</div><input type="checkbox" data-id="wallhavenPurityNsfw" data-bitIdx="2"></div>
                                </div>
                            </div>
                            <div class="flex spaceHori">
                                <div style="flex: 1">
                                    <div class="label">Sort:</div>
                                    <select data-id="wallhavenSort">
                                        <option value="date_added">Date Added</option>
                                        <option value="relevance">Relevance</option>
                                        <option value="random">Random</option>
                                        <option value="views">Views</option>
                                        <option value="favorites">Favorites</option>
                                        <option value="toplist">Toplist</option>
                                    </select>
                                </div>
                                <div>
                                    <div class="label">Order:</div>
                                    <select data-id="wallhavenOrder">
                                        <option value="desc">Desc</option>
                                        <option value="asc">Asc</option>
                                    </select>
                                </div>
                            </div>
                            <div class="wallhavenGridOptions">
                                <div data-id="wallhavenTopRangeContainer">
                                    <div class="label">Top from last:</div>
                                    <select data-id="wallhavenTopRange">
                                        <option value="1d">1 Day</option>
                                        <option value="3d">3 Days</option>
                                        <option value="1w">1 Week</option>
                                        <option value="1M">1 Month</option>
                                        <option value="3M">3 Months</option>
                                        <option value="6M">6 Months</option>
                                        <option value="1y">1 Year</option>
                                    </select>
                                </div>
                                <div>
                                    <div class="label">Minimum Resolution:</div>
                                    <input type="text" data-id="wallhavenMinResolution" placeholder="1920x1080">
                                </div>
                                <div>
                                    <div class="label">Exact Resolution(s):</div>
                                    <input type="text" data-id="wallhavenExactResolution" placeholder="1920x1080,1920x1200">
                                </div>
                                <div>
                                    <div class="label">Ratios:</div>
                                    <input type="text" data-id="wallhavenRatios" placeholder="16x9,16x10">
                                </div>
                            </div>
                            <div>
                                <div class="label">Colors:</div>
                                <div class="flex wrap" data-id="wallhavenColorsGrid" style="gap: 8px 12px"></div>
                            </div>
                        </div>
                    </div>
                    <div class="bottomButtons">
                        <button class="btn" data-id="deleteBackgroundBtn">Delete Background</button>
                        <button class="btn" data-id="remoteApiBgRerollBtn">Reroll Background</button>
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
                    <button class="btn" data-id="addWallhavenRandomizerBtn">Add Wallhaven Randomizer</button>
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

    const createWallhavenColors = () => {
        const colors = [
            "660000", "990000", "cc0000", "cc3333", "ea4c88", "993399", "663399", "333399", "0066cc", "0099cc",
            "66cccc", "77cc33", "669900", "336600", "666600", "999900", "cccc33", "ffff00", "ffcc33", "ff9900",
            "ff6600", "cc6633", "996633", "663300", "000000", "999999", "cccccc", "ffffff", "424153"
        ];
        colors.forEach((color) => {
            const colorButton = markupToElement(`
                <label class="wallhavenColorBtn"><input type="checkbox" data-color="${color}"></label>
            `);
            colorButton.style.background = '#' + color;
            ui.wallhavenColorsGrid.appendChild(colorButton);
        });
    };
    createWallhavenColors();

    const createWallhavenRandomizer = async () => {
        const hasWallhavenApiAccess = await requestOriginPermission(
            "https://wallhaven.cc/",
            "Super Bookmark Desktop needs access to the Wallhaven API to use this feature. If you click 'Grant Permission' below, your browser will ask for your permission."
        );
        if (!hasWallhavenApiAccess) {
            return;
        }

        const query = await prompt(
            'Wallhaven Randomizer',
            'This is a special background that randomly selects images from <a href="https://wallhaven.cc/" target="_blank">wallhaven.cc</a>. Type a ' +
            'wallhaven search query below.<br>',
            {
                placeholder: 'nature'
            }
        );
        if (query) {
            const newBg = createWallhavenRandomizerBg(query);
            let imageUrls = await fetchWallhavenImages(newBg);

            const pickRandomImage = async () => {
                const imageObj = imageUrls[randomInt(0, imageUrls.length - 1)];
                newBg.image = imageObj.url;
                newBg.link = imageObj.link;
                const img = await loadImage(newBg.image);
                const screenIsWide = window.innerWidth > window.innerHeight;
                const imageIsWide = img.width > img.height;
                newBg.mode = screenIsWide !== imageIsWide ? 'fit' : 'fill';
            };

            if (imageUrls.length > 0) {
                await pickRandomImage();
            } else {
                app.confirm("No backgrounds were found. Check spelling or your internet connection.");
                return;
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

        const bgLinkData = remoteApiBGFunctions[bg.subType]?.getBgLink?.(bg) ?? {};
        if (bgLinkData.link && bgLinkData.title) {
            ui.bgLink.href = bgLinkData.link;
            ui.bgLink.textContent = bgLinkData.title;
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
        updateBackground(bg, bg.type === 'remoteApi');
    };

    const updateInputs = (bgid = currentBgId) => {
        const bg = getBackground(bgid);
        ui.bgColor.style.background = bg.color;
        ui.filterColor.style.background = bg.filter;
        ui.inRotation.checked = bg.selected;
        ui.bgMode.value = bg.smartFit ? 'auto' : bg.mode;
        ui.bgRotateTime.value = app.data.rotateMinutes;
        ui.bgShuffle.checked = app.data.random;
        ui.deleteBackgroundBtn.disabled = bg.default;

        document.querySelectorAll('.remoteApiOptions').forEach((el) => {
            el.style.display = 'none';
        });
        ui.remoteApiBgRerollBtn.style.display = 'none';

        if (bg.type === 'remoteApi') {
            const optionsId = `${bg.subType}Options`;
            if (ui[optionsId]) {
                ui[optionsId].style.display = 'block';
            } else {
                console.warn('No remote api options for', bg.subType);
            }

            const rerollFunc = remoteApiBGFunctions[bg.subType]?.rerollBg;
            if (rerollFunc) {
                ui.remoteApiBgRerollBtn.style.display = 'block';
            }
        }


        if (bg.subType === 'wallhavenRandomizer') {
            ui.wallhavenQuery.value = bg.queryParams.q;
            ui.wallhavenCategoryGeneral.checked = bg.queryParams.categories[0] === '1';
            ui.wallhavenCategoryAnime.checked = bg.queryParams.categories[1] === '1';
            ui.wallhavenCategoryPeople.checked = bg.queryParams.categories[2] === '1';
            ui.wallhavenPuritySfw.checked = bg.queryParams.purity[0] === '1';
            ui.wallhavenPuritySketchy.checked = bg.queryParams.purity[1] === '1';
            ui.wallhavenPurityNsfw.checked = bg.queryParams.purity[2] === '1';
            ui.wallhavenSort.value = bg.queryParams.sorting;
            ui.wallhavenOrder.value = bg.queryParams.order;
            ui.wallhavenTopRangeContainer.style.display = bg.queryParams.sorting === 'toplist' ? 'block' : 'none';
            ui.wallhavenTopRange.value = bg.queryParams.topRange;
            ui.wallhavenMinResolution.value = bg.queryParams.atleast;
            ui.wallhavenExactResolution.value = bg.queryParams.resolutions.join(', ');
            ui.wallhavenRatios.value = bg.queryParams.ratios.join(', ');
            ui.wallhavenColorsGrid.querySelectorAll('input').forEach((el) => {
                el.checked = (bg.queryParams.colors || []).includes(el.dataset.color);
            });
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
    ui.addWallhavenRandomizerBtn.addEventListener('click', createWallhavenRandomizer);
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

        colorPicker.onChange(debounce((color) => {
            const hex = '#' + pad(color.r.toString(16), 2) + pad(color.g.toString(16), 2) +
                pad(color.b.toString(16), 2);
            ui.bgColor.style.background = hex;
            currentBg.color = hex;
            changeBackgroundPreview();
        }, 20));
    });

    ui.filterColor.addEventListener('click', (e) => {
        const colorPicker = setupColorPicker(e, ui.filterColor, true);
        const rgb = ui.filterColor.style.background.match(/[0-9.]+/g);
        colorPicker.setColor(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]), parseFloat(rgb[3]));
        const currentBg = getBackground(currentBgId);

        colorPicker.onChange(debounce((color) => {
            const colorStr = `rgba(${color.r},${color.g},${color.b},${color.a})`;
            ui.filterColor.style.background = colorStr;
            currentBg.filter = colorStr;
            changeBackgroundPreview();
        }, 20));
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
        if (ui.bgMode.value === 'auto') {
            currentBg.smartFit = true;
            currentBg.mode = 'fill';
        } else {
            currentBg.smartFit = false;
            currentBg.mode = ui.bgMode.value;
        }
        changeBackgroundPreview();
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenQuery.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.q = ui.wallhavenQuery.value.trim();
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenQueryInfo.addEventListener('click', () => {
        app.confirm(
            'Typing one keyword works best. Use `+` just before keywords to require multiple. Use `-` just before keywords to exclude. ' +
            'See <a href="https://wallhaven.cc/help/api#search" target="_blank">here</a> for the full query documentation.'
        );
    });

    const makeBitCheckboxOnChange = param => (e) => {
        const checkbox = e.currentTarget;
        const currentBg = getBackground(currentBgId);
        const bits = currentBg.queryParams[param]?.split('');
        bits[checkbox.dataset.bitidx] = checkbox.checked ? "1" : "0";
        currentBg.queryParams[param] = bits.join('');
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    };
    const wallhavenCategoryOnChange = makeBitCheckboxOnChange('categories');
    const wallhavenPurityOnChange = makeBitCheckboxOnChange('purity');
    ui.wallhavenCategoryGeneral.addEventListener('change', wallhavenCategoryOnChange);
    ui.wallhavenCategoryAnime.addEventListener('change', wallhavenCategoryOnChange);
    ui.wallhavenCategoryPeople.addEventListener('change', wallhavenCategoryOnChange);
    ui.wallhavenPuritySfw.addEventListener('change', wallhavenPurityOnChange);
    ui.wallhavenPuritySketchy.addEventListener('change', wallhavenPurityOnChange);
    ui.wallhavenPurityNsfw.addEventListener('change', async (e) => {
        const checkbox = e.currentTarget;
        if (checkbox.checked && !localStorage.wallhavenApiKey) {
            const key = await prompt(
                'Wallhaven Api Key',
                'To get Wallhaven NSFW wallpapers, you must have a Wallhaven account and API key. Go to ' +
                    '<a href="https://wallhaven.cc/settings/account" target="_blank">your wallhaven account</a> ' +
                    'to get one and enter it below.',
                {
                    placeholder: 'Wallhaven API Key'
                }
            );
            if (!key) {
                checkbox.checked = false;
                return;
            }
            localStorage.wallhavenApiKey = key;
        }
        wallhavenPurityOnChange({ ...e, currentTarget: checkbox });
    });

    ui.wallhavenSort.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.sorting = ui.wallhavenSort.value;
        ui.wallhavenTopRangeContainer.style.display = ui.wallhavenSort.value === 'toplist' ? 'block' : 'none';
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenOrder.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.order = ui.wallhavenOrder.value;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenTopRange.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.topRange = ui.wallhavenTopRange.value;
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenMinResolution.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.atleast = ui.wallhavenMinResolution.value.trim();
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenExactResolution.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.resolutions = ui.wallhavenExactResolution.value.trim().split(/\s*,\s*/);
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenRatios.addEventListener('change', () => {
        const currentBg = getBackground(currentBgId);
        currentBg.queryParams.ratios = ui.wallhavenRatios.value.trim().split(/\s*,\s*/);
        saveData();
        chrome.runtime.sendMessage({action: 'reload'});
    });

    ui.wallhavenColorsGrid.querySelectorAll('input').forEach((el) => {
        el.addEventListener('change', (e) => {
            const targetColor = e.target?.dataset?.color;
            if (targetColor) {
                const currentBg = getBackground(currentBgId);
                const colorsArr = currentBg.queryParams.colors || [];
                if (e.target.checked) {
                    colorsArr.push(targetColor);
                    currentBg.queryParams.colors = colorsArr;
                } else {
                    currentBg.queryParams.colors = colorsArr.filter(color => color !== targetColor);
                }
                saveData();
                chrome.runtime.sendMessage({action: 'reload'});
            }
        });
    });

    ui.remoteApiBgRerollBtn.addEventListener('click', async () => {
        const currentBg = getBackground(currentBgId);
        const rerollFunc = remoteApiBGFunctions[currentBg.subType]?.rerollBg;
        if (rerollFunc) {
            await rerollFunc(currentBg, { manual: true });
            saveData();
            chrome.runtime.sendMessage({action: 'reload'});
            app.rerenderDesktopProperties();
        } else {
            console.warn('No reroll function for', currentBg.subType);
        }
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

