/* global app */
{
    const {hide, show} = app.util;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modalOverlay';
    modalOverlay.dataset.display = 'flex';
    modalOverlay.innerHTML = '<div class="modal"></div>';
    modalOverlay.style.display = 'none';
    const modal = modalOverlay.children[0];
    let currentOptions;

    app.openModal = (content, options = {}) => {
        currentOptions = options;
        modalOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
        modal.style.background = '#ffffff';
        modal.innerHTML = '';
        modal.appendChild(content);
        return show(modalOverlay);
    };

    app.closeModal = () => {
        const result = hide(modalOverlay);
        if (currentOptions.onClose) {
            currentOptions.onClose();
        }
        return result;
    };

    modalOverlay.addEventListener('click', e => {
        if (currentOptions.overlayClose && e.target === modalOverlay) {
            app.closeModal();
        }
    }, false);

    app.modal = modal;
    app.modalOverlay = modalOverlay;

    document.body.appendChild(modalOverlay);
}
