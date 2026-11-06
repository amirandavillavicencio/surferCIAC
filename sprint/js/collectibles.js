/**
 * Saurabh's Sprint - Collectibles & Power-Ups System
 * Features: Coins, 3D Super Jump Sneakers, 3D Turbo Jetpack (no flat circle), 3D Super Magnet, 3D Hoverboard, 3D 2X Multiplier.
 */

class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // Active collectibles

    // Create High-Res Embossed Golden ₹ Rupee Coin Texture
    this.coinTexture = this.createCoinTexture();

    // 3D Coin Geometries and Materials (Classic Bright Yellow Gold Coin)
    this.coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.09, 18);
    this.coinSideMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,       // Classic Bright Yellow Gold
      emissive: 0xFFD700,    // Bright Yellow Glow
      emissiveIntensity: 0.25,
      metalness: 0.7,
      roughness: 0.22
    });
    this.coinCapMat = new THREE.MeshStandardMaterial({
      map: this.coinTexture,
      color: 0xffffff,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.2,
      metalness: 0.65,
      roughness: 0.25
    });
    this.coinMaterials = [this.coinSideMat, this.coinCapMat, this.coinCapMat];

    // Particle Sparks on collection
    this.particles = [];
    this.initParticlePool();
  }

  createCoinTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Classic Yellow Coin Radial Gradient
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 120);
    grad.addColorStop(0, '#ffffff');      // Bright Catchlight
    grad.addColorStop(0.18, '#ffff99');   // Bright Luminous Yellow
    grad.addColorStop(0.55, '#FFD700');   // Classic Gold Yellow
    grad.addColorStop(0.85, '#FFA500');   // Warm Orange Rim
    grad.addColorStop(1, '#8B6914');      // Dark Edge

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    // Outer milled coin rim
    ctx.strokeStyle = '#ffff66';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#cc8800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 98, 0, Math.PI * 2);
    ctx.stroke();

    // Outer gear / milled coin dots (Bright Gold Beads)
    ctx.fillStyle = '#ffffff';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
      const dx = 128 + Math.cos(a) * 104;
      const dy = 128 + Math.sin(a) * 104;
      ctx.beginPath();
      ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner embossed Currency Symbol (₹) in Bold 3D Gold with Deep Cast Shadow
    ctx.font = '900 114px "Russo One", "Lilita One", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3D Extrusion Shadow
    ctx.fillStyle = '#8B6914';
    ctx.fillText('₹', 128, 137);

    // Yellow Glow
    ctx.shadowColor = '#FFA500';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    // Face Fill (Bright Yellow-White)
    ctx.fillStyle = '#fffff0';
    ctx.fillText('₹', 128, 130);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  initParticlePool() {
    this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.particleMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Classic Yellow
  }

  spawnCoin(x, y, z) {
    const coin = new THREE.Mesh(this.coinGeo, this.coinMaterials);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, y + 0.45, z);
    coin.castShadow = true;

    const itemObj = {
      type: 'coin',
      value: 1,
      mesh: coin,
      baseY: y + 0.45,
      collected: false
    };

    this.scene.add(coin);
    this.items.push(itemObj);
    return itemObj;
  }

  spawnCoinArc(laneX, startZ, count = 5, startY = 0) {
    const spacing = 2.4;
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const arcY = startY + Math.sin(progress * Math.PI) * 1.8;
      this.spawnCoin(laneX, arcY, startZ - i * spacing);
    }
  }

  spawnJetpackCoins(startZ, count = 18) {
    const spacing = 3.0;
    for (let i = 0; i < count; i++) {
      const lane = (i % 3) - 1;
      this.spawnCoin(lane * 2.2, 5.2, startZ - i * spacing);
    }
  }

  // Helper to build 3D Extruded 5-Pointed Star
  createStarGeometry(outerR = 0.42, innerR = 0.20, depth = 0.14) {
    const shape = new THREE.Shape();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const sx = Math.cos(angle) * r;
      const sy = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(sx, sy);
      else shape.lineTo(sx, sy);
    }
    shape.closePath();
    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    };
    const starGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    starGeo.center();
    return starGeo;
  }

  // Spawn 3D Power-Up Device (Upright standing orientation on track)
  spawnPowerUp(type, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y + 0.8, z);

    if (type === 'jetpack') {
      // --- PURE 3D DUAL-ROCKET TURBO JETPACK ---
      const jetBodyMat = new THREE.MeshStandardMaterial({
        color: 0x34495e,
        metalness: 0.9,
        roughness: 0.2
      });
      const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7675 });

      // Twin Main Fuel Cylinders
      const cylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.75, 10);
      const cylL = new THREE.Mesh(cylGeo, jetBodyMat);
      cylL.position.x = -0.24;
      const cylR = new THREE.Mesh(cylGeo, jetBodyMat);
      cylR.position.x = 0.24;
      group.add(cylL);
      group.add(cylR);

      // Central Energy Core
      const coreGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
      const core = new THREE.Mesh(coreGeo, cyanGlowMat);
      group.add(core);

      // Top Nose Cones
      const coneGeo = new THREE.ConeGeometry(0.18, 0.28, 10);
      const coneL = new THREE.Mesh(coneGeo, cyanGlowMat);
      coneL.position.set(-0.24, 0.48, 0);
      const coneR = new THREE.Mesh(coneGeo, cyanGlowMat);
      coneR.position.set(0.24, 0.48, 0);
      group.add(coneL);
      group.add(coneR);

      // Bottom Exhaust Nozzles
      const nozGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.22, 8);
      const nozL = new THREE.Mesh(nozGeo, jetBodyMat);
      nozL.position.set(-0.24, -0.44, 0);
      const nozR = new THREE.Mesh(nozGeo, jetBodyMat);
      nozR.position.set(0.24, -0.44, 0);
      group.add(nozL);
      group.add(nozR);

      // Animated Glowing Thruster Flames
      const flameGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
      const flameL = new THREE.Mesh(flameGeo, flameMat);
      flameL.rotation.x = Math.PI;
      flameL.position.set(-0.24, -0.65, 0);
      const flameR = flameL.clone();
      flameR.position.x = 0.24;
      group.add(flameL);
      group.add(flameR);

      // Side Stabilizer Wings
      const wingGeo = new THREE.BoxGeometry(0.3, 0.06, 0.2);
      const wingL = new THREE.Mesh(wingGeo, cyanGlowMat);
      wingL.position.set(-0.45, 0.1, 0);
      const wingR = new THREE.Mesh(wingGeo, cyanGlowMat);
      wingR.position.set(0.45, 0.1, 0);
      group.add(wingL);
      group.add(wingR);

    } else if (type === 'sneakers') {
      // --- 3D UPRIGHT SUPER JUMP SNEAKERS (Standing pair on track) ---
      const shoeMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        metalness: 0.7,
        roughness: 0.2
      });
      const soleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const cyanMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x0077ff, emissiveIntensity: 0.5 });
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const springMat = new THREE.MeshStandardMaterial({ color: 0xff9f1a, metalness: 0.8 });

      // Pair of shoes side by side standing upright
      for (let side of [-0.22, 0.22]) {
        // Rubber Sole
        const soleGeo = new THREE.BoxGeometry(0.22, 0.08, 0.52);
        const sole = new THREE.Mesh(soleGeo, soleMat);
        sole.position.set(side, -0.22, 0.02);
        group.add(sole);

        // Main Sneaker Upper Body
        const upperGeo = new THREE.BoxGeometry(0.20, 0.22, 0.46);
        const upper = new THREE.Mesh(upperGeo, shoeMat);
        upper.position.set(side, -0.08, 0.02);
        group.add(upper);

        // Sneaker Ankle Tongue / High Collar
        const collarGeo = new THREE.BoxGeometry(0.18, 0.16, 0.22);
        const collar = new THREE.Mesh(collarGeo, cyanMat);
        collar.position.set(side, 0.08, -0.06);
        group.add(collar);

        // Golden Wing on Outer Side
        const wingGeo = new THREE.ConeGeometry(0.08, 0.32, 4);
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.rotation.z = side < 0 ? Math.PI / 3.2 : -Math.PI / 3.2;
        wing.rotation.x = -Math.PI / 8;
        wing.position.set(side < 0 ? side - 0.12 : side + 0.12, 0.12, -0.04);
        group.add(wing);

        // High-Jump Bouncy Springs underneath
        const springGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.22, 8);
        const spring = new THREE.Mesh(springGeo, springMat);
        spring.position.set(side, -0.36, 0.02);
        group.add(spring);
      }

    } else if (type === 'magnet') {
      // --- 3D UPRIGHT HORSESHOE MAGNET (Standing vertical U-shape) ---
      const magnetRedMat = new THREE.MeshStandardMaterial({
        color: 0xff2222,
        emissive: 0x990000,
        emissiveIntensity: 0.4,
        metalness: 0.7,
        roughness: 0.2
      });
      const silverTipMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.95,
        roughness: 0.1
      });
      const arcGlowMat = new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        transparent: true,
        opacity: 0.8
      });

      // 1. Bottom Curve Arch (Connecting base of U-Shape)
      const baseArchGeo = new THREE.TorusGeometry(0.26, 0.085, 10, 20, Math.PI);
      const baseArch = new THREE.Mesh(baseArchGeo, magnetRedMat);
      baseArch.rotation.z = Math.PI; // Arch curves at bottom, prongs go UP
      baseArch.position.set(0, -0.05, 0);
      group.add(baseArch);

      // 2. Left & Right Upright Red Prongs (Standing straight UP)
      const prongGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.38, 12);
      const prongL = new THREE.Mesh(prongGeo, magnetRedMat);
      prongL.position.set(-0.26, 0.14, 0);
      group.add(prongL);

      const prongR = new THREE.Mesh(prongGeo, magnetRedMat);
      prongR.position.set(0.26, 0.14, 0);
      group.add(prongR);

      // 3. Shiny Silver/Steel Pole Tips at top of prongs
      const tipGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.16, 12);
      const tipL = new THREE.Mesh(tipGeo, silverTipMat);
      tipL.position.set(-0.26, 0.40, 0);
      group.add(tipL);

      const tipR = new THREE.Mesh(tipGeo, silverTipMat);
      tipR.position.set(0.26, 0.40, 0);
      group.add(tipR);

      // 4. Glowing Magnetic Field Beam bridging the top poles
      const beamGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8);
      const beam = new THREE.Mesh(beamGeo, arcGlowMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, 0.44, 0);
      group.add(beam);

      // 5. Magnetic Particle Sparkle Halo
      const haloGeo = new THREE.RingGeometry(0.42, 0.48, 16);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);

    } else if (type === 'multiplier') {
      // --- 3D UPRIGHT GLOWING 5-POINTED SPEED STAR ---
      const starGeo = this.createStarGeometry(0.46, 0.22, 0.15);
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
        metalness: 0.85,
        roughness: 0.18
      });
      const star = new THREE.Mesh(starGeo, starMat);
      group.add(star);

      // Inner Glowing Core Jewel
      const coreGeo = new THREE.OctahedronGeometry(0.18, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      // Orbiting Golden Sparkle Ring
      const ringGeo = new THREE.TorusGeometry(0.52, 0.025, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff08a, transparent: true, opacity: 0.7 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

    } else if (type === 'hoverboard') {
      // --- 3D HOVERBOARD DEVICE ---
      const boardGeo = new THREE.BoxGeometry(0.52, 0.08, 1.0);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, emissive: 0x2ed573, emissiveIntensity: 0.5, metalness: 0.8 });
      const board = new THREE.Mesh(boardGeo, boardMat);
      group.add(board);

      const neonGeo = new THREE.BoxGeometry(0.56, 0.04, 1.05);
      const neon = new THREE.Mesh(neonGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      group.add(neon);
    }

    const itemObj = {
      type: type,
      mesh: group,
      baseY: y + 0.8,
      collected: false
    };

    this.scene.add(group);
    this.items.push(itemObj);
    return itemObj;
  }

  createLetterTexture(letter) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Vibrant Glowing Magenta/Purple Gradient
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#f368e0');
    grad.addColorStop(0.8, '#ff007f');
    grad.addColorStop(1, '#6c5ce7');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Shiny Gold Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 54, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px "Russo One", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#1e293b';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillText(letter, 64, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  spawnLetter(char, x, y, z) {
    const tex = this.createLetterTexture(char);
    const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const boxMat = new THREE.MeshPhongMaterial({
      map: tex,
      color: 0xffffff,
      emissive: 0xff007f,
      emissiveIntensity: 0.5,
      specular: 0xffffff,
      shininess: 90
    });
    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.position.set(x, y + 0.85, z);

    const itemObj = {
      type: 'letter',
      letter: char,
      mesh: mesh,
      baseY: y + 0.85,
      collected: false
    };

    this.scene.add(mesh);
    this.items.push(itemObj);
    return itemObj;
  }

  // 3D Shiny Golden Key Collectible for Second Chance Revivals
  spawnKey(x, y, z) {
    const keyGroup = new THREE.Group();
    keyGroup.position.set(x, y + 0.75, z);

    // Rich Imperial Golden Material for 3D Key
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      metalness: 0.9,
      roughness: 0.15
    });

    const keyGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfff08a,
      transparent: true,
      opacity: 0.65
    });

    // 1. Key Bow / Loop (Head ring)
    const bowGeo = new THREE.TorusGeometry(0.24, 0.07, 12, 24);
    const bow = new THREE.Mesh(bowGeo, keyMat);
    bow.position.set(0, 0.35, 0);
    bow.castShadow = true;
    keyGroup.add(bow);

    // Inner crown emblem / jewel inside bow
    const crownGeo = new THREE.OctahedronGeometry(0.12, 0);
    const crown = new THREE.Mesh(crownGeo, keyGlowMat);
    crown.position.set(0, 0.35, 0);
    keyGroup.add(crown);

    // 2. Key Stem / Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.65, 12);
    const shaft = new THREE.Mesh(shaftGeo, keyMat);
    shaft.position.set(0, -0.05, 0);
    shaft.castShadow = true;
    keyGroup.add(shaft);

    // 3. Key Teeth / Bit
    const toothGeo1 = new THREE.BoxGeometry(0.18, 0.09, 0.08);
    const tooth1 = new THREE.Mesh(toothGeo1, keyMat);
    tooth1.position.set(0.11, -0.22, 0);
    keyGroup.add(tooth1);

    const toothGeo2 = new THREE.BoxGeometry(0.22, 0.09, 0.08);
    const tooth2 = new THREE.Mesh(toothGeo2, keyMat);
    tooth2.position.set(0.13, -0.32, 0);
    keyGroup.add(tooth2);

    // Sparkling Golden Halo ring around key
    const haloGeo = new THREE.RingGeometry(0.42, 0.46, 20);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    keyGroup.add(halo);

    const itemObj = {
      type: 'key',
      mesh: keyGroup,
      baseY: y + 0.75,
      collected: false
    };

    this.scene.add(keyGroup);
    this.items.push(itemObj);
    return itemObj;
  }

  createPickupParticles(x, y, z, colorHex = 0xffd700) {
    if (!this._particleMats) this._particleMats = {};
    if (!this._particleMats[colorHex]) {
      this._particleMats[colorHex] = new THREE.MeshBasicMaterial({ color: colorHex });
    }
    const mat = this._particleMats[colorHex];

    const count = Math.min(6, 24 - this.particles.length);
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.particleGeo, mat);
      p.position.set(x, y, z);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 5
      );
      this.scene.add(p);
      this.particles.push({ mesh: p, vel: vel, life: 0.30, maxLife: 0.30 });
    }
  }

  update(delta, player, onCollectCoin, onCollectPowerUp, onCollectLetter, onCollectKey) {
    const playerPos = player.mesh.position;
    const playerCol = player.getCollider();
    const magnetActive = player.hasMagnet;
    const magnetRadius = 15.0;

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.scale.setScalar(Math.max(0.01, p.life / (p.maxLife || 0.30)));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Update Collectibles
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const mesh = item.mesh;

      // Rotation & Floating
      mesh.rotation.y += delta * 3.5;
      mesh.position.y = item.baseY + Math.sin(Date.now() * 0.005 + mesh.position.x) * 0.15;

      // Magnet Attractor Logic (Pulls coins smoothly towards runner)
      if (magnetActive && item.type === 'coin') {
        const dx = playerPos.x - mesh.position.x;
        const dy = playerPos.y + 0.8 - mesh.position.y;
        const dz = playerPos.z - mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < magnetRadius && dz < 4) {
          mesh.position.x += dx * delta * 14;
          mesh.position.y += dy * delta * 14;
          mesh.position.z += dz * delta * 16;
        }
      }

      // Check Collision with Player Collider
      const colX = Math.abs(mesh.position.x - playerPos.x) < 0.85;
      const colY = mesh.position.y >= playerCol.minY - 0.3 && mesh.position.y <= playerCol.maxY + 0.4;
      const colZ = Math.abs(mesh.position.z - playerPos.z) < 0.9;

      if (colX && colY && colZ) {
        if (item.type === 'coin') {
          if (onCollectCoin) onCollectCoin(item.value);
          Audio.playCoin();
          this.createPickupParticles(mesh.position.x, mesh.position.y, mesh.position.z, 0xffd700);
        } else if (item.type === 'key') {
          if (onCollectKey) onCollectKey(item);
          if (typeof Audio !== 'undefined' && Audio.playKey) Audio.playKey();
          this.createPickupParticles(mesh.position.x, mesh.position.y, mesh.position.z, 0x00d2ff);
        } else if (item.type === 'letter') {
          if (onCollectLetter) onCollectLetter(item.letter);
          if (typeof Audio !== 'undefined' && Audio.playReward) Audio.playReward();
          this.createPickupParticles(mesh.position.x, mesh.position.y, mesh.position.z, 0xff007f);
        } else {
          if (onCollectPowerUp) onCollectPowerUp(item.type);
          let pColor = 0xff4757;
          if (item.type === 'multiplier') pColor = 0xffd700;
          if (item.type === 'hoverboard') pColor = 0x2ed573;
          if (item.type === 'jetpack') pColor = 0x00d2d3;
          if (item.type === 'sneakers') pColor = 0xffd700;
          if (item.type === 'magnet') pColor = 0xff2222;
          this.createPickupParticles(mesh.position.x, mesh.position.y, mesh.position.z, pColor);
        }

        this.scene.remove(mesh);
        this.items.splice(i, 1);
        continue;
      }

      if (mesh.position.z > playerPos.z + 18) {
        this.scene.remove(mesh);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    this.items.forEach(it => this.scene.remove(it.mesh));
    this.items = [];
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
  }
}

if (typeof window !== 'undefined') {
  window.CollectibleManager = CollectibleManager;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CollectibleManager = CollectibleManager;
}
if (typeof global !== 'undefined') {
  global.CollectibleManager = CollectibleManager;
}
