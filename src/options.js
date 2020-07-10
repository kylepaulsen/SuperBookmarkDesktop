/* global chrome, app */
{
    const {openModal, closeModal} = app;
    const {getUiElements, applyStylesheet, getParentElementWithClass, semverIsBigger} = app.util;

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
                <div class="optionsTab" data-id="helpTab" data-page="helpPage">Help</div>
                <div class="optionsTab" data-id="aboutTab" data-page="aboutPage">About</div>
                <div class="optionsTabsFiller"></div>
            </div>
            <div class="tabPages">
                <div class="tabPage currentPage" data-id="optionsPage">
                    <div class="option">
                        <div class="optionText">Remember opened folder and document windows:</div>
                        <div class="optionUi">
                            <input type="checkbox" data-id="rememberWindows">
                        </div>
                    </div>
                    <div class="option">
                        <div class="optionText">Window close button on right:</div>
                        <div class="optionUi">
                            <input type="checkbox" data-id="windowCloseRight">
                        </div>
                    </div>
                    <div class="option">
                        <div class="optionText">Hide "Bookmarks Bar" bookmarks on desktop:</div>
                        <div class="optionUi">
                            <input type="checkbox" data-id="hideBookmarksBarBookmarks">
                        </div>
                    </div>
                    <div class="option">
                        <div class="optionText">Use double click to open:</div>
                        <div class="optionUi">
                            <input type="checkbox" data-id="useDoubleClicks">
                        </div>
                    </div>
                    <div class="option">
                        <div class="optionText">Hide bookmark search button:</div>
                        <div class="optionUi">
                            <input type="checkbox" data-id="hideBookmarkSearchButton">
                        </div>
                    </div>
                    <div class="option">
                        <div class="textareaContainer">
                            <div class="label">Custom Styles (CSS):</div>
                            <div>
                                <textarea data-id="customCss" placeholder="${customCssPlaceholder}"></textarea>
                            </div>
                        </div>
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
                    <div>
                        <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
                        <input type="hidden" name="cmd" value="_s-xclick">
                        <input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----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-----END PKCS7-----
                        ">
                        <div style="display: flex">
                            <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">
                            <div style="font-size: 20px; margin-left: 10px;">Like this extension? Please buy me food! &#x1F35C</div>
                        </div>
                        <img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">
                        </form>
                    </div>
                    <div>
                        <h3 class="changelogTitle">Changelog</h3>
                        <div class="changelogEntry featured">
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

        localStorage.userStyles = ui.customCss.value;
        chrome.runtime.sendMessage({action: 'reloadOptions'});
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

        const defaultCustomCss = '/*' + customCssPlaceholder.replace('/*', '').replace('*/', '') + '\n*/';
        ui.customCss.value = localStorage.userStyles || defaultCustomCss;
        applyStylesheet(localStorage.userStyles || '', 'userStyles');
        if (rerender) {
            app.debouncedRender();
        }
    };

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
        } else {
            localStorage.openedWindows = '';
        }
    };

    const reopenWindows = async () => {
        const openedWindows = JSON.parse(localStorage.openedWindows || '[]');
        for (let x = 0; x < openedWindows.length; x++) {
            const win = openedWindows[x];
            if (win.type === 'document') {
                await app.editDocument(win.id, win);
            } else if (win.type === 'folder') {
                await app.openFolder(win.id, null, win);
            }
        }
    };
    reopenWindows();

    ui.windowCloseRight.addEventListener('change', () => {
        save();
        load();
    });

    ui.hideBookmarksBarBookmarks.addEventListener('change', () => {
        save();
        load(true);
    });

    ui.useDoubleClicks.addEventListener('change', () => {
        save();
        load();
    });

    ui.hideBookmarkSearchButton.addEventListener('change', () => {
        save();
        load();
    });

    ui.customCss.addEventListener('change', () => {
        save();
        load();
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
        openModal(content);
        load();
        showTab(ui.optionsTab);
        modalOpen = true;
    };

    if (window.location.hash.includes('options')) {
        app.openOptions();
        window.location.hash = '';
    }

    const currentExtensionVersion = chrome.runtime.getManifest().version;
    const currentStoredVersion = localStorage.version || '0.0.0';
    ui.version.textContent = currentExtensionVersion;
    if (!app.firstTimeUse && semverIsBigger(currentExtensionVersion, currentStoredVersion)) {
        ui.updateMessage.style.display = 'block';
        app.openOptions();
        showTab(ui.aboutTab);
        setTimeout(() => {
            localStorage.version = currentExtensionVersion;
        }, 1000);
    } else if (app.firstTimeUse) {
        app.openOptions();
        showTab(ui.helpTab);
        localStorage.version = currentExtensionVersion;
    }
}
