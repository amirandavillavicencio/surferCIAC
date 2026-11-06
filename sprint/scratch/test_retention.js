// Unit tests for new retention features: Daily Rewards, Lucky Spin, Trophies, Mystery Box
const fs = require('fs');

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
  createElement: (tag) => ({
    getContext: () => ({
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      strokeRect: () => {},
      roundRect: () => {},
      rect: () => {}
    }),
    style: {},
    width: 300,
    height: 300,
    addEventListener: () => {},
    removeEventListener: () => {}
  })
};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; }
};
global.performance = { now: () => Date.now() };

eval(fs.readFileSync('js/storage.js', 'utf8'));
eval(fs.readFileSync('js/audio.js', 'utf8'));

console.log('--- TESTING DAILY REWARDS ---');
const dData = Storage.getDailyRewardsData();
console.log('Daily rewards initial:', dData);
if (!dData.canClaim) throw new Error('Initial daily rewards should be claimable');
const claimedD1 = Storage.claimDailyReward(1);
console.log('Claimed Day 1:', claimedD1);
if (claimedD1.type !== 'coins' || claimedD1.amount !== 250) throw new Error('Day 1 should be 250 coins');
const dDataAfter = Storage.getDailyRewardsData();
console.log('Daily rewards after claim:', dDataAfter);
if (dDataAfter.canClaim) throw new Error('Should not be able to claim twice today');

console.log('--- TESTING SPIN WHEEL DATA ---');
const sData = Storage.getSpinWheelData();
console.log('Spin wheel initial:', sData);
if (!sData.canFreeSpin) throw new Error('First spin should be free');
Storage.useFreeSpin();
const sDataAfter = Storage.getSpinWheelData();
console.log('Spin wheel after use:', sDataAfter);
if (sDataAfter.canFreeSpin) throw new Error('Should not have free spin immediately after use');

console.log('--- TESTING MYSTERY BOXES ---');
Storage.addMysteryBoxes(2);
console.log('Mystery boxes after +2:', Storage.getMysteryBoxes());
if (Storage.getMysteryBoxes() < 2) throw new Error('Mystery box count should be >= 2');
const box1 = Storage.openMysteryBox();
console.log('Opened Box 1:', box1);
if (!box1 || !box1.title) throw new Error('Mystery box reward should be returned');
console.log('Remaining boxes:', Storage.getMysteryBoxes());

console.log('--- TESTING ACHIEVEMENTS ---');
Storage.incrementStat('totalRuns', 1);
const achData = Storage.getAchievementsData();
console.log('Initial achievements:', achData);
const claimedAch = Storage.claimAchievement('first_run', 'coins', 200);
console.log('Claimed first_run achievement:', claimedAch);
if (!claimedAch) throw new Error('Should claim first_run achievement');
const duplicateClaim = Storage.claimAchievement('first_run', 'coins', 200);
if (duplicateClaim) throw new Error('Should not allow duplicate claim');

console.log('--- TESTING AUDIO SYNTHESIS EFFECTS ---');
// Verify methods exist and are callable
if (typeof Audio.playWheelTick !== 'function') throw new Error('Audio.playWheelTick missing');
if (typeof Audio.playWheelWin !== 'function') throw new Error('Audio.playWheelWin missing');
if (typeof Audio.playChestOpen !== 'function') throw new Error('Audio.playChestOpen missing');
if (typeof Audio.playClaimReward !== 'function') throw new Error('Audio.playClaimReward missing');
Audio.playWheelTick();
Audio.playWheelWin();
Audio.playChestOpen();
Audio.playClaimReward();
console.log('Audio synthesizer calls succeeded without throwing!');

console.log('RETENTION FEATURES ALL PASSED!');
