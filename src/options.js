/* global app */
{
    const {openModal, closeModal} = app;
    const {getUiElements, applyStylesheet, hide, show} = app.util;

    const customCssPlaceholder = [
        '/* no transparent windows */',
        '.window .window-top-nav, .window .window-middle, .window .window-bottom {',
        '    background: rgba(255, 255, 255, 1.0);',
        '}'
    ].join('\n');

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="optionsModal">
            <div class="optionsTabs">
                <div class="optionsTabStartFiller"></div>
                <div class="optionsTab currentTab" data-id="optionsTab" data-page="optionsPage">Options</div>
                <div class="optionsTab" data-id="aboutTab" data-page="aboutPage">About</div>
                <div class="optionsTabsFiller"></div>
            </div>
            <div class="tabPages">
                <div class="tabPage currentPage" data-id="optionsPage">
                    <div class="option">
                        <div class="optionText">Remember opened windows:</div>
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
                        <div class="textareaContainer">
                            <div class="label">Custom Styles (CSS):</div>
                            <div>
                                <textarea data-id="customCss" placeholder="${customCssPlaceholder}"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tabPage" data-id="aboutPage">
                    about
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

    ui.optionsTab.addEventListener('click', () => {
        showTab(ui.optionsTab);
    });
    ui.aboutTab.addEventListener('click', () => {
        showTab(ui.aboutTab);
    });
    ui.closeBtn.addEventListener('click', close);

    ui.rememberWindows.addEventListener('change', () => {
        localStorage.rememberWindows = ui.rememberWindows.checked ? '1' : '';
    });
    if (localStorage.rememberWindows) {
        ui.rememberWindows.checked = true;
    }
    window.addEventListener('beforeunload', () => {
        if (localStorage.rememberWindows) {
            const windows = [];
            document.querySelectorAll('.window').forEach((win) => {
                windows.push({
                    x: win.offsetLeft,
                    y: win.offsetTop,
                    width: win.offsetWidth,
                    height: win.offsetHeight,
                    id: win.dataset.id,
                    type: win.dataset.document ? 'document' : 'folder'
                });
            });
            localStorage.openedWindows = JSON.stringify(windows);
        } else {
            localStorage.openedWindows = '';
        }
    });

    const reopenWindows = () => {
        const openedWindows = JSON.parse(localStorage.openedWindows || '[]');
        openedWindows.forEach((win) => {
            if (win.type === 'document') {
                app.editDocument(win.id, win);
            } else if (win.type === 'folder') {
                app.openFolder(win.id, null, win);
            }
        });
    };
    reopenWindows();

    ui.windowCloseRight.addEventListener('change', () => {
        if (ui.windowCloseRight.checked) {
            applyStylesheet('.title-bar{flex-direction: row-reverse;}', 'windowCloseRight');
            localStorage.windowCloseRight = '1';
        } else {
            applyStylesheet('.title-bar{flex-direction: row;}', 'windowCloseRight');
            localStorage.windowCloseRight = '';
        }
    });
    if (localStorage.windowCloseRight) {
        applyStylesheet('.title-bar{flex-direction: row-reverse;}', 'windowCloseRight');
        ui.windowCloseRight.checked = true;
    }

    ui.customCss.addEventListener('change', () => {
        applyStylesheet(ui.customCss.value, 'userStyles');
        localStorage.userStyles = ui.customCss.value;
    });
    applyStylesheet(localStorage.userStyles || '', 'userStyles');

    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 13 || e.keyCode === 27) { // enter or esc
                const focusedEl = document.activeElement;
                if (focusedEl.tagName === 'INPUT') {
                    focusedEl.blur();
                } else {
                    close();
                }
            }
        }
    });

    app.openOptions = () => {
        openModal(content);
        modalOpen = true;
    };
}
