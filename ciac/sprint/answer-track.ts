import * as THREE from 'three';
const LANE_W = 2.2;
const laneX = (lane:number) => (lane-1)*LANE_W;
import { QuizCourse, GATE_SPACING, STRIP_LENGTH, RETIRE_BEHIND } from './course';

// Cada franja ocupa el carril real y conserva el mismo color que la opción
// de la pregunta. Son superficies visuales: no alteran colisiones ni puntajes.
const COLORS = [0x346fdb, 0x229579, 0x814fcf] as const;
const STRIP_WIDTH = LANE_W - 0.22;

export class QuizAnswerTrack {
  readonly root = new THREE.Group();
  private readonly strips: THREE.Mesh[] = [];
  private readonly finish: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    const stripGeometry = new THREE.PlaneGeometry(STRIP_WIDTH, STRIP_LENGTH);
    const lineGeometry = new THREE.PlaneGeometry(STRIP_WIDTH, 1.3);
    for (let slot = 0; slot < 3; slot++) for (let lane = 0; lane < 3; lane++) {
      const strip = new THREE.Mesh(
        stripGeometry,
        new THREE.MeshBasicMaterial({
          color: COLORS[lane], transparent: true, opacity: 0.71,
          depthWrite: false, side: THREE.DoubleSide
        })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(laneX(lane), 0.065, 0);
      strip.renderOrder = 5;
      strip.visible = false;
      this.root.add(strip);
      this.strips.push(strip);

      // La última franja marca exactamente dónde se registra la respuesta.
      const finishLine = new THREE.Mesh(
        lineGeometry,
        new THREE.MeshBasicMaterial({
          color: COLORS[lane], transparent: true, opacity: 0.96,
          depthWrite: false, side: THREE.DoubleSide
        })
      );
      finishLine.rotation.x = -Math.PI / 2;
      finishLine.position.set(laneX(lane), 0.078, 0);
      finishLine.renderOrder = 6;
      finishLine.visible = false;
      this.root.add(finishLine);
      this.finish.push(finishLine);
    }
  }

  update(distance: number, course: QuizCourse) {
    const first = course.gateAtOrAfter(distance - RETIRE_BEHIND);
    for (let slot = 0; slot < 3; slot++) {
      const gate = first + slot * GATE_SPACING;
      const visible = course.enabled && course.canShow(gate, distance);
      for (let lane = 0; lane < 3; lane++) {
        const i = slot * 3 + lane;
        this.strips[i].visible = this.finish[i].visible = visible;
        if (visible) {
          this.strips[i].position.z = distance - gate + STRIP_LENGTH / 2;
          this.finish[i].position.z = distance - gate + 0.7;
        }
      }
    }
  }

  hide() {
    for (const strip of this.strips) strip.visible = false;
    for (const line of this.finish) line.visible = false;
  }
}
