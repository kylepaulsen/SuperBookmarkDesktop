/* global app */
{
    const {hide, show, getUiElements} = app.util;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modalOverlay';
    modalOverlay.dataset.display = 'flex';
    modalOverlay.innerHTML = `
        <div class="modal" data-id="modal">
            <div class="confirmModal">
                <div class="confirmMessage" data-id="confirmMessage"></div>
                <div class="confirmButtons" data-id="confirmButtons"></div>
            </div>
        </div>
    `;
    const ui = getUiElements(modalOverlay);
    const modal = ui.modal;

    let modalOpen = false;
    const openModal = () => {
        modalOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
        modal.style.background = '#ffffff';
        show(modalOverlay);
        modalOpen = true;
    };

    const closeModal = () => {
        hide(modalOverlay);
        modalOpen = false;
    };

    const makeButton = (button) => {
        if (typeof button === 'string') {
            button = {text: button};
        }
        let classes = (button.classes || '') + ' btn';
        if (button.default) {
            classes += ' defaultBtn';
        }
        return `<button class="${classes}" data-value="${button.value || button.text}">${button.text}</button>`;
    };

    let currentResolve;
    modal.addEventListener('click', (e) => {
        const target = e.target;
        if (target.dataset.value) {
            currentResolve(target.dataset.value);
            closeModal();
        }
    });

    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 27) { // esc
                const defaultBtn = modal.querySelector('.defaultBtn');
                if (defaultBtn) {
                    currentResolve(defaultBtn.dataset.value);
                    closeModal();
                }
            }
        }
    });

    app.confirm = (message, buttons) => {
        openModal();
        return new Promise((res) => {
            currentResolve = res;
            ui.confirmMessage.innerHTML = message;
            ui.confirmButtons.innerHTML = buttons.map(makeButton).join('');
            modal.querySelector('.defaultBtn').focus();
        });
    };

    document.body.appendChild(modalOverlay);
}
