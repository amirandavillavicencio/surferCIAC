import * as THREE from 'three';
import type { ChaseFrame } from './chase';

// Keep the pursuer out of the near lens without changing the chase simulation.
export function guardVisualScale(depthFromCamera: number) {
  return Math.max(0, Math.min(1, (depthFromCamera - 1.25) / 2.8));
}

const CYCLE = 2 * Math.PI;
const STANCE = .16;
const THIGH = .35;
const SHIN = .32;
const HIP_HEIGHT = .74;

function bone(model: THREE.Object3D, name: string) {
  const joint = model.getObjectByName(name);
  if (!(joint instanceof THREE.Bone)) throw new Error('Certamen: falta el hueso ' + name);
  return joint;
}

class Leg {
  private readonly thigh: THREE.Bone;
  private readonly shin: THREE.Bone;
  private readonly foot: THREE.Bone;

  constructor(model: THREE.Object3D, side: string) {
    this.thigh = bone(model, 'Thigh_' + side);
    this.shin = bone(model, 'Shin_' + side);
    this.foot = bone(model, 'Foot_' + side);
  }

  pose(hipY: number, forwardZ: number, lift: number, pitch: number) {
    // Place the sole against the course plane, compensating for toe/heel pitch.
    const c = Math.cos(pitch), s = Math.sin(pitch);
    const sole = Math.max(.104 * c + .100 * s, .104 * c - .267 * s,
      .096 * c + .104 * s, .096 * c - .282 * s);
    const down = hipY - lift - sole;
    const reach = Math.min(Math.hypot(down, forwardZ), THIGH + SHIN - .001);
    const hip = Math.acos((THIGH ** 2 + reach ** 2 - SHIN ** 2) / (2 * THIGH * reach));
    const knee = Math.acos((THIGH ** 2 + SHIN ** 2 - reach ** 2) / (2 * THIGH * SHIN));
    this.thigh.rotation.x = hip - Math.atan2(forwardZ, down);
    this.shin.rotation.x = knee - Math.PI;
    this.foot.rotation.x = pitch - this.thigh.rotation.x - this.shin.rotation.x;
  }

  run(phase: number, hipY: number, halfStep: number, air: boolean) {
    const cycle = (phase % CYCLE) / CYCLE;
    if (air) {
      this.pose(hipY, -.28 * Math.cos(phase), .18 + .07 * Math.sin(phase), -.24);
    } else if (cycle < STANCE) {
      this.pose(hipY, halfStep * (2 * cycle / STANCE - 1), 0, 0);
    } else {
      const swing = (cycle - STANCE) / (1 - STANCE);
      this.pose(hipY, halfStep * Math.cos(Math.PI * swing), .34 * Math.sin(Math.PI * swing),
        -.65 * Math.sin(CYCLE * swing));
    }
  }
}

export class GuardView {
  readonly root = new THREE.Group();
  private readonly torso: THREE.Bone;
  private readonly sheet: THREE.Bone;
  private readonly arms: readonly [THREE.Bone, THREE.Bone];
  private readonly elbows: readonly [THREE.Bone, THREE.Bone];
  private readonly legs: readonly [Leg, Leg];

  constructor(scene: THREE.Scene, private readonly model: THREE.Group) {
    this.root.name = 'ciac-guard';
    this.torso = bone(model, 'Torso');
    this.sheet = bone(model, 'Sheet');
    this.arms = [bone(model, 'Arm_L'), bone(model, 'Arm_R')];
    this.elbows = [bone(model, 'Elbow_L'), bone(model, 'Elbow_R')];
    this.legs = [new Leg(model, 'L'), new Leg(model, 'R')];
    model.traverse(node => {
      if (node instanceof THREE.SkinnedMesh) {
        node.castShadow = true;
        // The shared asset loader replaces glTF materials with Lambert.
        if (node.material instanceof THREE.MeshLambertMaterial) node.material.vertexColors = true;
        // Its pose changes the mesh bounds. ChaseState and the camera already
        // cull the whole actor, so keep Three.js from using a stale bind box.
        node.frustumCulled = false;
      }
    });
    this.root.add(model);
    scene.add(this.root);
    this.reset();
  }

  reset() {
    this.root.visible = false;
    this.root.scale.setScalar(1);
  }

  update(state: ChaseFrame, distance: number, camera: THREE.PerspectiveCamera) {
    this.root.position.set(state.x - .55, state.y, distance - state.d);
    const scale = guardVisualScale(camera.position.z - this.root.position.z);
    this.root.scale.setScalar(scale);
    this.root.visible = state.visible && state.mode !== 'hidden' && scale > .02;
    if (!this.root.visible) return;

    const running = 1 - state.reach;
    const stride = Math.cos(state.phase) * running;
    const hipY = .60 + .020 * Math.sin(state.phase * 2) * running;
    this.model.position.y = hipY - HIP_HEIGHT;
    this.torso.rotation.x = -.075 - .065 * state.urgency - .19 * state.reach;
    this.torso.rotation.z = .065 * stride;
    this.sheet.rotation.x = .086 * Math.sin(state.phase * 2 - .5) * running;
    this.sheet.rotation.y = .09 * stride;

    // ChaseState advances the phase from travelled distance. Compensating for
    // that cadence holds the stance foot in place relative to the track.
    const halfStep = CYCLE * STANCE / (2 * (1.25 + .45 * state.urgency));
    for (const i of [0, 1] as const) {
      const side = i === 0 ? -1 : 1;
      this.arms[i].rotation.x = side * stride * .74 + state.reach * 1.18;
      this.elbows[i].rotation.x = .32 + side * stride * .20 - state.reach * .52;
      if (state.mode === 'captured') {
        this.legs[i].pose(hipY, side * .18, 0, 0);
      } else {
        this.legs[i].run(state.phase + i * Math.PI, hipY, halfStep, state.air);
      }
    }
  }
}
