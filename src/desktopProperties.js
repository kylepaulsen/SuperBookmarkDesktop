/* global app */
{
    const {openModal, closeModal, saveData} = app;
    const {getUiElements, selectImageFromDisk, getParentElementWithClass, pad, updateBackground,
        setBackgroundStylesFromMode} = app.util;

    const makeBgTile = (bg) => {
        return `
            <div class="bgTile${bg.selected ? ' selected' : ''}" data-bgid="${bg.id}">
                <div class="bgTileOverlay"></div>
                <img src="${bg.image}" alt="">
                <input type="checkbox" class="bgCheckbox" ${bg.selected ? 'checked="checked"' : ''}>
            </div>
        `;
    };

    let defaultBgsMarkup = [];
    app.data.backgrounds.forEach((bg) => {
        if (bg.default) {
            defaultBgsMarkup.push(makeBgTile(bg));
        }
    });
    defaultBgsMarkup = defaultBgsMarkup.join('');

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="desktopProperties">
            <div class="backgroundUi">
                <div class="backgroundProperties">
                    <div>
                        <div class="previewBG" data-id="previewBG">
                            <img src="" alt="" class="previewBGFake" data-id="previewBGFake">
                        </div>
                        <div class="topBgOptions">
                            <div>
                                <div class="label">Page Color</div>
                                <input type="color" data-id="bgColor">
                            </div>
                            <div>
                                <div class="label">Filter Color</div>
                                <input type="color" data-id="filterColor">
                                <span><input type="number" data-id="filterOpacity" value="0" min="0" max="100">%</span>
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
                    <div class="defaultBackgrounds">
                        ${defaultBgsMarkup}
                    </div>
                    <div class="userBackgrounds"></div>
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
        console.log(blobToSave);
    };

    const changeBackgroundPreview = (bg = currentBg) => {
        ui.previewBGFake.src = bg.image;
        ui.previewBG.style.borderColor = bg.color;
        ui.previewBG.style.backgroundColor = bg.color;
        ui.previewBG.style.backgroundImage = `linear-gradient(${bg.filter}, ${bg.filter}), url(${bg.image})`;
        setBackgroundStylesFromMode(ui.previewBG, bg.mode);
        updateBackground(bg);
    };

    const updateInputs = (bg = currentBg) => {
        ui.bgColor.value = bg.color;
        const filterParts = bg.filter.split('(')[1].split(',');
        const r = pad(parseInt(filterParts[0]).toString(16), 2);
        const g = pad(parseInt(filterParts[1]).toString(16), 2);
        const b = pad(parseInt(filterParts[2]).toString(16), 2);
        const a = parseFloat(filterParts[3]);
        ui.filterColor.value = `#${r}${g}${b}`;
        ui.filterOpacity.value = Math.floor(a * 100);
        ui.inRotation.checked = bg.selected;
        ui.bgMode.value = bg.mode;
        ui.bgRotateTime.value = app.data.rotateMinutes;
        ui.bgShuffle.checked = app.data.random;
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
            } else {
                currentBg = bg;
                updateInputs();
                changeBackgroundPreview();
            }
        }
    });

    ui.bgColor.addEventListener('input', () => {
        currentBg.color = ui.bgColor.value;
        changeBackgroundPreview();
    });

    const parseFilterColor = () => {
        const color = ui.filterColor.value;
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5), 16);
        const a = Math.min(Math.max(ui.filterOpacity.value / 100, 0), 1);
        currentBg.filter = `rgba(${r},${g},${b},${a})`;
        changeBackgroundPreview();
    };
    ui.filterColor.addEventListener('input', parseFilterColor);
    ui.filterOpacity.addEventListener('change', parseFilterColor);

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

    ui.bgRotateTime.addEventListener('change', () => {
        app.data.rotateMinutes = Math.max(Math.floor(ui.bgRotateTime.value), 1);
        localStorage.lastRotation = Date.now();
    });

    ui.bgShuffle.addEventListener('change', () => {
        app.data.random = ui.bgShuffle.checked;
    });

    app.openDesktopProperties = () => {
        openModal(content);
        modalOpen = true;
        app.modalOverlay.style.background = 'transparent';
        app.modal.style.background = 'rgba(255, 255, 255, 0.8)';

        currentBg = app.data.background;
        updateInputs();
        changeBackgroundPreview();
    };
}

