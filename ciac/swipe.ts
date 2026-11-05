import type { Action } from '../input';

const interactive = 'button, input, select, textarea, a, [contenteditable]';

export function bindSwipe(target: HTMLElement, on: (action: Action) => void, canSwipe: () => boolean) {
  let gesture: { id: number; x: number; y: number; consumed: boolean; touch: boolean } | null = null;

  const start = (id: number, x: number, y: number, touch: boolean, event: Event) => {
    if (!canSwipe() || gesture || (event.target as Element).closest(interactive)) return false;
    gesture = { id, x, y, touch, consumed: false };
    return true;
  };

  const move = (x: number, y: number) => {
    if (!gesture || gesture.consumed || !canSwipe()) return;
    const dx = x - gesture.x;
    const dy = y - gesture.y;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const major = Math.max(Math.abs(dx), Math.abs(dy));
    const minor = Math.min(Math.abs(dx), Math.abs(dy));
    if (major < 12 || major < minor * 1.25) return;
    gesture.consumed = true;
    on(horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const cancelNative = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
  };

  target.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      if (gesture?.touch) {
        gesture.consumed = true;
        cancelNative(event);
      }
      return;
    }
    const touch = event.changedTouches[0];
    if (touch && start(touch.identifier, touch.clientX, touch.clientY, true, event)) cancelNative(event);
  }, { passive: false });

  const readTouch = (event: TouchEvent, ending: boolean) => {
    if (!gesture?.touch) return;
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier !== gesture.id) continue;
      cancelNative(event);
      move(touch.clientX, touch.clientY);
      if (ending) gesture = null;
      return;
    }
  };
  target.addEventListener('touchmove', (event) => readTouch(event, false), { passive: false });
  target.addEventListener('touchend', (event) => readTouch(event, true), { passive: false });
  target.addEventListener('touchcancel', () => { if (gesture?.touch) gesture = null; });

  // Touch Events own touch gestures. Pointer Events are for mouse and pen only.
  target.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return;
    if (start(event.pointerId, event.clientX, event.clientY, false, event)) target.setPointerCapture(event.pointerId);
  });
  const isPointer = (event: PointerEvent) =>
    gesture && !gesture.touch && event.pointerType !== 'touch' && gesture.id === event.pointerId;
  target.addEventListener('pointermove', (event) => {
    if (isPointer(event)) move(event.clientX, event.clientY);
  });
  target.addEventListener('pointerup', (event) => {
    if (!isPointer(event)) return;
    move(event.clientX, event.clientY);
    gesture = null;
  });
  const endPointer = (event: PointerEvent) => { if (isPointer(event)) gesture = null; };
  target.addEventListener('pointercancel', endPointer);
  target.addEventListener('lostpointercapture', endPointer);
  window.addEventListener('blur', () => { gesture = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) gesture = null; });
}
