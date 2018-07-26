const hourHand = document.querySelector('.hourHand');
const minHand = document.querySelector('.minHand');
const secHand = document.querySelector('.secHand');

function updateClock() {
    const d = new Date();
    let secAngle = 360 * d.getSeconds() / 60;
    let minAngle = 360 * (d.getMinutes() + secAngle / 360) / 60;
    let hourAngle = 360 * (d.getHours() + minAngle / 360) / 12;
    if (secAngle === 0) {
        secAngle = 360;
        setTimeout(() => {
            secHand.style.transition = 'transform 0s linear';
            secHand.style.transform = 'translate(-50%, 0) rotate(0deg)';
            secHand.offsetWidth;
            secHand.style.transition = 'transform 0.2s linear';
        }, 500);
    }
    hourHand.style.transform = `translate(-50%, 0) rotate(${hourAngle}deg)`;
    minHand.style.transform = `translate(-50%, 0) rotate(${minAngle}deg)`;
    secHand.style.transform = `translate(-50%, 0) rotate(${secAngle}deg)`;
}
updateClock();
secHand.style.transition = 'transform 0.2s linear';

setInterval(updateClock, 1000);
