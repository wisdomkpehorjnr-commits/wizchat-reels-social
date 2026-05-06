// Shared SW update state — avoids circular imports between main.tsx and App.tsx

let swUpdateAvailable = false;
let waitingSW: ServiceWorker | null = null;

export function setWaitingSW(sw: ServiceWorker) {
  waitingSW = sw;
  swUpdateAvailable = true;
  window.dispatchEvent(new CustomEvent('sw-update-available'));
}

export function activateSwUpdate() {
  if (waitingSW) {
    waitingSW.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function isSwUpdateAvailable() {
  return swUpdateAvailable;
}
