/**
 * Saurabh's Sprint - Main Engine & Game Loop
 * Features:
 * - Subway Surfers Spray Painting Intro Cutscene
 * - Police Whistle & Dog Bark on Start
 * - 5-7s Close Chase, Stumble Near-Miss Chase, and Catch Sequence
 * - 26 Unique Gaming Heroes & Power-Up Upgrades
 */

class Game {
  constructor() {
    this.STATE = {
      MENU: 'MENU',
      PLAYING: 'PLAYING',
      PAUSED: 'PAUSED',
      GAMEOVER: 'GAMEOVER'
    };
    this.currentState = this.STATE.MENU;

    // Game Metrics
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.multiplier = 1;

    this.baseSpeed = 13.0;
    this.maxSpeed = 38.0;
    this.currentSpeed = this.baseSpeed;
    this.speedAcceleration = 0.4;

    this.clock = new THREE.Clock();

    this.initThree();
    this.initSubsystems();
    this.initSpeedLines();
    this.setupInputs();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.container = document.getElementById('game-container');

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x70a1ff);

    // 2. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 300);
    this.targetFOV = 65;
    this.cameraOffset = new THREE.Vector3(0, 3.2, 5.8);
    this.cameraLookOffset = new THREE.Vector3(0, 1.4, -4);
    this.camera.position.set(0.8, 1.4, 2.0);
    this.camera.lookAt(0.5, 1.2, -4);
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();

    // 3. Renderer (Tuned for 60 FPS on all Laptops and Mobile GPUs)
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        precision: 'mediump'
      });
    } catch (e) {
      console.warn('High-perf WebGLRenderer fallback:', e);
      this.renderer = new THREE.WebGLRenderer();
    }
    this.renderer.setSize(window.innerWidth || 800, window.innerHeight || 600);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    if (this.renderer.shadowMap) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    if (this.container && this.renderer.domElement) {
      this.container.appendChild(this.renderer.domElement);
    }

    // 4. Lights & Optimized Shadow Frustum
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff275, 1.1);
    this.dirLight.position.set(8, 20, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 512;
    this.dirLight.shadow.mapSize.height = 512;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 40;
    this.dirLight.shadow.camera.left = -6;
    this.dirLight.shadow.camera.right = 6;
    this.dirLight.shadow.camera.top = 6;
    this.dirLight.shadow.camera.bottom = -6;
    this.scene.add(this.dirLight);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initSubsystems() {
    this.collectibles = new CollectibleManager(this.scene);
    this.world = new WorldManager(this.scene, this.collectibles);
    this.player = new Player(this.scene);
    this.chaser = new ChaserManager(this.scene);
    this.input = new InputManager();
    this.ui = new UIManager(this);

    const savedSkin = Storage.getSelectedSkin();
    this.player.applySkin(savedSkin);
  }

  initSpeedLines() {
    // Create a star-shaped canvas texture for speed particles
    const starCanvas = document.createElement ? document.createElement('canvas') : null;
    let starTexture = null;
    if (starCanvas) {
      starCanvas.width = 64;
      starCanvas.height = 64;
      const sCtx = starCanvas.getContext('2d');
      // Draw a 5-pointed star
      const drawStar = (ctx, cx, cy, spikes, outerR, innerR) => {
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
          rot += step;
          ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
      };
      // Outer glow
      const glow = sCtx.createRadialGradient(32, 32, 0, 32, 32, 28);
      glow.addColorStop(0, 'rgba(255,255,200,1)');
      glow.addColorStop(0.4, 'rgba(200,220,255,0.8)');
      glow.addColorStop(1, 'rgba(100,180,255,0)');
      sCtx.fillStyle = glow;
      sCtx.fillRect(0, 0, 64, 64);
      // Star shape
      drawStar(sCtx, 32, 32, 5, 28, 11);
      const starGrad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 28);
      starGrad.addColorStop(0, 'rgba(255,255,255,1)');
      starGrad.addColorStop(0.5, 'rgba(180,220,255,0.95)');
      starGrad.addColorStop(1, 'rgba(80,160,255,0.0)');
      sCtx.fillStyle = starGrad;
      sCtx.fill();
      starTexture = new THREE.CanvasTexture(starCanvas);
    }

    this.speedLineCount = 80;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.speedLineCount * 3);
    const sizes = new Float32Array(this.speedLineCount);

    for (let i = 0; i < this.speedLineCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = Math.random() * 8 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      sizes[i] = 0.18 + Math.random() * 0.28;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xd0eeff,
      size: 0.32,
      transparent: true,
      opacity: 0.82,
      map: starTexture,
      alphaTest: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.speedLines = new THREE.Points(geo, mat);
    this.speedLines.visible = false; // Only show when running fast
    this.scene.add(this.speedLines);
  }

  updateSpeedLines(delta) {
    if (!this.speedLines) return;

    // Show stars only when speed is above 60% of the way to max speed
    const speedRatio = (this.currentSpeed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed);
    this.speedLines.visible = speedRatio > 0.25;
    if (!this.speedLines.visible) return;

    // Scale opacity and size with speed
    this.speedLines.material.opacity = 0.45 + speedRatio * 0.5;
    this.speedLines.material.size = 0.22 + speedRatio * 0.35;

    const positions = this.speedLines.geometry.attributes.position.array;
    const pZ = this.player.mesh.position.z;

    for (let i = 0; i < this.speedLineCount; i++) {
      let z = positions[i * 3 + 2];
      // Stars fly towards camera (positive Z = towards viewer)
      z += this.currentSpeed * delta * 1.8;
      if (z > pZ + 10) {
        z = pZ - 38 - Math.random() * 12;
        positions[i * 3]     = (Math.random() - 0.5) * 18;
        positions[i * 3 + 1] = Math.random() * 7.5 + 0.5;
      }
      positions[i * 3 + 2] = z;
    }
    this.speedLines.geometry.attributes.position.needsUpdate = true;
  }

  setupInputs() {
    this.input.onSwipeLeft = () => {
      if (this.currentState === this.STATE.PLAYING) this.player.moveLeft();
    };
    this.input.onSwipeRight = () => {
      if (this.currentState === this.STATE.PLAYING) this.player.moveRight();
    };
    this.input.onSwipeUp = () => {
      if (this.currentState === this.STATE.PLAYING) this.player.jump();
      else if (this.currentState === this.STATE.MENU) this.startGame();
    };
    this.input.onSwipeDown = () => {
      if (this.currentState === this.STATE.PLAYING) this.player.slide();
    };
    this.input.onDoubleTap = () => {
      if (this.currentState === this.STATE.PLAYING) {
        this.player.activateHoverboard();
      }
    };
    this.input.onPauseToggle = () => {
      if (this.currentState === this.STATE.PLAYING || this.currentState === this.STATE.PAUSED) {
        this.togglePause();
      }
    };

    if (this.container) {
      this.container.addEventListener('click', () => {
        if (this.currentState === this.STATE.MENU) {
          this.startGame();
        }
      });
    }
  }

  // Authentic Subway Surfers Intro Sequence (Spray Painting -> Whistle -> Close Chase)
  startGame() {
    if (this.currentState === this.STATE.PLAYING) return;
    this.currentState = this.STATE.PLAYING;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.runReviveCount = 0;
    this.keysCollected = 0;
    this.currentSpeed = this.baseSpeed;
    this.savedSpeedBeforeCrash = this.baseSpeed;
    this.clock.getDelta(); // Flush any accumulated clock time

    // Pick new fresh word on every new game run!
    if (typeof Missions !== 'undefined' && Missions.startNewRunWord) {
      Missions.startNewRunWord();
    }

    const equippedSkin = Storage.getSelectedSkin();
    this.player.applySkin(equippedSkin);

    this.player.reset();
    this.collectibles.clear();
    this.world.clear();

    // Snap camera immediately behind player so no lerp lag or blue void
    this.camera.position.set(0, 3.2, 5.8);
    this.camera.lookAt(0, 1.4, -4);

    // Sound FX & Start Intro Close Chase (5-7 seconds)
    Audio.playWhistle();
    setTimeout(() => Audio.playDogBark(), 350);
    this.chaser.startChase();

    this.ui.showScreen(null);
    this.ui.showHUD(true);
    this.ui.updateWordHuntUI(true); // Popup word banner for 3.5s at start of run!
    Audio.startBGM();
  }

  togglePause() {
    if (this.currentState === this.STATE.PLAYING) {
      this.currentState = this.STATE.PAUSED;
      this.ui.showScreen(this.ui.pauseScreen);
      const scoreEl = document.getElementById('pause-score');
      const coinsEl = document.getElementById('pause-coins');
      if (scoreEl) scoreEl.textContent = Math.floor(this.score);
      if (coinsEl) coinsEl.textContent = '🪙 ' + this.coins;
      Audio.stopBGM();
    } else if (this.currentState === this.STATE.PAUSED) {
      this.clock.getDelta(); // Flush clock delta so unpausing causes zero lag/frame jump
      this.currentState = this.STATE.PLAYING;
      this.ui.showScreen(null);
      this.ui.showHUD(true);
      Audio.startBGM();
    }
  }

  quitToMenu() {
    this.currentState = this.STATE.MENU;
    this.player.reset();
    this.chaser.hide();
    this.collectibles.clear();
    this.world.clear();
    this.camera.position.set(0.0, 1.35, 2.7);
    this.camera.lookAt(0.0, 0.95, 0.0);
    this.ui.showHUD(false);
    this.ui.showScreen(this.ui.startScreen);
    this.ui.refreshMenuStats();
    this.ui.updateHomeCharacterCard();
    this.lastStumbleTime = 0;
    Audio.stopBGM();
  }

  onPlayerStumble() {
    const now = performance.now();
    if (now - this.lastStumbleTime < 8000) return; // 8s cooldown so chaser doesn't repeatedly harass
    this.lastStumbleTime = now;

    this.player.stumble();
    this.chaser.triggerStumbleCatch();
  }

  onCollectLetter(letter) {
    if (typeof Missions !== 'undefined' && Missions.collectLetter) {
      const res = Missions.collectLetter(letter);
      if (res) {
        this.score += 500;
        if (this.ui) {
          if (res.completed) {
            this.coins += res.reward;
            this.score += 2500;
            this.ui.showToast(`🎉 WORD HUNT COMPLETED: ${res.word}! +${res.reward} 🪙 COINS`);
          } else {
            this.ui.showToast(`🔤 LETTER [${res.letter}] COLLECTED! (${res.count}/${res.total})`);
          }
          this.ui.updateWordHuntUI(true); // Popup for 3.5s showing newly updated letter!
        }
      }
    }
  }

  onCollectKey(keyItem) {
    this.keysCollected = (this.keysCollected || 0) + 1;
    const total = Storage.addKeys(1);
    this.score += 250;
    if (this.ui) {
      this.ui.showToast(`🗝️ KEY COLLECTED! (${total} TOTAL)`);
      this.ui.refreshMenuStats();
    }
  }

  onPlayerCrash(obstacle) {
    this.currentState = this.STATE.GAMEOVER;
    this.savedSpeedBeforeCrash = Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 100) * this.speedAcceleration);
    this.currentSpeed = 0; // Immediately stop forward movement

    // Prevent clipping/penetrating inside the train or obstacle: snap player in front outside the boundary
    if (obstacle && obstacle.getBounds) {
      const bounds = obstacle.getBounds();
      this.player.mesh.position.z = Math.max(this.player.mesh.position.z, bounds.maxZ + 0.65);
    } else if (obstacle && obstacle.mesh) {
      this.player.mesh.position.z = Math.max(this.player.mesh.position.z, obstacle.mesh.position.z + 0.65);
    }

    // Trigger knockdown / fall backwards onto the track
    if (this.player && this.player.playCrashKnockdown) {
      this.player.playCrashKnockdown();
    }

    Audio.playCrash();
    Audio.stopBGM();
    Audio.playWhistle();
    Audio.playDogBark();
    this.input.vibrate([100, 50, 100]);

    this.chaser.triggerCatchAnimation();

    const neededKeys = (this.runReviveCount + 1) * 2;

    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      this.camera.position.x += (Math.random() - 0.5) * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * 0.35;
      shakeCount++;
      if (shakeCount > 8) {
        clearInterval(shakeInterval);
        this.ui.startReviveOffer(
          this.score,
          this.coins,
          this.distance,
          neededKeys,
          () => this.revivePlayer(),
          () => this.ui.showGameOver(this.score, this.coins, this.distance, neededKeys)
        );
      }
    }, 30);
  }

  revivePlayer() {
    this.currentState = this.STATE.PLAYING;
    this.runReviveCount = (this.runReviveCount || 0) + 1;
    this.currentSpeed = this.savedSpeedBeforeCrash || Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 100) * this.speedAcceleration);

    // Properly stand up the character — resets isDead, body rotations, physics
    this.player.revive();

    // Clear nearby obstacles around player so they don't instantly re-crash
    const pZ = this.player.mesh.position.z;
    for (let i = this.world.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.world.activeObstacles[i];
      if (obs.mesh.position.z < pZ + 10 && obs.mesh.position.z > pZ - 45) {
        this.collectibles.createPickupParticles(obs.mesh.position.x, 1.0, obs.mesh.position.z, 0x00d2d3);
        this.scene.remove(obs.mesh);
        this.world.activeObstacles.splice(i, 1);
      }
    }

    // Activate hoverboard for brief invincibility
    this.player.activateHoverboard();

    Audio.startBGM();
    this.chaser.startChase();

    this.ui.showScreen(null);
    this.ui.showHUD(true);

    // Flush clock delta LAST so no large delta causes speed spike on first frame
    this.clock.getDelta();
  }

  // --- GAME LOOP ---
  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.035);

    if (this.currentState === this.STATE.PLAYING) {
      // 1. Move Player
      const stepDistance = this.currentSpeed * delta;
      this.player.mesh.position.z -= stepDistance;
      this.distance += stepDistance;

      // Speed increases strictly with run progress / distance
      this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 100) * this.speedAcceleration);

      const mult = this.player.hasMultiplier ? 2 : 1;
      this.score += (stepDistance * 1.5) * mult;

      // 2. Update Player Kinematics
      this.player.update(delta, this.currentSpeed, this.player.groundHeight || 0);

      // 3. Update Chaser (Police & Dog)
      this.chaser.update(delta, this.player, this.currentSpeed);

      // 4. Update World, Collisions & Near-Miss Stumble
      this.world.update(
        delta,
        this.player,
        this.currentSpeed,
        (obs) => this.onPlayerCrash(obs),
        () => this.onPlayerStumble(),
        this.distance
      );

      this.updateEnvironmentalLighting(delta);

      // 5. Update Collectibles, Keys, Magnet & Word Hunt
      this.collectibles.update(
        delta,
        this.player,
        (val) => {
          this.coins += val;
          this.score += val * 10;
        },
        (powerupType) => {
          if (powerupType === 'magnet') {
            this.player.activateMagnet();
            Storage.incrementStat('totalMagnetsCollected', 1);
          }
          if (powerupType === 'multiplier') this.player.activateMultiplier();
          if (powerupType === 'hoverboard') this.player.activateHoverboard();
          if (powerupType === 'sneakers') this.player.activateSneakers();
          if (powerupType === 'jetpack') {
            this.player.activateJetpack();
            this.collectibles.spawnJetpackCoins(this.player.mesh.position.z - 8, 18);
          }
          Storage.incrementStat('totalPowerUpsCollected', 1);
        },
        (letter) => this.onCollectLetter(letter),
        (keyItem) => this.onCollectKey(keyItem)
      );

      // 6. VFX & HUD
      this.updateSpeedLines(delta);
      this.ui.updateHUD(this.score, this.coins, this.multiplier, this.player);

      this.dirLight.position.set(10, 25, this.player.mesh.position.z + 15);
      this.dirLight.target = this.player.mesh;

      this.updateCamera(delta);

    } else if (this.currentState === this.STATE.MENU) {
      // Check which menu modal is active
      const activeModal = this.ui ? this.ui.activeModalId : null;

      if (activeModal === 'skins') {
        // Hero Showcase Mode: Framing full 3D character with idle breathing & gentle sway
        this.player.updateIdle(delta);
        if (this.player.hoverboardGroup) this.player.hoverboardGroup.visible = false;
        const targetCamPos = new THREE.Vector3(0.0, 1.25, 2.35);
        this.camera.position.lerp(targetCamPos, delta * 8);
        this.camera.lookAt(0.0, 0.9, 0.0);
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();
        this.dirLight.position.set(2, 7, 4);
      } else if (activeModal === 'boards') {
        // Skateboard Showcase Mode: Focus camera on floating 3D Hoverboard
        this.player.updateIdle(delta);
        if (this.player.hoverboardGroup) {
          this.player.hoverboardGroup.visible = true;
          this.player.hoverboardGroup.rotation.y += delta * 1.8;
          this.player.hoverboardGroup.position.y = 0.12 + Math.sin(performance.now() * 0.004) * 0.04;
        }
        const targetCamPos = new THREE.Vector3(0.0, 0.75, 2.05);
        this.camera.position.lerp(targetCamPos, delta * 8);
        this.camera.lookAt(0.0, 0.3, 0.0);
        this.camera.fov = 48;
        this.camera.updateProjectionMatrix();
        this.dirLight.position.set(3, 5, 4);
      } else {
        // Standard Home Screen Presentation
        this.player.updateIdle(delta);
        const targetCamPos = new THREE.Vector3(0.0, 1.35, 2.7);
        this.camera.position.lerp(targetCamPos, delta * 6);
        this.camera.lookAt(0.0, 0.95, 0.0);
        this.camera.fov = 52;
        this.camera.updateProjectionMatrix();
        this.dirLight.position.set(3, 8, 5);
      }

      this.dirLight.target = this.player.mesh;
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateEnvironmentalLighting(delta) {
    const theme = this.world.getCurrentTheme();

    if (!this._tempSkyColor) {
      this._tempSkyColor = new THREE.Color();
      this._tempFogColor = new THREE.Color();
      this._tempAmbientColor = new THREE.Color();
      this._tempDirColor = new THREE.Color();
      this._tempLookTarget = new THREE.Vector3();
    }

    this._tempSkyColor.set(theme.skyColor);
    this.scene.background.lerp(this._tempSkyColor, delta * 2.0);

    if (this.scene.fog) {
      this._tempFogColor.set(theme.fogColor);
      this.scene.fog.color.lerp(this._tempFogColor, delta * 2.0);
      this.scene.fog.density += (theme.fogDensity - this.scene.fog.density) * delta * 2.0;
    }

    this._tempAmbientColor.set(theme.ambientColor);
    this.ambientLight.color.lerp(this._tempAmbientColor, delta * 2.0);
    this._tempDirColor.set(theme.dirLightColor);
    this.dirLight.color.lerp(this._tempDirColor, delta * 2.0);
    this.dirLight.intensity += (theme.dirLightIntensity - this.dirLight.intensity) * delta * 2.0;
  }

  updateCamera(delta) {
    const pPos = this.player.mesh.position;

    let targetCamY = pPos.y + this.cameraOffset.y;
    let targetCamZ = pPos.z + this.cameraOffset.z;

    let desiredFOV = 65 + (this.currentSpeed - this.baseSpeed) * 0.4;
    if (this.player.hasJetpack) {
      targetCamY = pPos.y + 2.2;
      targetCamZ = pPos.z + 6.8;
      desiredFOV = 78;
    }

    this.camera.fov += (desiredFOV - this.camera.fov) * delta * 4;
    this.camera.updateProjectionMatrix();

    this.camera.position.x += (pPos.x * 0.45 - this.camera.position.x) * delta * 6;
    this.camera.position.y += (targetCamY - this.camera.position.y) * delta * 5;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * delta * 12;

    if (!this._tempLookTarget) this._tempLookTarget = new THREE.Vector3();
    this._tempLookTarget.set(
      pPos.x * 0.4,
      pPos.y + this.cameraLookOffset.y,
      pPos.z + this.cameraLookOffset.z
    );
    this.camera.lookAt(this._tempLookTarget);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }
}
function launchGame() {
  if (!window.game) {
    window.game = new Game();
  }
}

if (typeof window !== 'undefined') {
  window.Game = Game;
  window.launchGame = launchGame;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Game = Game;
  globalThis.launchGame = launchGame;
}
if (typeof global !== 'undefined') {
  global.Game = Game;
  global.launchGame = launchGame;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchGame);
  } else {
    launchGame();
  }
}
