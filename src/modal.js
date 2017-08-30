/* global app */
{
    const {hide, show} = app.util;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modalOverlay';
    modalOverlay.dataset.display = 'flex';
    modalOverlay.innerHTML = '<div class="modal" data-id="modal"></div>';
    const modal = modalOverlay.children[0];

    app.openModal = (content) => {
        modal.innerHTML = '';
        modal.appendChild(content);
        show(modalOverlay);
    };

    app.closeModal = () => {
        hide(modalOverlay);
    };

    document.body.appendChild(modalOverlay);
}
