/* global chrome, app */
{
    const {openModal, closeModal} = app;
    const {getUiElements, applyStylesheet, getParentElementWithClass, semverIsBigger} = app.util;
    const {saveBrowserSyncData, loadBrowserSyncData, exportBackupFile, importBackupFile} = app.backup;

    const customCssPlaceholder = [
        '/* no transparent windows */',
        '.window .window-top-nav, .window .window-middle, .window .window-bottom {',
        '    background: rgba(255, 255, 255, 1.0);',
        '}'
    ].join('\n');

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="optionsModal">
            <div class="optionsTabs" data-id="tabs">
                <div class="optionsTabStartFiller"></div>
                <div class="optionsTab currentTab" data-id="optionsTab" data-page="optionsPage">Options</div>
                <div class="optionsTab" data-id="backupTab" data-page="backupPage">Backup</div>
                <div class="optionsTab" data-id="helpTab" data-page="helpPage">Help</div>
                <div class="optionsTab" data-id="aboutTab" data-page="aboutPage">About</div>
                <div class="optionsTabsFiller"></div>
            </div>
            <div class="tabPages">
                <div class="tabPage optionsPage currentPage" data-id="optionsPage">
                    <label class="checkboxLabel">
                        <div><input type="checkbox" data-id="rememberWindows"></div>
                        <div>Remember opened folder and document windows</div>
                    </label>
                    <label class="checkboxLabel">
                        <div><input type="checkbox" data-id="windowCloseRight"></div>
                        <div>Window close button on right</div>
                    </label>
                    <label class="checkboxLabel">
                        <div><input type="checkbox" data-id="hideBookmarksBarBookmarks"></div>
                        <div>Hide "Bookmarks Bar" bookmarks on desktop</div>
                    </label>
                    <label class="checkboxLabel">
                        <div><input type="checkbox" data-id="useDoubleClicks"></div>
                        <div>Use double click to open</div>
                    </label>
                    <label class="checkboxLabel">
                        <div><input type="checkbox" data-id="hideBookmarkSearchButton"></div>
                        <div>Hide bookmark search button</div>
                    </label>
                    <div>
                        <div class="label">Wallhaven API Key: <button class="infoBtn" data-id="wallhavenApiKeyInfo">?</button></div>
                        <input type="text" data-id="wallhavenApiKeyInput" placeholder="Wallhaven API Key" style="width: 50%;">
                    </div>
                    <div class="textareaContainer">
                        <div class="label">Custom Styles (CSS):</div>
                        <div>
                            <textarea data-id="customCss" placeholder="${customCssPlaceholder}"></textarea>
                        </div>
                    </div>
                </div>
                <div class="tabPage backupPage" data-id="backupPage">
                    <div>This tab has experimental features.</div>
                    <div class="backupOption">
                        <div>
                            <div class="flex">
                                <h3>Browser Sync</h3>
                                <div class="browserSyncEnabledText" data-id="browserSyncEnabledText">Off</div>
                            </div>
                            <div>Enabling browser sync will backup desktop icon positions, widgets, and option settings to all browsers signed into the same account with this enabled. Unfortunately, there isn't enough space to sync custom background images or icons. Please note that desktop items may render off-screen on screens that are smaller than the one you are currently using.</div>
                        </div>
                        <div><button class="button" data-id="enableBrowserSyncAndLoadButton">Enable and load existing data</button> <button class="button" data-id="enableBrowserSyncAndOverwriteButton">Enable and overwrite existing data</button> <button class="button" data-id="disableBrowserSync">Disable Browser Sync</button></div>
                    </div>
                    <div class="backupOption">
                        <h3>Export Backup File</h3>
                        <div>Click the button below to backup everything to a file that you can load into this extension on a different computer. This file can get large if you are using many custom backgrounds or icons. Please note this only makes a backup of Super Bookmark Desktop related things. It won't make a backup of your actual bookmarks! Your browser can backup bookmarks for you.</div>
                        <div><button class="button" data-id="backupToFileButton">Save Backup File</button></div>
                    </div>
                    <div class="backupOption">
                        <h3>Import Backup File</h3>
                        <div>Click the button below to load a backup file that was created from the "Save Backup File" button above. Please note that desktop items may render off-screen on screens that are smaller than the one you are currently using. <span class="warning">WARNING: This may overwrite icons and settings you already have.</span></div>
                        <div><button class="button" data-id="importBackupFileButton">Import Backup File</button><input type="file" data-id="importFileInput" style="display: none;"></div>
                    </div>
                </div>
                <div class="tabPage" data-id="helpPage">
                    ${app.helpMarkup}
                </div>
                <div class="tabPage" data-id="aboutPage">
                    <div class="updateMessage" data-id="updateMessage">Super Bookmark Desktop was updated! See what changed below.</div>
                    <h3 class="extensionName">Super Bookmark Desktop v<span data-id="version"></span></h3>
                    <div>&copy; Kyle Paulsen (2017-${(new Date()).getFullYear()})</div>
                    <div><a href="https://github.com/kylepaulsen/SuperBookmarkDesktop">Open Source on Github</a></div><br>
                    <div style="margin-bottom: 16px;">
                        <a class="donateBtn" target="_blank" href="https://www.paypal.com/donate/?business=7598UZYTQPWEN&no_recurring=0&item_name=Thanks+for+supporting+my+development+work.+This+motivates+me+to+create+more+cool+things+for+everyone.&currency_code=USD">
                            Donate
                        </a>
                        <span style="font-size: 20px; margin-left: 6px; display: inline-block; transform: translateY(1px);">Like this extension? Please buy me food! 🍜</span>
                    </div>
                    <div>
                        <h3 class="changelogTitle">Changelog</h3>
                        <div class="changelogEntry featured">
                            <b>v1.5.2</b>
                            <ul>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Fixing subreddit background tiles showing wrong image.</li>
                                        <li>Fixing donation button (Thank you for reporting this ❤️).</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.5.1</b>
                            <ul>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Attempting to fix weird reddit fetch bug.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.5.0</b>
                            <ul>
                                <li>
                                    <div>Features</div>
                                    <ul>
                                        <li><b>Updated extension to MV3</b></li>
                                        <li>Add browser sync and backup file support. See options pane. (Experimental)</li>
                                    </ul>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Reddit widget fixes.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.4.1</b>
                            <ul>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Don't allow windows to be placed in negative coordinates.</li>
                                        <li>Fix context menu not working when scrolled down on desktop.</li>
                                        <li>Make subreddit randomizer textbox parse subreddets better.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.4.0</b>
                            <ul>
                                <li>
                                    <div>Features</div>
                                    <ul>
                                        <li><b>Bookmark Quick Search!</b> Press the tab key from the browser's url box when the tab first opens or press the spacebar any other time to open a bookmark search.</li>
                                        <li>Added an option to remove the search button from the top of the page.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.3.0</b>
                            <ul>
                                <li>
                                    <div>Features</div>
                                    <ul>
                                        <li><b>Random Subreddit Backgrounds!</b> Right click somewhere on the desktop and click "Desktop Properties" to add one!</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.2.1</b>
                            <ul>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Fixed folder icons not being sorted alphabetically.</li>
                                        <li>Fixed some cases of overflowing icon names.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.2.0</b>
                            <ul>
                                <li>
                                    <div>Quality of Life</div>
                                    <ul>
                                        <li>Added basic keyboard support. Try pressing tab then using arrow keys.</li>
                                        <li>Reddit Widget: Mark NSFW posts and change default sub to r/popular.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.1.2</b>
                            <ul>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Fixed folders not being able to scroll in Chrome 73. Thanks <a href="https://github.com/mstrater">mstrater</a>!</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.1.1</b>
                            <ul>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Reddit Widget: Fix comment links going to broken reddit pages.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.1.0</b>
                            <ul>
                                <li>
                                    <div>Features</div>
                                    <ul>
                                        <li>Widgets! Right click somewhere on the desktop and click "Add Widget"!</li>
                                        <li>Added a default widget: Analog clock</li>
                                        <li>Added a default widget: Reddit Feed</li>
                                    </ul>
                                </li>
                                <li>
                                    <div>Quality of Life</div>
                                    <ul>
                                        <li>Make "Options" context menu item always open options tab.</li>
                                        <li>Other minor performance improvements to reduce background flicker.</li>
                                    </ul>
                                </li>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Fix losing unsaved changes in docs after certain actions.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.0.2</b>
                            <ul>
                                <li>
                                    <div>Quality of Life</div>
                                    <ul>
                                        <li>Opening js bookmarklet now opens in new tab (instead of doing nothing). Bookmarklets can't be run on new tab page.</li>
                                    </ul>
                                </li>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Only allow deleting things with delete key when not in modal.</li>
                                        <li>Sanitize user input &#x1F61E</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.0.1</b>
                            <ul>
                                <li>
                                    <div>Quality of Life</div>
                                    <ul>
                                        <li>Make text selectable in options tabs for Chrome 62.</li>
                                        <li>Make opening in new tab be a non active tab.</li>
                                        <li>Highlight name input when creating new anything.</li>
                                        <li>Folder breadcrumbs now line break if window is too small.</li>
                                        <li>Icons being moved to desktop start off selected.</li>
                                    </ul>
                                </li>
                                <li>
                                    <div>Bug Fixes</div>
                                    <ul>
                                        <li>Fix saving and closing doc not remembering the window close.</li>
                                        <li>Fix saving doc not updating internal url.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="changelogEntry">
                            <b>v1.0.0</b>
                            <ul>
                                <li>Initial release!</li>
                            </ul>
                        </div>
                    </div>
                    <div class="backgroundImageAttributions">
                        <h3>Background Image Attributions</h3>
                        <div>All default background images are &copy; Kyle Paulsen except for the ones listed below:</div>
                        <div class="imageAttribution">
                            <div class="imageAttributionImg"><img src="backgrounds/aurora-borealis.png"></div>
                            <div class="imageAttributionText">
                                <div>
                                    aurora-borealis.png is by janeb13
                                    <a href="https://pixabay.com/en/aurora-borealis-alaska-space-1181004/">
                                        https://pixabay.com/en/aurora-borealis-alaska-space-1181004/
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div class="imageAttribution">
                            <div class="imageAttributionImg"><img src="backgrounds/clouds.png"></div>
                            <div class="imageAttributionText">
                                <div>
                                    clouds.png is by carloyuen
                                    <a href="https://pixabay.com/en/clouds-mist-a-surname-mountain-2517653/">
                                        https://pixabay.com/en/clouds-mist-a-surname-mountain-2517653/
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div class="imageAttribution">
                            <div class="imageAttributionImg"><img src="backgrounds/micro.png"></div>
                            <div class="imageAttributionText">
                                <div>
                                    micro.png is by Max Strater
                                    <a href="http://www.maxstrater.com/">http://www.maxstrater.com/</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="buttons">
                <button class="btn" data-id="closeBtn">Close</button>
            </div>
        </div>
    `;
    const ui = getUiElements(content);
    let modalOpen = false;

    const close = () => {
        closeModal();
        modalOpen = false;
    };

    const showTab = (tab) => {
        document.querySelectorAll('.optionsTab').forEach((tab) => {
            tab.classList.remove('currentTab');
        });
        document.querySelectorAll('.tabPage').forEach((page) => {
            page.classList.remove('currentPage');
        });
        tab.classList.add('currentTab');
        ui[tab.dataset.page].classList.add('currentPage');
    };

    const save = () => {
        if (ui.rememberWindows.checked) {
            localStorage.rememberWindows = '1';
        } else {
            localStorage.rememberWindows = '';
            localStorage.openedWindows = '';
        }

        if (ui.windowCloseRight.checked) {
            localStorage.windowCloseRight = '1';
        } else {
            localStorage.windowCloseRight = '';
        }

        if (ui.hideBookmarksBarBookmarks.checked) {
            localStorage.hideBookmarksBarBookmarks = '1';
        } else {
            localStorage.hideBookmarksBarBookmarks = '';
        }

        if (ui.useDoubleClicks.checked) {
            localStorage.useDoubleClicks = '1';
        } else {
            localStorage.useDoubleClicks = '';
        }

        if (ui.hideBookmarkSearchButton.checked) {
            localStorage.hideBookmarkSearchButton = '1';
        } else {
            localStorage.hideBookmarkSearchButton = '';
        }

        localStorage.wallhavenApiKey = ui.wallhavenApiKeyInput.value;
        localStorage.userStyles = ui.customCss.value;
        chrome.runtime.sendMessage({action: 'reloadOptions'});
        saveBrowserSyncData();
    };

    const load = (rerender = false) => {
        ui.rememberWindows.checked = false;
        if (localStorage.rememberWindows === '1') {
            ui.rememberWindows.checked = true;
        }

        if (localStorage.windowCloseRight) {
            ui.windowCloseRight.checked = true;
            applyStylesheet('.title-bar{flex-direction: row-reverse;}', 'windowCloseRightStyle');
        } else {
            ui.windowCloseRight.checked = false;
            applyStylesheet('.title-bar{flex-direction: row;}', 'windowCloseRightStyle');
        }

        ui.hideBookmarksBarBookmarks.checked = false;
        if (localStorage.hideBookmarksBarBookmarks === '1') {
            ui.hideBookmarksBarBookmarks.checked = true;
        }

        ui.useDoubleClicks.checked = false;
        if (localStorage.useDoubleClicks === '1') {
            ui.useDoubleClicks.checked = true;
        }

        if (localStorage.hideBookmarkSearchButton === '1') {
            ui.hideBookmarkSearchButton.checked = true;
            applyStylesheet('.quickSearchButton{display: none;}', 'bmSearchButtonStyle');
        } else {
            ui.hideBookmarkSearchButton.checked = false;
            applyStylesheet('.quickSearchButton{display: block;}', 'bmSearchButtonStyle');
            if (app.updateQuickSearchButton) {
                app.updateQuickSearchButton();
            }
        }

        ui.wallhavenApiKeyInput.value = localStorage.wallhavenApiKey || '';

        const defaultCustomCss = '/*' + customCssPlaceholder.replace('/*', '').replace('*/', '') + '\n*/';
        ui.customCss.value = localStorage.userStyles || defaultCustomCss;
        applyStylesheet(localStorage.userStyles || '', 'userStyles');
        if (rerender) {
            app.debouncedRender();
        }
    };
    app.rerenderOptions = load;

    ui.tabs.addEventListener('click', (e) => {
        const tab = getParentElementWithClass(e.target, 'optionsTab');
        if (tab) {
            showTab(tab);
        }
    });
    ui.closeBtn.addEventListener('click', close);

    ui.rememberWindows.addEventListener('change', () => {
        save();
        app.rememberOpenWindows();
        load();
    });

    app.rememberOpenWindows = () => {
        if (localStorage.rememberWindows) {
            let windowEls = document.querySelectorAll('.window:not(.widget)');
            const activeWin = document.querySelector('.window.active:not(.widget)');
            if (activeWin) {
                // make the active window last so it shows up in front.
                windowEls = windowEls.filter((win) => !win.classList.contains('active'));
                windowEls.push(activeWin);
            }
            const windows = windowEls.map((win) => {
                return {
                    x: win.offsetLeft,
                    y: win.offsetTop,
                    width: win.offsetWidth,
                    height: win.offsetHeight,
                    id: win.dataset.id,
                    type: win.dataset.type
                };
            });
            localStorage.openedWindows = JSON.stringify(windows);
            saveBrowserSyncData();
        } else {
            localStorage.openedWindows = '';
        }
    };

    const reopenWindows = async () => {
        const openedWindows = JSON.parse(localStorage.openedWindows || '[]');
        for (let x = 0; x < openedWindows.length; x++) {
            const win = openedWindows[x];
            if (win.type === 'document') {
                await app.openDocument(win.id, win);
            } else if (win.type === 'folder') {
                await app.openFolder(win.id, null, win);
            }
        }
    };
    reopenWindows();

    const basicOptionsOnChange = () => {
        save();
        load();
    };

    ui.windowCloseRight.addEventListener('change', basicOptionsOnChange);
    ui.hideBookmarksBarBookmarks.addEventListener('change', () => {
        save();
        load(true);
    });
    ui.useDoubleClicks.addEventListener('change', basicOptionsOnChange);
    ui.hideBookmarkSearchButton.addEventListener('change', basicOptionsOnChange);
    ui.wallhavenApiKeyInput.addEventListener('change', basicOptionsOnChange);
    ui.customCss.addEventListener('change', basicOptionsOnChange);

    ui.wallhavenApiKeyInfo.addEventListener('click', () => {
        app.confirm(
            'A Wallhaven API key can be used to enforce wallpaper search preferences. It also allows searches for ' +
            'NSFW wallpapers. To get one, go to <a href="https://wallhaven.cc/settings/account" target="_blank">' +
            'your wallhaven account</a>.'
        );
    });

    let overwriteBtnOldText = ui.enableBrowserSyncAndOverwriteButton.textContent;
    const enableBrowserSync = () => {
        ui.enableBrowserSyncAndLoadButton.style.display = 'none';
        ui.enableBrowserSyncAndOverwriteButton.style.display = 'none';
        ui.disableBrowserSync.style.display = 'inline-block';
        ui.browserSyncEnabledText.textContent = 'On';
        ui.browserSyncEnabledText.style.color = '#090';
        localStorage.browserSync = '1';
    };

    ui.enableBrowserSyncAndOverwriteButton.addEventListener('click', () => {
        enableBrowserSync();
        ui.enableBrowserSyncAndOverwriteButton.textContent = overwriteBtnOldText;
        saveBrowserSyncData();
    });

    ui.enableBrowserSyncAndLoadButton.addEventListener('click', async () => {
        enableBrowserSync();
        ui.enableBrowserSyncAndOverwriteButton.textContent = overwriteBtnOldText;
        await loadBrowserSyncData();
        app.messageActions.reload();
        app.rerenderOptions();
    });

    ui.disableBrowserSync.addEventListener('click', () => {
        ui.enableBrowserSyncAndLoadButton.style.display = 'inline-block';
        ui.enableBrowserSyncAndOverwriteButton.style.display = 'inline-block';
        ui.disableBrowserSync.style.display = 'none';
        ui.browserSyncEnabledText.textContent = 'Off';
        ui.browserSyncEnabledText.style.color = '#b00';
        localStorage.browserSync = '';
    });

    const checkForBrowserSyncStuff = () => {
        if (localStorage.browserSync) {
            enableBrowserSync();
        } else {
            ui.disableBrowserSync.style.display = 'none';
        }
        chrome.storage.sync.get('sync#').then((data) => {
            if (!data['sync#']) {
                ui.enableBrowserSyncAndLoadButton.style.display = 'none';
                ui.enableBrowserSyncAndOverwriteButton.textContent = 'Enable Browser Sync';
            } else {
                if (!localStorage.browserSync) {
                    ui.enableBrowserSyncAndLoadButton.style.display = 'inline-block';
                }
                ui.enableBrowserSyncAndOverwriteButton.textContent = overwriteBtnOldText;
            }
        });
    };

    ui.backupToFileButton.addEventListener('click', exportBackupFile);
    ui.importBackupFileButton.addEventListener('click', () => {
        ui.importFileInput.click();
    });
    ui.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const fr = new FileReader();
            fr.onload = (e) => {
                importBackupFile(new Uint8Array(e.target.result));
            };
            fr.readAsArrayBuffer(file);
        }
        ui.importFileInput.value = '';
    });

    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 13 || e.keyCode === 27) { // enter or esc
                const focusedEl = document.activeElement;
                if (focusedEl.tagName === 'INPUT') {
                    focusedEl.blur();
                } else if (focusedEl.tagName !== 'TEXTAREA') {
                    close();
                }
            }
        }
    });

    chrome.runtime.onMessage.addListener((msgObj) => {
        if (msgObj.action === 'reloadOptions') {
            load(true);
        }
    });

    load();
    app.openOptions = () => {
        checkForBrowserSyncStuff();
        openModal(content);
        load();
        showTab(ui.optionsTab);
        modalOpen = true;
    };

    if (window.location.hash.includes('options')) {
        app.openOptions();
        window.location.hash = '';
    }

    const firstTimeUse = !localStorage.showedHelp && !localStorage.madeHelp;

    const currentExtensionVersion = chrome.runtime.getManifest().version;
    const currentStoredVersion = localStorage.version || '0.0.0';
    ui.version.textContent = currentExtensionVersion;

    if (!firstTimeUse && semverIsBigger(currentExtensionVersion, currentStoredVersion)) {
        ui.updateMessage.style.display = 'block';
        app.openOptions();
        showTab(ui.aboutTab);
        setTimeout(() => {
            localStorage.version = currentExtensionVersion;
        }, 1000);
    } else if (firstTimeUse) {
        app.openOptions();
        showTab(ui.helpTab);
        localStorage.version = currentExtensionVersion;
        setTimeout(() => {
            localStorage.showedHelp = 1;
        }, 1000);
    }
}
