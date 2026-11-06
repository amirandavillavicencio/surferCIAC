/**
 * Saurabh's Sprint - Dedicated Lightweight 3D WebGL Model Previewer
 * Renders real Three.js 3D character and skateboard models inside showcase modals.
 */
class ModelPreview3D {
  constructor(canvasId, type = 'character') {
    this.canvasId = canvasId;
    this.type = type; // 'character' | 'board'
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.currentMesh = null;
    this.animFrameId = null;
    this.isRunning = false;
  }

  init() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas || typeof THREE === 'undefined') return;

    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 155, false);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(38, (canvas.clientWidth || 300) / (canvas.clientHeight || 155), 0.1, 50);

        const ambLight = new THREE.AmbientLight(0xffffff, 1.1);
        this.scene.add(ambLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
        dirLight1.position.set(3, 5, 4);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x00d2d3, 0.9);
        dirLight2.position.set(-3, 2, -3);
        this.scene.add(dirLight2);

        const bottomLight = new THREE.PointLight(0x00f5d4, 1.4, 5);
        bottomLight.position.set(0, -0.2, 0);
        this.scene.add(bottomLight);
      } catch (e) {
        console.warn('3D Preview WebGL initialization:', e);
      }
    }
  }

  setModel(modelMesh, isCharacter = true) {
    if (!this.scene) {
      this.init();
    }
    if (!this.scene) return;

    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }

    if (modelMesh) {
      this.currentMesh = modelMesh;
      this.scene.add(this.currentMesh);

      if (isCharacter) {
        this.camera.position.set(0, 1.05, 3.4);
        this.camera.lookAt(0, 0.95, 0);
        this.currentMesh.position.set(0, 0.05, 0);
        this.currentMesh.rotation.set(0, 0, 0);
      } else {
        this.camera.position.set(0, 0.9, 2.5);
        this.camera.lookAt(0, 0.08, 0);
        this.currentMesh.position.set(0, 0.08, 0);
        this.currentMesh.rotation.set(0.2, 0, 0);
      }
    }

    this.startLoop();
  }

  startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    const animate = () => {
      if (!this.isRunning) return;
      this.animFrameId = requestAnimationFrame(animate);

      if (this.currentMesh) {
        this.currentMesh.rotation.y += 0.02;
        if (this.type === 'board') {
          this.currentMesh.rotation.x = 0.22 + Math.sin(Date.now() * 0.003) * 0.08;
          this.currentMesh.rotation.z = Math.sin(Date.now() * 0.0025) * 0.06;
          this.currentMesh.position.y = 0.08 + Math.sin(Date.now() * 0.003) * 0.05;
        } else {
          this.currentMesh.position.y = 0.05 + Math.sin(Date.now() * 0.0025) * 0.02;
        }
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

class UIManager {
  constructor(game) {
    this.game = game;

    // DOM Elements
    this.hud = document.getElementById('hud');
    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.reviveModal = document.getElementById('revive-modal');

    // Modals
    this.shopModal = document.getElementById('shop-modal');
    this.skinsModal = document.getElementById('skins-modal');
    this.boardsModal = document.getElementById('boards-modal');
    this.missionsModal = document.getElementById('missions-modal');
    this.helpModal = document.getElementById('help-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.installModal = document.getElementById('install-modal');
    this.dailyModal = document.getElementById('daily-rewards-modal');
    this.spinModal = document.getElementById('spin-wheel-modal');
    this.achievementsModal = document.getElementById('achievements-modal');
    this.mysteryModal = document.getElementById('mystery-box-modal');

    this.wheelRotation = 0;
    this.isWheelSpinning = false;
    this._lastRunStats = { score: 0, coins: 0, distance: 0 };

    // 3D Model Previewers
    this.heroPreview = null;
    this.boardPreview = null;

    this.hudScore = document.getElementById('hud-score');
    this.hudHighscore = document.getElementById('hud-highscore');
    this.hudCoins = document.getElementById('hud-coins');
    this.hudKeys = document.getElementById('hud-keys');
    this.multiplierBadge = document.getElementById('multiplier-badge');

    // Dirty-checking cache for HUD updates to prevent 60FPS DOM thrashing
    this._lastScore = -1;
    this._lastCoins = -1;
    this._lastKeys = -1;
    this._lastHighscore = -1;
    this._lastMult = -1;

    // Power-up bars
    this.magnetBar = document.getElementById('magnet-bar');
    this.magnetFill = document.getElementById('magnet-fill');
    this.multiplierBar = document.getElementById('multiplier-bar');
    this.multiplierFill = document.getElementById('multiplier-fill');
    this.hoverboardBar = document.getElementById('hoverboard-bar');
    this.hoverboardFill = document.getElementById('hoverboard-fill');
    this.jetpackBar = document.getElementById('jetpack-bar');
    this.jetpackFill = document.getElementById('jetpack-fill');
    this.sneakersBar = document.getElementById('sneakers-bar');
    this.sneakersFill = document.getElementById('sneakers-fill');

    // Revive elements
    this.reviveCountdown = document.getElementById('revive-countdown');
    this.reviveInterval = null;

    // PWA Install Elements
    this.deferredPrompt = null;
    this.pwaBanner = document.getElementById('pwa-install-container');
    this.btnInstallPwa = document.getElementById('btn-install-pwa');

    // Character Keys from Player Roster (26 unique heroes)
    this.characterKeys = Object.keys(this.game.player.skins).filter(k => k !== 'default' && k !== 'saurabh');
    const currentSkin = Storage.getSelectedSkin();
    this.currentCharIndex = Math.max(0, this.characterKeys.indexOf(currentSkin));
    this.modalSkinIndex = this.currentCharIndex;

    // Skateboard Keys (26 unique boards)
    this.boardKeys = Object.keys(this.game.player.boards);
    const currentBoard = Storage.getSelectedBoard();
    this.modalBoardIndex = Math.max(0, this.boardKeys.indexOf(currentBoard));

    // Active skin filter in modal
    this.activeSkinFilter = 'all';
    this.activeModalId = null;

    this.initSoundUI();
    this.bindEvents();
    this.refreshMenuStats();
    this.updateHomeCharacterCard();
    this.setupPWAInstall();
  }

  initSoundUI() {
    const soundEnabled = Storage.isSoundEnabled();
    const bgmEnabled = Storage.isBgmEnabled();
    const sfxEnabled = Storage.isSfxEnabled();

    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    if (soundIcon) {
      soundIcon.textContent = '⚙️';
    }
    if (soundText) {
      soundText.textContent = soundEnabled ? 'SOUND ON' : 'MUTED';
    }

    const pauseIcon = document.getElementById('pause-sound-icon');
    const pauseText = document.getElementById('pause-sound-text');
    if (pauseIcon) {
      pauseIcon.textContent = '⚙️';
    }
    if (pauseText) {
      pauseText.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: MUTED';
    }

    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle) soundToggle.checked = soundEnabled;

    const bgmToggle = document.getElementById('setting-bgm-toggle');
    if (bgmToggle) bgmToggle.checked = bgmEnabled;

    const sfxToggle = document.getElementById('setting-sfx-toggle');
    if (sfxToggle) sfxToggle.checked = sfxEnabled;
  }

  updateHomeCharacterCard() {
    const charKey = this.characterKeys[this.currentCharIndex] || 'cyber_dash';
    const charData = this.game.player.skins[charKey];
    if (!charData) return;

    const unlocked = Storage.getUnlockedSkins();
    const selected = Storage.getSelectedSkin();
    const isUnlocked = unlocked.includes(charKey);
    const isSelected = selected === charKey;

    const genderEl = document.getElementById('home-char-gender');
    const avatarEl = document.getElementById('home-char-avatar');
    const nameEl = document.getElementById('home-char-name');
    const btnEl = document.getElementById('home-char-btn');

    if (genderEl) {
      genderEl.textContent = charData.gender === 'female' ? 'GIRL' : 'BOY';
      genderEl.className = 'gender-tag ' + (charData.gender === 'female' ? 'gender-girl' : 'gender-boy');
    }
    if (avatarEl) avatarEl.textContent = charData.avatar || 'CD';
    if (nameEl) nameEl.textContent = charData.name;

    if (btnEl) {
      if (isSelected) {
        btnEl.textContent = 'EQUIPPED';
        btnEl.className = 'btn-home-equip equipped';
      } else if (isUnlocked) {
        btnEl.textContent = 'EQUIP';
        btnEl.className = 'btn-home-equip can-equip';
      } else {
        btnEl.textContent = `${charData.cost} C UNLOCK`;
        btnEl.className = 'btn-home-equip unlock';
      }

      btnEl.onclick = () => {
        if (isUnlocked) {
          Storage.setSelectedSkin(charKey);
          this.game.player.applySkin(charKey);
          Audio.playButtonClick();
          this.updateHomeCharacterCard();
          this.renderSkins();
        } else {
          if (Storage.spendCoins(charData.cost)) {
            Storage.unlockSkin(charKey);
            Storage.setSelectedSkin(charKey);
            this.game.player.applySkin(charKey);
            Audio.playPowerUp();
            this.updateHomeCharacterCard();
            this.renderSkins();
            this.refreshMenuStats();
          } else {
            alert(`Need ${charData.cost} coins to unlock ${charData.name}! Keep sprinting to collect coins!`);
          }
        }
      };
    }

    // Apply preview skin in 3D right away
    this.game.player.applySkin(charKey);
  }

  bindEvents() {
    // Universal Multi-Event Button Helper for Fast Instant Response on Mobile & PC
    const attachFastButton = (id, callback) => {
      const el = typeof id === 'string' ? document.getElementById(id) : id;
      if (!el) return;
      let lastClick = 0;
      const trigger = (e) => {
        const now = Date.now();
        if (now - lastClick < 250) return;
        lastClick = now;
        if (e && e.stopPropagation) e.stopPropagation();
        callback(e);
      };
      el.addEventListener('click', trigger);
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          trigger(e);
        }
      });
    };

    // Character Quick Switcher Buttons (Home Screen)
    const btnPrevChar = document.getElementById('btn-prev-char');
    if (btnPrevChar) {
      attachFastButton(btnPrevChar, () => {
        Audio.playWhoosh();
        this.currentCharIndex = (this.currentCharIndex - 1 + this.characterKeys.length) % this.characterKeys.length;
        this.modalSkinIndex = this.currentCharIndex;
        this.updateHomeCharacterCard();
      });
    }

    const btnNextChar = document.getElementById('btn-next-char');
    if (btnNextChar) {
      attachFastButton(btnNextChar, () => {
        Audio.playWhoosh();
        this.currentCharIndex = (this.currentCharIndex + 1) % this.characterKeys.length;
        this.modalSkinIndex = this.currentCharIndex;
        this.updateHomeCharacterCard();
      });
    }

    // Modal Character Showcase Slider Buttons
    attachFastButton('btn-modal-prev-skin', () => {
      Audio.playWhoosh();
      this.modalSkinIndex = (this.modalSkinIndex - 1 + this.characterKeys.length) % this.characterKeys.length;
      this.currentCharIndex = this.modalSkinIndex;
      const skinId = this.characterKeys[this.modalSkinIndex];
      this.game.player.applySkin(skinId);
      this.renderSkins();
      this.updateHomeCharacterCard();
    });

    attachFastButton('btn-modal-next-skin', () => {
      Audio.playWhoosh();
      this.modalSkinIndex = (this.modalSkinIndex + 1) % this.characterKeys.length;
      this.currentCharIndex = this.modalSkinIndex;
      const skinId = this.characterKeys[this.modalSkinIndex];
      this.game.player.applySkin(skinId);
      this.renderSkins();
      this.updateHomeCharacterCard();
    });

    // Modal Skateboard Showcase Slider Buttons
    attachFastButton('btn-modal-prev-board', () => {
      Audio.playWhoosh();
      this.modalBoardIndex = (this.modalBoardIndex - 1 + this.boardKeys.length) % this.boardKeys.length;
      const boardId = this.boardKeys[this.modalBoardIndex];
      this.game.player.applyBoard(boardId);
      this.renderBoards();
    });

    attachFastButton('btn-modal-next-board', () => {
      Audio.playWhoosh();
      this.modalBoardIndex = (this.modalBoardIndex + 1) % this.boardKeys.length;
      const boardId = this.boardKeys[this.modalBoardIndex];
      this.game.player.applyBoard(boardId);
      this.renderBoards();
    });

    // Start Game Button (Strictly enforces playing ONLY with equipped skin)
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
      attachFastButton(btnStart, () => {
        const charKey = this.characterKeys[this.currentCharIndex] || 'cyber_dash';
        const unlocked = Storage.getUnlockedSkins();

        // If the currently browsed character is unlocked, ensure it's equipped
        if (unlocked.includes(charKey)) {
          Storage.setSelectedSkin(charKey);
          this.game.player.applySkin(charKey);
        } else {
          // If locked, automatically revert to the actually equipped unlocked skin
          const equippedSkin = Storage.getSelectedSkin();
          this.game.player.applySkin(equippedSkin);
          this.currentCharIndex = Math.max(0, this.characterKeys.indexOf(equippedSkin));
          this.updateHomeCharacterCard();
        }

        Audio.playButtonClick();
        this.game.startGame();
      });
    }

    // Pause & Resume Buttons (Instant & Bulletproof)
    attachFastButton('btn-pause', () => {
      Audio.playButtonClick();
      this.game.togglePause();
    });

    attachFastButton('btn-resume', () => {
      Audio.playButtonClick();
      this.game.togglePause();
    });

    attachFastButton('btn-quit-to-menu', () => {
      Audio.playButtonClick();
      this.game.quitToMenu();
    });

    // Game Over Buttons
    const btnGameoverRevive = document.getElementById('btn-gameover-revive');
    if (btnGameoverRevive) {
      attachFastButton(btnGameoverRevive, () => {
        Audio.playButtonClick();
        this.handleRevive();
      });
    }

    attachFastButton('btn-restart', () => {
      Audio.playButtonClick();
      this.game.startGame();
    });

    attachFastButton('btn-go-shop', () => {
      Audio.playButtonClick();
      this.showModal(this.shopModal);
      this.renderShop();
    });

    attachFastButton('btn-go-menu', () => {
      Audio.playButtonClick();
      this.game.quitToMenu();
    });

    // Main Menu / Home Screen Subway Surfers Floating Docks
    attachFastButton('btn-open-shop', () => {
      Audio.playButtonClick();
      this.showModal(this.shopModal);
      this.renderShop();
    });
    attachFastButton('btn-open-skins', () => {
      Audio.playButtonClick();
      this.showModal(this.skinsModal);
      this.renderSkins();
    });
    attachFastButton('btn-open-boards', () => {
      Audio.playButtonClick();
      this.showModal(this.boardsModal);
      this.renderBoards();
    });
    attachFastButton('btn-open-missions', () => {
      Audio.playButtonClick();
      this.showModal(this.missionsModal);
      this.renderMissions();
    });
    attachFastButton('btn-open-word-hunt', () => {
      Audio.playButtonClick();
      this.showModal(this.missionsModal);
      this.renderMissions();
    });
    attachFastButton('btn-open-help', () => {
      Audio.playButtonClick();
      this.showModal(this.helpModal);
    });

    // Retention Features Modals: Daily Rewards, Spin Wheel, Trophies, Mystery Box
    attachFastButton('btn-open-daily', () => {
      Audio.playButtonClick();
      this.showModal(this.dailyModal);
      this.renderDailyRewards();
    });
    attachFastButton('btn-open-spin', () => {
      Audio.playButtonClick();
      this.showModal(this.spinModal);
      this.initSpinWheel();
    });
    attachFastButton('btn-open-achievements', () => {
      Audio.playButtonClick();
      this.showModal(this.achievementsModal);
      this.renderAchievements();
    });
    attachFastButton('btn-claim-daily', () => {
      this.claimDailyRewardAction();
    });
    attachFastButton('btn-spin-action', () => {
      this.spinWheelAction();
    });
    attachFastButton('btn-open-box-action', () => {
      this.openMysteryBoxAction();
    });
    attachFastButton('mystery-box-graphic', () => {
      this.openMysteryBoxAction();
    });
    attachFastButton('btn-gameover-mystery', () => {
      Audio.playButtonClick();
      this.showModal(this.mysteryModal);
      this.renderMysteryBoxModal();
    });
    attachFastButton('btn-share-score', () => {
      Audio.playButtonClick();
      this.shareScoreCard();
    });

    // Settings Modal
    attachFastButton('btn-open-settings', () => {
      Audio.playButtonClick();
      this.initSoundUI();
      this.showModal(this.settingsModal);
    });

    // Pause Menu Sound Toggle Button
    const btnPauseSound = document.getElementById('btn-pause-sound');
    if (btnPauseSound) {
      attachFastButton(btnPauseSound, () => {
        Audio.toggleSound();
        this.initSoundUI();
      });
    }

    // Settings Modal Switches
    const settingSoundToggle = document.getElementById('setting-sound-toggle');
    if (settingSoundToggle) {
      settingSoundToggle.addEventListener('change', (e) => {
        Audio.setSoundEnabled(e.target.checked);
        this.initSoundUI();
      });
    }

    const settingBgmToggle = document.getElementById('setting-bgm-toggle');
    if (settingBgmToggle) {
      settingBgmToggle.addEventListener('change', () => {
        Audio.toggleBGM();
        this.initSoundUI();
      });
    }

    const settingSfxToggle = document.getElementById('setting-sfx-toggle');
    if (settingSfxToggle) {
      settingSfxToggle.addEventListener('change', () => {
        Audio.toggleSFX();
        this.initSoundUI();
      });
    }

    // Close Modals
    document.getElementById('btn-close-shop')?.addEventListener('click', () => this.hideModal(this.shopModal));
    document.getElementById('btn-close-skins')?.addEventListener('click', () => {
      this.hideModal(this.skinsModal);
      this.updateHomeCharacterCard();
    });
    document.getElementById('btn-close-boards')?.addEventListener('click', () => {
      this.hideModal(this.boardsModal);
    });
    document.getElementById('btn-close-missions')?.addEventListener('click', () => this.hideModal(this.missionsModal));
    document.getElementById('btn-close-help')?.addEventListener('click', () => this.hideModal(this.helpModal));
    document.getElementById('btn-close-help-bottom')?.addEventListener('click', () => this.hideModal(this.helpModal));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.hideModal(this.settingsModal));
    document.getElementById('btn-close-settings-bottom')?.addEventListener('click', () => this.hideModal(this.settingsModal));
    document.getElementById('btn-close-install')?.addEventListener('click', () => this.hideModal(this.installModal));
    document.getElementById('btn-close-daily')?.addEventListener('click', () => this.hideModal(this.dailyModal));
    document.getElementById('btn-close-spin')?.addEventListener('click', () => this.hideModal(this.spinModal));
    document.getElementById('btn-close-achievements')?.addEventListener('click', () => this.hideModal(this.achievementsModal));
    document.getElementById('btn-close-mystery')?.addEventListener('click', () => this.hideModal(this.mysteryModal));

    // Install Modal Platform Tabs
    const tabButtons = document.querySelectorAll('.install-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchInstallTab(tab);
      });
    });

    // Android Modal Direct One-Click Install Button
    const btnModalInstallAction = document.getElementById('btn-modal-install-action');
    if (btnModalInstallAction) {
      btnModalInstallAction.addEventListener('click', () => {
        this.triggerNativeInstallPrompt();
      });
    }

    // Revive Actions
    const btnReviveAction = document.getElementById('btn-revive-action');
    if (btnReviveAction) {
      btnReviveAction.addEventListener('click', () => {
        this.handleRevive();
      });
    }
    const btnReviveSkip = document.getElementById('btn-revive-skip');
    if (btnReviveSkip) {
      btnReviveSkip.addEventListener('click', () => {
        this.endReviveCountdown(false);
      });
    }
  }

  detectPlatform() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'pc';
  }

  openInstallModal(preferredTab) {
    const platform = preferredTab || this.detectPlatform();
    this.switchInstallTab(platform);
    this.showModal(this.installModal);
  }

  switchInstallTab(tabName) {
    const tabButtons = document.querySelectorAll('.install-tab-btn');
    const tabContents = document.querySelectorAll('.install-tab-content');

    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabContents.forEach(content => {
      if (content.id === `tab-content-${tabName}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  async triggerNativeInstallPrompt() {
    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          if (this.pwaBanner) this.pwaBanner.classList.add('hidden');
          this.hideModal(this.installModal);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      this.deferredPrompt = null;
    } else {
      alert('To Install on Android:\n1. Tap the 3-dot menu (⋮) at top right of Chrome.\n2. Tap "Install App" or "Add to Home screen"!\n\nOffline ready at top speed!');
    }
  }

  setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.pwaBanner) {
        this.pwaBanner.classList.remove('hidden');
      }
    });

    const isStandalone = (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || 
                         (typeof navigator !== 'undefined' && navigator.standalone === true);
    if (isStandalone) {
      if (this.pwaBanner) this.pwaBanner.classList.add('hidden');
    } else {
      if (this.pwaBanner) this.pwaBanner.classList.remove('hidden');
    }

    if (this.btnInstallPwa) {
      this.btnInstallPwa.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          await this.triggerNativeInstallPrompt();
        } else {
          this.openInstallModal();
        }
      });
    }
  }

  showScreen(screen) {
    [
      this.startScreen, 
      this.gameoverScreen, 
      this.pauseScreen, 
      this.reviveModal,
      this.shopModal,
      this.skinsModal,
      this.missionsModal,
      this.helpModal,
      this.settingsModal,
      this.installModal
    ].forEach(s => {
      if (s) {
        s.classList.remove('menu-active');
        s.classList.add('menu-hidden');
      }
    });

    if (screen) {
      screen.classList.remove('menu-hidden');
      screen.classList.add('menu-active');
    }
  }

  showHUD(show) {
    if (show) {
      this.hud.classList.remove('hud-hidden');
      this.hud.classList.add('menu-active');
    } else {
      this.hud.classList.remove('menu-active');
      this.hud.classList.add('hud-hidden');
    }
  }

  showModal(modal) {
    if (!modal) return;
    modal.classList.remove('menu-hidden');
    modal.classList.add('menu-active');
    if (modal === this.skinsModal) {
      this.activeModalId = 'skins';
      const skinId = this.characterKeys[this.modalSkinIndex] || 'cyber_dash';
      this.game.player.applySkin(skinId);
    } else if (modal === this.boardsModal) {
      this.activeModalId = 'boards';
      const boardId = this.boardKeys[this.modalBoardIndex] || 'freestyle';
      this.game.player.applyBoard(boardId);
    } else {
      this.activeModalId = 'other';
    }
  }

  hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('menu-active');
    modal.classList.add('menu-hidden');
    this.activeModalId = null;

    // Reapply user's equipped skin and board
    const equippedSkin = Storage.getSelectedSkin();
    this.game.player.applySkin(equippedSkin);
    const equippedBoard = Storage.getSelectedBoard();
    this.game.player.applyBoard(equippedBoard);
    this.refreshMenuStats();
  }

  updateHUD(score, coins, multiplier, player) {
    const intScore = Math.floor(score);
    if (this._lastScore !== intScore) {
      this._lastScore = intScore;
      if (this.hudScore) this.hudScore.textContent = intScore;
    }

    if (this._lastCoins !== coins) {
      this._lastCoins = coins;
      if (this.hudCoins) this.hudCoins.textContent = coins;
    }

    const highScore = Storage.getHighScore();
    if (this._lastHighscore !== highScore) {
      this._lastHighscore = highScore;
      if (this.hudHighscore) this.hudHighscore.textContent = highScore;
    }

    const totalKeys = Storage.getTotalKeys();
    if (this._lastKeys !== totalKeys) {
      this._lastKeys = totalKeys;
      if (this.hudKeys) this.hudKeys.textContent = totalKeys;
    }

    const effectiveMult = multiplier * (player.hasMultiplier ? 2 : 1);
    if (this._lastMult !== effectiveMult) {
      this._lastMult = effectiveMult;
      if (this.multiplierBadge) {
        this.multiplierBadge.textContent = effectiveMult + 'X';
        if (player.hasMultiplier) {
          this.multiplierBadge.classList.add('multiplier-boosted');
        } else {
          this.multiplierBadge.classList.remove('multiplier-boosted');
        }
      }
    }

    // Power-Up Progress Bars
    this.updatePowerUpBar(this.magnetBar, this.magnetFill, player.hasMagnet, player.magnetTimer, Storage.getPowerUpDuration('magnet'));
    this.updatePowerUpBar(this.multiplierBar, this.multiplierFill, player.hasMultiplier, player.multiplierTimer, Storage.getPowerUpDuration('multiplier'));
    this.updatePowerUpBar(this.hoverboardBar, this.hoverboardFill, player.hasHoverboard, player.hoverboardTimer, Storage.getPowerUpDuration('hoverboard'));
    this.updatePowerUpBar(this.jetpackBar, this.jetpackFill, player.hasJetpack, player.jetpackTimer, Storage.getPowerUpDuration('jetpack'));
    this.updatePowerUpBar(this.sneakersBar, this.sneakersFill, player.hasSneakers, player.sneakersTimer, Storage.getPowerUpDuration('sneakers'));
  }

  updatePowerUpBar(barElem, fillElem, active, timer, maxDuration) {
    if (!barElem || !fillElem) return;
    if (active && timer > 0) {
      if (barElem.classList.contains('hidden')) {
        barElem.classList.remove('hidden');
      }
      const pct = Math.max(0, Math.min(100, Math.round((timer / maxDuration) * 100)));
      const wStr = pct + '%';
      if (fillElem.style.width !== wStr) {
        fillElem.style.width = wStr;
      }
    } else {
      if (!barElem.classList.contains('hidden')) {
        barElem.classList.add('hidden');
      }
    }
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(message) {
    const toast = document.getElementById('game-toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    msgEl.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show-toast');
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show-toast');
      toast.classList.add('hidden');
    }, 2800);
  }

  // --- SUBWAY SURFERS WORD HUNT UI (3-4s Auto-Hide Popup on Collection) ---
  updateWordHuntUI(showHudPopup = false) {
    if (typeof Missions === 'undefined' || !Missions.getWordHunt) return;
    const wh = Missions.getWordHunt();

    // 1. Home Screen Word Hunt Card
    const homeLettersContainer = document.getElementById('word-hunt-letters-container');
    if (homeLettersContainer) {
      homeLettersContainer.innerHTML = '';
      wh.word.split('').forEach(ch => {
        const box = document.createElement('div');
        const isCollected = wh.collected.includes(ch);
        box.className = 'wh-letter-box' + (isCollected ? ' collected' : ' missing');
        box.textContent = ch;
        homeLettersContainer.appendChild(box);
      });
    }

    // 2. In-Game HUD Mini Tracker
    const hudTracker = document.getElementById('hud-word-hunt');
    const hudLettersContainer = document.getElementById('hud-wh-letters');
    if (hudLettersContainer) {
      hudLettersContainer.innerHTML = '';
      wh.word.split('').forEach(ch => {
        const box = document.createElement('span');
        const isCollected = wh.collected.includes(ch);
        box.className = 'hud-wh-box' + (isCollected ? ' collected' : ' missing');
        box.textContent = ch;
        hudLettersContainer.appendChild(box);
      });
    }

    // Popup for 3.5 seconds on letter collection or new run start, then auto-hides!
    if (showHudPopup && hudTracker) {
      hudTracker.classList.remove('hidden');
      hudTracker.classList.add('show-wh-popup');
      if (this._whPopupTimer) clearTimeout(this._whPopupTimer);
      this._whPopupTimer = setTimeout(() => {
        hudTracker.classList.remove('show-wh-popup');
      }, 3500);
    }
  }

  // --- BULLETPROOF KEY REVIVE MODAL COUNTDOWN (Progression: 2, 4, 6, 8... keys) ---
  startReviveOffer(score, coins, distance, neededKeys = 2, onRevive, onSkip) {
    this.onReviveCallback = onRevive;
    this.onSkipCallback = onSkip;
    this.currentNeededKeys = neededKeys;

    this.showHUD(false);

    let countdown = 5;
    if (this.reviveCountdown) this.reviveCountdown.textContent = countdown;

    const userKeys = Storage.getTotalKeys();
    const btnAction = document.getElementById('btn-revive-action');
    if (btnAction) {
      btnAction.innerHTML = `<span>🗝️ REVIVE (${this.currentNeededKeys} KEYS)</span>`;
      btnAction.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRevive();
      };
      btnAction.ontouchstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRevive();
      };
      btnAction.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRevive();
      };
    }

    const btnSkip = document.getElementById('btn-revive-skip');
    if (btnSkip) {
      btnSkip.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.endReviveCountdown(false);
      };
      btnSkip.ontouchstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.endReviveCountdown(false);
      };
    }

    this.showScreen(this.reviveModal);

    if (this.reviveInterval) clearInterval(this.reviveInterval);
    this.reviveInterval = setInterval(() => {
      countdown--;
      if (this.reviveCountdown) this.reviveCountdown.textContent = countdown;
      if (countdown <= 0) {
        this.endReviveCountdown(false);
      }
    }, 1000);
  }

  handleRevive() {
    const cost = this.currentNeededKeys || 2;
    const totalKeys = Storage.getTotalKeys();

    if (totalKeys >= cost) {
      if (this.reviveInterval) {
        clearInterval(this.reviveInterval);
        this.reviveInterval = null;
      }
      Storage.spendKeys(cost);
      this.showScreen(null);
      this.showHUD(true);
      if (typeof Audio !== 'undefined' && Audio.playRevive) Audio.playRevive();

      if (this.onReviveCallback) {
        this.onReviveCallback();
      } else {
        this.game.revivePlayer();
      }
    } else {
      this.showToast(`❌ NEED ${cost} KEYS! (YOU HAVE: ${totalKeys} 🗝️)`);
    }
  }

  endReviveCountdown(didRevive = false) {
    if (this.reviveInterval) {
      clearInterval(this.reviveInterval);
      this.reviveInterval = null;
    }
    if (!didRevive) {
      if (this.onSkipCallback) {
        this.onSkipCallback();
      } else {
        this.showGameOver(this.game.score, this.game.coins, this.game.distance, this.currentNeededKeys);
      }
    }
  }

  showGameOver(score, coinsEarned, distance, neededKeys = 2) {
    this.currentNeededKeys = neededKeys;
    const isNewHigh = Storage.setHighScore(score);
    Storage.addCoins(coinsEarned);

    // Increment lifetime stats
    Storage.incrementStat('totalRuns', 1);
    Storage.incrementStat('totalDistance', Math.floor(distance));

    document.getElementById('result-score').textContent = Math.floor(score);
    document.getElementById('result-coins').textContent = '+' + coinsEarned;
    document.getElementById('result-distance').textContent = Math.floor(distance) + 'm';
    document.getElementById('result-best').textContent = Storage.getHighScore();

    const newRecordEl = document.getElementById('new-record-alert');
    if (isNewHigh) {
      newRecordEl.classList.remove('hidden');
    } else {
      newRecordEl.classList.add('hidden');
    }

    // Direct gameover revive binding
    const btnGameOverRevive = document.getElementById('btn-gameover-revive');
    if (btnGameOverRevive) {
      btnGameOverRevive.innerHTML = `<span>🗝️ REVIVE & CONTINUE (${this.currentNeededKeys} KEYS)</span>`;
      btnGameOverRevive.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRevive();
      };
      btnGameOverRevive.ontouchstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRevive();
      };
    }

    this._lastRunStats = { score: Math.floor(score), coins: coinsEarned, distance: Math.floor(distance) };

    // Surprise Mystery Box Drop on Good Runs
    if (distance > 350 || Math.random() < 0.35) {
      if (Storage.addMysteryBoxes) Storage.addMysteryBoxes(1);
    }
    const mysteryCount = Storage.getMysteryBoxes ? Storage.getMysteryBoxes() : 0;
    const btnMystery = document.getElementById('btn-gameover-mystery');
    if (btnMystery) {
      if (mysteryCount > 0) {
        btnMystery.classList.remove('hidden');
        btnMystery.innerHTML = `<span>📦 OPEN MYSTERY CRATE (${mysteryCount} WAITING)</span>`;
      } else {
        btnMystery.classList.add('hidden');
      }
    }

    this.showHUD(false);
    this.showScreen(this.gameoverScreen);
    this.refreshMenuStats();
  }

  refreshMenuStats() {
    const highscoreEl = document.getElementById('menu-highscore');
    if (highscoreEl) highscoreEl.textContent = Storage.getHighScore();

    const coinsEl = document.getElementById('menu-coins');
    if (coinsEl) coinsEl.textContent = Storage.getTotalCoins();

    const keysEl = document.getElementById('menu-keys');
    if (keysEl) keysEl.textContent = Storage.getTotalKeys();

    const hudKeysEl = document.getElementById('hud-keys');
    if (hudKeysEl) hudKeysEl.textContent = Storage.getTotalKeys();

    const skinsCoinsEl = document.getElementById('skins-coins-display');
    if (skinsCoinsEl) skinsCoinsEl.textContent = Storage.getTotalCoins();

    const boardsCoinsEl = document.getElementById('boards-coins-display');
    if (boardsCoinsEl) boardsCoinsEl.textContent = Storage.getTotalCoins();

    const shopCoinsEl = document.getElementById('shop-coins-display');
    if (shopCoinsEl) shopCoinsEl.textContent = Storage.getTotalCoins();

    this.updateWordHuntUI();

    const missionsBadge = document.getElementById('missions-badge');
    if (missionsBadge && (typeof Missions !== 'undefined' || window.Missions)) {
      const mgr = typeof Missions !== 'undefined' ? Missions : window.Missions;
      const unclaimed = mgr.getUnclaimedCount();
      if (unclaimed > 0) {
        missionsBadge.classList.remove('hidden');
      } else {
        missionsBadge.classList.add('hidden');
      }
    }

    // Daily Gifts Badge
    const dailyBadge = document.getElementById('daily-badge');
    if (dailyBadge && Storage.getDailyRewardsData) {
      const dData = Storage.getDailyRewardsData();
      if (dData.canClaim) dailyBadge.classList.remove('hidden');
      else dailyBadge.classList.add('hidden');
    }

    // Lucky Spin Badge
    const spinBadge = document.getElementById('spin-badge');
    if (spinBadge && Storage.getSpinWheelData) {
      const sData = Storage.getSpinWheelData();
      if (sData.canFreeSpin) spinBadge.classList.remove('hidden');
      else spinBadge.classList.add('hidden');
    }

    // Achievements Badge
    const achBadge = document.getElementById('ach-badge');
    if (achBadge && this.hasUnclaimedAchievements) {
      if (this.hasUnclaimedAchievements()) achBadge.classList.remove('hidden');
      else achBadge.classList.add('hidden');
    }
  }

  // --- SHOP & UPGRADES RENDERER ---
  renderShop() {
    const totalCoins = Storage.getTotalCoins();
    const shopDisplay = document.getElementById('shop-coins-display');
    if (shopDisplay) shopDisplay.textContent = totalCoins;

    // Also show key balance in shop header
    const shopKeysDisplay = document.getElementById('shop-keys-display');
    if (shopKeysDisplay) shopKeysDisplay.textContent = Storage.getTotalKeys();

    const types = ['magnet', 'multiplier', 'hoverboard', 'jetpack', 'sneakers'];
    types.forEach(type => {
      const level = Storage.getUpgradeLevel(type);
      const dotsContainer = document.getElementById(type + '-level-dots');
      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
          const dot = document.createElement('span');
          dot.className = 'dot' + (i <= level ? ' active' : '');
          dotsContainer.appendChild(dot);
        }
      }

      const btn = document.getElementById('btn-upgrade-' + type);
      if (btn) {
        if (level >= 5) {
          btn.classList.add('maxed');
          btn.innerHTML = '<span>MAX LEVEL</span>';
        } else {
          btn.classList.remove('maxed');
          const cost = Storage.getUpgradeCost(type, level);
          btn.innerHTML = `<span class="price-val">${cost} C</span><span class="buy-label">UPGRADE</span>`;
          btn.onclick = () => this.handleUpgrade(type);
        }
      }
    });

    // Key Bundle Buy Button
    const btnBuyKeys = document.getElementById('btn-buy-keys');
    if (btnBuyKeys) {
      btnBuyKeys.onclick = () => this.handleBuyKeys();
    }
  }

  handleUpgrade(type) {
    const level = Storage.getUpgradeLevel(type);
    if (level >= 5) return;

    const cost = Storage.getUpgradeCost(type, level);
    if (Storage.spendCoins(cost)) {
      Audio.playPowerUp();
      Storage.setUpgradeLevel(type, level + 1);
      this.renderShop();
      this.refreshMenuStats();
    } else {
      alert('Not enough coins! Keep sprinting to earn more coins.');
    }
  }

  handleBuyKeys() {
    const KEY_BUNDLE_COST = 150;
    const KEY_BUNDLE_AMOUNT = 3;
    if (Storage.spendCoins(KEY_BUNDLE_COST)) {
      Storage.addKeys(KEY_BUNDLE_AMOUNT);
      if (typeof Audio !== 'undefined' && Audio.playPowerUp) Audio.playPowerUp();
      this.showToast(`🗝️ BOUGHT ${KEY_BUNDLE_AMOUNT} REVIVE KEYS! (Total: ${Storage.getTotalKeys()})`);
      this.renderShop();
      this.refreshMenuStats();
    } else {
      this.showToast(`❌ NOT ENOUGH COINS! Need ${KEY_BUNDLE_COST} coins for 3 keys.`);
    }
  }

  // --- MISSIONS RENDERER ---
  renderMissions() {
    const totalCoins = Storage.getTotalCoins();
    const displayCoins = document.getElementById('missions-coins-display');
    if (displayCoins) displayCoins.textContent = totalCoins;

    const container = document.getElementById('missions-list-container');
    if (!container || !window.Missions) return;

    container.innerHTML = '';
    Missions.missions.forEach(mission => {
      const prog = Missions.getProgress(mission);
      const card = document.createElement('div');
      card.className = 'mission-card' + (prog.isClaimed ? ' claimed' : (prog.isCompleted ? ' completed' : ''));

      const pct = Math.min(100, Math.floor((prog.current / prog.target) * 100));

      let actionHtml = '';
      if (prog.isClaimed) {
        actionHtml = '<span class="mission-status claimed">CLAIMED</span>';
      } else if (prog.isCompleted) {
        actionHtml = `<button class="btn-claim-mission pulse-anim" data-id="${mission.id}">CLAIM ${mission.reward} C</button>`;
      } else {
        actionHtml = `<span class="mission-reward-tag">${mission.reward} C</span>`;
      }

      card.innerHTML = `
        <div class="mission-icon-box">${mission.icon}</div>
        <div class="mission-info">
          <h4>${mission.title}</h4>
          <p>${mission.desc}</p>
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width: ${pct}%"></div>
          </div>
          <span class="mission-count-text">${prog.current} / ${prog.target}</span>
        </div>
        <div class="mission-action-box">
          ${actionHtml}
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll('.btn-claim-mission').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (Missions.claim(id)) {
          this.renderMissions();
          this.refreshMenuStats();
        }
      });
    });
  }

  // --- 26+ CHARACTERS / HEROES SHOWCASE CAROUSEL RENDERER ---
  renderSkins() {
    const totalCoins = Storage.getTotalCoins();
    const displayCoins = document.getElementById('skins-coins-display');
    if (displayCoins) displayCoins.textContent = totalCoins;

    const unlocked = Storage.getUnlockedSkins();
    const selected = Storage.getSelectedSkin();

    const skinId = this.characterKeys[this.modalSkinIndex] || 'cyber_dash';
    const charData = this.game.player.skins[skinId];
    if (!charData) return;

    const isUnlocked = unlocked.includes(skinId);
    const isSelected = selected === skinId;
    const isFemale = charData.gender === 'female';

    // Update Counter (e.g. 1 / 26)
    const indexDisplay = document.getElementById('skin-index-display');
    if (indexDisplay) {
      indexDisplay.textContent = `${this.modalSkinIndex + 1} / ${this.characterKeys.length}`;
    }

    // 1. Render Featured Center Showcase Card Details
    const headerEl = document.getElementById('skin-showcase-header');
    if (headerEl) {
      headerEl.innerHTML = `
        <span class="gender-tag ${isFemale ? 'gender-girl' : 'gender-boy'}">${isFemale ? 'GIRL HERO' : 'BOY HERO'}</span>
        <span class="showcase-rarity">${isUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
      `;
    }

    const infoEl = document.getElementById('skin-showcase-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <h3 class="showcase-hero-name text-3d-header">${charData.name}</h3>
        <span class="showcase-hero-title">${charData.title || 'Subway Sprinter'}</span>
      `;
    }

    const statsEl = document.getElementById('skin-showcase-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="showcase-stat-pill">
          <span class="stat-name">SPEED</span>
          <div class="stat-track"><div class="stat-fill" style="width: ${70 + (this.modalSkinIndex % 6) * 5}%"></div></div>
        </div>
        <div class="showcase-stat-pill">
          <span class="stat-name">AGILITY</span>
          <div class="stat-track"><div class="stat-fill" style="width: ${75 + ((this.modalSkinIndex * 3) % 5) * 5}%"></div></div>
        </div>
      `;
    }

    const actionEl = document.getElementById('skin-showcase-action');
    if (actionEl) {
      let actionBtnHtml = '';
      if (isSelected) {
        actionBtnHtml = '<button class="btn-showcase-action equipped" disabled>EQUIPPED</button>';
      } else if (isUnlocked) {
        actionBtnHtml = `<button class="btn-showcase-action can-equip" id="btn-showcase-equip-skin">EQUIP HERO</button>`;
      } else {
        actionBtnHtml = `<button class="btn-showcase-action unlock" id="btn-showcase-equip-skin">UNLOCK (${charData.cost} COINS)</button>`;
      }
      actionEl.innerHTML = actionBtnHtml;

      const btnAction = document.getElementById('btn-showcase-equip-skin');
      if (btnAction) {
        btnAction.onclick = () => {
          if (isUnlocked) {
            Storage.setSelectedSkin(skinId);
            this.game.player.applySkin(skinId);
            Audio.playButtonClick();
            this.renderSkins();
            this.updateHomeCharacterCard();
          } else {
            if (Storage.spendCoins(charData.cost)) {
              Storage.unlockSkin(skinId);
              Storage.setSelectedSkin(skinId);
              this.game.player.applySkin(skinId);
              Audio.playPowerUp();
              this.renderSkins();
              this.updateHomeCharacterCard();
              this.refreshMenuStats();
            } else {
              alert(`Need ${charData.cost} coins to unlock ${charData.name}! Keep sprinting to earn coins.`);
            }
          }
        };
      }
    }

    // 2. Render Live 3D Model on Showcase Stage Canvas
    if (!this.heroPreview) {
      this.heroPreview = new ModelPreview3D('hero-3d-preview-canvas', 'character');
    }
    const heroModel = this.game.player.createCharacterModelGroup(skinId, false);
    this.heroPreview.setModel(heroModel, true);

    // 3. Render Collection Horizontal Thumbnails Strip
    const thumbContainer = document.getElementById('skins-thumb-container');
    if (thumbContainer) {
      thumbContainer.innerHTML = '';
      this.characterKeys.forEach((k, idx) => {
        const d = this.game.player.skins[k];
        if (!d) return;

        const isUnl = unlocked.includes(k);
        const isSel = selected === k;
        const isActive = this.modalSkinIndex === idx;

        const thumb = document.createElement('div');
        thumb.className = `showcase-thumb-item ${isActive ? 'active-thumb' : ''} ${isSel ? 'equipped-thumb' : ''} ${isUnl ? 'unlocked' : 'locked'}`;

        const colorHex = '#' + (d.hoodie.toString(16).padStart(6, '0'));
        const accentHex = '#' + (d.accent ? d.accent.toString(16).padStart(6, '0') : '00d2d3');

        thumb.innerHTML = `
          <div class="thumb-avatar" style="background: linear-gradient(135deg, ${colorHex}, ${accentHex});">
            <span>${d.avatar || 'CD'}</span>
          </div>
          <span class="thumb-name">${d.name.split(' ')[0]}</span>
          ${isSel ? '<span class="thumb-badge">EQ</span>' : (!isUnl ? '<span class="thumb-lock">LOCK</span>' : '')}
        `;

        thumb.onclick = () => {
          Audio.playWhoosh();
          this.modalSkinIndex = idx;
          this.currentCharIndex = idx;
          this.game.player.applySkin(k);
          this.renderSkins();
          this.updateHomeCharacterCard();
        };

        thumbContainer.appendChild(thumb);
      });
    }

    // Apply live 3D preview in game background
    this.game.player.applySkin(skinId);
  }

  // --- 26 SKATEBOARDS & HOVERBOARDS SHOWCASE CAROUSEL RENDERER ---
  renderBoards() {
    const totalCoins = Storage.getTotalCoins();
    const displayCoins = document.getElementById('boards-coins-display');
    if (displayCoins) displayCoins.textContent = totalCoins;

    const unlocked = Storage.getUnlockedBoards();
    const selected = Storage.getSelectedBoard();

    const boardId = this.boardKeys[this.modalBoardIndex] || 'freestyle';
    const bData = this.game.player.boards[boardId];
    if (!bData) return;

    const isUnlocked = unlocked.includes(boardId);
    const isSelected = selected === boardId;

    // Update Counter (e.g. 1 / 26)
    const indexDisplay = document.getElementById('board-index-display');
    if (indexDisplay) {
      indexDisplay.textContent = `${this.modalBoardIndex + 1} / ${this.boardKeys.length}`;
    }

    // 1. Render Featured Center Hoverboard Showcase Card Details
    const headerEl = document.getElementById('board-showcase-header');
    if (headerEl) {
      headerEl.innerHTML = `
        <span class="gender-tag gender-boy">HOVERBOARD</span>
        <span class="showcase-rarity">${isUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
      `;
    }

    const infoEl = document.getElementById('board-showcase-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <h3 class="showcase-hero-name text-3d-header">${bData.name}</h3>
        <span class="showcase-hero-title">${bData.desc || 'Custom Subway Hoverboard'}</span>
      `;
    }

    const statsEl = document.getElementById('board-showcase-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="showcase-stat-pill">
          <span class="stat-name">SHIELD BOOST</span>
          <div class="stat-track"><div class="stat-fill" style="width: ${80 + (this.modalBoardIndex % 5) * 4}%"></div></div>
        </div>
        <div class="showcase-stat-pill">
          <span class="stat-name">TRAIL GLOW</span>
          <div class="stat-track"><div class="stat-fill" style="width: ${85 + ((this.modalBoardIndex * 2) % 4) * 4}%"></div></div>
        </div>
      `;
    }

    const actionEl = document.getElementById('board-showcase-action');
    if (actionEl) {
      let actionBtnHtml = '';
      if (isSelected) {
        actionBtnHtml = '<button class="btn-showcase-action equipped" disabled>EQUIPPED</button>';
      } else if (isUnlocked) {
        actionBtnHtml = `<button class="btn-showcase-action can-equip" id="btn-showcase-equip-board">EQUIP BOARD</button>`;
      } else {
        actionBtnHtml = `<button class="btn-showcase-action unlock" id="btn-showcase-equip-board">UNLOCK (${bData.cost} COINS)</button>`;
      }
      actionEl.innerHTML = actionBtnHtml;

      const btnAction = document.getElementById('btn-showcase-equip-board');
      if (btnAction) {
        btnAction.onclick = () => {
          if (isUnlocked) {
            Storage.setSelectedBoard(boardId);
            this.game.player.applyBoard(boardId);
            Audio.playButtonClick();
            this.renderBoards();
          } else {
            if (Storage.spendCoins(bData.cost)) {
              Storage.unlockBoard(boardId);
              Storage.setSelectedBoard(boardId);
              this.game.player.applyBoard(boardId);
              Audio.playPowerUp();
              this.renderBoards();
              this.refreshMenuStats();
            } else {
              alert(`Need ${bData.cost} coins to unlock ${bData.name}! Keep sprinting to earn coins.`);
            }
          }
        };
      }
    }

    // 2. Render Live 3D Hoverboard on Showcase Stage Canvas
    if (!this.boardPreview) {
      this.boardPreview = new ModelPreview3D('board-3d-preview-canvas', 'board');
    }
    const boardModel = this.game.player.buildHoverboardMesh(boardId);
    this.boardPreview.setModel(boardModel, false);

    // 3. Render Collection Horizontal Thumbnails Strip
    const thumbContainer = document.getElementById('boards-thumb-container');
    if (thumbContainer) {
      thumbContainer.innerHTML = '';
      this.boardKeys.forEach((k, idx) => {
        const d = this.game.player.boards[k];
        if (!d) return;

        const isUnl = unlocked.includes(k);
        const isSel = selected === k;
        const isActive = this.modalBoardIndex === idx;

        const thumb = document.createElement('div');
        thumb.className = `showcase-thumb-item ${isActive ? 'active-thumb' : ''} ${isSel ? 'equipped-thumb' : ''} ${isUnl ? 'unlocked' : 'locked'}`;

        const colorHex = '#' + (d.deck.toString(16).padStart(6, '0'));
        const neonHex = '#' + (d.neon.toString(16).padStart(6, '0'));

        thumb.innerHTML = `
          <div class="thumb-avatar" style="background: linear-gradient(135deg, ${colorHex}, ${neonHex});">
            <span>${d.avatar || 'SB'}</span>
          </div>
          <span class="thumb-name">${d.name.split(' ')[0]}</span>
          ${isSel ? '<span class="thumb-badge">EQ</span>' : (!isUnl ? '<span class="thumb-lock">LOCK</span>' : '')}
        `;

        thumb.onclick = () => {
          Audio.playWhoosh();
          this.modalBoardIndex = idx;
          this.game.player.applyBoard(k);
          this.renderBoards();
        };

        thumbContainer.appendChild(thumb);
      });
    }

    // Apply live 3D board on player
    this.game.player.applyBoard(boardId);
  }

  // ===================================================
  // RETENTION & ENGAGEMENT FEATURES
  // Daily Rewards, Spin Wheel, Trophies, Mystery Box, Share
  // ===================================================

  // --- 1. DAILY LOGIN REWARDS CALENDAR (7-DAY STREAK) ---
  renderDailyRewards() {
    const container = document.getElementById('daily-streak-container');
    const claimBtn = document.getElementById('btn-claim-daily');
    const claimBtnText = document.getElementById('daily-claim-btn-text');
    if (!container || !Storage.getDailyRewardsData) return;

    const data = Storage.getDailyRewardsData();
    const streakDay = data.streak || 1;
    const claimedToday = data.claimedToday;

    const schedule = [
      { day: 1, icon: '🪙', reward: '250 Coins' },
      { day: 2, icon: '🪙', reward: '500 Coins' },
      { day: 3, icon: '🗝️', reward: '1 Key' },
      { day: 4, icon: '🪙', reward: '1,000 Coins' },
      { day: 5, icon: '📦', reward: '1 Mystery Box' },
      { day: 6, icon: '🗝️', reward: '3 Keys' },
      { day: 7, icon: '🎁', reward: '3,000 C + 5 Keys', super: true }
    ];

    container.innerHTML = '';
    schedule.forEach(item => {
      const card = document.createElement('div');
      let statusClass = '';
      let badgeText = '';

      if (item.day < streakDay || (item.day === streakDay && claimedToday)) {
        statusClass = 'claimed';
        badgeText = 'CLAIMED ✓';
      } else if (item.day === streakDay && !claimedToday) {
        statusClass = 'today';
        badgeText = 'READY!';
      } else {
        statusClass = 'locked';
        badgeText = 'LOCKED';
      }

      card.className = `daily-card ${item.super ? 'day-7-super' : ''} ${statusClass}`;
      card.innerHTML = `
        <span class="daily-card-day">DAY ${item.day}</span>
        <span class="daily-card-icon">${item.icon}</span>
        <span class="daily-card-reward">${item.reward}</span>
        <span class="daily-card-badge">${badgeText}</span>
      `;
      container.appendChild(card);
    });

    if (claimBtn) {
      if (data.canClaim) {
        claimBtn.disabled = false;
        if (claimBtnText) claimBtnText.textContent = `🎁 CLAIM DAY ${streakDay} REWARD!`;
      } else {
        claimBtn.disabled = true;
        if (claimBtnText) claimBtnText.textContent = `COME BACK TOMORROW FOR DAY ${streakDay >= 7 ? 1 : streakDay + 1}`;
      }
    }
  }

  claimDailyRewardAction() {
    if (!Storage.getDailyRewardsData || !Storage.claimDailyReward) return;
    const data = Storage.getDailyRewardsData();
    if (!data.canClaim) return;

    const streak = data.streak || 1;
    const reward = Storage.claimDailyReward(streak);
    if (Audio.playClaimReward) Audio.playClaimReward();

    this.showToast(`🎁 CLAIMED DAY ${streak}: ${reward.label}!`);
    this.refreshMenuStats();
    this.renderDailyRewards();
  }

  // --- 2. LUCKY SPIN WHEEL ---
  initSpinWheel() {
    this.spinSectors = [
      { label: '200 COINS', icon: '🪙', type: 'coins', amount: 200, bg: '#fef08a', color: '#854d0e' },
      { label: '1 KEY', icon: '🗝️', type: 'keys', amount: 1, bg: '#fed7aa', color: '#9a3412' },
      { label: '500 COINS', icon: '🪙', type: 'coins', amount: 500, bg: '#bbf7d0', color: '#166534' },
      { label: 'MYSTERY', icon: '📦', type: 'mystery', amount: 1, bg: '#ddd6fe', color: '#5b21b6' },
      { label: '1,000 COINS', icon: '🪙', type: 'coins', amount: 1000, bg: '#fef08a', color: '#854d0e' },
      { label: '2 KEYS', icon: '🗝️', type: 'keys', amount: 2, bg: '#fbcfe8', color: '#9d174d' },
      { label: '300 COINS', icon: '🪙', type: 'coins', amount: 300, bg: '#bae6fd', color: '#075985' },
      { label: 'JACKPOT!', icon: '💎', type: 'jackpot', coins: 2000, keys: 3, bg: '#fed7aa', color: '#9a3412' }
    ];

    this.drawSpinWheel(this.wheelRotation || 0);
    this.updateSpinWheelStatus();
  }

  updateSpinWheelStatus() {
    const sData = Storage.getSpinWheelData ? Storage.getSpinWheelData() : { canFreeSpin: true };
    const banner = document.getElementById('spin-wheel-status');
    const spinBtn = document.getElementById('btn-spin-action');
    const spinBtnText = document.getElementById('spin-btn-text');

    if (banner) {
      banner.textContent = sData.canFreeSpin ? '🎡 1 FREE DAILY SPIN READY!' : '⚡ 200 COINS PER EXTRA SPIN';
    }
    if (spinBtnText) {
      spinBtnText.textContent = sData.canFreeSpin ? '🎡 SPIN NOW (FREE)' : '🎡 SPIN (200 COINS)';
    }
    if (spinBtn) {
      spinBtn.disabled = this.isWheelSpinning;
    }
  }

  drawSpinWheel(angleOffset = 0) {
    const canvas = document.getElementById('spin-wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 8;
    const count = this.spinSectors ? this.spinSectors.length : 8;
    const arc = (Math.PI * 2) / count;

    ctx.clearRect(0, 0, width, height);

    // Draw Outer Rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.restore();

    // Draw Sectors
    for (let i = 0; i < count; i++) {
      const sector = this.spinSectors[i];
      const startAngle = angleOffset + i * arc;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = sector.bg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Sector Text & Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = sector.color;
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.fillText(`${sector.icon} ${sector.label}`, radius - 16, 4);
      ctx.restore();
    }

    // Draw Center Hub Pin
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY);
  }

  spinWheelAction() {
    if (this.isWheelSpinning) return;
    const sData = Storage.getSpinWheelData ? Storage.getSpinWheelData() : { canFreeSpin: true };

    if (sData.canFreeSpin) {
      Storage.useFreeSpin();
    } else {
      if (!Storage.spendCoins(200)) {
        alert('Need 200 coins to spin again! Keep sprinting to earn coins.');
        return;
      }
      this.refreshMenuStats();
    }

    this.isWheelSpinning = true;
    const spinBtn = document.getElementById('btn-spin-action');
    if (spinBtn) spinBtn.disabled = true;

    const count = this.spinSectors.length;
    const arc = (Math.PI * 2) / count;

    // Pick target sector with weighted roll
    const targetIndex = Math.floor(Math.random() * count);
    const extraRotations = 5 + Math.floor(Math.random() * 3);
    const targetAngle = -Math.PI / 2 - (targetIndex * arc + arc / 2);
    const currentNorm = this.wheelRotation % (Math.PI * 2);
    const totalRotation = extraRotations * Math.PI * 2 + (targetAngle - currentNorm);

    const startTime = performance.now();
    const duration = 3800; // ms
    const initialRotation = this.wheelRotation;
    let lastSectorTick = -1;

    const animateWheel = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      this.wheelRotation = initialRotation + totalRotation * ease;

      const normalized = (this.wheelRotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const currentSector = Math.floor(((-Math.PI / 2 - normalized + Math.PI * 4) % (Math.PI * 2)) / arc);
      if (currentSector !== lastSectorTick) {
        lastSectorTick = currentSector;
        if (Audio.playWheelTick) Audio.playWheelTick();
      }

      this.drawSpinWheel(this.wheelRotation);

      if (progress < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        this.isWheelSpinning = false;
        this.onSpinWheelLanded(this.spinSectors[targetIndex]);
      }
    };

    requestAnimationFrame(animateWheel);
  }

  onSpinWheelLanded(sector) {
    if (Audio.playWheelWin) Audio.playWheelWin();

    if (sector.type === 'coins') {
      Storage.addCoins(sector.amount);
      this.showToast(`🎉 LUCKY WIN: +${sector.amount} COINS!`);
    } else if (sector.type === 'keys') {
      Storage.addKeys(sector.amount);
      this.showToast(`🎉 LUCKY WIN: +${sector.amount} REVIVE KEY!`);
    } else if (sector.type === 'mystery') {
      Storage.addMysteryBoxes(1);
      this.showToast(`🎉 LUCKY WIN: +1 MYSTERY CRATE!`);
    } else if (sector.type === 'jackpot') {
      Storage.addCoins(sector.coins);
      Storage.addKeys(sector.keys);
      this.showToast(`💎 MEGA JACKPOT! +${sector.coins} COINS & +${sector.keys} KEYS!`);
    }

    this.refreshMenuStats();
    this.updateSpinWheelStatus();
  }

  // --- 3. ACHIEVEMENTS TROPHY ROOM ---
  getAchievementsList() {
    return [
      { id: 'first_run', title: 'First Sprint', desc: 'Complete your first run across metro rails', stat: 'totalRuns', req: 1, type: 'coins', rewardVal: 200, rewardLabel: '200 Coins', icon: '🏃' },
      { id: 'dist_1k', title: 'Rookie Runner', desc: 'Sprint 1,000 meters total distance', stat: 'totalDistance', req: 1000, type: 'coins', rewardVal: 300, rewardLabel: '300 Coins', icon: '👟' },
      { id: 'dist_5k', title: 'Pro Sprinter', desc: 'Sprint 5,000 meters total distance', stat: 'totalDistance', req: 5000, type: 'coins', rewardVal: 500, rewardLabel: '500 Coins', icon: '⚡' },
      { id: 'dist_20k', title: 'Marathon Master', desc: 'Sprint 20,000 meters total distance', stat: 'totalDistance', req: 20000, type: 'keys', rewardVal: 2, rewardLabel: '2 Keys', icon: '👑' },
      { id: 'coins_500', title: 'Coin Collector', desc: 'Collect 500 total gold coins in your sprints', stat: 'totalCoinsCollected', req: 500, type: 'coins', rewardVal: 300, rewardLabel: '300 Coins', icon: '🪙' },
      { id: 'coins_2500', title: 'Coin Tycoon', desc: 'Collect 2,500 total gold coins', stat: 'totalCoinsCollected', req: 2500, type: 'coins', rewardVal: 800, rewardLabel: '800 Coins', icon: '💰' },
      { id: 'coins_10k', title: 'Metro Millionaire', desc: 'Collect 10,000 total gold coins', stat: 'totalCoinsCollected', req: 10000, type: 'keys', rewardVal: 3, rewardLabel: '3 Keys', icon: '💎' },
      { id: 'jumps_50', title: 'Airborne Athlete', desc: 'Perform 50 high hurdle jumps', stat: 'totalJumps', req: 50, type: 'coins', rewardVal: 300, rewardLabel: '300 Coins', icon: '🦘' },
      { id: 'slides_50', title: 'Smooth Slider', desc: 'Slide under 50 barriers and blockades', stat: 'totalSlides', req: 50, type: 'coins', rewardVal: 300, rewardLabel: '300 Coins', icon: '🛹' },
      { id: 'boards_10', title: 'Hoverboard Legend', desc: 'Surf on hoverboards 10 times to dodge crashes', stat: 'totalHoverboardsUsed', req: 10, type: 'keys', rewardVal: 2, rewardLabel: '2 Keys', icon: '🛹' }
    ];
  }

  hasUnclaimedAchievements() {
    const list = this.getAchievementsList();
    const stats = Storage.getStats ? Storage.getStats() : {};
    const achData = Storage.getAchievementsData ? Storage.getAchievementsData() : { claimed: [] };
    const claimed = achData.claimed || [];

    for (let ach of list) {
      const val = stats[ach.stat] || 0;
      if (val >= ach.req && !claimed.includes(ach.id)) {
        return true;
      }
    }
    return false;
  }

  renderAchievements() {
    const list = this.getAchievementsList();
    const stats = Storage.getStats ? Storage.getStats() : {};
    const achData = Storage.getAchievementsData ? Storage.getAchievementsData() : { claimed: [] };
    const claimed = achData.claimed || [];

    const container = document.getElementById('achievements-list-container');
    const counterDisplay = document.getElementById('achievements-counter-display');
    if (!container) return;

    let completedCount = 0;
    container.innerHTML = '';

    list.forEach(ach => {
      const currentVal = Math.min(ach.req, stats[ach.stat] || 0);
      const isCompleted = currentVal >= ach.req;
      const isClaimed = claimed.includes(ach.id);
      if (isCompleted) completedCount++;

      const pct = Math.round((currentVal / ach.req) * 100);

      const card = document.createElement('div');
      card.className = `achievement-item-card ${isClaimed ? 'completed' : ''}`;

      let actionHtml = '';
      if (isClaimed) {
        actionHtml = `<span class="ach-claimed-badge">COMPLETED ✓</span>`;
      } else if (isCompleted) {
        actionHtml = `<button class="btn-claim-ach pulse-anim" data-id="${ach.id}">CLAIM (${ach.rewardLabel})</button>`;
      } else {
        actionHtml = `<span class="ach-reward-tag">${ach.rewardLabel}</span>`;
      }

      card.innerHTML = `
        <div class="ach-icon-circle">${ach.icon}</div>
        <div class="ach-item-details">
          <div class="ach-title-row">
            <span class="ach-title">${ach.title}</span>
            <span style="font-size:11px;font-weight:700;color:#64748b;">${currentVal}/${ach.req}</span>
          </div>
          <span class="ach-desc">${ach.desc}</span>
          <div class="ach-progress-bar-wrap">
            <div class="ach-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
        ${actionHtml}
      `;

      const btnClaim = card.querySelector('.btn-claim-ach');
      if (btnClaim) {
        btnClaim.onclick = (e) => {
          e.stopPropagation();
          this.claimAchievementAction(ach);
        };
      }

      container.appendChild(card);
    });

    if (counterDisplay) {
      counterDisplay.textContent = `${completedCount} / ${list.length}`;
    }
  }

  claimAchievementAction(ach) {
    if (!Storage.claimAchievement) return;
    const ok = Storage.claimAchievement(ach.id, ach.type, ach.rewardVal);
    if (ok) {
      if (Audio.playClaimReward) Audio.playClaimReward();
      this.showToast(`🏆 UNLOCKED: ${ach.title}! (+${ach.rewardLabel})`);
      this.refreshMenuStats();
      this.renderAchievements();
    }
  }

  // --- 4. MYSTERY BOX UNBOXING ---
  renderMysteryBoxModal() {
    const count = Storage.getMysteryBoxes ? Storage.getMysteryBoxes() : 0;
    const countEl = document.getElementById('mystery-boxes-count');
    if (countEl) countEl.textContent = count;

    const revealEl = document.getElementById('mystery-reward-reveal');
    if (revealEl) revealEl.classList.add('hidden');

    const headline = document.getElementById('mystery-headline');
    if (headline) headline.textContent = count > 0 ? 'TAP CRATE TO UNBOX!' : 'NO CRATES LEFT';

    const subtext = document.getElementById('mystery-subtext');
    if (subtext) subtext.textContent = count > 0 ? 'Mystery crates contain coins, revive keys & surprises!' : 'Sprint farther or spin the lucky wheel to get crates!';

    const boxGraphic = document.getElementById('mystery-box-graphic');
    if (boxGraphic) boxGraphic.textContent = '📦';
  }

  openMysteryBoxAction() {
    const count = Storage.getMysteryBoxes ? Storage.getMysteryBoxes() : 0;
    if (count <= 0) {
      this.showToast('📦 No mystery crates left! Sprint to find more!');
      return;
    }

    const boxGraphic = document.getElementById('mystery-box-graphic');
    if (boxGraphic) {
      boxGraphic.classList.remove('mystery-box-shake');
      void boxGraphic.offsetWidth; // reflow
      boxGraphic.classList.add('mystery-box-shake');
    }

    if (Audio.playChestOpen) Audio.playChestOpen();

    setTimeout(() => {
      const reward = Storage.openMysteryBox ? Storage.openMysteryBox() : null;
      if (!reward) return;

      if (boxGraphic) boxGraphic.textContent = '🎁';

      const revealEl = document.getElementById('mystery-reward-reveal');
      const iconEl = document.getElementById('mystery-reward-icon');
      const amountEl = document.getElementById('mystery-reward-amount');

      if (iconEl) iconEl.textContent = reward.icon;
      if (amountEl) amountEl.textContent = `+${reward.title}!`;
      if (revealEl) revealEl.classList.remove('hidden');

      const headline = document.getElementById('mystery-headline');
      if (headline) headline.textContent = 'SURPRISE REWARD UNLOCKED!';

      this.showToast(`🎁 FOUND: ${reward.title}!`);
      this.refreshMenuStats();

      const newCount = Storage.getMysteryBoxes ? Storage.getMysteryBoxes() : 0;
      const countEl = document.getElementById('mystery-boxes-count');
      if (countEl) countEl.textContent = newCount;
    }, 450);
  }

  // --- 5. SCORE SHARE SNAPSHOT CARD GENERATOR ---
  shareScoreCard() {
    const stats = this._lastRunStats || {
      score: parseInt(document.getElementById('result-score')?.textContent || '0', 10),
      coins: parseInt(document.getElementById('result-coins')?.textContent || '0', 10),
      distance: parseInt(document.getElementById('result-distance')?.textContent || '0', 10)
    };

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#0284c7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon Frame Accent
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("SAURABH'S SPRINT", canvas.width / 2, 80);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px Fredoka, sans-serif';
    ctx.fillText('SUBWAY SURFERS METRO RUNNER', canvas.width / 2, 110);

    // Character Tag Box
    const skinKey = Storage.getSelectedSkin ? Storage.getSelectedSkin() : 'cyber_dash';
    const skinData = (this.game && this.game.player && this.game.player.skins) ? this.game.player.skins[skinKey] || {} : {};
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(50, 140, canvas.width - 100, 70, 20);
    else ctx.rect(50, 140, canvas.width - 100, 70);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 22px Fredoka, sans-serif';
    ctx.fillText(`HERO: ${skinData.name || 'CYBER DASH'}`, canvas.width / 2, 182);

    // Score Hero Card
    ctx.fillStyle = 'rgba(2, 132, 199, 0.35)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(50, 235, canvas.width - 100, 160, 24);
    else ctx.rect(50, 235, canvas.width - 100, 160);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Fredoka, sans-serif';
    ctx.fillText('FINAL SPRINT SCORE', canvas.width / 2, 275);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 58px Fredoka, sans-serif';
    ctx.fillText(stats.score.toLocaleString(), canvas.width / 2, 345);

    // Dual Stats Badges: Coins & Distance
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(50, 420, 235, 120, 18);
    else ctx.rect(50, 420, 235, 120);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.fillText('COINS EARNED', 167, 455);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 32px Fredoka, sans-serif';
    ctx.fillText(`🪙 +${stats.coins}`, 167, 505);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(315, 420, 235, 120, 18);
    else ctx.rect(315, 420, 235, 120);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.fillText('DISTANCE', 432, 455);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px Fredoka, sans-serif';
    ctx.fillText(`${stats.distance}m`, 432, 505);

    // High Score Row
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px Fredoka, sans-serif';
    ctx.fillText(`🏆 ALL-TIME BEST: ${Storage.getHighScore().toLocaleString()}`, canvas.width / 2, 590);

    // Call to Action Footer
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px Fredoka, sans-serif';
    ctx.fillText('⚡ CAN YOU BEAT MY RECORD? ⚡', canvas.width / 2, 655);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Fredoka, sans-serif';
    ctx.fillText('Play free offline: Saurabh Sprint', canvas.width / 2, 690);

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], 'saurabh_sprint_score.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: "Saurabh's Sprint - High Score!",
            text: `I just scored ${stats.score.toLocaleString()} points in Saurabh's Sprint! Can you beat my record?`
          }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `saurabh_sprint_score_${stats.score}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.showToast('📸 Score card downloaded to your device!');
        }
      }, 'image/png');
    }
  }
}

if (typeof window !== 'undefined') {
  window.UIManager = UIManager;
}
if (typeof globalThis !== 'undefined') {
  globalThis.UIManager = UIManager;
}
if (typeof global !== 'undefined') {
  global.UIManager = UIManager;
}
