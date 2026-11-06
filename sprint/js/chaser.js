/**
 * Saurabh's Sprint - Chaser System (Police Inspector & K-9 Guard Dog)
 * Subway Surfers authentic behavior:
 * - Starts close behind the player for 5-7 seconds after sprint begins.
 * - Gradually slows down and falls back (~15m behind).
 * - If player stumbles, grazes an obstacle, or near-misses, Inspector blows whistle, dog barks, and they rush close behind for 5 seconds!
 * - On crash, inspector & dog rush in to catch the player.
 */

class ChaserManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.officerGroup = new THREE.Group();
    this.dogGroup = new THREE.Group();

    this.group.add(this.officerGroup);
    this.group.add(this.dogGroup);

    // States: 'HIDDEN', 'INTRO_CHASE', 'FALLEN_BACK', 'STUMBLE_CHASE', 'CATCHING'
    this.state = 'HIDDEN';
    this.stateTimer = 0;

    this.closeDistance = 2.4; // Distance when close chasing (m)
    this.farDistance = 14.0;  // Distance when fallen back (m)
    this.currentFollowDistance = this.closeDistance;
    this.targetFollowDistance = this.closeDistance;

    this.runCycle = 0;
    this.laneX = 0;
    this.y = 0;

    this.buildOfficer();
    this.buildDog();

    this.scene.add(this.group);
    this.group.visible = false;
  }

  buildOfficer() {
    // High-Fidelity Police Inspector Materials
    const uniformMat = new THREE.MeshLambertMaterial({ color: 0x1b2a4a }); // Deep Navy Security Uniform
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x141f36 });   // Dark Navy Trousers
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xf5cda5 });    // Natural Skin Tone
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });    // Dark Hair / Mustache
    const capMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });     // Police Peaked Cap
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 }); // Gold Badge / Trim
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 }); // Tactical Belt / Boots
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.3 }); // Brass Buttons
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.95, roughness: 0.1 }); // Aviator Glasses
    const flashlightMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }); // Silver Flashlight
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 }); // Luminous LED beam tip

    // 1. Officer Torso (Muscular Curved Uniform Coat)
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.33, 0.82, 16);
    this.officerTorso = new THREE.Mesh(torsoGeo, uniformMat);
    this.officerTorso.scale.set(1.08, 1.0, 0.78);
    this.officerTorso.position.y = 1.0;
    this.officerTorso.castShadow = true;
    this.officerGroup.add(this.officerTorso);

    // Front Coat Placket & Double-Breasted Brass Buttons
    const placket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.80, 8), uniformMat);
    placket.scale.set(1.0, 1.0, 0.4);
    placket.position.set(0, 0, 0.23);
    this.officerTorso.add(placket);

    for (let b = -1; b <= 1; b++) {
      for (let side of [-0.08, 0.08]) {
        const button = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), brassMat);
        button.rotation.x = Math.PI / 2;
        button.position.set(side, b * 0.2, 0.26);
        this.officerTorso.add(button);
      }
    }

    // Gold Police Star Shield Badge
    const badge = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 5), goldMat);
    badge.position.set(-0.22, 0.22, 0.26);
    badge.rotation.z = Math.PI;
    this.officerTorso.add(badge);

    // Shoulder Epaulets with Gold Trim
    for (let s of [-1, 1]) {
      const epaulet = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.04, 10), darkMat);
      epaulet.scale.set(1.0, 1.0, 1.6);
      epaulet.position.set(s * 0.36, 0.39, 0);
      this.officerTorso.add(epaulet);

      const epauletGold = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12), goldMat);
      epauletGold.rotation.x = Math.PI / 2;
      epauletGold.position.set(s * 0.36, 0.41, 0);
      this.officerTorso.add(epauletGold);
    }

    // Tactical Duty Belt (Smooth Ring, Gold Buckle, Radio & Holster)
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16), darkMat);
    belt.scale.set(1.1, 1.0, 0.82);
    belt.position.y = 0.65;
    this.officerGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), goldMat);
    buckle.rotation.x = Math.PI / 2;
    buckle.position.set(0, 0.65, 0.28);
    this.officerGroup.add(buckle);

    // Tactical Shoulder Walkie-Talkie Radio
    const radio = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), darkMat);
    radio.position.set(0.26, 1.25, 0.16);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), darkMat);
    antenna.position.set(0.26, 1.42, 0.16);
    this.officerGroup.add(radio);
    this.officerGroup.add(antenna);

    // 2. Officer Head, Mustache & Peaked Police Cap (Smooth 3D Sculpt)
    this.officerHeadGroup = new THREE.Group();
    this.officerHeadGroup.position.set(0, 1.62, 0);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 12), skinMat);
    neck.position.y = -0.22;
    this.officerHeadGroup.add(neck);

    const headGeo = new THREE.SphereGeometry(0.24, 18, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(0.98, 1.05, 0.98);
    head.castShadow = true;
    this.officerHeadGroup.add(head);

    // Sculpted Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skinMat);
    nose.scale.set(0.9, 1.3, 1.1);
    nose.position.set(0, -0.02, -0.23);
    this.officerHeadGroup.add(nose);

    // Signature Subway Inspector Curved Mustache
    const stache = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.032, 8, 14, Math.PI * 0.85), hairMat);
    stache.rotation.z = Math.PI;
    stache.position.set(0, -0.09, -0.22);
    this.officerHeadGroup.add(stache);

    // Aviator Sunglasses (Curved Gold Frame & Dark Lenses)
    const glassesFrame = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 12, Math.PI), goldMat);
    glassesFrame.rotation.z = Math.PI;
    glassesFrame.position.set(0, 0.06, -0.22);
    
    for (let s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glassMat);
      lens.scale.set(1.2, 0.9, 0.3);
      lens.position.set(s * 0.10, 0.05, -0.235);
      this.officerHeadGroup.add(lens);
    }
    this.officerHeadGroup.add(glassesFrame);

    // Security Police Peaked Cap with Gold Emblem & Patent Visor (Curved Cap)
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), capMat);
    capDome.position.set(0, 0.04, -0.02);
    this.officerHeadGroup.add(capDome);

    const capGoldBand = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 6, 16), goldMat);
    capGoldBand.rotation.x = Math.PI / 2;
    capGoldBand.position.set(0, 0.04, -0.02);
    this.officerHeadGroup.add(capGoldBand);

    const visorGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.035, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
    const visor = new THREE.Mesh(visorGeo, darkMat);
    visor.rotation.x = -0.18;
    visor.position.set(0, 0.12, -0.18);
    this.officerHeadGroup.add(visor);

    const capBadge = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 5), goldMat);
    capBadge.position.set(0, 0.18, -0.25);
    capBadge.rotation.z = Math.PI;
    this.officerHeadGroup.add(capBadge);

    this.officerGroup.add(this.officerHeadGroup);

    // 3. Arms & Flashlight (Smooth Cylindrical Muscular Limbs)
    const armRadius = 0.10;
    const armH = 0.65;
    const armGeo = new THREE.CylinderGeometry(armRadius, armRadius * 0.85, armH, 12);
    const shoulderGeo = new THREE.SphereGeometry(armRadius * 1.15, 10, 10);
    const handGeo = new THREE.SphereGeometry(armRadius * 0.95, 10, 10);

    this.officerLeftArm = new THREE.Group();
    this.officerLeftArm.position.set(-0.44, 1.25, 0);
    
    const shoulderL = new THREE.Mesh(shoulderGeo, uniformMat);
    this.officerLeftArm.add(shoulderL);
    
    const armL = new THREE.Mesh(armGeo, uniformMat);
    armL.position.y = -armH / 2;
    armL.castShadow = true;
    this.officerLeftArm.add(armL);
    
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(0, -armH - 0.02, 0);
    this.officerLeftArm.add(handL);
    this.officerGroup.add(this.officerLeftArm);

    this.officerRightArm = new THREE.Group();
    this.officerRightArm.position.set(0.44, 1.25, 0);
    
    const shoulderR = new THREE.Mesh(shoulderGeo, uniformMat);
    this.officerRightArm.add(shoulderR);
    
    const armR = new THREE.Mesh(armGeo, uniformMat);
    armR.position.y = -armH / 2;
    armR.castShadow = true;
    this.officerRightArm.add(armR);
    
    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0, -armH - 0.02, 0);
    this.officerRightArm.add(handR);

    // Heavy Police Flashlight (Smooth Torch with Luminous LED Tip & Volumetric Beam)
    const torchGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.55, 10);
    const torch = new THREE.Mesh(torchGeo, flashlightMat);
    torch.rotation.x = Math.PI / 2.5;
    torch.position.set(0, -0.65, 0.25);
    this.officerRightArm.add(torch);

    const torchLED = new THREE.Mesh(new THREE.CircleGeometry(0.055, 10), lightGlowMat);
    torchLED.position.set(0, -0.74, 0.5);
    torchLED.rotation.x = -Math.PI / 4;
    this.officerRightArm.add(torchLED);

    const beamGeo = new THREE.ConeGeometry(0.35, 1.8, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = -Math.PI / 2.5;
    beam.position.set(0, -0.9, 1.3);
    this.officerRightArm.add(beam);

    this.officerGroup.add(this.officerRightArm);

    // 4. Legs & Heavy Combat Duty Boots (Curved Trousers & Rounded Boots)
    const legRadius = 0.12;
    const legH = 0.65;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.88, legH, 12);
    const hipSphereGeo = new THREE.SphereGeometry(legRadius * 1.05, 10, 10);

    const createDutyBoot = () => {
      const boot = new THREE.Group();
      
      const uGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.32, 10);
      const upper = new THREE.Mesh(uGeo, darkMat);
      upper.rotation.x = Math.PI / 2;
      upper.position.set(0, 0, 0.02);
      upper.castShadow = true;
      boot.add(upper);

      const toeGeo = new THREE.SphereGeometry(0.125, 10, 8);
      const toe = new THREE.Mesh(toeGeo, darkMat);
      toe.scale.set(1.0, 0.85, 1.1);
      toe.position.set(0, -0.01, 0.17);
      boot.add(toe);

      const soleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const soleGeo = new THREE.CylinderGeometry(0.13, 0.135, 0.05, 10);
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.rotation.x = Math.PI / 2;
      sole.position.set(0, -0.07, 0.02);
      boot.add(sole);

      return boot;
    };

    this.officerLeftLeg = new THREE.Group();
    this.officerLeftLeg.position.set(-0.18, 0.6, 0);
    this.officerLeftLeg.add(new THREE.Mesh(hipSphereGeo, pantsMat));
    
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.y = -legH / 2;
    legL.castShadow = true;
    this.officerLeftLeg.add(legL);

    const bootL = createDutyBoot();
    bootL.position.set(0, -legH / 2 - 0.22, 0.06);
    this.officerLeftLeg.add(bootL);
    this.officerGroup.add(this.officerLeftLeg);

    this.officerRightLeg = new THREE.Group();
    this.officerRightLeg.position.set(0.18, 0.6, 0);
    this.officerRightLeg.add(new THREE.Mesh(hipSphereGeo, pantsMat));
    
    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.y = -legH / 2;
    legR.castShadow = true;
    this.officerRightLeg.add(legR);

    const bootR = createDutyBoot();
    bootR.position.set(0, -legH / 2 - 0.22, 0.06);
    this.officerRightLeg.add(bootR);
    this.officerGroup.add(this.officerRightLeg);

    this.officerGroup.position.set(-0.55, 0, 0);
  }

  buildDog() {
    // Realistic K-9 Guard Dog Materials (German Shepherd / Pitbull)
    const furTanMat = new THREE.MeshLambertMaterial({ color: 0xb87333 });    // Copper Tan Coat
    const furDarkMat = new THREE.MeshLambertMaterial({ color: 0x2d1f18 });   // Dark Saddle Back / Muzzle
    const noseBlackMat = new THREE.MeshLambertMaterial({ color: 0x111111 }); // Jet Black Nose
    const tonguePinkMat = new THREE.MeshLambertMaterial({ color: 0xff6b81 });// Pink Tongue
    const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });       // White Fangs
    const collarMat = new THREE.MeshLambertMaterial({ color: 0xff3838 });    // Red Tactical Collar
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85 }); // Gold Dog Tag & Studs

    // 1. Organic Curved Canine Body (Chest + Midsection + Hindquarters)
    const chestGeo = new THREE.SphereGeometry(0.24, 16, 14);
    const chest = new THREE.Mesh(chestGeo, furTanMat);
    chest.scale.set(0.85, 0.95, 1.25);
    chest.position.set(0, 0.48, -0.15);
    chest.castShadow = true;
    this.dogGroup.add(chest);

    // Dark Saddle Marking on Back (Curved Dome Overlay)
    const saddleGeo = new THREE.SphereGeometry(0.245, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const saddle = new THREE.Mesh(saddleGeo, furDarkMat);
    saddle.scale.set(0.86, 0.96, 1.26);
    saddle.position.set(0, 0.50, -0.15);
    this.dogGroup.add(saddle);

    const hipsGeo = new THREE.SphereGeometry(0.20, 14, 14);
    const hips = new THREE.Mesh(hipsGeo, furTanMat);
    hips.scale.set(0.80, 0.90, 1.10);
    hips.position.set(0, 0.45, 0.22);
    hips.castShadow = true;
    this.dogGroup.add(hips);

    // Red Spiked Collar & Gold Tag (Smooth Torus Collar)
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 16), collarMat);
    collar.position.set(0, 0.58, -0.34);
    this.dogGroup.add(collar);

    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), goldMat);
    tag.rotation.x = Math.PI / 2;
    tag.position.set(0, 0.50, -0.40);
    this.dogGroup.add(tag);

    // 2. Sculpted Dog Head, Jaws, Teeth, Tongue & Alert Pointed Ears
    this.dogHead = new THREE.Group();
    this.dogHead.position.set(0, 0.72, -0.46);

    const headGeo = new THREE.SphereGeometry(0.19, 16, 14);
    const head = new THREE.Mesh(headGeo, furTanMat);
    head.scale.set(0.95, 1.05, 1.0);
    head.castShadow = true;
    this.dogHead.add(head);

    // Curved Canine Snout & Muzzle
    const snoutGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.24, 10);
    const snout = new THREE.Mesh(snoutGeo, furDarkMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.04, -0.20);
    this.dogHead.add(snout);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), noseBlackMat);
    noseTip.scale.set(1.1, 0.8, 1.0);
    noseTip.position.set(0, 0.01, -0.32);
    this.dogHead.add(noseTip);

    // Open Mouth with Curved Tongue & Teeth
    const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.14, 8), tonguePinkMat);
    tongue.rotation.x = Math.PI / 2.3;
    tongue.position.set(0, -0.10, -0.22);
    this.dogHead.add(tongue);

    for (let s of [-1, 1]) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), teethMat);
      fang.rotation.x = Math.PI;
      fang.position.set(s * 0.07, -0.07, -0.26);
      this.dogHead.add(fang);
    }

    // Alert Pointed German Shepherd Ears (Cones)
    for (let s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 8), furDarkMat);
      ear.position.set(s * 0.13, 0.22, 0.03);
      ear.rotation.z = s * -0.25;
      ear.rotation.x = -0.15;
      this.dogHead.add(ear);
    }

    this.dogGroup.add(this.dogHead);

    // 3. Tail (Smooth Curved Wagging Tail)
    this.dogTail = new THREE.Group();
    this.dogTail.position.set(0, 0.55, 0.38);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.38, 8), furTanMat);
    tail.rotation.x = 0.85;
    tail.position.set(0, 0.14, 0.14);
    this.dogTail.add(tail);
    this.dogGroup.add(this.dogTail);

    // 4. 4 Articulated Running Legs & Curved Paws
    const dogLegGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.38, 10);
    
    const createDogPaw = () => {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), furDarkMat);
      paw.scale.set(1.0, 0.6, 1.3);
      paw.position.set(0, -0.32, 0.04);
      return paw;
    };

    // Front Left Leg
    this.dogLegFL = new THREE.Group();
    this.dogLegFL.position.set(-0.15, 0.36, -0.26);
    const lFL = new THREE.Mesh(dogLegGeo, furTanMat);
    lFL.position.y = -0.18;
    lFL.castShadow = true;
    this.dogLegFL.add(lFL);
    this.dogLegFL.add(createDogPaw());
    this.dogGroup.add(this.dogLegFL);

    // Front Right Leg
    this.dogLegFR = new THREE.Group();
    this.dogLegFR.position.set(0.15, 0.36, -0.26);
    const lFR = new THREE.Mesh(dogLegGeo, furTanMat);
    lFR.position.y = -0.18;
    lFR.castShadow = true;
    this.dogLegFR.add(lFR);
    this.dogLegFR.add(createDogPaw());
    this.dogGroup.add(this.dogLegFR);

    // Back Left Leg
    this.dogLegBL = new THREE.Group();
    this.dogLegBL.position.set(-0.14, 0.36, 0.24);
    const lBL = new THREE.Mesh(dogLegGeo, furTanMat);
    lBL.position.y = -0.18;
    lBL.castShadow = true;
    this.dogLegBL.add(lBL);
    this.dogLegBL.add(createDogPaw());
    this.dogGroup.add(this.dogLegBL);

    // Back Right Leg
    this.dogLegBR = new THREE.Group();
    this.dogLegBR.position.set(0.14, 0.36, 0.24);
    const lBR = new THREE.Mesh(dogLegGeo, furTanMat);
    lBR.position.y = -0.18;
    lBR.castShadow = true;
    this.dogLegBR.add(lBR);
    this.dogLegBR.add(createDogPaw());
    this.dogGroup.add(this.dogLegBR);

    this.dogGroup.position.set(0.55, 0, -0.2);
  }

  // Start Intro Chase (Runs close behind for 6 seconds, then falls back)
  startChase() {
    this.group.visible = true;
    this.state = 'INTRO_CHASE';
    this.stateTimer = 6.5; // Close chase for 6.5 seconds
    this.currentFollowDistance = 2.4;
    this.targetFollowDistance = this.closeDistance;
  }

  // Player stumbled on obstacle -> Inspector & Dog rush in with whistle & bark!
  triggerStumbleCatch() {
    if (this.state === 'CATCHING') return;

    this.group.visible = true;
    this.state = 'STUMBLE_CHASE';
    this.stateTimer = 5.0; // Stay close for 5 seconds after stumble
    this.targetFollowDistance = this.closeDistance;

    if (window.Audio) {
      Audio.playWhistle();
      setTimeout(() => Audio.playDogBark(), 300);
    }
  }

  triggerCatchAnimation() {
    this.group.visible = true;
    this.state = 'CATCHING';
    this.targetFollowDistance = 0.5;
  }

  hide() {
    this.group.visible = false;
    this.state = 'HIDDEN';
  }

  update(delta, player, gameSpeed) {
    if (!this.group.visible || this.state === 'HIDDEN') return;

    const pPos = player.mesh.position;

    // State Transitions
    if (this.state === 'INTRO_CHASE' || this.state === 'STUMBLE_CHASE') {
      this.stateTimer -= delta;
      this.targetFollowDistance = this.closeDistance;

      if (this.stateTimer <= 0) {
        this.state = 'FALLEN_BACK';
      }
    } else if (this.state === 'FALLEN_BACK') {
      // Gradually slow down and fall back far behind
      this.targetFollowDistance = this.farDistance;
    } else if (this.state === 'CATCHING') {
      this.targetFollowDistance = 0.5;
    }

    // Smoothly adjust follow distance
    const followLerpRate = this.state === 'CATCHING' ? 14 : (this.state === 'FALLEN_BACK' ? 1.5 : 4.0);
    this.currentFollowDistance += (this.targetFollowDistance - this.currentFollowDistance) * delta * followLerpRate;

    // Position along Z
    this.group.position.z = pPos.z + this.currentFollowDistance;

    // If fallen far back (> 18m), hide to save draw calls until next stumble/event
    if (this.currentFollowDistance > 17.5 && this.state === 'FALLEN_BACK') {
      this.group.visible = false;
      return;
    } else {
      this.group.visible = true;
    }

    // Follow player Lane smoothly
    this.laneX += (pPos.x - this.laneX) * Math.min(delta * 9, 1.0);
    this.group.position.x = this.laneX;

    // Follow Ground Height
    const targetY = Math.min(pPos.y, player.groundHeight || 0);
    this.y += (targetY - this.y) * delta * 12;
    this.group.position.y = this.y;

    // Animate Officer Running
    this.runCycle += delta * gameSpeed * 1.25;
    const stride = Math.sin(this.runCycle);
    const bounce = Math.abs(Math.cos(this.runCycle)) * 0.12;

    this.officerTorso.position.y = 0.98 + bounce;
    this.officerLeftLeg.rotation.x = stride * 1.1;
    this.officerRightLeg.rotation.x = -stride * 1.1;
    this.officerLeftArm.rotation.x = -stride * 1.0;
    this.officerRightArm.rotation.x = stride * 1.0 + (this.state === 'CATCHING' ? 0.9 : 0.3); // Wave baton aggressively
    this.officerHeadGroup.rotation.y = -stride * 0.08;

    // Animate Dog Gallop
    const dogStride = Math.sin(this.runCycle * 1.3);
    const dogBounce = Math.abs(Math.sin(this.runCycle * 1.3)) * 0.08;

    this.dogGroup.position.y = dogBounce;
    this.dogLegFL.rotation.x = dogStride * 1.2;
    this.dogLegFR.rotation.x = -dogStride * 1.2;
    this.dogLegBL.rotation.x = -dogStride * 1.2;
    this.dogLegBR.rotation.x = dogStride * 1.2;
    this.dogTail.rotation.y = Math.sin(this.runCycle * 2.5) * 0.6;
    this.dogHead.rotation.x = Math.sin(this.runCycle * 1.3) * 0.15;
  }
}

if (typeof window !== 'undefined') {
  window.ChaserManager = ChaserManager;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ChaserManager = ChaserManager;
}
if (typeof global !== 'undefined') {
  global.ChaserManager = ChaserManager;
}
