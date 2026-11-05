import * as THREE from 'three';
import { laneX } from '../config';

export class QuizGates {
  private readonly sprites: THREE.Sprite[] = [];

  constructor(scene: THREE.Scene) {
    for (let lane = 0; lane < 3; lane++) {
      const material = new THREE.SpriteMaterial({
        transparent: true, depthTest: false, depthWrite: false, fog: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.35, 1.24, 1);
      sprite.position.set(laneX(lane), 2.65, -30);
      sprite.renderOrder = 15;
      sprite.visible = false;
      scene.add(sprite);
      this.sprites.push(sprite);
    }
  }

  setOptions(options: string[]) {
    this.sprites.forEach((sprite, lane) => {
      const material = sprite.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.map = this.makeTexture(options[lane] || '', lane);
      material.needsUpdate = true;
    });
  }

  update(distanceAhead: number) {
    this.sprites.forEach((sprite, lane) => {
      sprite.visible = distanceAhead > -1.5 && distanceAhead <= 110;
      if (sprite.visible) sprite.position.set(laneX(lane), 2.65, -distanceAhead);
    });
  }

  hide() {
    for (const sprite of this.sprites) sprite.visible = false;
  }

  private makeTexture(label: string, lane: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(15, 25, 46, 0.93)';
    ctx.strokeStyle = '#ffc23d';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.roundRect(14, 14, 996, 484, 65);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc23d';
    ctx.font = 'bold 85px system-ui, sans-serif';
    ctx.fillText(['A', 'B', 'C'][lane], 512, 115);
    let size = 115;
    while (size > 49) {
      ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
      if (ctx.measureText(label).width < 915) break;
      size -= 4;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 512, 304);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
