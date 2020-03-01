/* global app */
{
    const {getUiElements, show, hide} = app.util;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modalOverlay';
    modalOverlay.dataset.display = 'flex';
    modalOverlay.innerHTML = `
        <div class="prompt" data-id="modal">
            <div class="promptTitle" data-id="promptTitle"></div>
            <div class="promptDesc" data-id="promptDesc"></div>
            <div class="promptTextbox"><input data-id="promptTextbox" /></div>
            <div class="buttons">
                <button class="btn" data-id="cancelBtn">Cancel</button>
                <button class="btn defaultBtn" data-id="okBtn">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

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

    let currentResolve;
    ui.okBtn.addEventListener('click', () => {
        if (ui.promptTextbox.value) {
            currentResolve(ui.promptTextbox.value);
            closeModal();
        }
    });

    ui.cancelBtn.addEventListener('click', () => {
        currentResolve(null);
        closeModal();
    });

    window.addEventListener('keydown', (e) => {
        if (modalOpen) {
            if (e.keyCode === 27) { // esc
                currentResolve(null);
                closeModal();
            } else if (e.keyCode === 13 && ui.promptTextbox.value) { // enter
                currentResolve(ui.promptTextbox.value);
                closeModal();
            }
        }
    });

    app.prompt = (title, description, options = {}) => {
        ui.promptTitle.textContent = title;
        if (typeof description === 'string') {
            ui.promptDesc.innerHTML = description;
        } else {
            ui.promptDesc.innerHTML = '';
            ui.promptDesc.appendChild(description);
        }
        ui.promptTextbox.value = options.value || '';
        ui.promptTextbox.setAttribute('placeholder', options.placeholder || '');
        openModal();
        return new Promise((res) => {
            currentResolve = res;
            ui.promptTextbox.focus();
        });
    };

    app.closePrompt = (val = null) => {
        currentResolve(val);
        closeModal();
    };
}
