/**
 * Saurabh's Sprint - Storage Manager
 * Handles persistent game state, high scores, coins, unlocked characters & upgrades via LocalStorage
 */

const Storage = {
  _mem: {},
  _getItem(k) {
    if (this._mem[k] !== undefined) return this._mem[k];
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(k);
        if (val !== null) {
          this._mem[k] = val;
          return val;
        }
      }
    } catch (e) {}
    this._mem[k] = null;
    return null;
  },
  _setItem(k, v) {
    const s = String(v);
    this._mem[k] = s;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(k, s);
      }
    } catch (e) {}
  },
  KEYS: {
    HIGH_SCORE: 'ss_highscore',
    TOTAL_COINS: 'ss_total_coins',
    TOTAL_KEYS: 'ss_total_keys',
    TOTAL_DISTANCE: 'ss_total_distance',
    TOTAL_RUNS: 'ss_total_runs',
    SOUND_ENABLED: 'ss_sound_enabled',
    SELECTED_SKIN: 'ss_selected_skin',
    UNLOCKED_SKINS: 'ss_unlocked_skins',
    UPGRADE_MAGNET: 'ss_upg_magnet',
    UPGRADE_MULTIPLIER: 'ss_upg_multiplier',
    UPGRADE_HOVERBOARD: 'ss_upg_hoverboard',
    UPGRADE_JETPACK: 'ss_upg_jetpack',
    UPGRADE_SNEAKERS: 'ss_upg_sneakers',
    MISSIONS_DATA: 'ss_missions_data',
    STATS_DATA: 'ss_lifetime_stats'
  },

  getHighScore() {
    return parseInt(this._getItem(this.KEYS.HIGH_SCORE) || '0', 10);
  },

  setHighScore(val) {
    if (val > this.getHighScore()) {
      this._setItem(this.KEYS.HIGH_SCORE, Math.floor(val).toString());
      return true; // New record
    }
    return false;
  },

  getTotalCoins() {
    return parseInt(this._getItem(this.KEYS.TOTAL_COINS) || '0', 10);
  },

  addCoins(amount) {
    const current = this.getTotalCoins();
    const updated = current + Math.max(0, Math.floor(amount));
    this._setItem(this.KEYS.TOTAL_COINS, updated.toString());
    this.incrementStat('totalCoinsCollected', amount);
    return updated;
  },

  spendCoins(amount) {
    const current = this.getTotalCoins();
    if (current >= amount) {
      const updated = current - amount;
      this._setItem(this.KEYS.TOTAL_COINS, updated.toString());
      return true;
    }
    return false;
  },

  getTotalKeys() {
    const val = this._getItem(this.KEYS.TOTAL_KEYS);
    if (val === null) {
      this._setItem(this.KEYS.TOTAL_KEYS, '5'); // Starter bonus of 5 keys
      return 5;
    }
    return Math.max(0, parseInt(val, 10) || 0);
  },

  addKeys(amount) {
    const current = this.getTotalKeys();
    const updated = current + Math.max(0, Math.floor(amount));
    this._setItem(this.KEYS.TOTAL_KEYS, updated.toString());
    this.incrementStat('totalKeysCollected', amount);
    return updated;
  },

  spendKeys(amount) {
    const current = this.getTotalKeys();
    if (current >= amount) {
      const updated = current - amount;
      this._setItem(this.KEYS.TOTAL_KEYS, updated.toString());
      return true;
    }
    return false;
  },

  isSoundEnabled() {
    const val = this._getItem(this.KEYS.SOUND_ENABLED);
    return val === null ? true : val === 'true';
  },

  setSoundEnabled(enabled) {
    this._setItem(this.KEYS.SOUND_ENABLED, enabled.toString());
  },

  isBgmEnabled() {
    const val = this._getItem('ss_bgm_enabled');
    return val === null ? true : val === 'true';
  },

  setBgmEnabled(enabled) {
    this._setItem('ss_bgm_enabled', enabled.toString());
  },

  isSfxEnabled() {
    const val = this._getItem('ss_sfx_enabled');
    return val === null ? true : val === 'true';
  },

  setSfxEnabled(enabled) {
    this._setItem('ss_sfx_enabled', enabled.toString());
  },

  getUpgradeLevel(type) {
    const key = this.KEYS['UPGRADE_' + type.toUpperCase()];
    return parseInt(this._getItem(key) || '1', 10);
  },

  setUpgradeLevel(type, level) {
    const key = this.KEYS['UPGRADE_' + type.toUpperCase()];
    this._setItem(key, level.toString());
  },

  // Base duration in seconds + (level * bonus)
  getPowerUpDuration(type) {
    const level = this.getUpgradeLevel(type);
    const baseDurations = {
      magnet: 6,
      multiplier: 8,
      hoverboard: 10,
      jetpack: 6,
      sneakers: 8
    };
    const step = 2.0;
    return (baseDurations[type] || 6) + (level - 1) * step;
  },

  getUpgradeCost(type, currentLevel) {
    const baseCosts = {
      magnet: 100,
      multiplier: 150,
      hoverboard: 200,
      jetpack: 300,
      sneakers: 150
    };
    return (baseCosts[type] || 100) * currentLevel;
  },

  getSelectedSkin() {
    let skin = this._getItem(this.KEYS.SELECTED_SKIN) || 'cyber_dash';
    if (skin === 'default' || skin === 'saurabh' || skin === 'muskaan') skin = 'cyber_dash';
    return skin;
  },

  setSelectedSkin(skinId) {
    if (!skinId || skinId === 'default' || skinId === 'saurabh' || skinId === 'muskaan') {
      skinId = 'cyber_dash';
    }
    this._setItem(this.KEYS.SELECTED_SKIN, skinId);
  },

  getUnlockedSkins() {
    try {
      const raw = this._getItem(this.KEYS.UNLOCKED_SKINS);
      let list = raw ? JSON.parse(raw) : ['cyber_dash'];
      if (!Array.isArray(list)) list = ['cyber_dash'];
      if (!list.includes('cyber_dash')) list.push('cyber_dash');
      return list;
    } catch (e) {
      return ['cyber_dash'];
    }
  },

  unlockSkin(skinId) {
    const list = this.getUnlockedSkins();
    if (!list.includes(skinId)) {
      list.push(skinId);
      this._setItem(this.KEYS.UNLOCKED_SKINS, JSON.stringify(list));
    }
  },

  // --- SKATEBOARDS / HOVERBOARDS SYSTEM (25+ UNIQUE BOARDS) ---
  getSelectedBoard() {
    return this._getItem('ss_selected_board') || 'freestyle';
  },

  setSelectedBoard(boardId) {
    if (!boardId) boardId = 'freestyle';
    this._setItem('ss_selected_board', boardId);
  },

  getUnlockedBoards() {
    try {
      const raw = this._getItem('ss_unlocked_boards');
      let list = raw ? JSON.parse(raw) : ['freestyle'];
      if (!Array.isArray(list)) list = ['freestyle'];
      if (!list.includes('freestyle')) list.push('freestyle');
      return list;
    } catch (e) {
      return ['freestyle'];
    }
  },

  unlockBoard(boardId) {
    const list = this.getUnlockedBoards();
    if (!list.includes(boardId)) {
      list.push(boardId);
      this._setItem('ss_unlocked_boards', JSON.stringify(list));
    }
  },

  getMissionsData() {
    try {
      const raw = this._getItem(this.KEYS.MISSIONS_DATA);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  saveMissionsData(data) {
    try {
      this._setItem(this.KEYS.MISSIONS_DATA, JSON.stringify(data || {}));
    } catch (e) {}
  },

  // Lifetime Statistics
  getStats() {
    try {
      const raw = this._getItem(this.KEYS.STATS_DATA);
      const defaults = {
        totalCoinsCollected: 0,
        totalDistance: 0,
        totalRuns: 0,
        totalJumps: 0,
        totalSlides: 0,
        totalPowerUpsCollected: 0,
        totalHoverboardsUsed: 0
      };
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch (e) {
      return {
        totalCoinsCollected: 0,
        totalDistance: 0,
        totalRuns: 0,
        totalJumps: 0,
        totalSlides: 0,
        totalPowerUpsCollected: 0,
        totalHoverboardsUsed: 0
      };
    }
  },

  incrementStat(key, amount = 1) {
    const stats = this.getStats();
    stats[key] = (stats[key] || 0) + amount;
    this._setItem(this.KEYS.STATS_DATA, JSON.stringify(stats));

    if (typeof Missions !== 'undefined' && typeof Missions.checkMissions === 'function') {
      Missions.checkMissions(stats);
    } else if (typeof window !== 'undefined' && window.Missions && typeof window.Missions.checkMissions === 'function') {
      window.Missions.checkMissions(stats);
    }
  },

  // Word Hunt System
  getWordHuntData() {
    try {
      const raw = this._getItem('ss_word_hunt');
      const defaults = {
        wordIndex: 0,
        word: 'SPRINT',
        collected: []
      };
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch (e) {
      return { wordIndex: 0, word: 'SPRINT', collected: [] };
    }
  },

  saveWordHuntData(data) {
    try {
      this._setItem('ss_word_hunt', JSON.stringify(data || {}));
    } catch (e) {}
  },

  // --- DAILY LOGIN REWARDS SYSTEM (7-Day Streak) ---
  getDailyRewardsData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const raw = this._getItem('ss_daily_rewards');
      let data = raw ? JSON.parse(raw) : { lastClaimDate: null, streak: 1 };

      if (!data.lastClaimDate) {
        return { streak: 1, canClaim: true, claimedToday: false, todayStr: today };
      }

      if (data.lastClaimDate === today) {
        return { streak: data.streak || 1, canClaim: false, claimedToday: true, todayStr: today };
      }

      const lastDate = new Date(data.lastClaimDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));

      let nextStreak = data.streak || 1;
      if (diffDays === 1) {
        nextStreak = (nextStreak >= 7) ? 1 : nextStreak + 1;
      } else {
        nextStreak = 1;
      }

      return { streak: nextStreak, canClaim: true, claimedToday: false, todayStr: today };
    } catch (e) {
      return { streak: 1, canClaim: true, claimedToday: false, todayStr: '' };
    }
  },

  claimDailyReward(dayNumber) {
    const today = new Date().toISOString().split('T')[0];
    const rewards = [
      { day: 1, type: 'coins', amount: 250, label: '250 Coins', icon: '🪙' },
      { day: 2, type: 'coins', amount: 500, label: '500 Coins', icon: '🪙' },
      { day: 3, type: 'keys', amount: 1, label: '1 Key', icon: '🗝️' },
      { day: 4, type: 'coins', amount: 1000, label: '1,000 Coins', icon: '🪙' },
      { day: 5, type: 'mystery', amount: 1, label: '1 Mystery Box', icon: '📦' },
      { day: 6, type: 'keys', amount: 3, label: '3 Keys', icon: '🗝️' },
      { day: 7, type: 'super', coins: 3000, keys: 5, label: '3,000 Coins + 5 Keys', icon: '🎁' }
    ];

    const reward = rewards[dayNumber - 1] || rewards[0];
    if (reward.type === 'coins') {
      this.addCoins(reward.amount);
    } else if (reward.type === 'keys') {
      this.addKeys(reward.amount);
    } else if (reward.type === 'mystery') {
      this.addMysteryBoxes(reward.amount);
    } else if (reward.type === 'super') {
      this.addCoins(reward.coins);
      this.addKeys(reward.keys);
    }

    const data = { lastClaimDate: today, streak: dayNumber };
    this._setItem('ss_daily_rewards', JSON.stringify(data));
    return reward;
  },

  // --- LUCKY SPIN WHEEL SYSTEM ---
  getSpinWheelData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const raw = this._getItem('ss_spin_wheel');
      let data = raw ? JSON.parse(raw) : { lastFreeSpinDate: null };
      const canFreeSpin = (data.lastFreeSpinDate !== today);
      return { canFreeSpin, lastFreeSpinDate: data.lastFreeSpinDate, todayStr: today };
    } catch (e) {
      return { canFreeSpin: true, lastFreeSpinDate: null, todayStr: '' };
    }
  },

  useFreeSpin() {
    const today = new Date().toISOString().split('T')[0];
    this._setItem('ss_spin_wheel', JSON.stringify({ lastFreeSpinDate: today }));
  },

  // --- MYSTERY BOX SYSTEM ---
  getMysteryBoxes() {
    return parseInt(this._getItem('ss_mystery_boxes') || '0', 10);
  },

  addMysteryBoxes(qty = 1) {
    const current = this.getMysteryBoxes();
    const updated = current + Math.max(0, qty);
    this._setItem('ss_mystery_boxes', updated.toString());
    return updated;
  },

  openMysteryBox() {
    const count = this.getMysteryBoxes();
    if (count <= 0) return null;
    this._setItem('ss_mystery_boxes', (count - 1).toString());

    const roll = Math.random();
    let reward;
    if (roll < 0.40) {
      const coins = 300 + Math.floor(Math.random() * 5) * 100;
      this.addCoins(coins);
      reward = { type: 'coins', amount: coins, title: `${coins} Coins`, icon: '🪙' };
    } else if (roll < 0.70) {
      const coins = 800 + Math.floor(Math.random() * 5) * 150;
      this.addCoins(coins);
      reward = { type: 'coins', amount: coins, title: `${coins} Coins`, icon: '🪙' };
    } else if (roll < 0.90) {
      const keys = Math.random() < 0.7 ? 1 : 2;
      this.addKeys(keys);
      reward = { type: 'keys', amount: keys, title: `${keys} Key${keys > 1 ? 's' : ''}`, icon: '🗝️' };
    } else {
      this.addCoins(2500);
      this.addKeys(3);
      reward = { type: 'jackpot', amount: 2500, keys: 3, title: '2,500 Coins + 3 Keys!', icon: '💎' };
    }
    return reward;
  },

  // --- ACHIEVEMENTS TROPHY ROOM SYSTEM ---
  getAchievementsData() {
    try {
      const raw = this._getItem('ss_achievements');
      return raw ? JSON.parse(raw) : { claimed: [] };
    } catch (e) {
      return { claimed: [] };
    }
  },

  claimAchievement(achId, rewardType, rewardAmount) {
    const data = this.getAchievementsData();
    if (!data.claimed) data.claimed = [];
    if (data.claimed.includes(achId)) return false;

    data.claimed.push(achId);
    this._setItem('ss_achievements', JSON.stringify(data));

    if (rewardType === 'coins') {
      this.addCoins(rewardAmount);
    } else if (rewardType === 'keys') {
      this.addKeys(rewardAmount);
    }
    return true;
  }
};

if (typeof window !== 'undefined') {
  window.Storage = Storage;
}
if (typeof global !== 'undefined') {
  global.Storage = Storage;
}
