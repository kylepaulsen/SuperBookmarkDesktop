/* global chrome, idbKeyval, app */
{
    const {saveData, openModal, closeModal} = app;
    const {getUiElements, selectImageFromDisk, getFaviconImageUrl, clampText, hide, show} = app.util;

    const content = document.createElement('div');
    content.innerHTML = `
        <div class="bookmarkProperties">
            <div class="row">
                <div class="iconManagement">
                    <div class="icon" data-id="iconBtn">
                        <img src="" data-id="icon" alt="">
                    </div>
                    <button class="iconBtn" data-id="changeIconBtn">Change Icon</button>
                    <button class="iconBtn" data-id="revertIconBtn">Revert Icon</button>
                </div>
                <div class="data">
                    <div class="label">Bookmark Name</div>
                    <input data-id="bmName" placeholder="Bookmark Name" class="input">
                    <div class="label">Bookmark URL</div>
                    <input data-id="bmUrl" placeholder="Bookmark URL" class="input">
                </div>
            </div>
        </div>
        <div class="buttons">
            <button class="cancelBtn btn" data-id="cancelBtn">Cancel</button>
            <button class="applyBtn btn" data-id="applyBtn">Apply</button>
        </div>
    `;

    const ui = getUiElements(content);

    let context;
    let deleteImage;
    let blobToSave;
    let blobImgUrl;

    const loadIconFromDisk = async () => {
        blobToSave = await selectImageFromDisk();
        blobImgUrl = URL.createObjectURL(blobToSave);
        ui.icon.src = blobImgUrl;
    };

    const close = () => {
        blobImgUrl = undefined;
        blobToSave = undefined;
        closeModal();
    };
    const apply = () => {
        const icon = app.data.icons[context.dataset.id];
        const iconEl = icon.element;
        if (iconEl) {
            if (blobImgUrl) {
                iconEl.querySelector('.icon').src = blobImgUrl;
                icon.image = blobImgUrl;
            }
            icon.name = ui.bmName.value;
            icon.url = ui.bmUrl.value;
            context.dataset.url = icon.url;
            context.dataset.name = icon.name;
            iconEl.title = icon.name;
            iconEl.querySelector('.bookmarkLink').href = icon.url;
            clampText(iconEl.querySelector('.name'), icon.name);
            chrome.bookmarks.update(iconEl.dataset.id, {title: icon.name, url: icon.url});
            if (blobToSave) {
                idbKeyval.set(iconEl.dataset.id, blobToSave).then(() => {
                    blobToSave = undefined;
                    saveData();
                });
            } else {
                saveData();
            }
            if (deleteImage) {
                idbKeyval.delete(context.dataset.id).then(saveData);
                try {
                    URL.revokeObjectURL(icon.image);
                } catch (e) {}
                icon.image = undefined;
                iconEl.querySelector('.icon').src = getFaviconImageUrl(icon.url);
            }
        }
        close();
    };

    ui.cancelBtn.addEventListener('click', close);
    ui.applyBtn.addEventListener('click', apply);
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 13) { // enter
            apply();
        } else if (e.keyCode === 27) { // esc
            close();
        }
    });

    ui.iconBtn.addEventListener('click', loadIconFromDisk);
    ui.changeIconBtn.addEventListener('click', loadIconFromDisk);

    ui.revertIconBtn.addEventListener('click', () => {
        const icon = app.data.icons[context.dataset.id];
        ui.icon.src = getFaviconImageUrl(icon.url);
        deleteImage = true;
        blobToSave = undefined;
        blobImgUrl = undefined;
        hide(ui.revertIconBtn);
    });

    app.openBookmarkProperties = (ctx) => {
        context = ctx;
        blobImgUrl = undefined;
        blobToSave = undefined;
        deleteImage = false;

        const icon = app.data.icons[context.dataset.id];
        if (icon.image) {
            show(ui.revertIconBtn);
            hide(ui.changeIconBtn);
        } else {
            hide(ui.revertIconBtn);
            show(ui.changeIconBtn);
        }
        ui.icon.src = icon.image || getFaviconImageUrl(icon.url);
        ui.bmName.value = icon.name;
        ui.bmUrl.value = icon.url;

        openModal(content);
    };
}
