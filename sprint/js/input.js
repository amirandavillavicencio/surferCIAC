/**
 * Saurabh's Sprint - Input Manager
 * Handles Mobile Touch Swipes, Double Taps, Keyboard & Mobile Haptics
 */

class InputManager {
  constructor() {
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.lastTapTime = 0;
    this.minSwipeDistance = 30; // Min px for swipe
    this.maxSwipeTime = 500; // Max ms for swipe

    this.onSwipeLeft = null;
    this.onSwipeRight = null;
    this.onSwipeUp = null;
    this.onSwipeDown = null;
    this.onDoubleTap = null;
    this.onPauseToggle = null;

    this.initListeners();
  }

  initListeners() {
    // Touch Events on Window / Canvas
    window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    window.addEventListener('touchmove', (e) => {
      // Prevent browser pull-to-refresh & scrolling unless touching scrollable modal or UI panels
      if (e.target.closest('.modal-content, .pause-panel, .menu-glass-panel, .start-bottom-bar') === null) {
        e.preventDefault();
      }
    }, { passive: false });

    // Keyboard Events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleTouchStart(e) {
    if (e.touches.length > 0) {
      // If tapping interactive UI buttons / pause panel, don't hijack swipe or double-tap
      if (e.target.closest('button, .btn, .hud-btn-circle, #btn-pause, #pause-screen, .pause-panel, .modal, .menu-actions-grid, .home-character-widget')) {
        return;
      }

      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.startTime = Date.now();

      // Check for Double Tap (within 300ms)
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        if (this.onDoubleTap) {
          this.vibrate(40);
          this.onDoubleTap();
        }
        this.lastTapTime = 0; // Reset
      } else {
        this.lastTapTime = now;
      }
    }
  }

  handleTouchEnd(e) {
    if (e.changedTouches.length > 0) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const elapsed = Date.now() - this.startTime;

      if (elapsed <= this.maxSwipeTime) {
        const diffX = endX - this.startX;
        const diffY = endY - this.startY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (Math.max(absX, absY) >= this.minSwipeDistance) {
          if (absX > absY) {
            // Horizontal swipe
            if (diffX > 0) {
              if (this.onSwipeRight) {
                this.vibrate(20);
                this.onSwipeRight();
              }
            } else {
              if (this.onSwipeLeft) {
                this.vibrate(20);
                this.onSwipeLeft();
              }
            }
          } else {
            // Vertical swipe
            if (diffY > 0) {
              if (this.onSwipeDown) {
                this.vibrate(25);
                this.onSwipeDown();
              }
            } else {
              if (this.onSwipeUp) {
                this.vibrate(25);
                this.onSwipeUp();
              }
            }
          }
        }
      }
    }
  }

  handleKeyDown(e) {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        if (this.onSwipeLeft) this.onSwipeLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        if (this.onSwipeRight) this.onSwipeRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
        if (this.onSwipeUp) this.onSwipeUp();
        break;
      case 'ArrowDown':
      case 'KeyS':
        if (this.onSwipeDown) this.onSwipeDown();
        break;
      case 'Space':
      case 'Enter':
      case 'NumpadEnter':
        e.preventDefault();
        if (this.onSwipeUp) this.onSwipeUp();
        break;
      case 'KeyH':
      case 'KeyB':
      case 'KeyE':
        // Trigger hoverboard with H, B or E key
        if (this.onDoubleTap) this.onDoubleTap();
        break;
      case 'KeyP':
      case 'Escape':
        if (this.onPauseToggle) this.onPauseToggle();
        break;
    }
  }

  vibrate(ms) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (err) {
        // Safe fail
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.InputManager = InputManager;
}
if (typeof globalThis !== 'undefined') {
  globalThis.InputManager = InputManager;
}
if (typeof global !== 'undefined') {
  global.InputManager = InputManager;
}
