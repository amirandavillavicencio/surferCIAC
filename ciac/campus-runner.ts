import * as THREE from 'three';

// Corredor universitario ligero sobre los huesos Mixamo ya animados.
// Se sustituye la geometría visible original, no su rig ni sus ocho clips.
export function applyCampusRunner(model: THREE.Object3D): void {
  const bone = (name: string): THREE.Bone => {
    const found = model.getObjectByName('mixamorig:' + name);
    if (!(found instanceof THREE.Bone)) throw new Error('Falta hueso del corredor: ' + name);
    return found;
  };

  // Los modelos de ropa originales se ocultan; siguen vivos todos los huesos
  // y AnimationMixer continúa manejando carrera, salto, caída y deslizamiento.
  model.traverse(node => {
    if ((node as THREE.Mesh).isMesh) node.visible = false;
  });

  const material = (color: number, roughness = 0.94) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

  const jersey = material(0x246d84);
  const jerseyLight = material(0x3a92a6);
  const trousers = material(0x293d54);
  const cuffs = material(0x1d3446);
  const skin = material(0xd9a07e);
  const skinShade = material(0xc78c6c);
  const hair = material(0x29303a);
  const shoe = material(0xe9f2ef);
  const sole = material(0x8cc4bd);
  const eyes = material(0x1c2836);
  const up = new THREE.Vector3(0, 1, 0);

  const attach = (
    part: THREE.Object3D, to: THREE.Bone, name: string
  ) => {
    part.name = 'campus-runner:' + name;
    part.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
      }
    });
    to.add(part);
  };

  // Una forma sólida entre dos articulaciones. Las piezas siguen la
  // rotación de su propio hueso, incluso durante roll y jump.
  function segment(
    name: string, childName: string, start: number, finish: number,
    radius: number, mat: THREE.Material, label: string
  ) {
    const joint = bone(name);
    const direction = bone(childName).position.clone();
    const from = direction.clone().multiplyScalar(start);
    const to = direction.clone().multiplyScalar(finish);
    const displacement = to.sub(from);
    const length = displacement.length();
    if (length < 0.001) throw new Error('Segmento de rig demasiado corto: ' + label);
    const geometry = new THREE.CapsuleGeometry(
      radius, Math.max(0, length - radius * 1.7), 3, 10
    );
    const piece = new THREE.Mesh(geometry, mat);
    piece.position.copy(from).addScaledVector(displacement, 0.5);
    piece.quaternion.setFromUnitVectors(up, displacement.normalize());
    attach(piece, joint, label);
  }

  const ball = (
    parent: string, label: string, pos: [number, number, number],
    scale: [number, number, number], mat: THREE.Material
  ) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    attach(mesh, bone(parent), label);
  };

  // Polera deportiva limpia, sin mochila, gorro ni capucha.
  ball('Spine2', 'polera', [0, 1, 0], [21, 25, 13], jersey);
  ball('Spine1', 'cintura-polera', [0, 1, 0], [17, 13, 11], jersey);
  ball('Spine2', 'pechera', [0, 9, 11], [11, 9, 2], jerseyLight);
  segment('Neck', 'Head', 0, 1, 6.5, skin, 'cuello');
  ball('Hips', 'cintura-pantalon', [0, 0, 0], [18, 13, 11], trousers);

  for (const side of ['Left', 'Right']) {
    segment(side + 'Shoulder', side + 'Arm', 0, 1, 8.8, jersey, side + '-hombro');
    segment(side + 'Arm', side + 'ForeArm', 0, 0.54, 8.4, jersey, side + '-manga');
    segment(side + 'Arm', side + 'ForeArm', 0.55, 1, 6.3, skin, side + '-brazo');
    segment(side + 'ForeArm', side + 'Hand', 0, 1, 6, skin, side + '-antebrazo');
    ball(side + 'Hand', side + '-mano', [0, 5, 0], [6.5, 9, 5.5], skinShade);

    segment(side + 'UpLeg', side + 'Leg', 0, 1, 11, trousers, side + '-muslo');
    segment(side + 'Leg', side + 'Foot', 0, 1, 9.2, trousers, side + '-pierna');
    segment(side + 'Foot', side + 'ToeBase', 0, 0.28, 7.8, cuffs, side + '-tobillo');
    segment(side + 'Foot', side + 'ToeBase', 0.27, 1, 9.3, shoe, side + '-zapatilla');
    ball(side + 'ToeBase', side + '-puntera', [0, 2, 0], [9.2, 4.6, 10], sole);
  }

  // Rostro amable, pelo corto y sin accesorios de estética callejera.
  ball('Head', 'cabeza', [0, 18, 0], [17.5, 21, 16], skin);
  ball('Head', 'oreja-izq', [17, 17, 0], [4.5, 6, 4.5], skinShade);
  ball('Head', 'oreja-der', [-17, 17, 0], [4.5, 6, 4.5], skinShade);
  ball('Head', 'cabello', [0, 34, -2], [18.2, 9, 16.5], hair);
  ball('Head', 'cabello-frente', [0, 31, 12], [17, 5.5, 6], hair);
  for (const side of [-1, 1]) {
    ball('Head', side < 0 ? 'ojo-izq' : 'ojo-der',
      [side * 7.5, 22.5, 14.8], [2, 2.5, 1.5], eyes);
  }
  ball('Head', 'nariz', [0, 17, 16.4], [2.6, 4, 3], skinShade);
  ball('Head', 'sonrisa', [0, 9, 15.8], [5, 1.2, 0.8], skinShade);
}
