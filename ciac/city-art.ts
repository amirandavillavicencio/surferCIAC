import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Instanced} from '../view/pools';

// Original procedural scenery. Shared geometry, no downloads or per-frame allocation.
export class CityArt {
 private blocks:Instanced[]=[];
 private matrix=new THREE.Matrix4();
 constructor(scene:THREE.Scene){
  for(let variant=0;variant<3;variant++){
   const group=new THREE.Group();group.name='rail-neighborhood';
   const pieces:THREE.BufferGeometry[][]=[[],[],[],[],[]];
   const box=(k:number,w:number,h:number,d:number,x:number,y:number,z:number)=>pieces[k].push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
   const height=7+variant*2;
   box(0,5.5,height,10,0,height/2,0);
   box(1,5.8,.25,10.3,0,height,0);
   box(1,5.7,.35,10.2,0,.5,0);
   for(let floor=1;floor<height-1;floor+=2.1){
    box(1,5.6,.10,10.1,0,floor+.9,0);
    for(const z of [-3.6,-1.2,1.2,3.6])for(const side of [-1,1]){
     pieces[1].push(new THREE.PlaneGeometry(1.25,1.45).rotateY(side*Math.PI/2).translate(side*2.79,floor+.1,z));
     pieces[2].push(new THREE.PlaneGeometry(1.02,1.17).rotateY(side*Math.PI/2).translate(side*2.85,floor+.13,z));
     pieces[1].push(new THREE.PlaneGeometry(1.08,.07).rotateY(side*Math.PI/2).translate(side*2.91,floor+.1,z));
    }
   }
   box(1,1.6,.65,2,1,height+.44,-2);
   for(const side of [-1,1]){
    box(2,.12,1.7,1.6,side*2.84,1.2,0);
    box(3,1.15,.16,3,side*3.2,2.35,0);
    box(1,.7,.55,1.7,side*4.25,.55,3.8);
    box(4,.65,.5,1.6,side*4.25,.95,3.8);
   }
   const trunk=new THREE.CylinderGeometry(.12,.19,2.5,6).translate(-4.3,1.5,-3.5);pieces[1].push(trunk);
   for(const [x,y,z,r] of [[-4.3,3.5,-3.5,1.35],[-4.7,3,-3.1,1],[-3.7,3.1,-3.6,.9]])pieces[4].push(new THREE.IcosahedronGeometry(r,0).translate(x,y,z));
   const colors=[ [0xd7ac79,0xe5cdb0,0x274c62,0x397b87,0x528760], [0x91b6b1,0xe8ddc2,0x294d61,0xca784d,0x6b9255], [0xc58468,0xf3d6ad,0x31576c,0xe6ad46,0x42785b]][variant];
   const batches=pieces.map((parts,i)=>{
    const geometry=mergeGeometries(parts.map(p=>p.index?p.toNonIndexed():p))!;
    const color=new THREE.Color(colors[i]);const data=[];
    for(let vertex=0;vertex<geometry.getAttribute('position').count;vertex++)data.push(color.r,color.g,color.b);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(data,3));parts.forEach(p=>p.dispose());return geometry;
   });
   group.add(new THREE.Mesh(mergeGeometries(batches)!,new THREE.MeshLambertMaterial({vertexColors:true})));
   batches.forEach(p=>p.dispose());
   this.blocks.push(new Instanced(group,24,scene,{name:'city-'+variant}));
  }
 }
 update(distance:number){
  this.blocks.forEach(p=>p.begin());
  const first=Math.floor((distance-32)/14);
  for(let i=0;i<17;i++)for(const side of [-1,1]){
   const cell=first+i;const variant=((cell+(side===1?1:0))%3+3)%3;
   this.matrix.makeRotationY(side===1?Math.PI:0).setPosition(side*(10.5+(variant===2?1:0)),0,distance-(cell*14+(side===1?5:0)));
   this.blocks[variant].add(this.matrix);
  }
  this.blocks.forEach(p=>p.end());
 }
}

export function ballastTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#827e76';ctx.fillRect(0,0,256,256);
 let seed=19;const random=()=>((seed=seed*16807%2147483647)/2147483647);
 for(let i=0;i<4200;i++){
  const x=random()*256,y=random()*256,r=1+random()*2;
  const shade=95+Math.floor(random()*65);ctx.fillStyle=`rgb(${shade+6},${shade+3},${shade})`;
  ctx.fillRect(x,y,r*1.8,r);ctx.fillStyle='rgba(35,40,43,.18)';ctx.fillRect(x,y+r,r*1.8,1);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}

export function rewardCoin(){
 const root=new THREE.Group();root.name='reward-coin';
 const gold=new THREE.MeshStandardMaterial({color:0xffc536,metalness:.55,roughness:.28,emissive:0x603000,emissiveIntensity:.2});
 const face=new THREE.MeshStandardMaterial({color:0xffe99a,metalness:.35,roughness:.32});
 const details:THREE.BufferGeometry[]=[];
 const disc=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.095,20),gold);disc.rotation.x=Math.PI/2;root.add(disc);
 for(const z of [-.055,.055]){
  details.push(new THREE.TorusGeometry(.265,.025,5,20).translate(0,0,z));
  details.push(new THREE.BoxGeometry(.055,.28,.015).translate(0,0,z));
 }
 root.add(new THREE.Mesh(mergeGeometries(details)!,face));details.forEach(p=>p.dispose());
 return root;
}

export function obstacleFinish(original:THREE.Object3D,kind:string){
 const group=new THREE.Group();group.name=kind;group.add(original.clone());
 const parts:THREE.BufferGeometry[]=[];
 const box=(w:number,h:number,d:number,x:number,y:number,z:number)=>parts.push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
 if(kind==='low'){
  for(const x of [-.91,.91])box(.07,.84,.69,x,.47,0);
  for(const y of [.1,.86])box(1.88,.055,.69,0,y,0);
 }else{
  const top=kind==='hurdle'?1.25:2.65;
  for(const side of [-1,1]){
   box(.22,.08,.34,side*.94,.06,0);
   box(.035,top-.08,.3,side*1.04,top/2,0);
   box(.16,.12,.02,side*.85,top-.13,.175);
  }
 }
 const mesh=new THREE.Mesh(mergeGeometries(parts)!,new THREE.MeshStandardMaterial({color:0xd0d9d7,metalness:.4,roughness:.5}));group.add(mesh);parts.forEach(p=>p.dispose());return group;
}

export function rampDeck(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const g=canvas.getContext('2d')!;
 g.fillStyle='#5e7480';g.fillRect(0,0,256,256);
 for(let y=0;y<256;y+=24){g.fillStyle='#8ea1a5';g.fillRect(0,y,256,3);g.fillStyle='#3e515e';g.fillRect(0,y+3,256,2);}
 for(const x of [0,232]){
  g.fillStyle='#efc655';g.fillRect(x,0,24,256);
  g.fillStyle='#303e49';for(let y=-24;y<256;y+=48){g.beginPath();g.moveTo(x,y);g.lineTo(x+24,y+24);g.lineTo(x+24,y+43);g.lineTo(x,y+19);g.fill();}
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
