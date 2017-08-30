/* global app */
{
    const {openModal, closeModal} = app;
    const {getUiElements, selectImageFromDisk} = app.util;

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="desktopProperties">
            <div class="backgroundUi">
                <div class="backgroundProperties"></div>
                <div class="backgroundSelector"></div>
            </div>
        </div>
        <div class="buttons">
            <div class="groupStuff">
                <div class="rotateOptions">
                    <div>
                        <div class="label">Change background after:</div>
                        <input class="input bgRotateTime" type="number" value="20" data-id="bgRotateTime"> minutes.
                    </div>
                    <div class="shuffleDiv">
                        <div class="label">Shuffle?</div>
                        <input class="input bgShuffle" type="checkbox" data-id="bgShuffle">
                    </div>
                </div>
                <button class="addBackgroundBtn btn" data-id="addBackgroundBtn">Add Background</button>
            </div>
            <div class="groupStuffRight">
                <button class="cancelBtn btn" data-id="cancelBtn">Cancel</button>
                <button class="applyBtn btn" data-id="applyBtn">Apply</button>
            </div>
        </div>
    `;

    const ui = getUiElements(content);

    const loadDesktopFromDisk = async () => {
        const blobToSave = await selectImageFromDisk();
    };

    const close = () => {
        closeModal();
    };
    const apply = () => {
        close();
    };

    ui.addBackgroundBtn.addEventListener('click', loadDesktopFromDisk);
    ui.cancelBtn.addEventListener('click', close);
    ui.applyBtn.addEventListener('click', apply);
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 13) { // enter
            apply();
        } else if (e.keyCode === 27) { // esc
            close();
        }
    });

    app.openDesktopProperties = () => {
        openModal(content);
    };
}

