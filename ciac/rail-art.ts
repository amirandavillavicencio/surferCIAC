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
 for(const end of [-1,1]){
  box(rubber,1.94,.94,.035,0,2.38,end*3.34);
  box(glass,1.76,.73,.025,0,2.4,end*3.35);
  box(metal,.06,.8,.028,0,2.4,end*3.35);
  box(metal,1.8,.13,.04,0,1.72,end*3.34);
  box(rubber,1.65,.24,.04,0,.46,end*3.34);
  for(const side of [-1,1])box(metal,.29,.17,.03,side*.73,.96,end*3.35);
  for(let i=0;i<4;i++)box(rubber,1.02,.035,.025,0,1.3+i*.085,end*3.35);
 }
 for(const side of [-1,1]){
  box(rubber,.03,.37,5.9,side*1.14,.33,0);
  box(metal,.03,.10,6.5,side*1.16,1.43,0);
  for(const z of [-2.45,2.45])box(rubber,.07,.4,.72,side*1.13,.26,z);
  box(metal,.018,.18,.04,side*1.17,1.3,.17);
 }
 for(const z of [-2.6,-1.3,0,1.3,2.6])box(rubber,1.5,.005,.025,0,3.401,z);
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

export function trainBodyPrototype(){
 const section=new THREE.Shape();
 section.moveTo(-.98,.14);section.lineTo(.98,.14);section.lineTo(1.15,.42);
 section.lineTo(1.15,2.98);section.quadraticCurveTo(1.15,3.375,.78,3.375);
 section.lineTo(-.78,3.375);section.quadraticCurveTo(-1.15,3.375,-1.15,2.98);
 section.lineTo(-1.15,.42);section.closePath();
 const geometry=new THREE.ExtrudeGeometry(section,{depth:6.68,bevelEnabled:false,curveSegments:4});geometry.translate(0,0,-3.34);
 const position=geometry.getAttribute('position');const colors=[];
 const paint=new THREE.Color();
 for(let i=0;i<position.count;i++){
  const y=position.getY(i);
  paint.setHex(y>3.05?0xd5e0df:y>1.46?0xe5e7d9:y>.5?0x267c91:0x283e4a);
  colors.push(paint.r,paint.g,paint.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.22}));mesh.name='train';return mesh;
}
