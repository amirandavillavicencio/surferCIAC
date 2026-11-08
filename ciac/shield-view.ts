import { Group, Mesh, MeshBasicMaterial, Scene, TorusGeometry } from 'three';

export class ShieldView {
  private root = new Group();
  private material = new MeshBasicMaterial({
    color: 0x73efff, transparent: true, opacity: 0, depthWrite: false
  });
  private pulse = 0;
  private active = false;
  private impact = false;

  constructor(scene: Scene) {
    const ring = new Mesh(new TorusGeometry(.72, .028, 5, 32), this.material);
    ring.rotation.x = -Math.PI / 2;
    this.root.add(ring);
    scene.add(this.root);
    this.reset();
  }

  hit() {
    this.impact = true;
    this.pulse = 1;
  }

  reset() {
    this.root.visible = this.active = this.impact = false;
    this.pulse = 0;
    this.root.scale.setScalar(1);
  }

  update(active: boolean, x: number, y: number, dt: number) {
    if (active !== this.active && !this.impact) this.pulse = 1;
    this.active = active;
    this.pulse = Math.max(0, this.pulse - dt * 2.7);
    this.root.visible = active || this.pulse > 0;
    if (!this.root.visible) {
      this.impact = false;
      return;
    }
    this.root.position.set(x, y + .4, 0);
    this.material.color.setHex(this.impact ? 0xffdb86 : 0x73efff);
    this.material.opacity = active ? .5 + .4 * this.pulse : .85 * this.pulse;
    this.root.scale.setScalar(this.impact ? 1 + (1 - this.pulse) * .6 : active ? 1 + .22 * this.pulse : 1);
    if (this.pulse === 0) this.impact = false;
  }
}
