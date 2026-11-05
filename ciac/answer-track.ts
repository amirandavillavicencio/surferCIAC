import * as THREE from 'three';
import { LANE_W, laneX } from '../config';

// Cada franja ocupa el carril real y conserva el mismo color que la opción
// de la pregunta. Son superficies visuales: no alteran colisiones ni puntajes.
const COLORS = [0x346fdb, 0x229579, 0x814fcf] as const;
export const QUESTION_VISIBLE_DISTANCE = 80;
const STRIP_LENGTH = 75;
const STRIP_WIDTH = LANE_W - 0.22;

export class QuizAnswerTrack {
  private readonly strips: THREE.Mesh[] = [];
  private readonly finish: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    for (let lane = 0; lane < 3; lane++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(STRIP_WIDTH, STRIP_LENGTH),
        new THREE.MeshBasicMaterial({
          color: COLORS[lane], transparent: true, opacity: 0.71,
          depthWrite: false, side: THREE.DoubleSide
        })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(laneX(lane), 0.065, 0);
      strip.renderOrder = 5;
      strip.visible = false;
      scene.add(strip);
      this.strips.push(strip);

      // La última franja marca exactamente dónde se registra la respuesta.
      const finishLine = new THREE.Mesh(
        new THREE.PlaneGeometry(STRIP_WIDTH, 1.3),
        new THREE.MeshBasicMaterial({
          color: COLORS[lane], transparent: true, opacity: 0.96,
          depthWrite: false, side: THREE.DoubleSide
        })
      );
      finishLine.rotation.x = -Math.PI / 2;
      finishLine.position.set(laneX(lane), 0.078, 0);
      finishLine.renderOrder = 6;
      finishLine.visible = false;
      scene.add(finishLine);
      this.finish.push(finishLine);
    }
  }

  update(distance: number, gate: number) {
    const ahead = gate - distance;
    const visible = ahead > -2 && ahead <= QUESTION_VISIBLE_DISTANCE;
    // El motor dibuja el mundo relativo al corredor, que siempre está en z=0.
    const stripCenter = -(gate - STRIP_LENGTH / 2 - distance);
    const endPosition = -(gate - 0.7 - distance);
    for (let lane = 0; lane < 3; lane++) {
      this.strips[lane].visible = visible;
      this.finish[lane].visible = visible;
      if (visible) {
        this.strips[lane].position.z = stripCenter;
        this.finish[lane].position.z = endPosition;
      }
    }
  }

  hide() {
    for (const strip of this.strips) strip.visible = false;
    for (const line of this.finish) line.visible = false;
  }
}
