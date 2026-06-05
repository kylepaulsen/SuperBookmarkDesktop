/* global app */
{
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toastContainer';
    document.body.appendChild(toastContainer);

    app.toast = (message, { html, duration = 5000 } = {}) => {
        const newToast = document.createElement('div');
        newToast.className = 'toast';
        if (html) {
            newToast.innerHTML = message;
        } else if (typeof message === 'string') {
            newToast.textContent = message;
        } else {
            newToast.appendChild(message);
        }
        newToast.style.opacity = '0';

        const toastBar = document.createElement('div');
        toastBar.className = 'toastBar';
        toastBar.style.transition = `width ${duration}ms linear`;
        newToast.appendChild(toastBar);
        toastContainer.appendChild(newToast);

        const toastRect = newToast.getBoundingClientRect();
        newToast.style.transform = `translateY(-${toastRect.bottom + 100}px)`;
        newToast.offsetHeight; // trigger reflow
        newToast.style.transition = 'transform 0.4s';

        requestAnimationFrame(() => {
            newToast.style.opacity = '1';
            newToast.style.transform = `translateY(0)`;
            newToast.style.transition = 'transform 0.4s, opacity 0.4s';
            toastBar.style.width = '0';
        });

        let removeTimeout;
        const remove = () => {
            clearTimeout(removeTimeout);
            if (newToast?.parentNode) {
                newToast.style.opacity = '0';
                newToast.addEventListener('transitionend', (e) => {
                    if (e.propertyName === 'opacity') {
                        newToast.remove();
                    }
                });
            }
        };

        removeTimeout = setTimeout(remove, duration);

        return { remove };
    };
}
