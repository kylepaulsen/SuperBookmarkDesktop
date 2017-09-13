function makeColorPicker(hasAlpha = true) {
    const markup = `
        <div class="color-square" data-id="satContainer">
            <div class="duckness" data-id="duckness"></div>
            <div class="color-circle" data-id="colorCircle"></div>
        </div>
        <div class="hue-picker" data-id="hueContainer">
            <div class="color-line" data-id="hueLine"></div>
        </div>
        <div class="alpha-picker" data-id="alphaContainer">
            <div class="alpha-color" data-id="alphaColor"></div>
            <div class="color-line" data-id="alphaLine"></div>
        </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = markup;
    container.className = 'color-picker';

    const ui = {};
    container.querySelectorAll('[data-id]').forEach((item) => {
        ui[item.dataset.id] = item;
    });

    if (!hasAlpha) {
        ui.alphaContainer.style.display = 'none';
    }

    ui.hueLine.style.top = '0%';
    ui.alphaLine.style.top = '0%';
    ui.colorCircle.style.left = '0%';
    ui.colorCircle.style.top = '100%';

    const setupAlpha = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.fillRect(0, 0, 5, 5);
        ctx.fillRect(5, 5, 5, 5);
        ui.alphaContainer.style.background = `url(${canvas.toDataURL()})`;
    };
    setupAlpha();

    const invLerp = (a, b, val) => {
        const total = b - a;
        const p = (val - a) / total;
        return Math.min(Math.max(p, 0), 1);
    };

    const hsvToRgb = (h, s, v) => {
        let r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    };

    const rgbToHsv = (r, g, b) => {
        let max = Math.max(r, g, b), min = Math.min(r, g, b),
            d = max - min,
            h,
            s = (max === 0 ? 0 : d / max),
            v = max / 255;

        switch (max) {
            case min: h = 0; break;
            case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
            case g: h = (b - r) + d * 2; h /= 6 * d; break;
            case b: h = (r - g) + d * 4; h /= 6 * d; break;
        }

        return {
            h: h,
            s: s,
            v: v
        };
    };

    const triggerChange = () => {
        const h = parseFloat(ui.hueLine.style.top) / 100;
        const s = parseFloat(ui.colorCircle.style.left) / 100;
        const v = 1 - parseFloat(ui.colorCircle.style.top) / 100;
        const rgb = hsvToRgb(h, s, v);
        rgb.a = 1 - parseFloat(ui.alphaLine.style.top) / 100;
        onChangeFns.forEach((fn) => {
            fn(rgb);
        });
    };

    const changeSatDark = (e) => {
        const box = ui.satContainer.getBoundingClientRect();
        const x = e.clientX - box.left;
        const y = e.clientY - box.top;
        const xp = invLerp(0, ui.satContainer.offsetWidth, x);
        const yp = invLerp(0, ui.satContainer.offsetHeight, y);
        if (yp < 0.5) {
            ui.colorCircle.style.border = '2px solid #000';
        } else {
            ui.colorCircle.style.border = '2px solid #fff';
        }
        ui.colorCircle.style.left = xp * 100 + '%';
        ui.colorCircle.style.top = yp * 100 + '%';
        triggerChange();
    };

    const changeHue = (e) => {
        const box = ui.hueContainer.getBoundingClientRect();
        const y = e.clientY - box.top;
        const yp = invLerp(0, ui.hueContainer.offsetHeight, y);
        ui.hueLine.style.top = yp * 100 + '%';
        const color = hsvToRgb(yp, 1, 1);
        ui.satContainer.style.background = 'linear-gradient(to right, rgb(255, 255, 255), ' +
            `rgb(${color.r}, ${color.g}, ${color.b}))`;
        ui.alphaColor.style.background = 'linear-gradient(to top, rgba(0,0,0,0), ' +
            `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
        triggerChange();
    };

    const changeAlpha = (e) => {
        const box = ui.alphaContainer.getBoundingClientRect();
        const y = e.clientY - box.top;
        const yp = invLerp(0, ui.alphaContainer.offsetHeight, y);
        ui.alphaLine.style.top = yp * 100 + '%';
        triggerChange();
    };

    const setupColorChange = () => {
        let changing;
        ui.satContainer.addEventListener('mousedown', (e) => {
            changing = 'sat';
            changeSatDark(e);
        });

        ui.hueContainer.addEventListener('mousedown', (e) => {
            changing = 'hue';
            changeHue(e);
        });

        ui.alphaContainer.addEventListener('mousedown', (e) => {
            changing = 'alpha';
            changeAlpha(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (changing === 'sat') {
                changeSatDark(e);
            } else if (changing === 'hue') {
                changeHue(e);
            } else if (changing === 'alpha') {
                changeAlpha(e);
            }
        });

        window.addEventListener('mouseup', (e) => {
            changing = undefined;
        });
    };
    setupColorChange();

    const onChangeFns = [];
    const onChange = (fn) => {
        onChangeFns.push(fn);
    };

    const setColor = (r, g, b, a = 1) => {
        const hsv = rgbToHsv(r, g, b);
        ui.colorCircle.style.left = hsv.s * 100 + '%';
        ui.colorCircle.style.top = (1 - hsv.v) * 100 + '%';
        ui.hueLine.style.top = hsv.h * 100 + '%';
        ui.alphaLine.style.top = (1 - a) * 100 + '%';
        const color = hsvToRgb(hsv.h, 1, 1);
        ui.satContainer.style.background = 'linear-gradient(to right, rgb(255, 255, 255), ' +
            `rgb(${color.r}, ${color.g}, ${color.b}))`;
        ui.alphaColor.style.background = 'linear-gradient(to top, rgba(0,0,0,0), ' +
            `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    };

    return {
        container,
        onChange,
        setColor
    };
}
