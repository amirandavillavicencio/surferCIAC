import * as THREE from 'three';
import { Instanced } from '../view/pools';
import { CAR_LEN, CAR_GAP } from '../config';

// Trenes del modelo original circulando fuera de los 3 carriles jugables.
// No generan colisiones, puntos ni obstáculos durante las preguntas.
export class AmbientTrains {
  private readonly trains: Instanced;
  private readonly matrix = new THREE.Matrix4();
  private readonly tints = [
    new THREE.Color(0.76, 0.89, 1),
    new THREE.Color(1, 0.79, 0.65)
  ];
  private readonly tracks = [-9.85, 9.85];
  private readonly speeds = [27, 32];
  private clock = 0;

  constructor(scene: THREE.Scene, model: THREE.Object3D) {
    this.trains = new Instanced(model, 8, scene, {
      colors: true, name: 'ciac-ambient-trains'
    });

    const sleepers = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.65, 0.11, 0.19),
      new THREE.MeshLambertMaterial({ color: 0x65707a }),
      70
    );
    let idx = 0;
    for (const x of this.tracks) {
      for (let z = -175; z <= 25; z += 6) {
        sleepers.setMatrixAt(idx++, this.matrix.makeTranslation(x, 0.055, z));
      }
    }
    sleepers.count = idx;
    sleepers.instanceMatrix.needsUpdate = true;
    scene.add(sleepers);

    const railGeometry = new THREE.BoxGeometry(0.12, 0.11, 219);
    const railMaterial = new THREE.MeshLambertMaterial({ color: 0xc0cbd2 });
    for (const x of this.tracks) {
      for (const side of [-0.77, 0.77]) {
        const rail = new THREE.Mesh(railGeometry, railMaterial);
        rail.position.set(x + side, 0.15, -75);
        scene.add(rail);
      }
    }
  }

  reset() {
    this.clock = 0;
    this.trains.begin();
    this.trains.end();
  }

  update(dt: number, playing: boolean) {
    this.trains.begin();
    if (playing) {
      this.clock += Math.max(0, Math.min(dt, 0.05));
      for (let i = 0; i < 2; i++) {
        // Recorrido independiente de la simulación y de las preguntas CIAC.
        const zFront = -190 + ((this.clock * this.speeds[i] + i * 108) % 240);
        for (let car = 0; car < 2; car++) {
          const z = zFront - car * (CAR_LEN + CAR_GAP);
          if (z < -206 || z > 42) continue;
          this.trains.add(this.matrix.makeTranslation(this.tracks[i], 0, z), this.tints[i]);
        }
      }
    }
    this.trains.end();
  }
}
