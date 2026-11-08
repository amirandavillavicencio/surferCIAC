import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Instanced} from '../view/pools';
import {CAR_LEN, OB, laneX} from '../config';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
export class RailBed {
 private steel:Instanced;private sleepers:Instanced;private matrix=new THREE.Matrix4();
 constructor(scene:THREE.Scene){
  const rails:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[];
  for(let lane=0;lane<3;lane++){
   for(const side of [-1,1])rails.push(new THREE.BoxGeometry(.085,.055,16).translate(laneX(lane)+side*.64,.0025,0));
   for(let i=0;i<24;i++)wood.push(new THREE.BoxGeometry(1.84,.065,.23).translate(laneX(lane),-.0125,-8+(i+.5)*16/24));
  }
  this.steel=new Instanced(new THREE.Mesh(mergeGeometries(rails)!,new THREE.MeshStandardMaterial({color:0x899397,roughness:.5,metalness:.65})),18,scene,{name:'steel-rails'});
  this.sleepers=new Instanced(new THREE.Mesh(mergeGeometries(wood)!,new THREE.MeshStandardMaterial({color:0x655145,roughness:1})),18,scene,{name:'wood-sleepers'});
  for(const geometry of [...rails,...wood])geometry.dispose();
 }
 update(distance:number){
  this.steel.begin();this.sleepers.begin();const first=Math.floor((distance-24)/16);
  const m=this.matrix;
  for(let i=0;i<17;i++){const center=(first+i)*16+8;m.makeTranslation(0,0,distance-center);this.steel.add(m);this.sleepers.add(m);}
  this.steel.end();this.sleepers.end();
 }
}

const models = ['train-electric-subway-a', 'train-electric-subway-b'] as const;
const modelPath = 'assets/kenney-train-kit/';

export async function loadTrainArt() {
 const loader = new GLTFLoader().setPath(modelPath);
 const [cab, coach] = await Promise.all(models.map(async name => {
  const {scene} = await loader.loadAsync(name + '.glb');
  return fitTrainModel(scene, name);
 }));
 // Both original models use the same palette and glTF material.
 coach.material.map?.dispose();
 coach.material.dispose();
 coach.material = cab.material;
 return {cab, coach};
}

export type TrainArt = Awaited<ReturnType<typeof loadTrainArt>>;

export function fitTrainModel(scene: THREE.Group, name: typeof models[number]) {
 scene.updateMatrixWorld(true);
 const parts: THREE.BufferGeometry[] = [];
 const shell = scene.getObjectByName(name);
 if (!shell) throw new Error('Falta la carrocería de ' + name);
 let material: THREE.MeshStandardMaterial | undefined;
 const bounds = new THREE.Box3().setFromObject(scene);
 const size = bounds.getSize(new THREE.Vector3());
 const center = bounds.getCenter(new THREE.Vector3());
 const height = OB.train.yt;
 scene.traverse(object => {
  if (!(object instanceof THREE.Mesh)) return;
  const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld) as THREE.BufferGeometry;
  geometry.deleteAttribute('tangent');
  geometry.translate(-center.x, -bounds.min.y, -center.z);
  geometry.scale(OB.train.halfW * 2 / size.x, height / size.y, CAR_LEN / size.z);
  if (object === shell || object.parent === shell && !object.name.startsWith('wheels-')) {
   material = object.material as THREE.MeshStandardMaterial;
   // The raised palette details sit above the main roof in the source.
   // Align the roof skin to the running plane and recess the raised parts
   // slightly so coplanar faces cannot flicker.
   const positions = geometry.getAttribute('position');
   const roofStart = height - 0.1 * height / size.y;
   const tolerance = 0.0001;
   for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (Math.abs(y - roofStart) < tolerance) positions.setY(i, height);
    else if (y > roofStart) positions.setY(i, height - 0.008);
   }
  }
  parts.push(geometry);
 });
 const geometry = mergeGeometries(parts);
 for (const part of parts) part.dispose();
 scene.traverse(object => {
  if (object instanceof THREE.Mesh) object.geometry.dispose();
 });
 if (!geometry || !material) throw new Error('No se pudo unir el modelo ' + name);
 // Render back faces in the shadow map to avoid self-shadowing on the roof.
 material.shadowSide = THREE.BackSide;
 material.roughness = 0.65;
 material.metalness = 0.12;
 const train = new THREE.Mesh(geometry, material);
 train.name = name;
 return train;
}
