/* global app */
{
    const {getUiElements, markupToElement} = app.util;

    const promptModal = markupToElement(`
        <div class="prompt">
            <div class="promptTitle" data-id="promptTitle"></div>
            <div class="promptDesc" data-id="promptDesc"></div>
            <div class="promptTextbox"><input data-id="promptTextbox" /></div>
            <div class="buttons">
                <button class="btn" data-id="cancelBtn">Cancel</button>
                <button class="btn defaultBtn" data-id="okBtn">OK</button>
            </div>
        </div>
    `);
    const ui = getUiElements(promptModal);

    let modalOpen = false;
    const openModal = () => {
        app.openModal(promptModal);
        modalOpen = true;
    };

    const closeModal = () => {
        app.closeModal();
        modalOpen = false;
    };

    let currentResolve;
    ui.okBtn.addEventListener('click', (e) => {
        if (ui.promptTextbox.value) {
            currentResolve(ui.promptTextbox.value);
            closeModal();
        }
    });

    ui.cancelBtn.addEventListener('click', (e) => {
        currentResolve(null);
        closeModal();
    });

    window.addEventListener('keydown', function(e) {
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
        ui.promptTextbox.value = '';
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
