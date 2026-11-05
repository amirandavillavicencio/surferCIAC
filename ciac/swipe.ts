import type { Action } from '../input';

export function bindSwipe(target: HTMLElement, on: (action: Action) => void, canSwipe: () => boolean) {
  let finger: number | null = null;
  let pointer: number | null = null;
  let x = 0, y = 0, threshold = 0;
  let consumed = false;

  const isControl = (node: EventTarget | null) =>
    node instanceof Element && !!node.closest('button, input, select, textarea, a, [contenteditable]');
  const begin = (clientX: number, clientY: number, minimum: number) => {
    x = clientX;
    y = clientY;
    threshold = minimum;
    consumed = false;
  };
  const read = (clientX: number, clientY: number) => {
    if (consumed || !canSwipe()) return;
    const dx = clientX - x, dy = clientY - y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const major = Math.max(ax, ay), minor = Math.min(ax, ay);
    if (major < threshold || major < minor * 1.25) return;
    consumed = true;
    on(ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  const reset = () => { finger = pointer = null; };
  const suppress = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
  };

  // A native edge gesture may be reserved before Safari delivers touchstart.
  target.addEventListener('touchstart', (event) => {
    if (!canSwipe() || pointer !== null) return;
    if (finger !== null) {
      if (!isControl(event.target)) suppress(event);
      finger = null;
      return;
    }
    if (isControl(event.target)) return;
    suppress(event);
    if (event.touches.length !== 1) return;
    const touch = event.changedTouches[0];
    finger = touch.identifier;
    begin(touch.clientX, touch.clientY, Math.max(11, Math.min(18, target.clientWidth * 0.033)));
  }, { passive: false });

  const trackTouch = (event: TouchEvent, ending: boolean) => {
    if (finger === null) return;
    if (!canSwipe()) { finger = null; return; }
    suppress(event);
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier !== finger) continue;
      if (ending) finger = null;
      read(touch.clientX, touch.clientY);
      return;
    }
  };
  target.addEventListener('touchmove', (event) => trackTouch(event, false), { passive: false });
  target.addEventListener('touchend', (event) => trackTouch(event, true), { passive: false });
  target.addEventListener('touchcancel', reset);

  target.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0 ||
        pointer !== null || finger !== null || !canSwipe() || isControl(event.target)) return;
    pointer = event.pointerId;
    begin(event.clientX, event.clientY, 13);
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointer) read(event.clientX, event.clientY);
  });
  target.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    read(event.clientX, event.clientY);
  });
  const releasePointer = (event: PointerEvent) => {
    if (event.pointerId === pointer) pointer = null;
  };
  target.addEventListener('pointercancel', releasePointer);
  target.addEventListener('lostpointercapture', releasePointer);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
}
