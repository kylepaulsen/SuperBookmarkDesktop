/* global app */
{
    const {hide, show} = app.util;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modalOverlay';
    modalOverlay.dataset.display = 'flex';
    modalOverlay.innerHTML = '<div class="modal"></div>';
    const modal = modalOverlay.children[0];

    app.openModal = (content) => {
        modalOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
        modal.style.background = '#ffffff';
        modal.innerHTML = '';
        modal.appendChild(content);
        show(modalOverlay);
    };

    app.closeModal = () => {
        hide(modalOverlay);
    };

    app.modal = modal;
    app.modalOverlay = modalOverlay;

    document.body.appendChild(modalOverlay);
}
