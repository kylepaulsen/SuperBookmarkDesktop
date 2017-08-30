NodeList.prototype.forEach = Array.prototype.forEach;
HTMLCollection.prototype.forEach = Array.prototype.forEach;
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const GUTTER = 20;
const ICON_SPACING = 20;
const ICON_WIDTH = 80;
const ICON_HEIGHT = 90;

const fileInput = document.createElement('div');
const imageTypes = ['.jpg', '.jpeg', '.png', '.apng', '.gif', '.bmp', '.webp', '.ico', '.svg'];
fileInput.innerHTML = `<input class="hidden" type="file" data-id="file" accept="${imageTypes.join(',')}">`;
document.body.appendChild(fileInput);

function selectImageFromDisk() {
    return new Promise((res) => {
        const onSelect = (e) => {
            const file = e.target.files && e.target.files[0];
            if (file && file.type.includes('image/')) {
                const fr = new FileReader();
                fr.onload = (e) => {
                    res(new Blob([new Uint8Array(e.target.result)]));
                };
                fr.readAsArrayBuffer(file);
            }
            fileInput.value = '';
        };
        fileInput.onChange = onSelect;
        fileInput.click();
    });
}

function promisify(fn, that = null) {
    return function(...args) {
        return new Promise((res) => {
            args.push(res);
            fn.apply(that, args);
        });
    };
}

function getParentElementWithClass(el, classes) {
    if (typeof classes === 'string') {
        classes = [classes];
    }
    const classesLen = classes.length;
    while (el && el.classList) {
        for (let x = 0; x < classesLen; x++) {
            if (el.classList.contains(classes[x])) {
                return el;
            }
        }
        el = el.parentElement;
    }
    return false;
}

function show(el) {
    el.style.display = el.dataset.display || 'block';
}

function hide(el) {
    el.style.display = 'none';
}

function clampText(el, text, ellipsis = ' ...') {
    el.textContent = text;
    if (el.clientHeight === el.scrollHeight) {
        return text;
    }

    const range = [0, text.length];
    while (range[1] - range[0] > 1) {
        const tryIdx = Math.floor((range[1] + range[0]) / 2);
        el.textContent = text.substring(0, tryIdx) + ellipsis;
        if (el.clientHeight === el.scrollHeight) {
            range[0] = tryIdx; // still good.
        } else {
            range[1] = tryIdx; // overflow.
        }
    }
    const str = text.substring(0, range[0]) + ellipsis;
    el.textContent = str;
    return str;
}

function getFaviconImageUrl(url, size = 32) {
    return `chrome://favicon/size/${size}/${url}`;
}
