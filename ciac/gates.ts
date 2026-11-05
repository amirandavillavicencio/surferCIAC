import * as THREE from 'three';
import { laneX } from '../config';

// Tres señales situadas en los carriles reales. El borde dorado muestra
// dónde está el corredor, nunca cuál es la respuesta correcta.
export class QuizGates {
  private readonly sprites: THREE.Sprite[] = [];
  private readonly floor: THREE.Mesh[] = [];
  private textures: THREE.CanvasTexture[][] = [];
  private selectedLane = -1;

  constructor(scene: THREE.Scene) {
    for (let lane = 0; lane < 3; lane++) {
      const material = new THREE.SpriteMaterial({
        transparent: true, depthTest: false, depthWrite: false, fog: false,
        opacity: 1
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.24, 1.50, 1);
      sprite.position.set(laneX(lane), 3.1, -30);
      sprite.renderOrder = 15;
      sprite.visible = false;
      scene.add(sprite);
      this.sprites.push(sprite);

      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.2,
        side: THREE.DoubleSide, depthWrite: false
      });
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 5), mat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(laneX(lane), 0.09, -30);
      strip.renderOrder = 5;
      strip.visible = false;
      scene.add(strip);
      this.floor.push(strip);
    }
  }

  setOptions(options: string[]) {
    for (const laneMaps of this.textures) {
      for (const texture of laneMaps) texture.dispose();
    }
    this.textures = options.map((label, lane) => [
      this.makeTexture(label, lane, false),
      this.makeTexture(label, lane, true)
    ]);
    this.selectedLane = -1;
    this.highlight(1);
  }

  highlight(lane: number) {
    if (this.selectedLane === lane || !this.textures.length) return;
    this.selectedLane = lane;
    this.sprites.forEach((sprite, index) => {
      const material = sprite.material as THREE.SpriteMaterial;
      material.map = this.textures[index][index === lane ? 1 : 0];
      material.needsUpdate = true;
      const ground = this.floor[index].material as THREE.MeshBasicMaterial;
      ground.color.set(index === lane ? 0xffc23d : 0xffffff);
      ground.opacity = index === lane ? 0.64 : 0.18;
    });
  }

  update(distanceAhead: number, lane: number) {
    this.highlight(lane);
    const visible = distanceAhead >= 0 && distanceAhead <= 110;
    // La cámara persigue al personaje. Mantener las placas sobre el carril
    // impide que desaparezcan detrás del corredor en los últimos metros.
    const z = -Math.max(distanceAhead, 8);
    const near = THREE.MathUtils.clamp((65 - distanceAhead) / 45, 0, 1);
    this.sprites.forEach((sprite, index) => {
      sprite.visible = visible;
      const strip = this.floor[index];
      strip.visible = visible && distanceAhead <= 65;
      if (!visible) return;
      sprite.position.set(laneX(index), 3.1 + near * 0.28, z);
      const focus = index === lane ? 1.05 : 1;
      sprite.scale.set((2.17 + near * 0.12) * focus, (1.46 + near * 0.18) * focus, 1);
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = 0.94 + near * 0.06;
      strip.position.z = -distanceAhead;
    });
  }

  hide() {
    for (const sprite of this.sprites) sprite.visible = false;
    for (const strip of this.floor) strip.visible = false;
  }

  private makeTexture(label: string, lane: number, chosen: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = chosen ? 'rgba(21, 39, 69, 0.97)' : 'rgba(10, 21, 40, 0.97)';
    ctx.strokeStyle = chosen ? '#ffc23d' : '#ffffff';
    ctx.lineWidth = chosen ? 26 : 13;
    ctx.beginPath();
    ctx.roundRect(20, 20, 984, 600, 62);
    ctx.fill();
    ctx.stroke();

    // Letra grande para reconocer el carril incluso a cierta distancia.
    ctx.fillStyle = chosen ? '#ffc23d' : '#d9e8ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 126px system-ui, sans-serif';
    ctx.fillText(['A', 'B', 'C'][lane], 512, 154);
    if (chosen) {
      ctx.fillStyle = '#ffc23d';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText('TU CARRIL', 512, 245);
    }

    let size = 148;
    while (size > 62) {
      ctx.font = '800 ' + size + 'px system-ui, sans-serif';
      if (ctx.measureText(label).width <= 880) break;
      size -= 4;
    }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 10;
    ctx.fillText(label, 512, 439, 895);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
}
