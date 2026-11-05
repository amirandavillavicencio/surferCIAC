import type { Action } from '../input';

export function bindSwipe(target: HTMLElement, on: (action: Action) => void, canSwipe: () => boolean) {
  let active: number | null = null;
  let x = 0;
  let y = 0;
  let consumed = false;

  target.addEventListener('pointerdown', (event) => {
    if (!canSwipe() || !event.isPrimary || event.button !== 0 || active !== null) return;
    if ((event.target as Element).closest('button, input, select, textarea, a, [contenteditable]')) return;
    active = event.pointerId;
    x = event.clientX;
    y = event.clientY;
    consumed = false;
    target.setPointerCapture(event.pointerId);
  });

  const read = (event: PointerEvent) => {
    if (active !== event.pointerId || consumed || !canSwipe()) return;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const major = Math.max(Math.abs(dx), Math.abs(dy));
    const minor = Math.min(Math.abs(dx), Math.abs(dy));
    // Short, deliberate swipes respond immediately. Diagonals need more travel.
    if (major < 13 || (major < 27 && major < minor * 1.3)) return;
    consumed = true;
    on(horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const end = (event: PointerEvent) => {
    if (active === event.pointerId) active = null;
  };
  target.addEventListener('pointermove', read);
  target.addEventListener('pointerup', (event) => { read(event); end(event); });
  target.addEventListener('pointercancel', end);
  target.addEventListener('lostpointercapture', end);
  window.addEventListener('blur', () => { active = null; });

  // Safari may handle a swipe from the viewport edge before pointer events arrive.
  // Cancel the native touch gesture as early as WebKit allows on the play surface.
  const suppress = (event: TouchEvent) => {
    if (!canSwipe() || (event.target as Element).closest('button, input, select, textarea, a, [contenteditable]')) return;
    if (event.cancelable) event.preventDefault();
  };
  target.addEventListener('touchstart', suppress, { passive: false });
  target.addEventListener('touchmove', suppress, { passive: false });
}
