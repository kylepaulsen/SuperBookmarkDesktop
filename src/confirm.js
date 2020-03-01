/* global app */
{
    const {hide, show, getUiElements, getDataset, getParentElementWithClass} = app.util;

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
        const buttonVal = button.value === undefined ? button.text : button.value;
        return `<button class="${classes}" data-value="${buttonVal}">${button.text}</button>`;
    };

    let currentResolve;
    modal.addEventListener('click', (e) => {
        const target = e.target;
        if (target.dataset.value) {
            const data = getDataset(target);
            currentResolve(data.value);
            closeModal();
        }
    });

    window.addEventListener('keydown', function(e) {
        if (modalOpen) {
            if (e.keyCode === 27) { // esc
                const defaultBtn = modal.querySelector('.defaultBtn');
                if (defaultBtn) {
                    const data = getDataset(defaultBtn);
                    currentResolve(data.value);
                    closeModal();
                }
            } else if (e.keyCode === 9) { // tab
                e.preventDefault();
                const active = document.activeElement;
                const confirmButtonsContainer = getParentElementWithClass(active, 'confirmButtons');
                if (confirmButtonsContainer) {
                    const buttons = confirmButtonsContainer.querySelectorAll('button');
                    const idx = buttons.findIndex((b) => b === active);
                    buttons[(idx + 1) % buttons.length].focus();
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
            ui.confirmButtons.style.justifyContent = buttons.length === 1 ? 'flex-end' : 'space-between';
            const defaultBtn = modal.querySelector('.defaultBtn');
            if (defaultBtn) {
                defaultBtn.focus();
            }
        });
    };

    document.body.appendChild(modalOverlay);
}
