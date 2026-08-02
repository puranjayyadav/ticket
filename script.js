const STARTING_SECONDS = 59 * 60 + 58;
let remainingSeconds = STARTING_SECONDS;

const countdown = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');
const progressDot = document.getElementById('progressDot');
const instructionsLink = document.getElementById('instructionsLink');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function renderTimer() {
  countdown.textContent = remainingSeconds > 0 ? formatTime(remainingSeconds) : 'Expired';
  const percent = Math.max(0, (remainingSeconds / STARTING_SECONDS) * 100);
  progressFill.style.width = `${percent}%`;
  progressDot.style.left = `${percent}%`;

  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
  }
}

instructionsLink.addEventListener('click', (event) => {
  event.preventDefault();
  alert('Hold the QR code flat and steady under the onboard validator until you hear a confirmation tone.');
});

renderTimer();
setInterval(renderTimer, 1000);
