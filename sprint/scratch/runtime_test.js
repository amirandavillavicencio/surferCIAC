/**
 * Runtime Test - Simulate browser environment to catch runtime errors
 */

const fs = require('fs');
const path = require('path');

// Simulate browser globals that scripts might use
global.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (fn) => setTimeout(fn, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  location: { href: 'http://localhost:3000/', hostname: 'localhost' },
  navigator: { serviceWorker: null },
  game: null,
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  }
};
global.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return {
        width: 1024, height: 256,
        getContext(type) {
          if (type === '2d') {
            return {
              clearRect() {}, fillRect() {}, strokeRect() {},
              fillText() {}, measureText(t) { return { width: t.length * 10 }; },
              beginPath() {}, arc() {}, fill() {}, stroke() {},
              moveTo() {}, lineTo() {}, closePath() {},
              save() {}, restore() {}, clip() {}, rect() {},
              createLinearGradient() { return { addColorStop() {} }; },
              createRadialGradient() { return { addColorStop() {} }; },
              shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
              fillStyle: '', strokeStyle: '', lineWidth: 1,
              font: '', textAlign: '', textBaseline: ''
            };
          }
          return null;
        }
      };
    }
    return { style: {}, addEventListener: () => {}, appendChild: () => {} };
  },
  getElementById(id) { return { style: {}, textContent: '', className: '', checked: false, addEventListener: () => {}, appendChild: () => {}, querySelector: () => null }; },
  querySelector(sel) { return { style: {}, addEventListener: () => {} }; },
  querySelectorAll(sel) { return []; },
  addEventListener(evt, fn) { if (evt === 'DOMContentLoaded') fn(); },
  readyState: 'complete',
  body: { appendChild: () => {} }
};
global.navigator = { userAgent: 'Mozilla/5.0 (test)', language: 'en-US' };

// Fake THREE.js
class FakeGeometry {}
class FakeMaterial {}
class FakeMesh { constructor() { this.position = {x:0,y:0,z:0,set(){},copy(){}}; this.rotation = {x:0,y:0,z:0,set(){}}; this.scale = {x:1,y:1,z:1,set(){},multiplyScalar(){}}; this.children = []; this.visible = true; } add(){} remove(){} traverse(fn){fn(this);} }
class FakeGroup extends FakeMesh {}
class FakeScene extends FakeGroup { add(){} remove(){} }
class FakeCamera extends FakeMesh { updateProjectionMatrix(){} lookAt(){} }
class FakeRenderer { setSize(){} setPixelRatio(){} render(){} get shadowMap(){ return {enabled:false}; } get domElement(){ return document.createElement('canvas'); } }
class FakeClock { getDelta(){ return 0.016; } }
class FakeVector3 { constructor(x,y,z){ this.x=x||0; this.y=y||0; this.z=z||0; } set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; } copy(v){ this.x=v.x; this.y=v.y; this.z=v.z; return this; } }
class FakeTexture {}
class FakeCanvasTexture extends FakeTexture { constructor(){ super(); this.needsUpdate=false; } }

global.THREE = {
  Scene: FakeScene, Group: FakeGroup, Mesh: FakeMesh, Clock: FakeClock,
  Vector3: FakeVector3,
  PerspectiveCamera: class extends FakeCamera { constructor(fov,a,n,f){ super(); this.fov=fov; this.aspect=a; this.near=n; this.far=f; } },
  WebGLRenderer: class extends FakeRenderer { constructor(opts){ super(); } },
  AmbientLight: class extends FakeMesh { constructor(c,i){ super(); } },
  DirectionalLight: class extends FakeMesh { constructor(c,i){ super(); } get shadow(){ return {mapSize:{width:0,height:0}, camera:{near:0,far:0,left:0,right:0,top:0,bottom:0}}; } },
  PointLight: class extends FakeMesh { constructor(c,i,d){ super(); } },
  BoxGeometry: class extends FakeGeometry {},
  CylinderGeometry: class extends FakeGeometry {},
  SphereGeometry: class extends FakeGeometry {},
  PlaneGeometry: class extends FakeGeometry {},
  TorusGeometry: class extends FakeGeometry {},
  ConeGeometry: class extends FakeGeometry {},
  TubeGeometry: class extends FakeGeometry {},
  OctahedronGeometry: class extends FakeGeometry {},
  DodecahedronGeometry: class extends FakeGeometry {},
  MeshStandardMaterial: class extends FakeMaterial { constructor(opts){ super(); } },
  MeshLambertMaterial: class extends FakeMaterial { constructor(opts){ super(); } },
  MeshBasicMaterial: class extends FakeMaterial { constructor(opts){ super(); } },
  MeshPhongMaterial: class extends FakeMaterial { constructor(opts){ super(); } },
  Color: class { constructor(c){ this.r=1; this.g=1; this.b=1; } set(){} },
  CanvasTexture: FakeCanvasTexture,
  Points: class extends FakeMesh { constructor(g,m){ super(); } },
  BufferGeometry: class extends FakeGeometry { setAttribute(){} setFromPoints(){} },
  Float32BufferAttribute: class { constructor(a,i){ } },
  PointsMaterial: class extends FakeMaterial { constructor(opts){ super(); } },
  BackSide: 1, DoubleSide: 2, FrontSide: 0,
  PCFShadowMap: 1, PCFSoftShadowMap: 2,
  CatmullRomCurve3: class { constructor(pts){ this.points=pts; } getPoints(n){ return this.points||[]; } getPoint(t){ return new FakeVector3(); } },
  QuadraticBezierCurve3: class { constructor(){} getPoints(n){ return [new FakeVector3()]; } },
  TubeBufferGeometry: class extends FakeGeometry {},
  LatheGeometry: class extends FakeGeometry {}
};

// Load and execute each file
const files = [
  'js/storage.js', 'js/audio.js', 'js/missions.js', 
  'js/collectibles.js', 'js/player.js', 'js/chaser.js', 
  'js/world.js', 'js/input.js', 'js/ui.js', 'js/main.js'
];

let errorFound = false;
for (const file of files) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    eval(code);
    console.log('OK: ' + file);
  } catch(e) {
    console.error('ERROR in ' + file + ':');
    console.error('  ' + e.constructor.name + ': ' + e.message);
    if (e.stack) {
      const lines = e.stack.split('\n');
      lines.slice(1, 6).forEach(l => console.error('  ' + l));
    }
    errorFound = true;
  }
}

if (!errorFound) {
  console.log('\nAll files loaded without errors!');
}
