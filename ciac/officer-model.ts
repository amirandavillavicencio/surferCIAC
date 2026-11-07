/*!
MIT License

Copyright (c) 2026 Saurabh Shriwastava

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Adapted buildOfficer from Saurabh2005695/Saurabh-s-Sprint-/js/chaser.js.
Badges/emblems removed; dog and global engine/audio integration omitted.
*/
import * as THREE from 'three';
export class OfficerModel {
  officerGroup=new THREE.Group();
  officerTorso!: THREE.Mesh;
  officerHeadGroup!: THREE.Group;
  officerLeftArm!: THREE.Group;
  officerRightArm!: THREE.Group;
  officerLeftLeg!: THREE.Group;
  officerRightLeg!: THREE.Group;
  constructor(){this.buildOfficer();this.officerGroup.position.x=0;}
  buildOfficer() {
    // High-Fidelity Police Inspector Materials
    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x30485e, roughness:.83 }); // Deep Navy Security Uniform
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x243342 });   // Dark Navy Trousers
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe9b58e, roughness:.7 });    // Natural Skin Tone
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

}
