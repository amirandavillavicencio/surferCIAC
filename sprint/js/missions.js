/**
 * Saurabh's Sprint - Dynamic Missions & Word Hunt Engine
 * Features:
 * 1. Daily Word Hunt (Collect glowing 3D Alphabet Letters on tracks like Subway Surfers)
 * 2. Multi-Tier Challenges (Coins, Multipliers, Jumps, Slides, Magnets, High Scores)
 * 3. Instant Coin Rewards & Claim Notifications
 */

class MissionManager {
  constructor() {
    this.WORDS_POOL = [
      'SPRINT', 'SAURABH', 'SUBWAY', 'SURFER', 'SPEED', 'LEGEND',
      'GOLDEN', 'CHAMPION', 'RUNNER', 'METRO', 'TURBO', 'DIAMOND',
      'COSMIC', 'NINJA', 'PHOENIX', 'STORM', 'SHADOW', 'RADAR', 'HERO', 'FLASH'
    ];
    
    this.missions = [
      {
        id: 'word_hunt_complete',
        title: 'Word Hunt Master',
        desc: 'Complete 1 Daily Word Hunt puzzle',
        type: 'word_hunt',
        target: 1,
        reward: 500,
        icon: '🔤'
      },
      {
        id: 'run_coins_100',
        title: 'Golden Vault',
        desc: 'Collect 100 coins in a single run',
        type: 'run_coins',
        target: 100,
        reward: 250,
        icon: '💰'
      },
      {
        id: 'run_score_5000',
        title: 'Subway Champion',
        desc: 'Score 5,000 points in a single run',
        type: 'run_score',
        target: 5000,
        reward: 300,
        icon: '🏆'
      },
      {
        id: 'run_dist_800',
        title: 'Marathon Sprinter',
        desc: 'Sprint 800 meters in a single run',
        type: 'run_distance',
        target: 800,
        reward: 250,
        icon: '🏃'
      },
      {
        id: 'collect_magnets_5',
        title: 'Magnetic Force',
        desc: 'Collect 5 Coin Magnets in total',
        type: 'stat_magnets',
        target: 5,
        reward: 200,
        icon: '🧲'
      },
      {
        id: 'use_hoverboard_5',
        title: 'Boarding Pro',
        desc: 'Use Hoverboard shield 5 times',
        type: 'stat_hoverboards',
        target: 5,
        reward: 300,
        icon: '🛹'
      },
      {
        id: 'total_jumps_30',
        title: 'High Leaper',
        desc: 'Perform 30 hurdles & jumps',
        type: 'stat_jumps',
        target: 30,
        reward: 180,
        icon: '⬆️'
      },
      {
        id: 'total_slides_25',
        title: 'Tunnel Slider',
        desc: 'Perform 25 slides & ducks',
        type: 'stat_slides',
        target: 25,
        reward: 180,
        icon: '⬇️'
      },
      {
        id: 'total_powerups_15',
        title: 'Supercharged Turbo',
        desc: 'Collect 15 power-ups in total',
        type: 'stat_powerups',
        target: 15,
        reward: 350,
        icon: '⚡'
      },
      {
        id: 'high_score_15000',
        title: 'Grandmaster Runner',
        desc: 'Reach a High Score of 15,000',
        type: 'high_score',
        target: 15000,
        reward: 600,
        icon: '⭐'
      }
    ];

    this.claimed = Storage.getMissionsData();
  }

  // --- WORD HUNT SYSTEM ---
  startNewRunWord() {
    const data = Storage.getWordHuntData();
    let available = this.WORDS_POOL.filter(w => w !== data.word);
    if (available.length === 0) available = this.WORDS_POOL;
    const newWord = available[Math.floor(Math.random() * available.length)];
    const newIdx = this.WORDS_POOL.indexOf(newWord);
    
    const newWordData = {
      wordIndex: newIdx,
      word: newWord,
      collected: []
    };
    Storage.saveWordHuntData(newWordData);
    return newWordData;
  }

  getWordHunt() {
    const data = Storage.getWordHuntData();
    const word = data.word || this.WORDS_POOL[data.wordIndex % this.WORDS_POOL.length];
    const collected = Array.isArray(data.collected) ? data.collected : [];
    const isComplete = word.split('').every(ch => collected.includes(ch));
    return {
      word: word,
      wordIndex: data.wordIndex || 0,
      collected: collected,
      isComplete: isComplete
    };
  }

  getNextTargetLetter() {
    const wh = this.getWordHunt();
    const missing = wh.word.split('').filter(ch => !wh.collected.includes(ch));
    if (missing.length === 0) return null;
    return missing[Math.floor(Math.random() * missing.length)];
  }

  collectLetter(char) {
    const wh = this.getWordHunt();
    if (!wh.collected.includes(char) && wh.word.includes(char)) {
      wh.collected.push(char);
      Storage.saveWordHuntData(wh);
      const isComplete = wh.word.split('').every(ch => wh.collected.includes(ch));
      if (isComplete) {
        // Complete Word Hunt
        Storage.addCoins(1000);
        Storage.incrementStat('wordHuntsCompleted', 1);
        if (typeof Audio !== 'undefined' && Audio.playReward) Audio.playReward();
        
        // Pick fresh new word
        this.startNewRunWord();
        return { completed: true, word: wh.word, reward: 1000 };
      }
      return { completed: false, word: wh.word, letter: char, count: wh.collected.length, total: wh.word.length };
    }
    return null;
  }

  getProgress(mission, currentRun = null) {
    const stats = Storage.getStats();
    let current = 0;

    switch (mission.type) {
      case 'word_hunt':
        current = stats.wordHuntsCompleted || 0;
        break;
      case 'run_coins':
        current = currentRun ? currentRun.coins : (stats.bestRunCoins || 0);
        break;
      case 'run_score':
        current = currentRun ? currentRun.score : Storage.getHighScore();
        break;
      case 'run_distance':
        current = currentRun ? currentRun.distance : (stats.bestRunDistance || 0);
        break;
      case 'stat_magnets':
        current = stats.totalMagnetsCollected || 0;
        break;
      case 'stat_hoverboards':
        current = stats.totalHoverboardsUsed || 0;
        break;
      case 'stat_jumps':
        current = stats.totalJumps || 0;
        break;
      case 'stat_slides':
        current = stats.totalSlides || 0;
        break;
      case 'stat_powerups':
        current = stats.totalPowerUpsCollected || 0;
        break;
      case 'high_score':
        current = Storage.getHighScore();
        break;
      default:
        current = 0;
    }

    const isCompleted = current >= mission.target;
    const isClaimed = !!this.claimed[mission.id];

    return {
      current: Math.min(Math.floor(current), mission.target),
      target: mission.target,
      isCompleted,
      isClaimed
    };
  }

  claim(missionId) {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission) return false;

    const prog = this.getProgress(mission);
    if (prog.isCompleted && !prog.isClaimed) {
      this.claimed[missionId] = true;
      Storage.saveMissionsData(this.claimed);
      Storage.addCoins(mission.reward);
      if (typeof Audio !== 'undefined' && Audio.playReward) Audio.playReward();
      return true;
    }
    return false;
  }

  getUnclaimedCount() {
    return this.missions.filter(m => {
      const p = this.getProgress(m);
      return p.isCompleted && !p.isClaimed;
    }).length;
  }

  checkMissions(stats) {
    const badge = typeof document !== 'undefined' ? document.getElementById('missions-badge') : null;
    if (badge) {
      const unclaimed = this.getUnclaimedCount();
      if (unclaimed > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    return this.getUnclaimedCount();
  }
}

const Missions = new MissionManager();

if (typeof window !== 'undefined') {
  window.MissionManager = MissionManager;
  window.Missions = Missions;
}
if (typeof globalThis !== 'undefined') {
  globalThis.MissionManager = MissionManager;
  globalThis.Missions = Missions;
}
if (typeof global !== 'undefined') {
  global.MissionManager = MissionManager;
  global.Missions = Missions;
}
