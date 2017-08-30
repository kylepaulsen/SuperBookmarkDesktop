/* global chrome, hide, show, idbKeyval, saveData, clampText, getFaviconImageUrl */
{
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modalOverlay';
    modalOverlay.dataset.display = 'flex';
    modalOverlay.innerHTML = `
        <div class="modal" data-id="modal">
            <div class="bookmarkProperties" data-id="bookmarkProperties">
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
            <div class="desktopProperties" data-id="desktopProperties">
                <div class="backgroundUi">
                    <div class="backgroundProperties"></div>
                    <div class="backgroundSelector"></div>
                </div>
            </div>
            <div class="buttons" data-id="buttons" data-display="flex">
                <div class="groupStuff hidden" data-id="backgroundUi" data-display="flex">
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
        </div>
        <div class="hidden">
            <input type="file" data-id="file" accept=".jpg,.jpeg,.png,.apng,.gif,.bmp,.webp,.ico,.svg">
        </div>
    `;
    const modalUi = {};
    modalOverlay.querySelectorAll('[data-id]').forEach((item) => {
        modalUi[item.dataset.id] = item;
    });
    document.body.appendChild(modalOverlay);

    const openImageDialog = () => {
        modalUi.file.click();
    };
    modalUi.iconBtn.addEventListener('click', openImageDialog);
    modalUi.changeIconBtn.addEventListener('click', openImageDialog);

    modalUi.file.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];

        if (file && file.type.includes('image/')) {
            const fr = new FileReader();
            fr.onload = (e) => {
                const blob = new Blob([new Uint8Array(e.target.result)]);
                blobImgUrl = URL.createObjectURL(blob);

                modalUi.icon.src = blobImgUrl;
                blobToSave = blob;
            };
            fr.readAsArrayBuffer(file);
        }
        modalUi.file.value = '';
    });

    modalUi.revertIconBtn.addEventListener('click', () => {
        const icon = window.data.icons[context.dataset.id];
        modalUi.icon.src = getFaviconImageUrl(icon.url);
        deleteImage = true;
        blobToSave = undefined;
        blobImgUrl = undefined;
        hide(modalUi.revertIconBtn);
    });

    const closeModal = () => {
        blobImgUrl = undefined;
        blobToSave = undefined;
        hide(modalOverlay);
        modalOpen = false;
    };
    const apply = () => {
        if (!modalOpen) {
            return;
        }
        const icon = window.data.icons[context.dataset.id];
        const iconEl = icon.element;
        if (iconEl) {
            if (blobImgUrl) {
                iconEl.querySelector('.icon').src = blobImgUrl;
                icon.image = blobImgUrl;
            }
            icon.name = modalUi.bmName.value;
            icon.url = modalUi.bmUrl.value;
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
                } catch(e) {}
                icon.image = undefined;
                iconEl.querySelector('.icon').src = getFaviconImageUrl(icon.url);
            }
        }
        closeModal();
    };
    modalUi.cancelBtn.addEventListener('click', closeModal);
    modalUi.applyBtn.addEventListener('click', apply);
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 13) { // enter
            apply();
        } else if (e.keyCode === 27) { // esc
            closeModal();
        }
    });

    let modalOpen = false;
    let context;
    let blobToSave;
    let blobImgUrl;
    let deleteImage;
    window.showModal = (type, ctx) => {
        context = ctx;
        show(modalOverlay);
        modalOpen = true;
        modalUi.modal.children.forEach((menu) => {
            hide(menu);
        });
        if (type === 'bookmarkProperties') {
            const icon = window.data.icons[context.dataset.id];
            show(modalUi.bookmarkProperties);
            show(modalUi.buttons);
            hide(modalUi.backgroundUi);
            blobImgUrl = undefined;
            blobToSave = undefined;
            deleteImage = false;
            if (icon.image) {
                show(modalUi.revertIconBtn);
                hide(modalUi.changeIconBtn);
            } else {
                hide(modalUi.revertIconBtn);
                show(modalUi.changeIconBtn);
            }
            modalUi.icon.src = icon.image || getFaviconImageUrl(icon.url);
            modalUi.bmName.value = icon.name;
            modalUi.bmUrl.value = icon.url;
        } else if (type === 'desktopProperties') {
            show(modalUi.desktopProperties);
            show(modalUi.buttons);
            show(modalUi.backgroundUi);
        }
    };
}
