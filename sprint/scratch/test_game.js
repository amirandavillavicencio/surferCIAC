// Mock browser globals
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: (id) => ({
    textContent: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {}
  }),
  querySelectorAll: () => [],
  createElementNS: (ns, tag) => ({
    getContext: () => null,
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  createElement: (tag) => ({
    getContext: () => ({
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {}
    }),
    style: {},
    width: 128,
    height: 128,
    addEventListener: () => {},
    removeEventListener: () => {}
  })
};
global.window.innerWidth = 1920;
global.window.innerHeight = 1080;
global.navigator = { userAgent: 'Chrome', vibrate: () => {} };
global.location = { reload: () => {} };
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; }
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

// Load Three.js
const fs = require('fs');
global.THREE = {};
const threeFn = new Function('exports', 'module', fs.readFileSync('lib/three.min.js', 'utf8'));
const mod = { exports: {} };
threeFn(mod.exports, mod);
global.THREE = mod.exports.THREE || mod.exports;
global.THREE.WebGLRenderer = class {
  constructor() {
    this.domElement = { style: {} };
    this.shadowMap = { enabled: false };
  }
  setSize() {}
  setPixelRatio() {}
  render() {}
};

// Load game modules
eval(fs.readFileSync('js/storage.js', 'utf8'));
eval(fs.readFileSync('js/audio.js', 'utf8'));
eval(fs.readFileSync('js/missions.js', 'utf8'));
eval(fs.readFileSync('js/collectibles.js', 'utf8'));
eval(fs.readFileSync('js/player.js', 'utf8'));
eval(fs.readFileSync('js/chaser.js', 'utf8'));
eval(fs.readFileSync('js/world.js', 'utf8'));
eval(fs.readFileSync('js/input.js', 'utf8'));
eval(fs.readFileSync('js/ui.js', 'utf8'));
eval(fs.readFileSync('js/main.js', 'utf8'));

console.log('Modules loaded successfully!');

const game = new Game();
console.log('Game instantiated! Current state:', game.currentState);

// Test starting game
game.startGame();
console.log('game.startGame() executed! Current state:', game.currentState);

// Simulate 120 frames of gameplay
for (let i = 0; i < 120; i++) {
  const delta = 0.016;
  const stepDistance = game.currentSpeed * delta;
  game.player.mesh.position.z -= stepDistance;
  game.distance += stepDistance;
  game.currentSpeed = Math.min(game.maxSpeed, game.baseSpeed + (game.distance / 100) * game.speedAcceleration);
  game.score += stepDistance * 1.5;

  game.player.update(delta, game.currentSpeed, game.player.groundHeight || 0);
  game.chaser.update(delta, game.player, game.currentSpeed);
  game.world.update(delta, game.player, game.currentSpeed, (obs) => console.log('Crashed!'), () => {}, game.distance);
  game.updateEnvironmentalLighting(delta);
  game.collectibles.update(delta, game.player, (val) => {}, (p) => {});
  game.updateSpeedLines(delta);
  game.ui.updateHUD(game.score, game.coins, game.multiplier, game.player);
  game.updateCamera(delta);
}

console.log('Simulated 120 frames without any errors! Player Z:', game.player.mesh.position.z, 'Score:', game.score);

// Test Keys Storage & Progression
console.log('Initial keys:', Storage.getTotalKeys());
if (Storage.getTotalKeys() < 5) throw new Error('Default keys should be at least 5');

Storage.addKeys(2);
console.log('After +2 keys:', Storage.getTotalKeys());
const spent = Storage.spendKeys(2);
console.log('Spent 2 keys:', spent, 'Remaining:', Storage.getTotalKeys());
if (!spent) throw new Error('spendKeys failed');

// Test Key Collectible Spawning
const keyItem = game.collectibles.spawnKey(0, 0, -20);
console.log('spawnKey test item created:', keyItem.type);
if (keyItem.type !== 'key') throw new Error('spawnKey failed');

// Test Revive Key Progression & Speed Continuity
game.startGame();
game.score = 5000;
game.distance = 2000;
game.currentSpeed = 22.0;
game.onPlayerCrash();
console.log('Crash saved speed:', game.savedSpeedBeforeCrash);
if (game.savedSpeedBeforeCrash < 20.0) throw new Error('Speed should be preserved before crash');

// First revive
game.revivePlayer();
console.log('Run revive count 1:', game.runReviveCount, 'Current speed after revive:', game.currentSpeed);
if (game.runReviveCount !== 1) throw new Error('Revive count should be 1');
if (game.currentSpeed < 20.0) throw new Error('Speed should be restored on revive');

// Second revive
game.onPlayerCrash();
game.revivePlayer();
console.log('Run revive count 2:', game.runReviveCount);
if (game.runReviveCount !== 2) throw new Error('Revive count should be 2');

console.log('ALL TESTS PASSED WITH 0 ERRORS!');

