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
 g.fillStyle = '#12375d'; g.fillRect(0, 0, 256, 64);
 g.fillStyle = '#ffbf42'; g.fillRect(0, 58, 256, 6);
 g.fillStyle = '#48d6c0';
 g.beginPath(); g.moveTo(0, 0); g.lineTo(28, 0); g.lineTo(0, 28); g.fill();
 g.fillStyle = '#fff7e8'; g.font = 'bold 26px sans-serif';
 g.textAlign = 'center'; g.fillText('CIAC VITACURA', 128, 39);
 const map = new THREE.CanvasTexture(canvas);
 map.colorSpace = THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map, side: THREE.DoubleSide}));
}

const ink = 0x24304a;
const cream = 0xffe4af;
const glassBlue = 0x34616d;

function frontage(name: string, design: (box: (x: number, y: number, width: number, height: number, color: number, depth?: number, z?: number) => void) => void) {
 const parts: THREE.BufferGeometry[] = [];
 design((x, y, width, height, color, depth = .07, z = 0) => {
  const piece = new THREE.BoxGeometry(width, height, depth).translate(x, y + height / 2, z);
  const rgb = new THREE.Color(color);
  const colors = new Float32Array(piece.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
  piece.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  parts.push(piece);
 });
 const geometry = mergeGeometries(parts)!;
 for (const piece of parts) piece.dispose();
 const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({vertexColors: true}));
 mesh.name = name;
 return mesh;
}

function shopfronts() {
 return [
  frontage('corner-showcase', box => {
   box(0, 0, .96, .92, ink);
   box(-.17, .13, .51, .61, glassBlue, .03, .05);
   box(.28, .035, .21, .70, 0x68aaa6, .03, .05);
   for (const x of [-.32, -.09]) box(x, .18, .025, .56, cream, .03, .08);
   box(-.17, .12, .54, .05, cream, .10, .05);
   box(0, .76, 1, .11, 0xe36e5e, .48, .15);
   for (const x of [-.37, -.12, .12, .37]) box(x, .76, .11, .11, cream, .49, .15);
  }),
  frontage('recessed-arcade', box => {
   box(0, 0, .97, .82, 0x273b4f);
   for (const x of [-.33, 0, .33]) {
    box(x, .09, .25, .55, 0x568e91, .02, .046);
    box(x, .62, .27, .065, 0xe7ba68, .11, .09);
   }
   for (const x of [-.48, -.165, .165, .48]) box(x, 0, .055, .79, 0x67b6a9, .20, .10);
   box(0, .79, .99, .11, 0x226e69, .32, .13);
  }),
  frontage('shutter-and-studio', box => {
   box(0, 0, .97, .85, 0x40324c);
   box(-.26, .05, .36, .53, 0x695d83, .03, .05);
   for (const y of [.12, .22, .32, .42, .52]) box(-.26, y, .36, .02, 0x9a8eb0, .035, .07);
   box(.15, .14, .34, .47, 0x34616d, .03, .05);
   box(.15, .13, .39, .055, 0xffbf64, .14, .10);
   box(.40, 0, .13, .68, 0xc37764, .14, .07);
   box(0, .71, .98, .09, 0xeb9466, .20, .09);
  }),
 ];
}

function wallArt(name: string, record: boolean) {
 const canvas = document.createElement('canvas');
 canvas.width = 256; canvas.height = 128;
 const g = canvas.getContext('2d')!;
 const shape = (color: string, points: number[]) => {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath();
  g.fill();
 };
 g.fillStyle = record ? '#442b58' : '#263653';
 g.fillRect(0, 0, 256, 128);
 if (record) {
  shape('#e77a65', [0, 94, 216, 0, 256, 0, 256, 38, 0, 126]);
  shape('#ffcb67', [76, 128, 256, 44, 256, 56, 107, 128]);
  for (const [radius, color] of [[55, '#242840'], [43, '#66567a'], [40, '#242840'], [29, '#66567a'], [26, '#242840'], [16, '#65c4ab'], [4, '#242840']] as const) {
   g.fillStyle = color; g.beginPath(); g.arc(145, 62, radius, 0, 2 * Math.PI); g.fill();
  }
 } else {
  g.fillStyle = '#ffbb61'; g.beginPath(); g.arc(172, 43, 27, 0, 2 * Math.PI); g.fill();
  shape('#f48779', [0, 98, 70, 37, 111, 69, 153, 39, 256, 101, 256, 128, 0, 128]);
  shape('#ffe4af', [44, 61, 70, 37, 100, 60, 77, 54, 67, 66, 61, 55]);
  shape('#66ccba', [0, 107, 81, 83, 123, 101, 195, 77, 256, 98, 256, 128, 0, 128]);
  shape('#365376', [37, 128, 117, 98, 154, 100, 107, 128]);
 }
 const map = new THREE.CanvasTexture(canvas);
 map.colorSpace = THREE.SRGBColorSpace;
 const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, .5, 0), new THREE.MeshLambertMaterial({map}));
 mesh.name = name;
 return mesh;
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
  const facadeTints = [0xffa054, 0x60d7bd, 0xffd261, 0x9a8be7, 0xff7d73, 0xd29af3]
   .map(color => new THREE.Color(color));
  const shops = shopfronts().map(model => makePool(model));
  const murals = [wallArt('foothills-mural', false), wallArt('record-mural', true)].map(model => makePool(model));
  const loadingBay = makePool(frontage('loading-bays', box => {
   for (const x of [-.26, .24]) {
    box(x, 0, .38, .76, 0x3c4155);
    for (const y of [.14, .28, .42, .56]) box(x, y, .34, .018, 0x62697a, .03, .046);
    box(x, .73, .40, .08, 0x8f7166, .32, .10);
   }
  }));
  const industrial = models.industrial.map(m => makePool(m, true));
  const industrialTints = [0xb18fc9, 0xb8c2d7, 0xb8887a, 0x82a7af]
   .map(color => new THREE.Color(color));
  const [road, barrier, lamp, warning] = models.roads.map(m => makePool(m));
  const [oak, tree, fence] = models.nature.map(m => makePool(m));
  const [platform, column, roof, glazing] = models.station.map(m => makePool(m, true));
  const platformTint = new THREE.Color(0xe2d7d3);
  const enamel = new THREE.Color(0x537ccf);
  const canopy = new THREE.Color(0x59ccb9);
  const glass = new THREE.Color(0x83cbd0);
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
     put(platform, 5.75, .25, 0, 3.4, .30, TILE, 0, platformTint);
     put(edge, 4.23, .55, 0, .23, .018, TILE);
     put(roof, 5.85, 3.65, 0, 3.55, .24, TILE, 0, canopy);
     for (const z of [-7, 3]) put(column, 7.15, .55, z, .34, 3.1, .40, 0, enamel);
     put(glazing, 7.16, .55, -2, .18, 2.8, 7.8, 0, glass);
     put(lamp, 7, .55, 7, .78, 2.9, .28, towardRail + Math.PI / 2);
     put(sign, 5.77, 3.24, 6.4, 2.65, .66, 1);
     put(sign, 6.94, 1.85, -2.2, 3.1, .77, 1, towardRail);
     // Benches assembled from the same floor slab and column pieces.
     put(platform, 6.70, 1.02, -1, .47, .13, 2, 0, platformTint);
     for (const z of [-1.68, -.32]) put(column, 6.70, .55, z, .17, .47, .20, 0, enamel);
    } else if (sector === 'industrial') {
     put(industrial[variant % industrial.length], 16, -.08, 0, 13.7, 5.3 + (variant % 3), 7.5, towardRail, industrialTints[variant % industrial.length]);
     if (variant % 2 === 0) put(loadingBay, 12.2, 0, 0, 12, 3.2, 1, towardRail);
     put(barrier, 12.12, -.09, 0, .24, .83, TILE);
     put(warning, 7.12, .25, 5, .55, 1.58, .54, towardRail);
    } else {
     const building = variant % commercial.length;
     const buildingX = 14.2 + (variant % 2) * .55;
     const buildingZ = side * 1.75;
     const width = [8, 8, 15, 9, 16, 10][building];
     put(commercial[building], buildingX, -.08, buildingZ,
      width, [10, 9, 7, 13, 12, 19][building], 6.3, towardRail, facadeTints[building]);
     const front = buildingX - 3.25;
     put(shops[[0, 1, 2, 2, 1, 0][building]], front, -.04, buildingZ,
      width * .94, [3.2, 4.1, 3.5, 4.3, 3.7, 4.6][building], 1, towardRail);
     if (building === 2 || building === 4) {
      put(murals[building === 2 ? 0 : 1], front - .05, 3.8, buildingZ - side * 2.3,
       5.8, 2.9, 1, towardRail);
     }
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
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#a87361';ctx.fillRect(0,0,256,256);
 let seed=19;const random=()=>((seed=seed*16807%2147483647)/2147483647);
 for(let i=0;i<4200;i++){
  const x=random()*256,y=random()*256,r=1+random()*2;
  const shade=111+Math.floor(random()*37);ctx.fillStyle=`rgb(${shade+35},${shade-2},${shade-18})`;
  ctx.fillRect(x,y,r*1.8,r);ctx.fillStyle='rgba(65,30,52,.18)';ctx.fillRect(x,y+r,r*1.8,1);
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
