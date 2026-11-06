/**
 * Saurabh's Sprint - 3D Player Character Rig, 26+ Unique Gaming Characters,
 * Graffiti Spray Intro, Stumble Reaction, and Super Power-Ups.
 */

class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    // Lanes definition
    this.LANE_WIDTH = 2.2;
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right
    this.targetX = 0;

    // Physics parameters
    this.y = 0;
    this.vy = 0;
    this.gravity = -32.0;
    this.baseJumpForce = 12.5;
    this.sneakerJumpForce = 19.5;
    this.jumpForce = this.baseJumpForce;
    this.isGrounded = true;
    this.groundHeight = 0;

    // Slide state
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.75;

    // Stumble state (when grazing obstacles or sudden weave)
    this.isStumbling = false;
    this.stumbleTimer = 0;

    // Power-up states
    this.hasMagnet = false;
    this.magnetTimer = 0;

    this.hasMultiplier = false;
    this.multiplierTimer = 0;

    this.hasHoverboard = false;
    this.hoverboardTimer = 0;

    this.hasJetpack = false;
    this.jetpackTimer = 0;
    this.jetpackTargetY = 5.4;

    this.hasSneakers = false;
    this.sneakersTimer = 0;

    // Animation kinematics
    this.runCycle = 0;
    this.animSpeed = 14;
    this.bankRoll = 0;
    this.isDead = false;

    // Spray Painting Intro State
    this.isSpraying = true;
    this.sprayCycle = 0;

    // Footstep & Jetpack Trail Particles (Pre-allocated for 60 FPS performance)
    this.trailParticles = [];
    this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.sprayRedMat = new THREE.MeshBasicMaterial({ color: 0xff3838, transparent: true, opacity: 0.8 });
    this.sprayYellowMat = new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.8 });
    this.sprayCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.8 });

    this.footWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    this.footGoldMat = new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.7 });
    this.footCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.7 });
    this.footOrangeMat = new THREE.MeshBasicMaterial({ color: 0xffa502, transparent: true, opacity: 0.7 });
    this.jetFlameMat = new THREE.MeshBasicMaterial({ color: 0xff4757, transparent: true, opacity: 0.85 });
    this.jetSmokeMat = new THREE.MeshBasicMaterial({ color: 0xffa502, transparent: true, opacity: 0.6 });
    this.jetCoreMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.95 });
    this.jetCyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    this.sparkYellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 });
    this.shockwaveMat = new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.95 });
    this.particleMats = new Map();

    // 26 Unique Gaming Characters
    this.skins = {
      cyber_dash: {
        id: 'cyber_dash',
        name: 'Cyber Dash',
        title: 'Neon Speedster',
        gender: 'male',
        cost: 0,
        hairStyle: 'cap',
        accessory: 'headphones',
        hoodie: 0x00d2d3,
        pants: 0x1e293b,
        shoes: 0xff4757,
        board: 0x00d2d3,
        hair: 0x1e272e,
        cap: 0x0984e3,
        accent: 0xff3838,
        avatar: 'CD'
      },
      shadow_blade: {
        id: 'shadow_blade',
        name: 'Shadow Blade',
        title: 'Stealth Shinobi',
        gender: 'male',
        cost: 250,
        hairStyle: 'ninja_hood',
        accessory: 'ninja_mask',
        hoodie: 0x1e272e,
        pants: 0x0f172a,
        shoes: 0xff3838,
        board: 0xff3838,
        hair: 0x111111,
        cap: 0x2d3436,
        accent: 0xff3838,
        avatar: 'SB'
      },
      neon_phoenix: {
        id: 'neon_phoenix',
        name: 'Neon Phoenix',
        title: 'Flame Runner',
        gender: 'male',
        cost: 500,
        hairStyle: 'spiky',
        accessory: 'sunglasses',
        hoodie: 0xff5722,
        pants: 0x1a237e,
        shoes: 0xff3d00,
        board: 0xff5722,
        hair: 0xff3d00,
        cap: 0xffc107,
        accent: 0xffc107,
        avatar: 'NP'
      },
      valkyrie: {
        id: 'valkyrie',
        name: 'Valkyrie Gold',
        title: 'Cyber Warrior',
        gender: 'female',
        cost: 750,
        hairStyle: 'high_ponytail',
        accessory: 'cyber_visor',
        hoodie: 0xf59e0b,
        pants: 0x1e1b4b,
        shoes: 0xf59e0b,
        board: 0xf59e0b,
        hair: 0xd97706,
        ribbon: 0xffffff,
        accent: 0xffffff,
        avatar: 'VK'
      },
      void_walker: {
        id: 'void_walker',
        name: 'Void Walker',
        title: 'Phantom Spectre',
        gender: 'male',
        cost: 1000,
        hairStyle: 'cyber_hood',
        accessory: 'cyber_visor',
        hoodie: 0x6366f1,
        pants: 0x0f172a,
        shoes: 0x818cf8,
        board: 0x6366f1,
        hair: 0x312e81,
        cap: 0x4338ca,
        accent: 0xa855f7,
        avatar: 'VW'
      },
      blaze_apex: {
        id: 'blaze_apex',
        name: 'Blaze Apex',
        title: 'Crimson Striker',
        gender: 'male',
        cost: 1500,
        hairStyle: 'cap',
        accessory: 'headphones',
        hoodie: 0xff3838,
        pants: 0x111111,
        shoes: 0xff4757,
        board: 0xff3838,
        hair: 0x1e272e,
        cap: 0x111111,
        accent: 0xff6b81,
        avatar: 'BA'
      },
      turbo_bolt: {
        id: 'turbo_bolt',
        name: 'Turbo Bolt',
        title: 'Thunder Sprinter',
        gender: 'male',
        cost: 2000,
        hairStyle: 'spiky',
        accessory: 'cyber_visor',
        hoodie: 0xfffa65,
        pants: 0x1e272e,
        shoes: 0xfffa65,
        board: 0xfffa65,
        hair: 0xffd32a,
        cap: 0xffd32a,
        accent: 0xffd32a,
        avatar: 'TB'
      },
      luna_spectra: {
        id: 'luna_spectra',
        name: 'Luna Spectra',
        title: 'Moonlight Runner',
        gender: 'female',
        cost: 2500,
        hairStyle: 'twin_buns',
        accessory: 'headphones',
        hoodie: 0x00cec9,
        pants: 0x2d3436,
        shoes: 0x81ecec,
        board: 0x00cec9,
        hair: 0x74b9ff,
        ribbon: 0x55efc4,
        accent: 0x81ecec,
        avatar: 'LS'
      },
      titan_smash: {
        id: 'titan_smash',
        name: 'Titan Smash',
        title: 'Heavy Juggernaut',
        gender: 'male',
        cost: 3000,
        hairStyle: 'helmet',
        accessory: 'shoulder_armor',
        hoodie: 0x636e72,
        pants: 0x2d3436,
        shoes: 0xb2bec3,
        board: 0x636e72,
        hair: 0x2d3436,
        cap: 0xb2bec3,
        accent: 0xdfe6e9,
        avatar: 'TS'
      },
      spectre_x: {
        id: 'spectre_x',
        name: 'Spectre X',
        title: 'Ghost Infiltrator',
        gender: 'male',
        cost: 3800,
        hairStyle: 'cyber_hood',
        accessory: 'cyber_visor',
        hoodie: 0x00d2d3,
        pants: 0x111827,
        shoes: 0x01a3a4,
        board: 0x00d2d3,
        hair: 0x222f3e,
        cap: 0x10ac84,
        accent: 0x1dd1a1,
        avatar: 'SX'
      },
      frost_bite: {
        id: 'frost_bite',
        name: 'Frost Bite',
        title: 'Glacial Ranger',
        gender: 'female',
        cost: 4500,
        hairStyle: 'side_braid',
        accessory: 'cyber_visor',
        hoodie: 0x74b9ff,
        pants: 0x0984e3,
        shoes: 0xdff9fb,
        board: 0x74b9ff,
        hair: 0xc7ecee,
        ribbon: 0x70a1ff,
        accent: 0x70a1ff,
        avatar: 'FB'
      },
      pulse_raider: {
        id: 'pulse_raider',
        name: 'Pulse Raider',
        title: 'Synthwave Ace',
        gender: 'male',
        cost: 5500,
        hairStyle: 'spiky',
        accessory: 'headphones',
        hoodie: 0x8e44ad,
        pants: 0x2c2c54,
        shoes: 0xbe2edd,
        board: 0x8e44ad,
        hair: 0x9b59b6,
        cap: 0x8e44ad,
        accent: 0xe056fd,
        avatar: 'PR'
      },
      viper_strike: {
        id: 'viper_strike',
        name: 'Viper Strike',
        title: 'Venom Assassin',
        gender: 'male',
        cost: 6500,
        hairStyle: 'ninja_hood',
        accessory: 'ninja_mask',
        hoodie: 0x10ac84,
        pants: 0x111827,
        shoes: 0x1dd1a1,
        board: 0x10ac84,
        hair: 0x1e272e,
        cap: 0x10ac84,
        accent: 0x2ed573,
        avatar: 'VS'
      },
      axel_prime: {
        id: 'axel_prime',
        name: 'Axel Prime',
        title: 'Cyborg Commando',
        gender: 'male',
        cost: 7800,
        hairStyle: 'helmet',
        accessory: 'cyber_visor',
        hoodie: 0x34495e,
        pants: 0x2c3e50,
        shoes: 0xe74c3c,
        board: 0xe74c3c,
        hair: 0x7f8c8d,
        cap: 0x95a5a6,
        accent: 0xe74c3c,
        avatar: 'AP'
      },
      nova_star: {
        id: 'nova_star',
        name: 'Nova Star',
        title: 'Cosmic Diva',
        gender: 'female',
        cost: 9000,
        hairStyle: 'wavy_long',
        accessory: 'headphones',
        hoodie: 0xff4081,
        pants: 0x3f51b5,
        shoes: 0xff79b0,
        board: 0xff4081,
        hair: 0xffb8b8,
        ribbon: 0xfffa65,
        accent: 0xff4081,
        avatar: 'NS'
      },
      zenith_zero: {
        id: 'zenith_zero',
        name: 'Zenith Zero',
        title: 'Abyssal Overlord',
        gender: 'male',
        cost: 10500,
        hairStyle: 'cyber_hood',
        accessory: 'ninja_mask',
        hoodie: 0x182C61,
        pants: 0x0c2461,
        shoes: 0x4b7bec,
        board: 0x182C61,
        hair: 0x0c2461,
        cap: 0x182C61,
        accent: 0x3867d6,
        avatar: 'ZZ'
      },
      vector_neo: {
        id: 'vector_neo',
        name: 'Vector Neo',
        title: 'Matrix Hacker',
        gender: 'male',
        cost: 12000,
        hairStyle: 'spiky',
        accessory: 'cyber_visor',
        hoodie: 0x2ed573,
        pants: 0x111111,
        shoes: 0x7bed9f,
        board: 0x2ed573,
        hair: 0x2ed573,
        cap: 0x111111,
        accent: 0x2ed573,
        avatar: 'VN'
      },
      chrono_drift: {
        id: 'chrono_drift',
        name: 'Chrono Drift',
        title: 'Time Traveler',
        gender: 'male',
        cost: 13500,
        hairStyle: 'cap',
        accessory: 'sunglasses',
        hoodie: 0xe17055,
        pants: 0x2d3436,
        shoes: 0xfab1a0,
        board: 0xe17055,
        hair: 0x636e72,
        cap: 0xe17055,
        accent: 0xf39c12,
        avatar: 'CR'
      },
      eclipse_hunter: {
        id: 'eclipse_hunter',
        name: 'Eclipse Hunter',
        title: 'Blood Moon Sniper',
        gender: 'female',
        cost: 15000,
        hairStyle: 'high_ponytail',
        accessory: 'cyber_visor',
        hoodie: 0xd63031,
        pants: 0x1e272e,
        shoes: 0xff7675,
        board: 0xd63031,
        hair: 0x2d3436,
        ribbon: 0xff3838,
        accent: 0xff3838,
        avatar: 'EH'
      },
      vortex_master: {
        id: 'vortex_master',
        name: 'Vortex Master',
        title: 'Hydro Sorcerer',
        gender: 'male',
        cost: 16500,
        hairStyle: 'spiky',
        accessory: 'headphones',
        hoodie: 0x0984e3,
        pants: 0x1e272e,
        shoes: 0x74b9ff,
        board: 0x0984e3,
        hair: 0x00cec9,
        cap: 0x0984e3,
        accent: 0x00cec9,
        avatar: 'VM'
      },
      sakura_blade: {
        id: 'sakura_blade',
        name: 'Sakura Blade',
        title: 'Cherry Blossom Samurai',
        gender: 'female',
        cost: 18000,
        hairStyle: 'twin_buns',
        accessory: 'ninja_mask',
        hoodie: 0xfd79a8,
        pants: 0x2d3436,
        shoes: 0xff7675,
        board: 0xfd79a8,
        hair: 0xe84393,
        ribbon: 0xffffff,
        accent: 0xfd79a8,
        avatar: 'SK'
      },
      ghost_protocol: {
        id: 'ghost_protocol',
        name: 'Ghost Protocol',
        title: 'Chrome Spectre',
        gender: 'male',
        cost: 20000,
        hairStyle: 'helmet',
        accessory: 'cyber_visor',
        hoodie: 0xdfe6e9,
        pants: 0xb2bec3,
        shoes: 0xffffff,
        board: 0xdfe6e9,
        hair: 0xffffff,
        cap: 0xdfe6e9,
        accent: 0x74b9ff,
        avatar: 'GP'
      },
      omega_strike: {
        id: 'omega_strike',
        name: 'Omega Strike',
        title: 'Apex Mecha Soldier',
        gender: 'male',
        cost: 22000,
        hairStyle: 'helmet',
        accessory: 'shoulder_armor',
        hoodie: 0xff3838,
        pants: 0x111111,
        shoes: 0xfffa65,
        board: 0xff3838,
        hair: 0x111111,
        cap: 0xff3838,
        accent: 0xfffa65,
        avatar: 'OS'
      },
      hyperion_king: {
        id: 'hyperion_king',
        name: 'Hyperion King',
        title: 'Golden Legend',
        gender: 'male',
        cost: 25000,
        hairStyle: 'crown',
        accessory: 'sunglasses',
        hoodie: 0xf1c40f,
        pants: 0xf39c12,
        shoes: 0xfffa65,
        board: 0xf1c40f,
        hair: 0xf1c40f,
        cap: 0xf39c12,
        accent: 0xfffa65,
        avatar: 'HK'
      },
      cyberpunk_saurabh: {
        id: 'cyberpunk_saurabh',
        name: 'Cyberpunk Saurabh',
        title: 'Sprint Supreme Legend',
        gender: 'male',
        cost: 30000,
        hairStyle: 'cap',
        accessory: 'cyber_visor',
        hoodie: 0xff3838,
        pants: 0x00d2d3,
        shoes: 0xfffa65,
        board: 0xff3838,
        hair: 0x1e272e,
        cap: 0xff3838,
        accent: 0x00d2d3,
        avatar: 'SP'
      },
      matrix_nyx: {
        id: 'matrix_nyx',
        name: 'Matrix Nyx',
        title: 'Cyber Assassin Queen',
        gender: 'female',
        cost: 35000,
        hairStyle: 'side_braid',
        accessory: 'cyber_visor',
        hoodie: 0x2ed573,
        pants: 0x1e272e,
        shoes: 0x7bed9f,
        board: 0x2ed573,
        hair: 0x2ed573,
        ribbon: 0x00d2d3,
        accent: 0x2ed573,
        avatar: 'MN'
      }
    };

    this.skins.saurabh = this.skins.cyber_dash;
    this.skins.default = this.skins.cyber_dash;
    this.currentSkin = 'cyber_dash';

    // 26 Unique Skateboards / Hoverboards System
    this.boards = {
      freestyle: {
        id: 'freestyle',
        name: 'Freestyle Star',
        cost: 0,
        avatar: 'FS',
        deck: 0xff3838,
        neon: 0x00d2d3,
        thruster: 0x00ffff,
        particle: 0x00d2d3,
        fin: 'none',
        desc: 'Classic street board with star grip tape and neon edge'
      },
      star_blaster: {
        id: 'star_blaster',
        name: 'Star Blaster',
        cost: 250,
        avatar: 'SB',
        deck: 0xffc107,
        neon: 0x00d2d3,
        thruster: 0x38bdf8,
        particle: 0xfffa65,
        fin: 'winglets',
        desc: 'High-voltage lightning board with blue LED rails'
      },
      cyber_deck: {
        id: 'cyber_deck',
        name: 'Cyber Deck 2077',
        cost: 450,
        avatar: 'CD',
        deck: 0x0f172a,
        neon: 0x00f5d4,
        thruster: 0x00f5d4,
        particle: 0x00f5d4,
        fin: 'laser_fins',
        desc: 'Cyberpunk hologram deck with neon matrix edge'
      },
      flame_rider: {
        id: 'flame_rider',
        name: 'Flame Rider',
        cost: 650,
        avatar: 'FR',
        deck: 0xff3d00,
        neon: 0xffa502,
        thruster: 0xff4757,
        particle: 0xff3d00,
        fin: 'exhaust_pipes',
        desc: 'Molten magma deck with fiery rear flame boosters'
      },
      gold_dragon: {
        id: 'gold_dragon',
        name: 'Golden Dragon',
        cost: 900,
        avatar: 'GD',
        deck: 0xf59e0b,
        neon: 0xffd700,
        thruster: 0xfffa65,
        particle: 0xffd700,
        fin: 'dragon_crest',
        desc: '24K solid gold plated deck with imperial dragon aura'
      },
      shadow_phantom: {
        id: 'shadow_phantom',
        name: 'Shadow Phantom',
        cost: 1100,
        avatar: 'SP',
        deck: 0x111827,
        neon: 0xff0055,
        thruster: 0xef4444,
        particle: 0xff0055,
        fin: 'stealth_blades',
        desc: 'Stealth matte carbon deck with crimson laser underglow'
      },
      neon_synth: {
        id: 'neon_synth',
        name: 'Neon Synthwave',
        cost: 1300,
        avatar: 'NS',
        deck: 0x7c3aed,
        neon: 0xff007f,
        thruster: 0x00f5d4,
        particle: 0xff007f,
        fin: 'laser_fins',
        desc: '80s retro sunset violet with hot pink laser fins'
      },
      skull_crusher: {
        id: 'skull_crusher',
        name: 'Skull Crusher',
        cost: 1500,
        avatar: 'SK',
        deck: 0x1e293b,
        neon: 0x2ed573,
        thruster: 0x7bed9f,
        particle: 0x2ed573,
        fin: 'spike_tail',
        desc: 'Toxic graffiti board with spiked tail bumper'
      },
      galactic_void: {
        id: 'galactic_void',
        name: 'Galactic Void',
        cost: 1750,
        avatar: 'GV',
        deck: 0x312e81,
        neon: 0xa855f7,
        thruster: 0xc084fc,
        particle: 0xa855f7,
        fin: 'orbit_rings',
        desc: 'Cosmic deep space nebula with stardust glitter'
      },
      speed_bullet: {
        id: 'speed_bullet',
        name: 'Bullet Stream',
        cost: 2000,
        avatar: 'BS',
        deck: 0xe2e8f0,
        neon: 0x00d2d3,
        thruster: 0x38bdf8,
        particle: 0xe2e8f0,
        fin: 'aero_nose',
        desc: 'Aerodynamic silver bullet with front winglets'
      },
      lava_magma: {
        id: 'lava_magma',
        name: 'Lava Eruption',
        cost: 2250,
        avatar: 'LM',
        deck: 0x7f1d1d,
        neon: 0xf97316,
        thruster: 0xff4500,
        particle: 0xf97316,
        fin: 'exhaust_pipes',
        desc: 'Volcanic obsidian deck with boiling lava veins'
      },
      frozen_glacier: {
        id: 'frozen_glacier',
        name: 'Frozen Glacier',
        cost: 2500,
        avatar: 'FG',
        deck: 0x0284c7,
        neon: 0x38bdf8,
        thruster: 0xe0f2fe,
        particle: 0x38bdf8,
        fin: 'ice_crystals',
        desc: 'Sub-zero diamond ice deck with frosty mist trail'
      },
      matrix_code: {
        id: 'matrix_code',
        name: 'Matrix Runner',
        cost: 2800,
        avatar: 'MR',
        deck: 0x022c22,
        neon: 0x22c55e,
        thruster: 0x4ade80,
        particle: 0x22c55e,
        fin: 'laser_fins',
        desc: 'Digital cascading code with cyber circuit rails'
      },
      rainbow_prism: {
        id: 'rainbow_prism',
        name: 'Rainbow Prism',
        cost: 3100,
        avatar: 'RP',
        deck: 0xec4899,
        neon: 0xfacc15,
        thruster: 0x06b6d4,
        particle: 0xf43f5e,
        fin: 'winglets',
        desc: 'Prismatic multi-chrome deck with rainbow refraction'
      },
      titanium_tank: {
        id: 'titanium_tank',
        name: 'Titanium Mech',
        cost: 3400,
        avatar: 'TM',
        deck: 0x475569,
        neon: 0xf59e0b,
        thruster: 0x94a3b8,
        particle: 0xf59e0b,
        fin: 'headlights',
        desc: 'Heavy armored titanium deck with dual front headlights'
      },
      crimson_vampire: {
        id: 'crimson_vampire',
        name: 'Crimson Bat',
        cost: 3700,
        avatar: 'CB',
        deck: 0x881337,
        neon: 0xf43f5e,
        thruster: 0xe11d48,
        particle: 0xf43f5e,
        fin: 'bat_wings',
        desc: 'Gothic vampire deck with aerodynamic batwing fins'
      },
      hyper_voltage: {
        id: 'hyper_voltage',
        name: 'Hyper Voltage',
        cost: 4000,
        avatar: 'HV',
        deck: 0xeab308,
        neon: 0x3b82f6,
        thruster: 0x60a5fa,
        particle: 0xeab308,
        fin: 'spark_rods',
        desc: 'High-voltage surge board with electric plasma arcs'
      },
      aqua_shark: {
        id: 'aqua_shark',
        name: 'Megalodon Shark',
        cost: 4300,
        avatar: 'MS',
        deck: 0x0e7490,
        neon: 0x06b6d4,
        thruster: 0x67e8f9,
        particle: 0x06b6d4,
        fin: 'dorsal_fin',
        desc: 'Oceanic predator deck with dorsal stabilizing fin'
      },
      ninja_shuriken: {
        id: 'ninja_shuriken',
        name: 'Ninja Shuriken',
        cost: 4600,
        avatar: 'NS',
        deck: 0x09090b,
        neon: 0xdc2626,
        thruster: 0x71717a,
        particle: 0xdc2626,
        fin: 'shuriken',
        desc: 'Black obsidian shinobi deck with throwing star crests'
      },
      solar_flare: {
        id: 'solar_flare',
        name: 'Solar Flare',
        cost: 5000,
        avatar: 'SF',
        deck: 0xf97316,
        neon: 0xfacc15,
        thruster: 0xffd000,
        particle: 0xfacc15,
        fin: 'exhaust_pipes',
        desc: 'Blazing solar photosphere with coronal plasma jets'
      },
      toxic_hazard: {
        id: 'toxic_hazard',
        name: 'Bio Hazard',
        cost: 5500,
        avatar: 'BH',
        deck: 0xca8a04,
        neon: 0x16a34a,
        thruster: 0x22c55e,
        particle: 0x84cc16,
        fin: 'warning_stripes',
        desc: 'Hazard chevron stripes with bio-luminescent aura'
      },
      steampunk_cog: {
        id: 'steampunk_cog',
        name: 'Steampunk Brass',
        cost: 6000,
        avatar: 'SB',
        deck: 0x78350f,
        neon: 0xd97706,
        thruster: 0xb45309,
        particle: 0xd97706,
        fin: 'cogs',
        desc: 'Antique polished brass with spinning clockwork gears'
      },
      quantum_vortex: {
        id: 'quantum_vortex',
        name: 'Quantum Singularity',
        cost: 6500,
        avatar: 'QS',
        deck: 0x581c87,
        neon: 0xc084fc,
        thruster: 0xd8b4fe,
        particle: 0xc084fc,
        fin: 'orbit_rings',
        desc: 'Dark matter vortex with gravity-defying flux field'
      },
      champions_trophy: {
        id: 'champions_trophy',
        name: 'Master Champion',
        cost: 7500,
        avatar: 'MC',
        deck: 0x0f172a,
        neon: 0xf59e0b,
        thruster: 0xffffff,
        particle: 0xf59e0b,
        fin: 'crown',
        desc: 'Platinum trophy deck encrusted with victory diamonds'
      },
      saurabh_pro: {
        id: 'saurabh_pro',
        name: "Saurabh's Signature Pro",
        cost: 10000,
        avatar: 'PRO',
        deck: 0x991b1b,
        neon: 0xffd700,
        thruster: 0x00f5d4,
        particle: 0xffd700,
        fin: 'crown',
        desc: 'Royal gold & ruby red signature board with crown emblem'
      },
      hyper_cosmic: {
        id: 'hyper_cosmic',
        name: 'Hyper Cosmic Infinity',
        cost: 12500,
        avatar: 'HC',
        deck: 0x1e1b4b,
        neon: 0x38bdf8,
        thruster: 0xf43f5e,
        particle: 0x38bdf8,
        fin: 'orbit_rings',
        desc: 'Ultimate celestial infinite hoverboard with galaxy trail'
      }
    };

    this.currentBoard = typeof Storage !== 'undefined' ? Storage.getSelectedBoard() : 'freestyle';

    this.buildCharacterMesh();
    this.scene.add(this.mesh);
  }

  // Pure standalone 3D Character Rig Model Builder (Used both in-game and for 3D UI Showcase)
  createCharacterModelGroup(skinId = 'cyber_dash', forGamePlayer = false) {
    const skinTheme = this.skins[skinId] || this.skins.cyber_dash;
    const isFemale = skinTheme.gender === 'female';

    const root = new THREE.Group();

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    const outfitMat = new THREE.MeshLambertMaterial({ color: skinTheme.hoodie });
    const saddleMat = new THREE.MeshLambertMaterial({ color: skinTheme.accent || skinTheme.cap || 0x0984e3 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: skinTheme.pants });
    const shoeMat = new THREE.MeshLambertMaterial({ color: skinTheme.shoes });
    const hairMat = new THREE.MeshLambertMaterial({ color: skinTheme.hair });
    const ribbonMat = new THREE.MeshLambertMaterial({ color: skinTheme.ribbon || 0xffffff });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const accentMat = new THREE.MeshBasicMaterial({ color: skinTheme.accent || 0x00d2d3 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.85, roughness: 0.2 });
    const watchMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    // Root Body Group
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // 1. Torso & Multi-Tone Varsity Hoodie (Anatomical Humanoid Curvature with Rich Color Blocks)
    const torsoH = isFemale ? 0.68 : 0.74;
    const torsoRadiusTop = isFemale ? 0.28 : 0.34;
    const torsoRadiusBottom = isFemale ? 0.23 : 0.28;

    // Curved Stylized Main Torso
    const torsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoH, 16);
    const torso = new THREE.Mesh(torsoGeo, outfitMat);
    torso.scale.set(1.0, 1.0, 0.75); // Flattens slightly front-to-back for realistic chest
    torso.position.y = isFemale ? 0.92 : 0.96;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Raglan Upper-Chest & Shoulder Saddle Yoke (Contrasting Color Block)
    const yokeGeo = new THREE.CylinderGeometry(torsoRadiusTop * 1.01, torsoRadiusTop * 0.96, torsoH * 0.34, 16);
    const yoke = new THREE.Mesh(yokeGeo, saddleMat);
    yoke.position.y = torsoH * 0.32;
    torso.add(yoke);

    // Dynamic Golden Varsity / Sprint Star Chest Emblem
    const crestGeo = new THREE.CircleGeometry(0.065, 6);
    const crest = new THREE.Mesh(crestGeo, goldMat);
    crest.position.set(-0.11, 0.14, 0.24);
    crest.rotation.y = -0.15;
    torso.add(crest);

    // Dual Flank Contrast Racing Panels on Torso Ribs
    for (let s of [-1, 1]) {
      const flankGeo = new THREE.BoxGeometry(0.025, torsoH * 0.72, 0.36);
      const flank = new THREE.Mesh(flankGeo, saddleMat);
      flank.position.set(s * (torsoRadiusTop * 0.95), 0, 0);
      torso.add(flank);
    }

    // Front Zipper & Curved Hoodie Accent Stripe
    const stripeGeo = new THREE.CylinderGeometry(torsoRadiusTop * 0.22, torsoRadiusBottom * 0.22, torsoH * 0.95, 8);
    const stripe = new THREE.Mesh(stripeGeo, trimMat);
    stripe.scale.set(1.0, 1.0, 0.85);
    stripe.position.set(0, 0, 0.04);
    torso.add(stripe);

    // Front Kangaroo Pouch Pocket with Contrast Top Trim
    const pouchGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 0.95, torsoRadiusBottom * 0.95, torsoH * 0.32, 12, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
    const pouch = new THREE.Mesh(pouchGeo, outfitMat);
    pouch.position.set(0, -0.14, 0.05);
    torso.add(pouch);

    const pouchTrimGeo = new THREE.BoxGeometry(0.36, 0.025, 0.06);
    const pouchTrim = new THREE.Mesh(pouchTrimGeo, saddleMat);
    pouchTrim.position.set(0, 0.02, 0.24);
    torso.add(pouchTrim);

    // Contrast Ribbed Elastic Waistband Hem with White Racing Trim at Bottom
    const waistGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 1.02, torsoRadiusBottom * 1.02, 0.08, 16);
    const waist = new THREE.Mesh(waistGeo, saddleMat);
    waist.position.y = -torsoH * 0.46;
    torso.add(waist);

    const waistTrim = new THREE.Mesh(new THREE.TorusGeometry(torsoRadiusBottom * 1.03, 0.01, 6, 16), trimMat);
    waistTrim.rotation.x = Math.PI / 2;
    waistTrim.position.y = -torsoH * 0.46;
    torso.add(waistTrim);

    // Realistic Hoodie Drawstrings with Metallic Gold Aglets
    for (let s of [-1, 1]) {
      const stringGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6);
      const stringMesh = new THREE.Mesh(stringGeo, trimMat);
      stringMesh.position.set(s * 0.08, 0.12, 0.24);
      stringMesh.rotation.z = s * -0.12;
      torso.add(stringMesh);

      const agletGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.05, 6);
      const agletMesh = new THREE.Mesh(agletGeo, goldMat);
      agletMesh.position.set(s * 0.09, 0.0, 0.24);
      torso.add(agletMesh);
    }

    // Signature Subway Surfers Street Backpack on Back
    const backpackGeo = new THREE.CylinderGeometry(0.20, 0.18, torsoH * 0.62, 12);
    const backpackMat = new THREE.MeshLambertMaterial({ color: skinTheme.cap || skinTheme.shoes || 0x2d3436 });
    const backpack = new THREE.Mesh(backpackGeo, backpackMat);
    backpack.scale.set(0.9, 1.0, 0.7);
    backpack.position.set(0, 0.04, -0.22);
    torso.add(backpack);

    const bpTopGeo = new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bpTop = new THREE.Mesh(bpTopGeo, backpackMat);
    bpTop.position.set(0, torsoH * 0.31, -0.22);
    bpTop.scale.set(0.9, 0.8, 0.7);
    torso.add(bpTop);

    // Contrast Front Zipper Pouch on Backpack
    const bpPouchGeo = new THREE.BoxGeometry(0.24, 0.18, 0.08);
    const bpPouch = new THREE.Mesh(bpPouchGeo, saddleMat);
    bpPouch.position.set(0, -0.04, -0.32);
    torso.add(bpPouch);

    // Glowing Reflective Safety Strip
    const bpReflector = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.09), accentMat);
    bpReflector.position.set(0, 0.06, -0.32);
    torso.add(bpReflector);

    // Side Spray Can Canisters in Backpack Pockets
    for (let s of [-1, 1]) {
      const pocketCan = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8), new THREE.MeshStandardMaterial({ color: s > 0 ? 0x00d2d3 : 0xff3838, metalness: 0.8 }));
      pocketCan.position.set(s * 0.22, -0.04, -0.22);
      torso.add(pocketCan);
    }

    if (skinTheme.accessory === 'shoulder_armor') {
      const padGeo = new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const padL = new THREE.Mesh(padGeo, accentMat);
      padL.rotation.z = Math.PI / 4;
      padL.position.set(-torsoRadiusTop - 0.08, 0.28, 0);
      const padR = padL.clone();
      padR.rotation.z = -Math.PI / 4;
      padR.position.x = torsoRadiusTop + 0.08;
      torso.add(padL);
      torso.add(padR);
    }

    // 2. Head Group & Expressive Facial Features (Smooth 3D Sculpted Head)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, isFemale ? 1.50 : 1.56, 0);

    // Smooth Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 12), skinMat);
    neck.position.y = -0.2;
    headGroup.add(neck);

    // Smooth Rounded Head
    const headRadius = isFemale ? 0.23 : 0.25;
    const headGeo = new THREE.SphereGeometry(headRadius, 18, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(0.96, 1.05, 0.98);
    head.castShadow = true;
    headGroup.add(head);

    // 3D Eyes with Sclera, Pupils, and Catchlights
    const eyeWhiteGeo = new THREE.SphereGeometry(0.048, 10, 8);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilGeo = new THREE.SphereGeometry(0.028, 8, 6);
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: isFemale ? 0x0984e3 : 0x1e272e });
    const eyeGleamGeo = new THREE.SphereGeometry(0.012, 6, 6);
    const eyeGleamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let s of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.scale.set(1.0, 1.2, 0.4);
      eyeWhite.position.set(s * 0.10, 0.04, -headRadius * 0.88);
      
      const eyePupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      eyePupil.scale.set(1.0, 1.1, 0.4);
      eyePupil.position.set(s * 0.10, 0.04, -headRadius * 0.94);

      const eyeGleam = new THREE.Mesh(eyeGleamGeo, eyeGleamMat);
      eyeGleam.position.set(s * 0.10 + 0.01, 0.05, -headRadius * 0.96);
      
      headGroup.add(eyeWhite);
      headGroup.add(eyePupil);
      headGroup.add(eyeGleam);
    }

    // Smooth Curved Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), skinMat);
    nose.scale.set(0.8, 1.2, 1.0);
    nose.position.set(0, -0.03, -headRadius * 0.96);
    headGroup.add(nose);

    // Curved Smile
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12, Math.PI * 0.7), mouthMat);
    mouth.rotation.x = Math.PI * 0.85;
    mouth.position.set(0, -0.11, -headRadius * 0.90);
    headGroup.add(mouth);

    // Realistic Rounded Ears
    for (let s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skinMat);
      ear.scale.set(0.4, 0.9, 0.7);
      ear.position.set(s * (headRadius * 0.98), 0.02, 0);
      headGroup.add(ear);
    }

    if (isFemale) {
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xff7675 });
      for (let s of [-1, 1]) {
        const blush = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), blushMat);
        blush.scale.set(1.2, 0.6, 0.2);
        blush.position.set(s * 0.13, -0.05, -headRadius * 0.84);
        headGroup.add(blush);
      }
    }

    // HAIRSTYLES
    if (skinTheme.hairStyle === 'helmet') {
      const helmGeo = new THREE.SphereGeometry(headRadius * 1.15, 16, 16);
      const helm = new THREE.Mesh(helmGeo, outfitMat);
      headGroup.add(helm);

      const visorGeo = new THREE.CylinderGeometry(headRadius * 1.16, headRadius * 1.16, 0.15, 14, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
      const visor = new THREE.Mesh(visorGeo, accentMat);
      visor.position.set(0, 0.02, 0);
      headGroup.add(visor);

    } else if (skinTheme.hairStyle === 'crown') {
      const crownGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.18, 8);
      const crown = new THREE.Mesh(crownGeo, goldMat);
      crown.position.y = 0.30;
      headGroup.add(crown);

      const hairBase = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.04, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      hairBase.position.y = 0.02;
      headGroup.add(hairBase);

    } else if (skinTheme.hairStyle === 'ninja_hood' || skinTheme.hairStyle === 'cyber_hood') {
      const hoodGeo = new THREE.SphereGeometry(headRadius * 1.14, 16, 16);
      const hood = new THREE.Mesh(hoodGeo, outfitMat);
      headGroup.add(hood);

    } else if (skinTheme.hairStyle === 'spiky') {
      const hairBase = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.05, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      hairBase.position.y = 0.02;
      headGroup.add(hairBase);

      for (let s = -2; s <= 2; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), hairMat);
        spike.position.set(s * 0.09, 0.32, -s * 0.04);
        spike.rotation.z = -s * 0.18;
        headGroup.add(spike);
      }

    } else if (isFemale) {
      const hairDome = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.08, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), hairMat);
      hairDome.position.y = 0.02;
      headGroup.add(hairDome);

      if (skinTheme.hairStyle === 'high_ponytail') {
        const ponyBand = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 8, 12), ribbonMat);
        ponyBand.rotation.x = Math.PI / 2;
        ponyBand.position.set(0, 0.22, 0.24);
        headGroup.add(ponyBand);

        const ponyGeo = new THREE.CylinderGeometry(0.06, 0.11, 0.65, 10);
        const pony = new THREE.Mesh(ponyGeo, hairMat);
        pony.rotation.x = -0.35;
        pony.position.set(0, -0.06, 0.34);
        headGroup.add(pony);

      } else if (skinTheme.hairStyle === 'twin_buns') {
        const bunGeo = new THREE.SphereGeometry(0.13, 10, 10);
        const bunL = new THREE.Mesh(bunGeo, hairMat);
        bunL.position.set(-0.24, 0.28, 0.05);
        const bunR = bunL.clone();
        bunR.position.x = 0.24;
        headGroup.add(bunL);
        headGroup.add(bunR);

      } else if (skinTheme.hairStyle === 'side_braid') {
        const braidGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.65, 8);
        const braid = new THREE.Mesh(braidGeo, hairMat);
        braid.rotation.z = 0.22;
        braid.position.set(-0.22, -0.15, 0.1);
        headGroup.add(braid);
      } else {
        const lockGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.58, 8);
        const lockL = new THREE.Mesh(lockGeo, hairMat);
        lockL.position.set(-0.22, -0.10, -0.02);
        const lockR = lockL.clone();
        lockR.position.x = 0.22;
        headGroup.add(lockL);
        headGroup.add(lockR);
      }
    } else {
      // 2-Tone Baseball Cap
      const capDome = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), saddleMat);
      capDome.position.y = 0.03;
      headGroup.add(capDome);

      const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), goldMat);
      capButton.position.y = headRadius * 1.09;
      headGroup.add(capButton);

      // Curved Baseball Visor
      const visorGeo = new THREE.CylinderGeometry(headRadius * 1.15, headRadius * 1.15, 0.035, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
      const visor = new THREE.Mesh(visorGeo, new THREE.MeshLambertMaterial({ color: skinTheme.cap || skinTheme.hoodie }));
      visor.rotation.x = -0.18;
      visor.position.set(0, 0.12, -0.18);
      headGroup.add(visor);
    }

    // ACCESSORIES
    if (skinTheme.accessory === 'cyber_visor') {
      const visorGeo = new THREE.CylinderGeometry(headRadius * 1.06, headRadius * 1.06, 0.10, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
      const visor = new THREE.Mesh(visorGeo, accentMat);
      visor.position.set(0, 0.03, 0);
      headGroup.add(visor);
    } else if (skinTheme.accessory === 'sunglasses') {
      const shadesGeo = new THREE.TorusGeometry(0.18, 0.025, 6, 12, Math.PI);
      const shades = new THREE.Mesh(shadesGeo, darkMat);
      shades.rotation.z = Math.PI;
      shades.position.set(0, 0.04, -headRadius * 0.90);
      headGroup.add(shades);
    } else if (skinTheme.accessory === 'ninja_mask') {
      const maskGeo = new THREE.CylinderGeometry(headRadius * 1.02, headRadius * 0.98, 0.18, 14, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
      const mask = new THREE.Mesh(maskGeo, darkMat);
      mask.position.set(0, -0.09, 0);
      headGroup.add(mask);
    } else if (skinTheme.accessory === 'headphones') {
      const hpBandGeo = new THREE.TorusGeometry(headRadius * 1.05, 0.025, 8, 16, Math.PI);
      const hpBand = new THREE.Mesh(hpBandGeo, darkMat);
      hpBand.position.y = 0.06;
      headGroup.add(hpBand);

      const earGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 10);
      const earL = new THREE.Mesh(earGeo, accentMat);
      earL.rotation.z = Math.PI / 2;
      earL.position.set(-headRadius * 1.05, 0.04, 0);
      const earR = earL.clone();
      earR.position.x = headRadius * 1.05;
      headGroup.add(earL);
      headGroup.add(earR);
    }

    bodyGroup.add(headGroup);

    // 3. Limbs - Multi-Tone Arms
    const armRadius = isFemale ? 0.08 : 0.095;
    const armH = isFemale ? 0.58 : 0.64;
    const armGeo = new THREE.CylinderGeometry(armRadius, armRadius * 0.85, armH, 12);
    const shoulderGeo = new THREE.SphereGeometry(armRadius * 1.15, 10, 10);
    const handGeo = new THREE.SphereGeometry(armRadius * 0.95, 10, 10);

    const addVarsityArmDetails = (armGroup, isLeft) => {
      for (let i of [0.08, 0.14]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(armRadius * 0.96, 0.012, 6, 12), trimMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -i;
        armGroup.add(ring);
      }

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.92, armRadius * 0.92, 0.05, 10), saddleMat);
      cuff.position.y = -armH + 0.04;
      armGroup.add(cuff);

      if (isLeft) {
        const watch = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.98, armRadius * 0.98, 0.04, 10), watchMat);
        watch.position.y = -armH + 0.05;
        armGroup.add(watch);
      }
    };

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(isFemale ? -0.34 : -0.40, isFemale ? 1.18 : 1.25, 0);
    
    const shoulderL = new THREE.Mesh(shoulderGeo, saddleMat);
    leftArmGroup.add(shoulderL);
    
    const leftArm = new THREE.Mesh(armGeo, outfitMat);
    leftArm.position.y = -armH / 2;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    addVarsityArmDetails(leftArm, true);
    
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(0, -armH - 0.02, 0);
    leftArmGroup.add(handL);
    bodyGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(isFemale ? 0.34 : 0.40, isFemale ? 1.18 : 1.25, 0);
    
    const shoulderR = new THREE.Mesh(shoulderGeo, saddleMat);
    rightArmGroup.add(shoulderR);
    
    const rightArm = new THREE.Mesh(armGeo, outfitMat);
    rightArm.position.y = -armH / 2;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    addVarsityArmDetails(rightArm, false);
    
    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0, -armH - 0.02, 0);
    rightArmGroup.add(handR);

    // Spray Can
    const sprayCanGroup = new THREE.Group();
    const canGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 10);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xff3838, metalness: 0.8 });
    const canMesh = new THREE.Mesh(canGeo, canMat);
    sprayCanGroup.add(canMesh);

    const tipGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8);
    const tipMesh = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tipMesh.position.y = 0.13;
    sprayCanGroup.add(tipMesh);

    sprayCanGroup.position.set(0, -armH - 0.05, 0.12);
    sprayCanGroup.rotation.x = -Math.PI / 4;
    rightArmGroup.add(sprayCanGroup);

    bodyGroup.add(rightArmGroup);

    // 4. Limbs - Multi-Tone Street Pants with Racing Stripes & 2-Tone Sneakers
    const legRadius = isFemale ? 0.095 : 0.115;
    const legH = isFemale ? 0.60 : 0.64;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.85, legH, 12);
    const hipSphereGeo = new THREE.SphereGeometry(legRadius * 1.05, 10, 10);

    const shoeSoleMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    const createCurvedSneaker = () => {
      const sneaker = new THREE.Group();
      
      const uGeo = new THREE.CylinderGeometry(0.10, 0.11, 0.32, 10);
      const upper = new THREE.Mesh(uGeo, shoeMat);
      upper.rotation.x = Math.PI / 2;
      upper.position.set(0, 0, 0.02);
      upper.castShadow = true;
      sneaker.add(upper);

      const heelGeo = new THREE.CylinderGeometry(0.108, 0.114, 0.12, 10);
      const heel = new THREE.Mesh(heelGeo, saddleMat);
      heel.rotation.x = Math.PI / 2;
      heel.position.set(0, 0.01, -0.09);
      sneaker.add(heel);

      const toeGeo = new THREE.SphereGeometry(0.105, 10, 8);
      const toe = new THREE.Mesh(toeGeo, trimMat);
      toe.scale.set(1.0, 0.8, 1.1);
      toe.position.set(0, -0.01, 0.17);
      sneaker.add(toe);

      const soleGeo = new THREE.CylinderGeometry(0.11, 0.115, 0.04, 10);
      const sole = new THREE.Mesh(soleGeo, shoeSoleMat);
      sole.rotation.x = Math.PI / 2;
      sole.position.set(0, -0.07, 0.02);
      sneaker.add(sole);

      const toeSoleGeo = new THREE.SphereGeometry(0.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const toeSole = new THREE.Mesh(toeSoleGeo, shoeSoleMat);
      toeSole.rotation.x = -Math.PI / 2;
      toeSole.position.set(0, -0.07, 0.16);
      sneaker.add(toeSole);

      const treadGeo = new THREE.BoxGeometry(0.20, 0.015, 0.34);
      const tread = new THREE.Mesh(treadGeo, darkMat);
      tread.position.set(0, -0.095, 0.03);
      sneaker.add(tread);

      const laces = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), shoeSoleMat);
      laces.rotation.x = Math.PI / 2.5;
      laces.position.set(0, 0.06, 0.04);
      sneaker.add(laces);

      return sneaker;
    };

    const addLegDetails = (legMesh, isLeft) => {
      const sideStripeGeo = new THREE.BoxGeometry(0.025, legH * 0.86, 0.06);
      const sideStripe = new THREE.Mesh(sideStripeGeo, trimMat);
      sideStripe.position.set(isLeft ? -legRadius * 0.95 : legRadius * 0.95, 0, 0);
      legMesh.add(sideStripe);

      const kneeGeo = new THREE.CylinderGeometry(legRadius * 1.04, legRadius * 1.04, 0.11, 10, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
      const knee = new THREE.Mesh(kneeGeo, saddleMat);
      knee.position.set(0, -0.02, 0.03);
      legMesh.add(knee);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.98, legRadius * 0.98, 0.05, 10), saddleMat);
      cuff.position.y = -legH / 2 + 0.03;
      legMesh.add(cuff);
    };

    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(isFemale ? -0.15 : -0.18, isFemale ? 0.60 : 0.64, 0);
    
    const hipL = new THREE.Mesh(hipSphereGeo, pantsMat);
    leftLegGroup.add(hipL);
    
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.y = -legH / 2;
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);
    addLegDetails(leftLeg, true);

    const leftFoot = new THREE.Group();
    leftFoot.position.set(0, -legH / 2 - 0.22, 0.06);
    leftFoot.add(createCurvedSneaker());
    leftLegGroup.add(leftFoot);
    bodyGroup.add(leftLegGroup);

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(isFemale ? 0.15 : 0.18, isFemale ? 0.60 : 0.64, 0);
    
    const hipR = new THREE.Mesh(hipSphereGeo, pantsMat);
    rightLegGroup.add(hipR);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.y = -legH / 2;
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);
    addLegDetails(rightLeg, false);

    const rightFoot = new THREE.Group();
    rightFoot.position.set(0, -legH / 2 - 0.22, 0.06);
    rightFoot.add(createCurvedSneaker());
    rightLegGroup.add(rightFoot);
    bodyGroup.add(rightLegGroup);

    if (forGamePlayer) {
      this.bodyGroup = bodyGroup;
      this.torso = torso;
      this.headGroup = headGroup;
      this.leftArmGroup = leftArmGroup;
      this.rightArmGroup = rightArmGroup;
      this.sprayCanGroup = sprayCanGroup;
      this.leftLegGroup = leftLegGroup;
      this.rightLegGroup = rightLegGroup;
      this.leftFoot = leftFoot;
      this.rightFoot = rightFoot;
    }

    return root;
  }

  buildCharacterMesh() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const skinTheme = this.skins[this.currentSkin] || this.skins.cyber_dash;
    const isFemale = skinTheme.gender === 'female';
    const legH = isFemale ? 0.60 : 0.64;

    const charModel = this.createCharacterModelGroup(this.currentSkin, true);
    this.mesh.add(charModel);

    // Super Jump Shoe High-Tension Coiled Springs
    const buildSpringCoil = () => {
      const springGroup = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.2 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -i * 0.06;
        springGroup.add(ring);
      }
      return springGroup;
    };

    this.leftSpring = buildSpringCoil();
    this.leftSpring.position.set(0, -legH / 2 - 0.18, 0.06);
    this.leftSpring.visible = false;
    this.leftLegGroup.add(this.leftSpring);

    this.rightSpring = buildSpringCoil();
    this.rightSpring.position.set(0, -legH / 2 - 0.18, 0.06);
    this.rightSpring.visible = false;
    this.rightLegGroup.add(this.rightSpring);

    // 5. Authentic 3D Skateboard / Hoverboard (Equipped from 26 Unique Models)
    this.hoverboardGroup = this.buildHoverboardMesh(this.currentBoard);
    this.hoverboardGroup.position.y = 0.04;
    this.hoverboardGroup.visible = false;
    this.mesh.add(this.hoverboardGroup);

    // 6. Advanced 3D Twin-Rocket Turbo Jetpack (Mounted on Back)
    this.jetpackGroup = new THREE.Group();
    const jetBodyMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.92, roughness: 0.15 });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

    // Twin Titanium Turbines
    for (let s of [-0.22, 0.22]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.78, 14), jetBodyMat);
      tank.position.set(s, 0.95, -0.32);
      this.jetpackGroup.add(tank);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 12), neonCyanMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(s, 0.95, -0.32);
      this.jetpackGroup.add(ring);

      const intake = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 12), neonOrangeMat);
      intake.position.set(s, 1.42, -0.32);
      this.jetpackGroup.add(intake);

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.22, 12), jetBodyMat);
      nozzle.position.set(s, 0.48, -0.32);
      this.jetpackGroup.add(nozzle);

      const nozzleCore = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
      nozzleCore.rotation.x = Math.PI / 2;
      nozzleCore.position.set(s, 0.37, -0.32);
      this.jetpackGroup.add(nozzleCore);
    }

    // Stabilizer Aero Wings with Wingtip LED Beacons
    for (let s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.24), neonCyanMat);
      wing.position.set(s * 0.45, 1.05, -0.32);
      wing.rotation.z = s * -0.25;
      this.jetpackGroup.add(wing);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: s > 0 ? 0x2ed573 : 0xff4757 }));
      beacon.position.set(s * 0.65, 1.12, -0.32);
      this.jetpackGroup.add(beacon);
    }

    this.jetpackGroup.visible = false;
    this.bodyGroup.add(this.jetpackGroup);

    // 7. Advanced 3D Orbiting Magnet & Electromagnetic Energy Flux Rings
    this.magnetAuraGroup = new THREE.Group();

    // Floating 3D Gold Horseshoe Magnet Model
    const horseShoe = new THREE.Group();
    const uArch = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0xff3838, metalness: 0.8 }));
    uArch.rotation.z = Math.PI;
    horseShoe.add(uArch);

    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0x3867d6 }));
    poleL.position.set(-0.12, 0.06, 0);
    const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
    poleR.position.set(0.12, 0.06, 0);
    horseShoe.add(poleL);
    horseShoe.add(poleR);

    horseShoe.position.set(0.42, 1.45, 0);
    horseShoe.scale.set(0.7, 0.7, 0.7);
    this.magnetAuraGroup.add(horseShoe);
    this.floatingMagnet = horseShoe;

    // Dual Pulsing Electromagnetic Flux Rings
    this.fluxRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.025, 8, 20), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 }));
    this.fluxRing1.position.y = 0.9;
    this.magnetAuraGroup.add(this.fluxRing1);

    this.fluxRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 8, 20), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 }));
    this.fluxRing2.position.y = 0.9;
    this.magnetAuraGroup.add(this.fluxRing2);

    this.magnetAuraGroup.visible = false;
    this.bodyGroup.add(this.magnetAuraGroup);
  }

  // Builder for 26 High-Fidelity 3D Skateboards / Hoverboards
  buildHoverboardMesh(boardId = 'freestyle') {
    const bGroup = new THREE.Group();
    const boardData = this.boards[boardId] || this.boards.freestyle;

    // 1. Main Deck with Curvature
    const deckGeo = new THREE.BoxGeometry(0.74, 0.08, 1.62);
    const deckMat = new THREE.MeshStandardMaterial({
      color: boardData.deck,
      emissive: boardData.deck,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.25
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = -0.04;
    deck.castShadow = true;
    bGroup.add(deck);

    // 2. Grip Tape Surface
    const gripGeo = new THREE.BoxGeometry(0.68, 0.02, 1.52);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = 0.01;
    bGroup.add(grip);

    // 3. Dynamic Neon Rails & Edge Bevel
    const neonRailGeo = new THREE.BoxGeometry(0.78, 0.04, 1.66);
    const neonRailMat = new THREE.MeshBasicMaterial({ color: boardData.neon });
    const neonRail = new THREE.Mesh(neonRailGeo, neonRailMat);
    neonRail.position.y = -0.04;
    bGroup.add(neonRail);

    // 4. Twin Magnetic Hover Thruster Coils
    for (let posZ of [-0.48, 0.48]) {
      const coilGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 10);
      const coilMat = new THREE.MeshBasicMaterial({ color: boardData.thruster });
      const coil = new THREE.Mesh(coilGeo, coilMat);
      coil.position.set(0, -0.09, posZ);
      bGroup.add(coil);
    }

    // 5. Unique 3D Addon Features per Board Type
    if (boardData.fin === 'winglets') {
      for (let s of [-1, 1]) {
        const wingGeo = new THREE.BoxGeometry(0.22, 0.03, 0.45);
        const wing = new THREE.Mesh(wingGeo, neonRailMat);
        wing.position.set(s * 0.48, -0.02, -0.3);
        wing.rotation.z = s * 0.25;
        bGroup.add(wing);
      }
    } else if (boardData.fin === 'laser_fins') {
      for (let s of [-1, 1]) {
        const finGeo = new THREE.BoxGeometry(0.04, 0.16, 0.6);
        const fin = new THREE.Mesh(finGeo, neonRailMat);
        fin.position.set(s * 0.39, 0.06, -0.4);
        bGroup.add(fin);
      }
    } else if (boardData.fin === 'exhaust_pipes') {
      for (let s of [-0.18, 0.18]) {
        const pipeGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.35, 8);
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.9 });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(s, -0.05, -0.85);
        bGroup.add(pipe);

        const flameGeo = new THREE.ConeGeometry(0.07, 0.25, 8);
        const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xff4500 }));
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(s, -0.05, -1.05);
        bGroup.add(flame);
      }
    } else if (boardData.fin === 'dragon_crest' || boardData.fin === 'crown') {
      const crestGeo = new THREE.ConeGeometry(0.16, 0.3, 6);
      const crestMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95 });
      const crest = new THREE.Mesh(crestGeo, crestMat);
      crest.rotation.x = Math.PI / 4;
      crest.position.set(0, 0.12, 0.75);
      bGroup.add(crest);
    } else if (boardData.fin === 'dorsal_fin') {
      const dorsalGeo = new THREE.BoxGeometry(0.04, 0.24, 0.4);
      const dorsalMat = new THREE.MeshBasicMaterial({ color: boardData.neon });
      const dorsal = new THREE.Mesh(dorsalGeo, dorsalMat);
      dorsal.position.set(0, 0.12, -0.3);
      bGroup.add(dorsal);
    } else if (boardData.fin === 'orbit_rings') {
      const ringGeo = new THREE.TorusGeometry(0.48, 0.03, 6, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: boardData.neon, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -0.02, 0);
      bGroup.add(ring);
    } else if (boardData.fin === 'bat_wings') {
      for (let s of [-1, 1]) {
        const wingGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
        const wing = new THREE.Mesh(wingGeo, neonRailMat);
        wing.rotation.z = s * (Math.PI / 2.5);
        wing.position.set(s * 0.45, -0.02, -0.2);
        bGroup.add(wing);
      }
    }

    return bGroup;
  }

  getActiveBoardData() {
    return this.boards[this.currentBoard] || this.boards.freestyle;
  }

  applyBoard(boardId) {
    if (!this.boards[boardId]) boardId = 'freestyle';
    this.currentBoard = boardId;
    if (this.hoverboardGroup) {
      this.mesh.remove(this.hoverboardGroup);
    }
    this.hoverboardGroup = this.buildHoverboardMesh(boardId);
    this.hoverboardGroup.position.y = 0.04;
    this.hoverboardGroup.visible = this.hasHoverboard;
    this.mesh.add(this.hoverboardGroup);
  }

  applySkin(skinId) {
    if (!this.skins[skinId]) skinId = 'cyber_dash';
    this.currentSkin = skinId;
    this.buildCharacterMesh();
  }

  moveLeft() {
    if (this.currentLane > -1) {
      this.currentLane--;
      this.targetX = this.currentLane * this.LANE_WIDTH;
      this.bankRoll = 0.35;
      Audio.playWhoosh();
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.currentLane < 1) {
      this.currentLane++;
      this.targetX = this.currentLane * this.LANE_WIDTH;
      this.bankRoll = -0.35;
      Audio.playWhoosh();
      return true;
    }
    return false;
  }

  jump() {
    if (this.hasJetpack) return;

    if (this.isGrounded || this.isSliding) {
      this.jumpForce = this.hasSneakers ? this.sneakerJumpForce : this.baseJumpForce;
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.isSliding = false;
      Storage.incrementStat('totalJumps', 1);

      if (this.hasSneakers) {
        Audio.playSpringJump();
        this.spawnFootstepParticle(0xfffa65);
      } else {
        Audio.playJump();
      }
    }
  }

  slide() {
    if (this.hasJetpack) return;

    if (!this.isGrounded) {
      this.vy = -this.baseJumpForce * 1.6;
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      Storage.incrementStat('totalSlides', 1);
      Audio.playSlide();
    } else if (!this.isSliding) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      Storage.incrementStat('totalSlides', 1);
      Audio.playSlide();
    }
  }

  // Trigger Stumble when grazing obstacle or narrow weave
  stumble() {
    if (this.isStumbling || this.hasHoverboard || this.hasJetpack) return;
    this.isStumbling = true;
    this.stumbleTimer = 0.65;
    Audio.playWhoosh();
    this.spawnFootstepParticle(0xff4757);
  }

  activateHoverboard() {
    if (this.hasHoverboard) return;
    const selectedBoard = typeof Storage !== 'undefined' ? Storage.getSelectedBoard() : 'freestyle';
    this.applyBoard(selectedBoard);
    this.hasHoverboard = true;
    this.hoverboardTimer = Storage.getPowerUpDuration('hoverboard');
    this.hoverboardGroup.visible = true;
    Storage.incrementStat('totalHoverboardsUsed', 1);
    Audio.playHoverboard();
  }

  breakHoverboard() {
    if (!this.hasHoverboard) return;
    this.hasHoverboard = false;
    this.hoverboardTimer = 0;
    if (this.hoverboardGroup) this.hoverboardGroup.visible = false;
    if (typeof Audio !== 'undefined' && Audio.playCrash) {
      Audio.playCrash();
    }
    const bData = typeof this.getActiveBoardData === 'function' ? this.getActiveBoardData() : null;
    const particleColor = (bData && bData.particle) ? bData.particle : 0x00d2d3;
    for (let i = 0; i < 10; i++) {
      this.spawnFootstepParticle(particleColor);
    }
  }

  activateMagnet() {
    this.hasMagnet = true;
    this.magnetTimer = Storage.getPowerUpDuration('magnet');
    if (this.magnetAuraGroup) this.magnetAuraGroup.visible = true;
    Storage.incrementStat('totalPowerUpsCollected', 1);
    Audio.playPowerUp();
  }

  activateMultiplier() {
    this.hasMultiplier = true;
    this.multiplierTimer = Storage.getPowerUpDuration('multiplier');
    Storage.incrementStat('totalPowerUpsCollected', 1);
    Audio.playPowerUp();
  }

  activateJetpack() {
    this.hasJetpack = true;
    this.jetpackTimer = Storage.getPowerUpDuration('jetpack');
    this.jetpackGroup.visible = true;
    Storage.incrementStat('totalPowerUpsCollected', 1);
    Audio.playPowerUp();
  }

  activateSneakers() {
    this.hasSneakers = true;
    this.sneakersTimer = Storage.getPowerUpDuration('sneakers');
    if (this.leftSpring) this.leftSpring.visible = true;
    if (this.rightSpring) this.rightSpring.visible = true;
    Storage.incrementStat('totalPowerUpsCollected', 1);
    Audio.playPowerUp();
  }

  getParticleMat(hex) {
    if (!this.particleMats) this.particleMats = new Map();
    let mat = this.particleMats.get(hex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.85 });
      this.particleMats.set(hex, mat);
    }
    return mat;
  }

  spawnFootstepParticle(colorHex = 0x00d2d3) {
    if (this.trailParticles.length > 35) return;
    const p = new THREE.Mesh(this.particleGeo, this.getParticleMat(colorHex));
    p.position.set(
      this.mesh.position.x + (Math.random() - 0.5) * 0.4,
      this.mesh.position.y + 0.1,
      this.mesh.position.z + 0.3
    );
    this.scene.add(p);
    this.trailParticles.push({ mesh: p, life: 0.25, maxLife: 0.25 });
  }

  // High-performance Jetpack Thruster Flame with cached materials
  spawnJetFlameParticle() {
    if (this.trailParticles.length > 30) return;
    for (let side of [-0.22, 0.22]) {
      const coreP = new THREE.Mesh(this.particleGeo, this.jetCoreMat);
      coreP.position.set(
        this.mesh.position.x + side + (Math.random() - 0.5) * 0.06,
        this.mesh.position.y + 0.50,
        this.mesh.position.z + 0.32
      );
      this.scene.add(coreP);
      this.trailParticles.push({ mesh: coreP, life: 0.20, maxLife: 0.20, vy: -2.5, vz: 3.5 });

      const cyanP = new THREE.Mesh(this.particleGeo, this.jetCyanMat);
      cyanP.position.set(
        this.mesh.position.x + side + (Math.random() - 0.5) * 0.1,
        this.mesh.position.y + 0.42,
        this.mesh.position.z + 0.42
      );
      this.scene.add(cyanP);
      this.trailParticles.push({ mesh: cyanP, life: 0.28, maxLife: 0.28, vy: -2.0, vz: 4.0 });
    }
  }

  // Electric Spark Blast for Magnet
  spawnMagnetSpark() {
    if (this.trailParticles.length > 30) return;
    const mat = Math.random() > 0.5 ? this.jetCyanMat : this.sparkYellowMat;
    const spark = new THREE.Mesh(this.particleGeo, mat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.3;
    spark.position.set(
      this.mesh.position.x + Math.cos(angle) * radius,
      this.mesh.position.y + 0.6 + Math.sin(angle) * 0.6,
      this.mesh.position.z + (Math.random() - 0.5) * 0.4
    );
    this.scene.add(spark);
    this.trailParticles.push({ mesh: spark, life: 0.22, maxLife: 0.22 });
  }

  // Golden Shockwave Landing Blast for Sneakers
  spawnSneakerShockwave() {
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(this.particleGeo, this.shockwaveMat);
      const angle = (i / 6) * Math.PI * 2;
      p.position.set(
        this.mesh.position.x + Math.cos(angle) * 0.4,
        this.mesh.position.y + 0.05,
        this.mesh.position.z + Math.sin(angle) * 0.4
      );
      this.scene.add(p);
      this.trailParticles.push({ mesh: p, life: 0.30, maxLife: 0.30 });
    }
  }

  updateTrailParticles(delta) {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= delta;
      if (p.vy) p.mesh.position.y += p.vy * delta;
      if (p.vz) p.mesh.position.z += p.vz * delta;
      const s = Math.max(0.01, p.life / p.maxLife);
      p.mesh.scale.set(s, s, s);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.trailParticles.splice(i, 1);
      }
    }
  }

  setGroundHeight(h) {
    this.groundHeight = h;
  }

  update(delta, gameSpeed, groundHeight = 0) {
    if (this.groundHeight !== undefined && groundHeight === 0) {
      groundHeight = this.groundHeight;
    }
    // Hide spray can once sprinting
    if (this.sprayCanGroup) this.sprayCanGroup.visible = false;

    // 1. Lane X interpolation & Bank Roll
    this.mesh.position.x += (this.targetX - this.mesh.position.x) * Math.min(delta * 16, 1.0);
    this.bankRoll += (0 - this.bankRoll) * delta * 8;
    this.mesh.rotation.z = this.bankRoll;

    // Stumble recovery timer
    if (this.isStumbling) {
      this.stumbleTimer -= delta;
      if (this.stumbleTimer <= 0) {
        this.isStumbling = false;
      }
    }

    // 2. Jetpack vs Gravity
    if (this.hasJetpack) {
      this.y += (this.jetpackTargetY - this.y) * delta * 4;
      this.isGrounded = false;
      this.jetpackTimer -= delta;

      // Twin Thruster Smoke & High-Speed Plasma Particles
      this.spawnJetFlameParticle();

      if (this.jetpackTimer <= 0) {
        this.hasJetpack = false;
        this.jetpackGroup.visible = false;
      }
    } else {
      if (!this.isGrounded || this.y > groundHeight) {
        this.vy += this.gravity * delta;
        this.y += this.vy * delta;

        if (this.y <= groundHeight) {
          this.y = groundHeight;
          this.vy = 0;
          this.isGrounded = true;
          if (this.hasSneakers) {
            this.spawnSneakerShockwave();
          } else {
            this.spawnFootstepParticle(0xffffff);
          }
        }
      } else {
        this.y = groundHeight;
      }
    }

    this.mesh.position.y = this.y;

    // 3. Slide Timer
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (Math.random() > 0.3) this.spawnFootstepParticle(0xffa502);
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    } else if (this.isGrounded && Math.random() > 0.6) {
      this.spawnFootstepParticle(this.hasSneakers ? 0xfffa65 : (this.hasHoverboard ? 0x00d2d3 : 0xffffff));
    }

    // 4. Power-Up Timers & Dynamic VFX Animations
    if (this.hasMagnet) {
      this.magnetTimer -= delta;
      if (this.magnetAuraGroup) {
        this.magnetAuraGroup.visible = true;
        if (this.fluxRing1) {
          this.fluxRing1.rotation.y += delta * 5.0;
          this.fluxRing1.rotation.x += delta * 3.0;
          this.fluxRing1.scale.setScalar(1.0 + Math.sin(performance.now() * 0.008) * 0.08);
        }
        if (this.fluxRing2) {
          this.fluxRing2.rotation.y -= delta * 4.0;
          this.fluxRing2.rotation.z += delta * 2.5;
        }
        if (this.floatingMagnet) {
          this.floatingMagnet.position.y = 1.45 + Math.sin(performance.now() * 0.006) * 0.08;
          this.floatingMagnet.rotation.y += delta * 3.0;
        }
      }
      if (Math.random() > 0.5) this.spawnMagnetSpark();

      if (this.magnetTimer <= 0) {
        this.hasMagnet = false;
        if (this.magnetAuraGroup) this.magnetAuraGroup.visible = false;
      }
    }

    if (this.hasMultiplier) {
      this.multiplierTimer -= delta;
      if (this.multiplierTimer <= 0) {
        this.hasMultiplier = false;
      }
    }

    if (this.hasHoverboard) {
      this.hoverboardTimer -= delta;
      const bData = this.getActiveBoardData();
      if (Math.random() > 0.3) this.spawnFootstepParticle(bData.particle || 0x00d2d3);
      if (this.hoverboardTimer <= 0) {
        this.hasHoverboard = false;
        this.hoverboardGroup.visible = false;
      }
    }

    if (this.hasSneakers) {
      this.sneakersTimer -= delta;
      // High-tension spring compression and expansion cycle
      const springComp = 0.8 + Math.abs(Math.sin(this.runCycle * 1.5)) * 0.35;
      if (this.leftSpring) this.leftSpring.scale.set(1, springComp, 1);
      if (this.rightSpring) this.rightSpring.scale.set(1, springComp, 1);
      if (Math.random() > 0.6) this.spawnFootstepParticle(0xfffa65);

      if (this.sneakersTimer <= 0) {
        this.hasSneakers = false;
        if (this.leftSpring) this.leftSpring.visible = false;
        if (this.rightSpring) this.rightSpring.visible = false;
      }
    }

    // 5. Update Trail Particles
    this.updateTrailParticles(delta);

    // 6. Character Animations
    this.animate(delta, gameSpeed);
  }

  animate(delta, gameSpeed) {
    if (this.isDead) {
      // Knockdown / Fall on Ground animation outside obstacle
      this.bodyGroup.position.set(0, -0.65, 0.4);
      this.bodyGroup.rotation.set(-Math.PI / 2, 0, 0.12);
      this.headGroup.rotation.set(0.35, 0.2, 0);
      this.leftLegGroup.rotation.set(0.2, 0, 0.35);
      this.rightLegGroup.rotation.set(0.1, 0, -0.35);
      this.leftArmGroup.rotation.set(-1.4, 0, -0.7);
      this.rightArmGroup.rotation.set(-1.4, 0, 0.7);
      return;
    }

    if (this.hasJetpack) {
      // Dynamic Superhero Jetpack Soaring Pose
      this.bodyGroup.position.set(0, 0, 0);
      this.bodyGroup.rotation.set(0.5, 0, this.bankRoll * 0.6);
      this.headGroup.rotation.set(-0.35, 0, 0);
      this.leftArmGroup.rotation.set(0.7, 0, -0.35);
      this.rightArmGroup.rotation.set(0.7, 0, 0.35);
      this.leftLegGroup.rotation.set(0.4, 0, 0.1);
      this.rightLegGroup.rotation.set(0.4, 0, -0.1);
      return;
    }

    if (this.isStumbling) {
      // Stumble Wobble
      this.bodyGroup.position.set(0, -0.1, 0);
      this.bodyGroup.rotation.set(0.3, Math.sin(this.stumbleTimer * 20) * 0.25, 0);
      this.leftArmGroup.rotation.set(-1.2, 0, -0.5);
      this.rightArmGroup.rotation.set(1.2, 0, 0.5);
      return;
    }

    if (this.isSliding) {
      this.bodyGroup.position.set(0, -0.4, 0.2);
      this.bodyGroup.rotation.set(-0.6, 0, 0);
      this.leftLegGroup.rotation.set(-1.2, 0, 0);
      this.rightLegGroup.rotation.set(-0.4, 0, 0);
      this.leftArmGroup.rotation.set(1.0, 0, 0);
      this.rightArmGroup.rotation.set(1.0, 0, 0);
      return;
    }

    if (!this.isGrounded) {
      this.bodyGroup.position.set(0, 0, 0);
      this.bodyGroup.rotation.set(0, 0, 0);
      this.leftLegGroup.rotation.set(-0.5, 0, 0);
      this.rightLegGroup.rotation.set(0.6, 0, 0);
      this.leftArmGroup.rotation.set(-1.2, 0, 0);
      this.rightArmGroup.rotation.set(1.2, 0, 0);
      return;
    }

    if (this.hasHoverboard) {
      // Authentic Surfing Skateboarder Pose & Dynamic Board Tilting
      this.bodyGroup.position.set(0, 0.06, 0);
      this.bodyGroup.rotation.set(0.08, 0.65, this.bankRoll * 0.5);
      this.headGroup.rotation.set(-0.05, -0.58, 0);
      this.leftLegGroup.rotation.set(0.28, 0, 0.25);
      this.rightLegGroup.rotation.set(-0.25, 0, -0.22);
      this.leftArmGroup.rotation.set(-0.45, 0, -0.75);
      this.rightArmGroup.rotation.set(0.35, 0, 0.65);

      this.hoverboardGroup.rotation.z = -this.bankRoll * 1.6;
      this.hoverboardGroup.rotation.y = 0.15;
      return;
    }

    // Standard Running Stride Cycle (Smoothly scales with starting speed to sprint speed)
    this.runCycle += delta * (gameSpeed * 0.7 + 3.0);
    const stride = Math.sin(this.runCycle);
    const bounce = Math.abs(Math.cos(this.runCycle)) * (this.hasSneakers ? 0.18 : 0.1);

    this.bodyGroup.position.set(0, bounce, 0);
    this.bodyGroup.rotation.set(0.12, 0, stride * 0.05);

    this.leftLegGroup.rotation.x = stride * 0.95;
    this.rightLegGroup.rotation.x = -stride * 0.95;

    this.leftArmGroup.rotation.x = -stride * 0.9;
    this.rightArmGroup.rotation.x = stride * 0.9;

    this.headGroup.rotation.y = -stride * 0.05;
  }

  // Subway Surfers Character Idle Presentation in Home Menu
  updateIdle(delta) {
    if (this.sprayCanGroup) this.sprayCanGroup.visible = true;

    this.sprayCycle += delta * 2.5;
    const breathe = Math.sin(this.sprayCycle) * 0.03;
    const weightShift = Math.sin(this.sprayCycle * 0.8) * 0.05;
    const headLook = Math.cos(this.sprayCycle * 0.5) * 0.15;

    this.mesh.position.set(0, 0, 0);
    // Face directly toward the home screen camera with slight swagger
    this.mesh.rotation.y = 0.15 + weightShift * 0.5;

    this.bodyGroup.position.set(0, breathe, 0);
    this.bodyGroup.rotation.set(0.04, 0, weightShift * 0.3);

    // Left hand casually resting on hip
    this.leftArmGroup.rotation.set(0.2, 0, 0.45);

    // Right arm holding spray can with slight casual wave/sway
    this.rightArmGroup.rotation.set(0.35 + Math.sin(this.sprayCycle) * 0.1, -0.1, -0.25);
    this.headGroup.rotation.set(-0.04, headLook, 0);

    // Natural stance for feet
    this.leftLegGroup.rotation.set(0, 0, 0.06);
    this.rightLegGroup.rotation.set(0, 0, -0.06);

    // Subtle graffiti sparkle mist
    if (Math.random() > 0.8) {
      const mat = Math.random() > 0.5 ? this.sprayYellowMat : this.sprayCyanMat;
      const p = new THREE.Mesh(this.particleGeo, mat);
      p.position.set(
        this.mesh.position.x + 0.35 + (Math.random() - 0.5) * 0.15,
        0.8 + (Math.random() - 0.5) * 0.2,
        this.mesh.position.z + 0.2
      );
      this.scene.add(p);
      this.trailParticles.push({ mesh: p, life: 0.25, maxLife: 0.25 });
    }

    this.updateTrailParticles(delta);
  }

  playCrashKnockdown() {
    this.isDead = true;
    this.isSliding = false;
    this.isStumbling = false;
    this.vy = 0;
    this.y = 0;
    this.mesh.position.y = 0;
    this.bodyGroup.position.set(0, -0.65, 0.4);
    this.bodyGroup.rotation.set(-Math.PI / 2, 0, 0.12);
    this.headGroup.rotation.set(0.35, 0.2, 0);
    this.leftLegGroup.rotation.set(0.2, 0, 0.35);
    this.rightLegGroup.rotation.set(0.1, 0, -0.35);
    this.leftArmGroup.rotation.set(-1.4, 0, -0.7);
    this.rightArmGroup.rotation.set(-1.4, 0, 0.7);
  }

  // Stand back up after revive — resets all body parts to upright running pose
  revive() {
    this.isDead = false;
    this.isSliding = false;
    this.isStumbling = false;
    this.slideTimer = 0;
    this.stumbleTimer = 0;
    this.y = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.bankRoll = 0;
    this.mesh.position.y = 0;
    this.mesh.rotation.set(0, 0, 0);

    // Reset body parts back to neutral upright standing pose
    if (this.bodyGroup) this.bodyGroup.position.set(0, 0, 0);
    if (this.bodyGroup) this.bodyGroup.rotation.set(0, 0, 0);
    if (this.headGroup) this.headGroup.rotation.set(0, 0, 0);
    if (this.leftLegGroup) this.leftLegGroup.rotation.set(0, 0, 0);
    if (this.rightLegGroup) this.rightLegGroup.rotation.set(0, 0, 0);
    if (this.leftArmGroup) this.leftArmGroup.rotation.set(0, 0, 0);
    if (this.rightArmGroup) this.rightArmGroup.rotation.set(0, 0, 0);

    // Clear trail particles so no stale death particles linger
    if (this.trailParticles) {
      this.trailParticles.forEach(p => {
        if (p && p.mesh) this.scene.remove(p.mesh);
      });
      this.trailParticles = [];
    }
  }

  getCollider() {
    const height = this.isSliding ? 0.7 : 1.8;
    return {
      minX: this.mesh.position.x - 0.4,
      maxX: this.mesh.position.x + 0.4,
      minY: this.mesh.position.y,
      maxY: this.mesh.position.y + height,
      minZ: this.mesh.position.z - 0.35,
      maxZ: this.mesh.position.z + 0.35
    };
  }

  reset() {
    this.currentLane = 0;
    this.targetX = 0;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.y = 0;
    this.vy = 0;
    this.isDead = false;
    this.isGrounded = true;
    this.isSliding = false;
    this.isStumbling = false;
    this.slideTimer = 0;
    this.stumbleTimer = 0;
    this.hasMagnet = false;
    this.hasMultiplier = false;
    this.hasHoverboard = false;
    this.hasJetpack = false;
    this.hasSneakers = false;
    if (this.hoverboardGroup) this.hoverboardGroup.visible = false;
    if (this.jetpackGroup) this.jetpackGroup.visible = false;
    if (this.sprayCanGroup) this.sprayCanGroup.visible = false;
    if (this.leftSpring) this.leftSpring.visible = false;
    if (this.rightSpring) this.rightSpring.visible = false;
    if (this.trailParticles) {
      this.trailParticles.forEach(p => {
        if (p && p.mesh) this.scene.remove(p.mesh);
      });
      this.trailParticles = [];
    }
  }
}

if (typeof window !== 'undefined') {
  window.Player = Player;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Player = Player;
}
if (typeof global !== 'undefined') {
  global.Player = Player;
}
