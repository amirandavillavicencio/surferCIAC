import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Instanced} from '../view/pools';
import {laneX} from '../config';
// Original CIAC geometry, not an external asset or a Kenney replacement.
export function trainDetailPrototype(){
 const group=new THREE.Group();group.name='ciac-train-details';
 const metal:THREE.BufferGeometry[]=[],glass:THREE.BufferGeometry[]=[],rubber:THREE.BufferGeometry[]=[];
 const box=(list:THREE.BufferGeometry[],w:number,h:number,d:number,x:number,y:number,z:number)=>list.push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
 box(metal,2.2,.04,6.55,0,3.38,0);
 for(const side of [-1,1]){
  box(metal,.025,1.85,.72,side*1.15,1.4,0);
  box(rubber,.015,1.68,.018,side*1.168,1.4,0);
  box(glass,.018,.57,.47,side*1.168,1.94,0);
  for(const z of [-2.5,-1.3,1.3,2.5]){
   box(metal,.02,.73,.99,side*1.15,1.97,z);
   box(glass,.017,.61,.87,side*1.168,1.97,z);
  }
  box(metal,.025,.09,6.3,side*1.14,.6,0);
 }
 for(const z of [-2.2,0,2.2])box(rubber,1.95,.004,.025,0,3.399,z);
 const specs:[THREE.BufferGeometry[],THREE.Material,string][]=[
  [metal,new THREE.MeshStandardMaterial({color:0xbfcad0,roughness:.6,metalness:.32}),'roof-door-frames'],
  [glass,new THREE.MeshStandardMaterial({color:0x173b52,roughness:.28,metalness:.15,emissive:0x061018}),'windows'],
  [rubber,new THREE.MeshStandardMaterial({color:0x28383f,roughness:.9}),'seams']];
 for(const [parts,material,name] of specs){const mesh=new THREE.Mesh(mergeGeometries(parts)!,material);mesh.name=name;group.add(mesh);for(const geometry of parts)geometry.dispose();}
 return group;
}
export class RailBed {
 private steel:Instanced;private sleepers:Instanced;private matrix=new THREE.Matrix4();
 constructor(scene:THREE.Scene){
  const rails:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[];
  for(let lane=0;lane<3;lane++){
   for(const side of [-1,1])rails.push(new THREE.BoxGeometry(.065,.055,16).translate(laneX(lane)+side*.64,.0025,0));
   for(let i=0;i<24;i++)wood.push(new THREE.BoxGeometry(1.72,.045,.19).translate(laneX(lane),-.0125,-8+(i+.5)*16/24));
  }
  this.steel=new Instanced(new THREE.Mesh(mergeGeometries(rails)!,new THREE.MeshStandardMaterial({color:0x899397,roughness:.5,metalness:.65})),18,scene,{name:'steel-rails'});
  this.sleepers=new Instanced(new THREE.Mesh(mergeGeometries(wood)!,new THREE.MeshStandardMaterial({color:0x65574b,roughness:1})),18,scene,{name:'wood-sleepers'});
  for(const geometry of [...rails,...wood])geometry.dispose();
 }
 update(distance:number){
  this.steel.begin();this.sleepers.begin();const first=Math.floor((distance-24)/16);
  const m=this.matrix;
  for(let i=0;i<17;i++){const center=(first+i)*16+8;m.makeTranslation(0,0,distance-center);this.steel.add(m);this.sleepers.add(m);}
  this.steel.end();this.sleepers.end();
 }
}
