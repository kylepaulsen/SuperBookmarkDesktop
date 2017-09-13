/* global app, idbKeyval, makeColorPicker */
{
    const {openModal, closeModal, saveData} = app;
    const {getUiElements, selectImageFromDisk, getParentElementWithClass, pad, updateBackground,
        setBackgroundStylesFromMode, debounce, createBG, markupToElement, getNextBgInCycle, loadImage} = app.util;

    const makeBgTile = (bg) => {
        return `
            <div class="bgTile${bg.selected ? ' selected' : ''}" data-bgid="${bg.id}">
                <div class="aspect16-9">
                    <div class="aspect-container">
                        <img src="${bg.image}" alt="" draggable="false">
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
                                    <div class="pageSizeRatio" data-id="pageSizeRatio"></div>
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
                    </div>
                    <div class="bottomButtons">
                        <button class="btn" data-id="deleteBackgroundBtn">Delete Background</button>
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
                <button class="addBackgroundBtn btn" data-id="addBackgroundBtn">Add Background</button>
                <button class="applyBtn btn" data-id="applyBtn">Close</button>
            </div>
        </div>
    `;
    const ui = getUiElements(content);

    let modalOpen;
    let currentBg;

    const loadDesktopFromDisk = async () => {
        const blobToSave = await selectImageFromDisk();
        const imageSrc = URL.createObjectURL(blobToSave);
        const newBg = createBG(app.data.backgrounds.length, imageSrc);
        await idbKeyval.set(newBg.id, blobToSave);
        app.data.backgrounds.push(newBg);
        saveData();

        const newBgTile = markupToElement(makeBgTile(newBg));
        await loadImage(imageSrc, false);
        ui.userBackgroundsSection.appendChild(newBgTile);
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

    const changeBackgroundPreview = (bg = currentBg) => {
        const maxHeight = 250;
        let previewWidth = ui.backgroundPreviewSizeRef.offsetWidth;
        let previewHeight = window.innerHeight * previewWidth / window.innerWidth;
        if (previewHeight > maxHeight) {
            previewHeight = maxHeight;
            previewWidth = window.innerWidth * maxHeight / window.innerHeight;
        }
        ui.pageSizeRatio.style.width = previewWidth + 'px';
        ui.pageSizeRatio.style.height = previewHeight + 'px';

        ui.previewPageBG.style.backgroundColor = bg.color;
        ui.previewBG.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image})`;
        setBackgroundStylesFromMode(ui.previewBG, bg.mode);
        if (bg.mode === 'tile' || bg.mode === 'center') {
            ui.previewBG.style.backgroundSize = previewWidth * 0.7 + 'px';
        }
        updateBackground(bg);
    };

    const updateInputs = (bg = currentBg) => {
        ui.bgColor.style.background = bg.color;
        ui.filterColor.style.background = bg.filter;
        ui.inRotation.checked = bg.selected;
        ui.bgMode.value = bg.mode;
        ui.bgRotateTime.value = app.data.rotateMinutes;
        ui.bgShuffle.checked = app.data.random;
        ui.deleteBackgroundBtn.disabled = bg.default;
    };

    const changeCheckmarks = (container, checked = false) => {
        const bgTiles = container.querySelectorAll('.bgTile');
        bgTiles.forEach((bgTile) => {
            const bg = app.data.backgrounds.find((bg) => bg.id === bgTile.dataset.bgid);
            bgTile.querySelector('.bgCheckbox').checked = checked;
            bg.selected = checked;
            updateSelected(bgTile, bg);
            updateInputs();
        });
        saveData();
    };

    const updateSelected = (el, bg) => {
        if (bg.selected) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    };

    const close = () => {
        closeModal();
        removeColorPickers({target: document.body});
        modalOpen = false;
    };
    const apply = () => {
        saveData();
        close();
    };
    ui.addBackgroundBtn.addEventListener('click', loadDesktopFromDisk);
    ui.applyBtn.addEventListener('click', apply);
    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 13 || e.keyCode === 27) { // enter or esc
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
            const bg = app.data.backgrounds.find((bg) => bg.id === bgTile.dataset.bgid);
            if (e.target.classList.contains('bgCheckbox')) {
                bg.selected = e.target.checked;
                updateSelected(bgTile, bg);
                updateInputs();
                saveData();
            } else {
                currentBg = bg;
                updateInputs();
                changeBackgroundPreview();
            }
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
        }
    };

    const setupColorPicker = (e, btn, alpha = false) => {
        const colorPicker = makeColorPicker(alpha);
        colorPicker.container.style.left = btn.offsetLeft + 'px';
        colorPicker.container.style.top = btn.offsetTop + 'px';
        document.body.appendChild(colorPicker.container);

        window.addEventListener('mousedown', removeColorPickers);
        return colorPicker;
    };

    ui.bgColor.addEventListener('click', (e) => {
        const colorPicker = setupColorPicker(e, ui.bgColor, false);
        const rgb = ui.bgColor.style.background.match(/[0-9]+/g);
        colorPicker.setColor(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));

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

        colorPicker.onChange((color) => {
            const colorStr = `rgba(${color.r},${color.g},${color.b},${color.a})`;
            ui.filterColor.style.background = colorStr;
            currentBg.filter = colorStr;
            changeBackgroundPreview();
        });
    });

    ui.inRotation.addEventListener('change', () => {
        currentBg.selected = ui.inRotation.checked;
        const bgel = ui.backgroundSelector.querySelectorAll('.bgTile').find((el) => el.dataset.bgid === currentBg.id);
        bgel.querySelector('.bgCheckbox').checked = currentBg.selected;
        updateSelected(bgel, currentBg);
    });

    ui.bgMode.addEventListener('change', () => {
        currentBg.mode = ui.bgMode.value;
        changeBackgroundPreview();
    });

    ui.deleteBackgroundBtn.addEventListener('click', async () => {
        const confirmBtns = [
            'Do It!',
            {text: 'No Way!', value: false, default: true}
        ];
        if (await app.confirm('Really? Delete this backgound?', confirmBtns)) {
            const nextBg = getNextBgInCycle(localStorage.lastBgId, app.data.backgrounds, app.data.random);

            localStorage.lastRotation = Date.now();
            idbKeyval.delete(currentBg.id);
            const bgTile = ui.backgroundSelector.querySelectorAll('.bgTile').find((el) => {
                return el.dataset.bgid === currentBg.id;
            });
            bgTile.parentElement.removeChild(bgTile);
            URL.revokeObjectURL(currentBg.image);
            app.data.backgrounds = app.data.backgrounds.filter((bg) => bg.id !== currentBg.id);

            if (nextBg) {
                currentBg = nextBg;
                updateBackground(nextBg);
                app.saveData();
                updateInputs();
                changeBackgroundPreview();
            }
        }
    });

    ui.bgRotateTime.addEventListener('change', () => {
        app.data.rotateMinutes = Math.max(Math.floor(ui.bgRotateTime.value), 1);
        localStorage.lastRotation = Date.now();
    });

    ui.bgShuffle.addEventListener('change', () => {
        app.data.random = ui.bgShuffle.checked;
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

    app.openDesktopProperties = async () => {
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
        if (localStorage.userBgsCollapsed === 'false') {
            ui.userBackgroundsSection.style.maxHeight = 'none';
        } else {
            ui.collapseUserBgs.querySelector('.arrow').classList.add('right');
            ui.userBackgroundsSection.classList.add('collapsed');
            ui.userBackgroundsSection.style.maxHeight = 0;
        }

        currentBg = app.data.background;
        updateInputs();
        changeBackgroundPreview();
    };
}

