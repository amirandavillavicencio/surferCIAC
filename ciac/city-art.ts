import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Instanced} from '../view/pools';

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {LANE_W} from '../config';

const packs = {
 commercial: ['city-kit-commercial', 'building-b', 'building-d', 'building-e', 'building-i', 'building-k', 'building-m'],
 industrial: ['city-kit-industrial', 'building-c', 'building-i', 'building-k', 'building-s'],
 roads: ['city-kit-roads', 'road-straight', 'road-straight-barrier', 'light-square', 'road-sign-warning'],
 nature: ['nature-kit', 'tree_oak', 'tree_default', 'fence_simpleLow'],
 station: ['building-kit', 'floor', 'column-wide', 'roof-flat-patch-large', 'wall-window-wide-square-detailed'],
} as const;
type Pack = keyof typeof packs;
export type CityModels = Record<Pack, THREE.Group[]>;

export async function loadCityArt(): Promise<CityModels> {
 const loader = new GLTFLoader();
 const entries = await Promise.all(Object.entries(packs).map(async ([key, [directory, ...names]]) => {
  const models = await Promise.all(names.map(async name => {
   const {scene} = await loader.loadAsync(`assets/kenney-city/${directory}/${name}.glb`);
   return normalizeModel(scene, name);
  }));
  // The models in each pack reference one common palette. Share its GPU texture.
  let palette: THREE.Texture | null = null;
  const materials = new Set<THREE.MeshLambertMaterial>();
  for (const model of models) model.traverse(object => {
   if (object instanceof THREE.Mesh) materials.add(object.material);
  });
  const duplicateTextures = new Set<THREE.Texture>();
  for (const material of materials) {
   if (!material.map) continue;
   palette ??= material.map;
   if (material.map !== palette) duplicateTextures.add(material.map);
   material.map = palette;
  }
  for (const texture of duplicateTextures) texture.dispose();
  return [key, models];
 }));
 return Object.fromEntries(entries) as CityModels;
}

function normalizeModel(scene: THREE.Group, name: string) {
 scene.updateMatrixWorld(true);
 const bounds = new THREE.Box3().setFromObject(scene);
 const size = bounds.getSize(new THREE.Vector3());
 const center = bounds.getCenter(new THREE.Vector3());
 const root = new THREE.Group();
 root.name = name;
 const batches = new Map<string, {parts: THREE.BufferGeometry[]; material: THREE.MeshLambertMaterial}>();
 scene.traverse(object => {
  if (!(object instanceof THREE.Mesh)) return;
  const source = object.material as THREE.MeshStandardMaterial;
  // Keep both the texture palette and untextured details such as tree trunks and windows.
  const key = [source.map?.uuid, source.color.getHex(), source.side, source.opacity, source.transparent].join(':');
  let batch = batches.get(key);
  if (!batch) {
   batch = {parts: [], material: new THREE.MeshLambertMaterial({
    map: source.map, color: source.color, side: source.side,
    opacity: source.opacity, transparent: source.transparent,
   })};
   batches.set(key, batch);
  }
  const geometry = object.geometry.clone() as THREE.BufferGeometry;
  geometry.applyMatrix4(object.matrixWorld)
   .translate(-center.x, -bounds.min.y, -center.z)
   .scale(1 / size.x, 1 / size.y, 1 / size.z);
  geometry.deleteAttribute('tangent');
  batch.parts.push(geometry);
 });
 for (const {parts, material} of batches.values()) {
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('Invalid city geometry: ' + name);
  root.add(new THREE.Mesh(merged, material));
 }
 return root;
}

const TILE = 20;
const TRACK_EDGE = LANE_W * 1.5;
const loop = (n: number, length: number) => ((n % length) + length) % length;

export function citySector(cell: number) {
 const block = loop(cell, 19);
 return block < 5 || block >= 14 ? 'commercial' : block < 8 ? 'station' : 'industrial';
}

export function isStationAt(distance: number) {
 return citySector(Math.floor(distance / TILE)) === 'station';
}

function stationSign() {
 const canvas = document.createElement('canvas');
 canvas.width = 256; canvas.height = 64;
 const g = canvas.getContext('2d')!;
 g.fillStyle = '#12485e'; g.fillRect(0, 0, 256, 64);
 g.fillStyle = '#ffca62'; g.fillRect(0, 58, 256, 6);
 g.fillStyle = '#ffffff'; g.font = 'bold 26px sans-serif';
 g.textAlign = 'center'; g.fillText('CIAC VITACURA', 128, 39);
 const map = new THREE.CanvasTexture(canvas);
 map.colorSpace = THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map, side: THREE.DoubleSide}));
}

interface CityPlacement {
 pool: Instanced;
 x: number;
 y: number;
 z: number;
 width: number;
 height: number;
 depth: number;
 angle: number;
 tint?: THREE.Color;
}

export class CityArt {
 private readonly pools: Instanced[] = [];
 private readonly tiles: CityPlacement[][] = [];
 private readonly matrix = new THREE.Matrix4();

 constructor(scene: THREE.Scene, models: CityModels) {
  const makePool = (model: THREE.Object3D, colors = false) => {
   const pool = new Instanced(model, 48, scene, {colors, name: 'city-' + model.name});
   this.pools.push(pool);
   return pool;
  };
  const commercial = models.commercial.map(m => makePool(m, true));
  const facadeTints = [0xf6c08d, 0xa9dfc6, 0xffdc92, 0xc1d9f4, 0xf9b3a3, 0xd8caf6]
   .map(color => new THREE.Color(color));
  const industrial = models.industrial.map(m => makePool(m));
  const [road, barrier, lamp, warning] = models.roads.map(m => makePool(m));
  const [oak, tree, fence] = models.nature.map(m => makePool(m));
  const [platform, column, roof, glazing] = models.station.map(m => makePool(m));
  const sign = makePool(stationSign());
  const floor = models.station[0].children[0] as THREE.Mesh;
  const edge = makePool(new THREE.Mesh(floor.geometry, new THREE.MeshLambertMaterial({color: 0xf3b945})));
  for (let cell = 0; cell < 19; cell++) {
   const sector = citySector(cell);
   const placements: CityPlacement[] = [];
   this.tiles.push(placements);
   for (const side of [-1, 1]) {
    const put = (pool: Instanced, x: number, y: number, z: number, width: number, height: number, depth: number, angle = 0, tint?: THREE.Color) => {
     const halfX = (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * depth) / 2;
     if (x - halfX <= TRACK_EDGE) throw new Error('City scenery overlaps the rail corridor');
     placements.push({pool, x: side * x, y, z, width, height, depth, angle, tint});
    };
    const variant = cell + (side === 1 ? 2 : 0);
    const towardRail = -side * Math.PI / 2;
    put(road, 9.15, -.11, 0, 3.5, .14, TILE);
    if (sector === 'station') {
     put(platform, 5.75, .25, 0, 3.4, .30, TILE);
     put(edge, 4.23, .55, 0, .23, .018, TILE);
     put(roof, 5.85, 3.65, 0, 3.55, .24, TILE);
     for (const z of [-7, 3]) put(column, 7.15, .55, z, .34, 3.1, .40);
     put(glazing, 7.16, .55, -2, .18, 2.8, 7.8);
     put(lamp, 7, .55, 7, .78, 2.9, .28, towardRail + Math.PI / 2);
     put(sign, 5.77, 3.24, 6.4, 2.65, .66, 1);
     // Benches assembled from the same floor slab and column pieces.
     put(platform, 6.70, 1.02, -1, .47, .13, 2);
     for (const z of [-1.68, -.32]) put(column, 6.70, .55, z, .17, .47, .20);
    } else if (sector === 'industrial') {
     put(industrial[variant % industrial.length], 16, -.08, 0, 13.7, 5.3 + (variant % 3), 7.5, towardRail);
     put(barrier, 12.12, -.09, 0, .24, .83, TILE);
     put(warning, 7.12, .25, 5, .55, 1.58, .54, towardRail);
    } else {
     const building = variant % commercial.length;
     put(commercial[building], 14.2 + (variant % 2) * .55, -.08, side * 1.75,
      [8,8,15,9,16,10][building], [10,9,7,13,12,19][building], 6.3, towardRail, facadeTints[building]);
     put(variant % 2 ? oak : tree, 6.35, .25, side * 3, 2.6, 3.7 + variant % 2, 2.55);
     put(fence, 6.32, .25, side * 3 + 1.5, 2.3, .53, .22);
     put(lamp, 7, .25, -5, .81, 3.3, .28);
    }
   }
  }
 }

 update(distance: number) {
  for (const pool of this.pools) pool.begin();
  const first = Math.floor((distance - 40) / TILE);
  const last = Math.ceil((distance + 220) / TILE);
  for (let cell = first; cell <= last; cell++) {
   for (const {pool, x, y, z, width, height, depth, angle, tint} of this.tiles[loop(cell, this.tiles.length)]) {
    // Scale the columns of the rotation matrix without allocating per instance.
    const matrix = this.matrix.makeRotationY(angle);
    const e = matrix.elements;
    e[0] *= width; e[2] *= width; e[5] *= height; e[8] *= depth; e[10] *= depth;
    matrix.setPosition(x, y, distance - (cell * TILE + TILE / 2) + z);
    pool.add(matrix, tint);
   }
  }
  for (const pool of this.pools) pool.end();
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
