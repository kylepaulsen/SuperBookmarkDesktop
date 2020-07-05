/* global chrome, idbKeyval, app */
{
    const {saveData, openModal, closeModal} = app;
    const {getUiElements, selectImageFromDisk, getFaviconImageUrl, hide, show,
        folderImage, documentImage, getDataset, clearIconObjectUrlCacheForId} = app.util;

    const content = document.createElement('div');
    content.innerHTML = `
        <div>
            <div class="row">
                <div>
                    <div class="icon" data-id="iconBtn">
                        <img src="" data-id="icon" alt="">
                    </div>
                    <button class="iconBtn" data-id="changeIconBtn">Change Icon</button>
                    <button class="iconBtn" data-id="revertIconBtn">Revert Icon</button>
                </div>
                <div data-id="folderUi">
                    <div class="label">Folder Name</div>
                    <input data-id="folderName" placeholder="Folder Name" class="input">
                </div>
                <div data-id="bookmarkUi">
                    <div class="label" data-id="bmNameLabel">Bookmark Name</div>
                    <input data-id="bmName" placeholder="Bookmark Name" class="input">
                    <div class="label" data-id="bmUrlLabel">Bookmark URL</div>
                    <input data-id="bmUrl" placeholder="Bookmark URL" class="input">
                </div>
            </div>
        </div>
        <div class="buttons">
            <button class="cancelBtn btn" data-id="cancelBtn">Cancel</button>
            <button class="applyBtn btn defaultBtn" data-id="applyBtn">Apply</button>
        </div>
    `;

    const ui = getUiElements(content);

    let context;
    let deleteImage;
    let blobToSave;
    let blobImgUrl;
    let modalOpen;

    const loadIconFromDisk = async () => {
        blobToSave = await selectImageFromDisk();
        blobImgUrl = URL.createObjectURL(blobToSave);
        ui.icon.src = blobImgUrl;
        show(ui.revertIconBtn);
        hide(ui.changeIconBtn);
    };

    const close = () => {
        blobImgUrl = undefined;
        blobToSave = undefined;
        closeModal();
        modalOpen = false;
    };
    const apply = () => {
        const icon = getDataset(context);
        const iconId = icon.id + ''; // must be a string.

        if (icon.type === 'folder') {
            icon.name = ui.folderName.value;
            chrome.bookmarks.update(iconId, {title: icon.name});
        } else {
            icon.name = ui.bmName.value;
            let url = ui.bmUrl.value || 'about:blank';
            url = url.includes(':') ? url : 'http://' + url;
            if (icon.type === 'document') {
                chrome.bookmarks.update(iconId, {title: icon.name});
            } else {
                icon.url = url;
                chrome.bookmarks.update(iconId, {title: icon.name, url: icon.url});
            }
        }
        if (blobToSave) {
            clearIconObjectUrlCacheForId(iconId);
            idbKeyval.set(iconId, blobToSave).then(() => {
                blobToSave = undefined;
                saveData();
            });
        } else {
            if (deleteImage) {
                clearIconObjectUrlCacheForId(iconId);
                idbKeyval.delete(iconId);
            }
        }

        close();
        chrome.runtime.sendMessage({action: 'reload'});
        app.debouncedRender();
    };

    ui.cancelBtn.addEventListener('click', close);
    ui.applyBtn.addEventListener('click', apply);
    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 13) { // enter
                const focusedEl = document.activeElement;
                if (focusedEl.tagName === 'INPUT') {
                    focusedEl.blur();
                } else {
                    apply();
                }
            } else if (e.keyCode === 27) { // esc
                close();
            }
        }
    });

    ui.iconBtn.addEventListener('click', loadIconFromDisk);
    ui.changeIconBtn.addEventListener('click', loadIconFromDisk);

    ui.revertIconBtn.addEventListener('click', () => {
        const icon = getDataset(context);
        ui.icon.src = getFaviconImageUrl(icon.url);
        if (icon.type === 'folder') {
            ui.icon.src = folderImage;
        }
        if (icon.type === 'document') {
            ui.icon.src = documentImage;
        }
        deleteImage = true;
        blobToSave = undefined;
        blobImgUrl = undefined;
        hide(ui.revertIconBtn);
        show(ui.changeIconBtn);
    });

    app.openBookmarkProperties = (iconEl, highlightFirst) => {
        context = iconEl;
        blobImgUrl = undefined;
        blobToSave = undefined;
        deleteImage = false;

        const iconElUi = getUiElements(context);
        const customImage = !iconElUi.image.src.startsWith('chrome');
        const icon = getDataset(context);
        if (customImage) {
            show(ui.revertIconBtn);
            hide(ui.changeIconBtn);
        } else {
            hide(ui.revertIconBtn);
            show(ui.changeIconBtn);
        }
        if (icon.type === 'folder') {
            show(ui.folderUi);
            hide(ui.bookmarkUi);
            ui.icon.src = customImage ? iconElUi.image.src : folderImage;
            ui.folderName.value = icon.name;
            openModal(content);
            if (highlightFirst) {
                ui.folderName.select();
            }
        } else {
            hide(ui.folderUi);
            show(ui.bookmarkUi);
            if (icon.type === 'document') {
                ui.icon.src = customImage ? iconElUi.image.src : documentImage;
                ui.bmNameLabel.textContent = 'Document Name';
                hide(ui.bmUrlLabel);
                hide(ui.bmUrl);
            } else {
                ui.icon.src = customImage ? iconElUi.image.src : getFaviconImageUrl(icon.url);
                ui.bmUrl.value = icon.url === 'about:blank' ? '' : icon.url;
                ui.bmNameLabel.textContent = 'Bookmark Name';
                show(ui.bmUrlLabel);
                show(ui.bmUrl);
            }
            ui.bmName.value = icon.name;
            openModal(content);
            if (highlightFirst) {
                ui.bmName.select();
            }
        }

        modalOpen = true;
    };
}
