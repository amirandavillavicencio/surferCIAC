import * as THREE from 'three';

const jointNames: Record<string, string> = {
  Chest: 'Spine1',
  UpperChest: 'Spine2',
  LeftToes: 'LeftToeBase',
  RightToes: 'RightToeBase',
};

export class CampusRunner {
  private readonly joints: {
    source: THREE.Bone;
    target: THREE.Bone;
    inverseSourceRest: THREE.Quaternion;
    targetRest: THREE.Quaternion;
  }[] = [];
  private readonly frame = new THREE.Quaternion();
  private readonly inverseFrame = new THREE.Quaternion();
  private readonly rotation = new THREE.Quaternion();
  private readonly parentRotation = new THREE.Quaternion();
  private readonly point = new THREE.Vector3();
  private readonly sourceHip: THREE.Bone;
  private readonly targetHip: THREE.Bone;
  private readonly sourceHipRest: THREE.Vector3;
  private readonly targetHipRest: THREE.Vector3;
  private readonly mesh: THREE.SkinnedMesh;
  private readonly soles: number[] = [];

  constructor(
    private readonly holder: THREE.Object3D,
    source: THREE.Object3D,
    private readonly skater: THREE.Object3D,
  ) {
    skater.scale.setScalar(0.48);
    holder.add(skater);
    holder.updateWorldMatrix(true, true);

    const sourceBones = new Map<string, THREE.Bone>();
    source.traverse(node => {
      if (node instanceof THREE.Bone) {
        sourceBones.set(node.name.replace(/^mixamorig[:_]?/, ''), node);
      }
      if ((node as THREE.Mesh).isMesh) node.visible = false;
    });
    const inverseFrame = holder.getWorldQuaternion(this.inverseFrame).invert();
    skater.traverse(target => {
      if (!(target instanceof THREE.Bone)) return;
      const sourceName = jointNames[target.name] ?? target.name;
      const driver = sourceBones.get(sourceName);
      if (!driver) return;
      this.joints.push({
        source: driver,
        target,
        inverseSourceRest: driver.getWorldQuaternion(new THREE.Quaternion()).premultiply(inverseFrame).invert(),
        targetRest: target.getWorldQuaternion(new THREE.Quaternion()).premultiply(inverseFrame),
      });
    });

    const hips = this.joints.find(joint => joint.target.name === 'Hips');
    if (!hips) throw new Error('El Skater requiere una articulación de cadera');
    this.sourceHip = hips.source;
    this.targetHip = hips.target;
    this.sourceHipRest = holder.worldToLocal(this.sourceHip.getWorldPosition(new THREE.Vector3()));
    this.targetHipRest = holder.worldToLocal(this.targetHip.getWorldPosition(new THREE.Vector3()));

    const mesh = skater.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    this.mesh = mesh;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      this.point.fromBufferAttribute(positions, i);
      if (mesh.localToWorld(this.point).y < 0.08) this.soles.push(i);
    }
  }

  update(supportY: number) {
    const { holder, skater, point, mesh } = this;
    skater.position.set(0, 0, 0);
    holder.updateWorldMatrix(true, true);
    holder.getWorldQuaternion(this.frame);
    this.inverseFrame.copy(this.frame).invert();

    // Carry hip motion and global rest-relative rotations across the two rigs.
    holder.worldToLocal(this.sourceHip.getWorldPosition(point));
    point.sub(this.sourceHipRest).add(this.targetHipRest);
    this.targetHip.parent!.worldToLocal(holder.localToWorld(point));
    this.targetHip.position.copy(point);

    for (const { source, target, inverseSourceRest, targetRest } of this.joints) {
      source.getWorldQuaternion(this.rotation)
        .premultiply(this.inverseFrame).multiply(inverseSourceRest)
        .multiply(targetRest).premultiply(this.frame);
      target.parent!.getWorldQuaternion(this.parentRotation).invert();
      target.quaternion.copy(this.rotation).premultiply(this.parentRotation);
      target.updateWorldMatrix(false, false);
    }

    skater.updateMatrixWorld(true);
    let lowest = Infinity;
    const positions = mesh.geometry.getAttribute('position');
    for (const index of this.soles) {
      point.fromBufferAttribute(positions, index);
      mesh.boneTransform(index, point);
      lowest = Math.min(lowest, mesh.localToWorld(point).y);
    }
    if (lowest < supportY) {
      // Apply contact only to the rendered model, in world vertical.
      point.setFromMatrixPosition(skater.matrixWorld);
      point.y += supportY - lowest;
      skater.position.copy(holder.worldToLocal(point));
    }
  }
}
