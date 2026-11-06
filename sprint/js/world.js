/**
 * Saurabh's Sprint - Ultra-Optimized 60 FPS 3D World Engine
 * Features:
 * 1. High Performance Low-Draw-Call Track & World Geometry
 * 2. Realistic Dynamic 3D Sky Dome with Drifting Clouds & Sun Horizon
 * 3. Streamlined 3D Subway Trains (Aerodynamic Nose, LED Headlights, Rooftop Catwalks, Bogies & Ramps)
 * 4. High-Performance Modern City Skyline & Overhead Railway Catenary Wires
 * 5. Accurate Precision Collision & Side-Graze Stumble Detection
 */

class WorldManager {
  constructor(scene, collectibleManager) {
    this.scene = scene;
    this.collectibles = collectibleManager;

    this.LANE_WIDTH = 2.2;
    this.LANES = [-this.LANE_WIDTH, 0, this.LANE_WIDTH]; // Left (-2.2), Center (0), Right (2.2)

    this.CHUNK_LENGTH = 45;
    this.VISIBLE_CHUNKS = 6; // 270m horizon: Seamless endless generation
    this.chunks = [];
    this.activeObstacles = [];
    this.movingTrains = [];

    this.nextChunkZ = 0;
    this.currentThemeIndex = 0;
    this.themeChangeDistance = 350;
    this.chunksSinceKey = 0;          // Counter for periodic key spawning
    this.nextKeyAfterChunks = 4 + Math.floor(Math.random() * 4); // Spawn every 4-7 chunks

    // Sky & Cloud System
    this.clouds = [];
    this.skyGroup = new THREE.Group();
    this.scene.add(this.skyGroup);

    this.THEMES = [
      {
        id: 'SUNNY_METRO',
        name: 'Sunny Metro Skyline',
        skyColor: 0x4aa3df,
        fogColor: 0xa9cce3,
        fogDensity: 0.003,
        ambientColor: 0xffffff,
        dirLightColor: 0xfff6c5,
        dirLightIntensity: 1.15,
        ballastColor: 0xd5dbdb,
        railColor: 0x00d2d3,
        isStation: false,
        isMountain: false
      },
      {
        id: 'METRO_STATION',
        name: 'Grand Central Subway Station',
        skyColor: 0x2c3e50,
        fogColor: 0x34495e,
        fogDensity: 0.004,
        ambientColor: 0xfdfefe,
        dirLightColor: 0xfef9e7,
        dirLightIntensity: 1.2,
        ballastColor: 0x2c3e50,
        railColor: 0xf1c40f,
        isStation: true,
        isMountain: false
      },
      {
        id: 'MOUNTAIN_CANYON',
        name: 'Rocky Alpine Canyon',
        skyColor: 0xe67e22,
        fogColor: 0xf39c12,
        fogDensity: 0.003,
        ambientColor: 0xfff0c2,
        dirLightColor: 0xd35400,
        dirLightIntensity: 1.1,
        ballastColor: 0x7f8c8d,
        railColor: 0xe67e22,
        isStation: false,
        isMountain: true
      },
      {
        id: 'CYBER_METROPOLIS',
        name: 'Cyber Neon Metropolis',
        skyColor: 0x0f172a,
        fogColor: 0x1e1b4b,
        fogDensity: 0.0035,
        ambientColor: 0xc084fc,
        dirLightColor: 0x38bdf8,
        dirLightIntensity: 1.1,
        ballastColor: 0x1e293b,
        railColor: 0x00f5d4,
        isStation: false,
        isMountain: false
      }
    ];

    this.initMaterials();
    this.initSky();
    this.initEnvironment();
  }

  getCurrentTheme() {
    return this.THEMES[this.currentThemeIndex];
  }

  initMaterials() {
    this.tunnelArchGeo = new THREE.CylinderGeometry(5.8, 5.8, this.CHUNK_LENGTH, 14, 1, true, 0, Math.PI);
    this.tunnelTubeLightGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.5, 6);

    // Track Materials
    this.ballastMat = new THREE.MeshLambertMaterial({ color: 0xdfe4ea });
    this.railMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, metalness: 0.85, roughness: 0.2 });
    this.tieMat = new THREE.MeshLambertMaterial({ color: 0x5d6d7e });

    // Boundary Retaining Wall & Fence Materials
    this.retainingWallMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    this.fenceMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.6 });

    // Advanced 3D Train Materials
    this.trainBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.4 });
    this.trainRoofMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.5 });
    this.trainStripeMat = new THREE.MeshLambertMaterial({ color: 0xff3838 });
    this.trainWindshieldMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.95 });
    this.trainWindowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.trainLightMat = new THREE.MeshBasicMaterial({ color: 0xfff9a6 });
    this.headlightBeamMat = new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    this.trainBogieMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.hvacMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 });
    this.trainChromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.1, metalness: 0.95 });
    this.trainPantographMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.7 });
    this.trainTailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    this.trainDoorTrimMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    this.trainWarningDoorMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Station Materials
    this.stationPlatformMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
    this.stationYellowMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    this.stationCanopyMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7, roughness: 0.3 });
    this.stationSignMat = new THREE.MeshBasicMaterial({ color: 0x0984e3 });
    this.stationBenchMat = new THREE.MeshLambertMaterial({ color: 0x8e44ad });
    this.stationLightMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });

    // Mountain Canyon Materials
    this.canyonRockMat = new THREE.MeshLambertMaterial({ color: 0xa0522d });
    this.canyonLedgeMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    this.pineLeavesMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    this.woodTrunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });

    // Tunnel Materials
    this.tunnelWallMat = new THREE.MeshLambertMaterial({ color: 0x1f242d, side: THREE.BackSide });
    this.tunnelLightMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    // Barriers & Overhead Gantries
    this.barrierMat = new THREE.MeshLambertMaterial({ color: 0xff3838 });
    this.barrierStripeMat = new THREE.MeshLambertMaterial({ color: 0xfffa65 });
    this.overheadMat = new THREE.MeshStandardMaterial({ color: 0x566573, metalness: 0.5 });
    this.catenaryWireMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
    this.coneMat = new THREE.MeshLambertMaterial({ color: 0xff9f1a });

    // City Buildings & Advanced Skyscraper Materials
    this.buildingMatGlass = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.15 });
    this.buildingMatDarkGlass = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.15 });
    this.buildingMatBrick = new THREE.MeshLambertMaterial({ color: 0xa93226 });
    this.buildingMatWarmTower = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    this.buildingMatConcrete = new THREE.MeshLambertMaterial({ color: 0x64748b });
    this.buildingMatCleanWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.2 });
    this.buildingMatBronze = new THREE.MeshStandardMaterial({ color: 0x92400e, metalness: 0.6, roughness: 0.3 });

    this.windowMatLit = new THREE.MeshBasicMaterial({ color: 0xfffa65, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
    this.windowCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
    this.windowAmberMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
    this.neonSignMat = new THREE.MeshBasicMaterial({ color: 0xff007f, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.neonFinCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.neonFinMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    this.beaconRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.helipadLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.waterTankWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    this.waterTankBandMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

    // Realistic Architectural Signage & Brand Textures (SAURABH SPRINT, STATION & TUNNEL)
    this.texSaurabhSprint = this.createBuildingSignTexture('SAURABH SPRINT', 'gold');
    this.texSaurabhStation = this.createBuildingSignTexture('SAURABH METRO STATION', 'station');
    this.texSaurabhTunnel = this.createBuildingSignTexture('SAURABH METRO TUNNEL', 'tunnel');

    const signMatOpt = { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2.5, polygonOffsetUnits: -2.5 };
    this.matSaurabhSprint = this.texSaurabhSprint ? new THREE.MeshBasicMaterial({ map: this.texSaurabhSprint, ...signMatOpt }) : this.windowAmberMat;
    this.matSaurabhStation = this.texSaurabhStation ? new THREE.MeshBasicMaterial({ map: this.texSaurabhStation, ...signMatOpt }) : this.windowAmberMat;
    this.matSaurabhTunnel = this.texSaurabhTunnel ? new THREE.MeshBasicMaterial({ map: this.texSaurabhTunnel, ...signMatOpt }) : this.neonCyanMat;

    // Auto-refresh billboard sign textures when Google WebFonts finish loading
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this.refreshAllBuildingSignTextures();
      }).catch(() => {});
    }

    // World Wonders & Eiffel Tower Iconic Materials
    this.eiffelMat = new THREE.MeshStandardMaterial({ color: 0x8a7968, metalness: 0.6, roughness: 0.4 });
    this.eiffelLightMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    this.tajMarbleMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2, metalness: 0.1 });
    this.tajGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    this.pyramidMat = new THREE.MeshLambertMaterial({ color: 0xdfa974 });
    this.colosseumMat = new THREE.MeshLambertMaterial({ color: 0xd7b899 });
    this.bigBenMat = new THREE.MeshLambertMaterial({ color: 0xc49a6c });
    this.clockFaceMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Mountain Geometries & Snow Caps
    this.mountainGeo1 = new THREE.ConeGeometry(12, 36, 5);
    this.mountainGeo1._isShared = true;
    this.mountainGeo2 = new THREE.ConeGeometry(15, 46, 5);
    this.mountainGeo2._isShared = true;
    this.mountainSnowGeo1 = new THREE.ConeGeometry(4.2, 10, 5);
    this.mountainSnowGeo1._isShared = true;
    this.mountainSnowGeo2 = new THREE.ConeGeometry(5.2, 12, 5);
    this.mountainSnowGeo2._isShared = true;
    this.snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Preallocated Shared Track & World Geometries (Ultra 60 FPS Performance)
    // 54m Wide Ground Bed covering full track shoulders & under trees with white stone ballast (Zero Blue Bleed)
    this.groundGeo = new THREE.PlaneGeometry(54.0, this.CHUNK_LENGTH);
    this.groundGeo._isShared = true;
    this.railGeo = new THREE.BoxGeometry(0.08, 0.12, this.CHUNK_LENGTH);
    this.railGeo._isShared = true;
    this.tieGeo = new THREE.BoxGeometry(1.25, 0.06, 0.28);
    this.tieGeo._isShared = true;
    this.retainingWallGeo = new THREE.BoxGeometry(0.4, 1.4, this.CHUNK_LENGTH);
    this.retainingWallGeo._isShared = true;
    this.fenceGeo = new THREE.BoxGeometry(0.05, 0.8, this.CHUNK_LENGTH);
    this.fenceGeo._isShared = true;

    // Shared Building Geometries
    this.bGeo0 = new THREE.BoxGeometry(8.5, 32, 10.5);
    this.bGeo0._isShared = true;
    this.bGeo1 = new THREE.BoxGeometry(8.5, 28, 10.5);
    this.bGeo1._isShared = true;
    this.bGeo2 = new THREE.BoxGeometry(8.5, 24, 10.5);
    this.bGeo2._isShared = true;
    this.bGeo3 = new THREE.BoxGeometry(8.5, 26, 10.5);
    this.bGeo3._isShared = true;
    this.bWinGeo = new THREE.PlaneGeometry(7.5, 22);
    this.bWinGeo._isShared = true;
    this.bBoardGeo = new THREE.PlaneGeometry(6.0, 2.8);
    this.bBoardGeo._isShared = true;
    this.bTankGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 8);
    this.bTankGeo._isShared = true;
    this.bSpireGeo = new THREE.CylinderGeometry(0.1, 0.25, 7, 4);
    this.bSpireGeo._isShared = true;
  }

  // Optimized Dynamic 3D Sky Dome with Drifting Clouds
  initSky() {
    const skyGeo = new THREE.SphereGeometry(200, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const skyMat = new THREE.MeshBasicMaterial({
      color: this.getCurrentTheme().skyColor,
      side: THREE.BackSide
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.position.y = -5;
    this.skyGroup.add(this.skyDome);

    // Glowing Sun Disk
    const sunGeo = new THREE.CircleGeometry(12, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc, transparent: true, opacity: 0.9 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 40, -180);
    this.skyGroup.add(this.sunMesh);

    // Lightweight Clouds (6 clusters)
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    for (let c = 0; c < 6; c++) {
      const cloudGroup = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puffGeo = new THREE.DodecahedronGeometry(3 + p * 1.2, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set((p - 1) * 3.5, 0, 0);
        puff.scale.y = 0.55;
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(
        (Math.random() - 0.5) * 120,
        25 + Math.random() * 20,
        -Math.random() * 160
      );
      this.clouds.push(cloudGroup);
      this.skyGroup.add(cloudGroup);
    }
  }

  initEnvironment() {
    const theme = this.getCurrentTheme();
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    this.scene.background = new THREE.Color(theme.skyColor);

    this.nextChunkZ = 15;
    for (let i = 0; i < this.VISIBLE_CHUNKS; i++) {
      this.spawnChunk(i === 0);
    }
  }

  spawnChunk(isFirst = false) {
    const chunk = new THREE.Group();
    const chunkZ = this.nextChunkZ;
    chunk.position.z = chunkZ;

    const theme = this.getCurrentTheme();

    // 1. Ground Track Bed (54m wide white stone ballast covering under tracks and trees)
    const ground = new THREE.Mesh(this.groundGeo, this.ballastMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -this.CHUNK_LENGTH / 2);
    ground.receiveShadow = true;
    chunk.add(ground);

    // 2. 3-Lane High-Speed Subway Rails & Sleepers
    this.LANES.forEach((laneX) => {
      const railL = new THREE.Mesh(this.railGeo, this.railMat);
      railL.position.set(laneX - 0.45, 0.06, -this.CHUNK_LENGTH / 2);
      const railR = new THREE.Mesh(this.railGeo, this.railMat);
      railR.position.set(laneX + 0.45, 0.06, -this.CHUNK_LENGTH / 2);
      chunk.add(railL);
      chunk.add(railR);

      const tieCount = Math.floor(this.CHUNK_LENGTH / 3.0);
      for (let t = 0; t < tieCount; t++) {
        const tie = new THREE.Mesh(this.tieGeo, this.tieMat);
        tie.position.set(laneX, 0.03, -t * 3.0);
        chunk.add(tie);
      }
    });

    // 3. Dynamic Multi-Environment Trackside Scenery (Metropolis 6 -> Station 5 -> Mountain 6 -> Short Tunnel 2)
    if (isFirst) {
      this.spawnIntroGraffitiTrain(chunk);
    }

    const chunkIndex = Math.abs(Math.floor(chunkZ / this.CHUNK_LENGTH));
    const CYCLE_LENGTH = 19; // 19 Chunks Cycle = City (6), Station (5), Mountain (6), Tunnel (2)
    const rel = chunkIndex % CYCLE_LENGTH;
    let currentZone = 0;
    let chunkInZone = rel;

    if (rel < 6) {
      currentZone = 0; // City (6 chunks = 270m)
      chunkInZone = rel;
    } else if (rel < 11) {
      currentZone = 1; // Station (5 chunks = 225m)
      chunkInZone = rel - 6;
    } else if (rel < 17) {
      currentZone = 2; // Mountain (6 chunks = 270m)
      chunkInZone = rel - 11;
    } else {
      currentZone = 3; // Tunnel (Short, punchy 2 chunks = 90m!)
      chunkInZone = rel - 17;
    }

    if (currentZone === 0) {
      // Zone 0: Continuous Dense Downtown Metropolis
      if (chunkInZone === 2) {
        const gantry = this.createOverheadGantry();
        gantry.position.set(0, 0, -this.CHUNK_LENGTH / 2);
        chunk.add(gantry);
      }
      this.addDenseCityScenery(chunk, chunkInZone);
    } else if (currentZone === 1) {
      // Zone 1: Grand Central Subway Station
      this.addStationScenery(chunk, chunkInZone);
    } else if (currentZone === 2) {
      // Zone 2: Rocky Alpine Mountain Canyon
      this.addMountainScenery(chunk, chunkInZone);
    } else {
      // Zone 3: Full Enclosed Subway Tunnel (2 Chunks)
      this.addTunnelScenery(chunk, chunkInZone);
    }

    // 4. Obstacles & Collectibles
    if (!isFirst) {
      this.populateObstacles(chunk, chunkZ);
    }

    this.scene.add(chunk);
    this.chunks.push({ mesh: chunk, z: chunkZ, themeIndex: this.currentThemeIndex });
    this.nextChunkZ -= this.CHUNK_LENGTH;
  }

  // Intro Subway Graffiti Train
  spawnIntroGraffitiTrain(chunk) {
    const train = this.createAdvancedTrainMesh(18.0, 3.2, 2.0, false, false);
    train.position.set(2.4, 0, -9);
    chunk.add(train);

    const grafGeo = new THREE.PlaneGeometry(6.5, 1.8);
    const grafMat = new THREE.MeshBasicMaterial({ color: 0xff3838, side: THREE.DoubleSide });
    const graf = new THREE.Mesh(grafGeo, grafMat);
    graf.rotation.y = -Math.PI / 2;
    graf.position.set(1.39, 1.6, -7.5);
    chunk.add(graf);

    const grafDecalGeo = new THREE.PlaneGeometry(5.0, 0.9);
    const grafDecal = new THREE.Mesh(grafDecalGeo, new THREE.MeshBasicMaterial({ color: 0xfffa65, side: THREE.DoubleSide }));
    grafDecal.rotation.y = -Math.PI / 2;
    grafDecal.position.set(1.38, 1.6, -7.5);
    chunk.add(grafDecal);
  }

  // Overhead Railway Gantry with SAURABH Banner & Catenary Wires
  createOverheadGantry() {
    const group = new THREE.Group();

    // Steel Pillars (Elevated high so jetpack flying at 5.4m has clear 3m headspace)
    const colGeo = new THREE.BoxGeometry(0.35, 9.6, 0.35);
    const colL = new THREE.Mesh(colGeo, this.overheadMat);
    colL.position.set(-5.0, 4.8, 0);
    const colR = new THREE.Mesh(colGeo, this.overheadMat);
    colR.position.set(5.0, 4.8, 0);
    group.add(colL);
    group.add(colR);

    // Cross Beam (High up at 8.8m)
    const beamGeo = new THREE.BoxGeometry(10.4, 0.35, 0.35);
    const beam = new THREE.Mesh(beamGeo, this.overheadMat);
    beam.position.set(0, 8.8, 0);
    group.add(beam);

    // High-Elevation Overhead Billboard ("SAURABH SPRINT" - High at 8.8m, well above jetpack)
    const bannerGeo = new THREE.PlaneGeometry(6.4, 1.9);
    const banner = new THREE.Mesh(bannerGeo, this.matSaurabhSprint);
    banner.position.set(0, 8.8, 0.22);
    group.add(banner);

    const bannerFrame = new THREE.Mesh(new THREE.BoxGeometry(6.65, 2.1, 0.1), this.stationCanopyMat);
    bannerFrame.position.set(0, 8.8, 0.16);
    group.add(bannerFrame);

    return group;
  }

  // Detailed Multi-Tier Background Skyscraper Skyline (100% Seamless, Zero Gaps, Real Architecture)
  addBackgroundSkylineRow(chunk, side, style = 'city') {
    const bgPositions = [-5.5, -16.5, -27.5, -38.5];
    const towerMats = [
      this.buildingMatDarkGlass,
      this.buildingMatGlass,
      this.buildingMatWarmTower,
      this.buildingMatBrick,
      this.buildingMatCleanWhite,
      this.buildingMatBronze
    ];
    const winMats = [this.windowMatLit, this.windowCyanMat, this.windowAmberMat];

    bgPositions.forEach((posZ, idx) => {
      const bgGroup = new THREE.Group();
      const heightTier = 38 + ((idx * 6 + (side > 0 ? 4 : 0)) % 16); // 38m to 54m height variation
      const towerMat = towerMats[(idx + (side > 0 ? 2 : 0)) % towerMats.length];
      const winMat = winMats[(idx + (side > 0 ? 1 : 0)) % winMats.length];

      // 1. Massive Primary Tower Body (11.8m wide x 11.5m deep: Overlaps seamlessly across chunks)
      const shaftGeo = new THREE.BoxGeometry(11.8, heightTier, 11.5);
      const shaft = new THREE.Mesh(shaftGeo, towerMat);
      shaft.position.y = heightTier / 2;
      bgGroup.add(shaft);

      // 2. High-Density Illuminated Window Array on Track Facade (Generous 0.2m depth separation)
      const winPanelGeo = new THREE.BoxGeometry(0.18, heightTier * 0.7, 8.6);
      const winPanel = new THREE.Mesh(winPanelGeo, winMat);
      winPanel.position.set(-side * 6.0, heightTier * 0.48, 0);
      bgGroup.add(winPanel);

      // 3. Architectural Setback Crown / Penthouse
      const crownHeight = 4.5 + (idx % 3) * 2;
      const crownGeo = new THREE.BoxGeometry(8.0, crownHeight, 8.0);
      const crown = new THREE.Mesh(crownGeo, this.buildingMatCleanWhite);
      crown.position.y = heightTier + crownHeight / 2;
      bgGroup.add(crown);

      // 4. Rooftop Details: Spire Antennas with Red Beacon or HVAC Chiller Unit
      if (idx % 2 === 0) {
        const spire = new THREE.Mesh(this.bSpireGeo, this.overheadMat);
        spire.position.set(0, heightTier + crownHeight + 3.5, 0);
        bgGroup.add(spire);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), this.beaconRedMat);
        beacon.position.set(0, heightTier + crownHeight + 7.0, 0);
        bgGroup.add(beacon);
      } else {
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 3.0), this.buildingMatConcrete);
        hvac.position.set(0, heightTier + crownHeight + 0.7, 0);
        bgGroup.add(hvac);
      }

      bgGroup.position.set(side * 17.5, 0, posZ);
      chunk.add(bgGroup);
    });
  }

  // Continuous Dense Downtown City Skyline with Zero Gaps & Eye-Level SAURABH Billboards
  addDenseCityScenery(chunk, chunkInZone = 0) {
    // 1. Trackside Concrete Retaining Walls with Metallic Safety Fencing & Background Skylines
    for (let side of [-1, 1]) {
      const wall = new THREE.Mesh(this.retainingWallGeo, this.retainingWallMat);
      wall.position.set(side * 4.9, 0.7, -this.CHUNK_LENGTH / 2);
      chunk.add(wall);

      const fence = new THREE.Mesh(this.fenceGeo, this.fenceMat);
      fence.position.set(side * 4.9, 1.8, -this.CHUNK_LENGTH / 2);
      chunk.add(fence);

      // Real Multi-Tier Architectural Background Skyscraper Row (Zero Flat Grey Boxes / Zero Gaps)
      this.addBackgroundSkylineRow(chunk, side, 'city');
    }



    // 3. Dense Advanced Architectural Buildings along both sides
    const buildingPositions = [-5.5, -16.5, -27.5, -38.5];
    for (let side of [-1, 1]) {
      buildingPositions.forEach((posZ, idx) => {
        const bType = (idx + (side > 0 ? 1 : 0)) % 4;
        const posX = side * (9.2 + (idx % 2) * 1.4);

        let bGroup;
        if (bType === 0) {
          bGroup = this.createAdvancedSkyscraperApex(side, idx);
        } else if (bType === 1) {
          bGroup = this.createAdvancedCyberTower(side, idx);
        } else if (bType === 2) {
          bGroup = this.createAdvancedBrickLoft(side, idx);
        } else {
          bGroup = this.createAdvancedCorporateCenter(side, idx);
        }

        bGroup.position.set(posX, 0, posZ);
        chunk.add(bGroup);
      });
    }

    // 4. Iconic World Landmarks & 7 Wonders in the Scenic Background Skyline
    const chunkNum = Math.abs(Math.floor(chunk.position.z / this.CHUNK_LENGTH));
    const landmarkCycle = chunkNum % 5;
    const landmarkSide = chunkNum % 2 === 0 ? 1 : -1;
    let landmarkMesh = null;

    if (landmarkCycle === 0) {
      landmarkMesh = this.createEiffelTower();
    } else if (landmarkCycle === 1) {
      landmarkMesh = this.createTajMahal();
    } else if (landmarkCycle === 2) {
      landmarkMesh = this.createGreatPyramid();
    } else if (landmarkCycle === 3) {
      landmarkMesh = this.createColosseum();
    } else if (landmarkCycle === 4) {
      landmarkMesh = this.createBigBen();
    }

    if (landmarkMesh) {
      landmarkMesh.position.set(landmarkSide * 20.0, 0, -this.CHUNK_LENGTH / 2);
      chunk.add(landmarkMesh);
    }
  }

  // Helper to generate crisp canvas-rendered architectural skyscraper brand signage with AUTO-FIT & 3D Depth
  // Helper to generate crisp canvas-rendered architectural skyscraper brand signage with AUTO-FIT & 3D Depth
  createBuildingSignTexture(text, style = 'tower') {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      this.renderSignToContext(ctx, text, style);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    } catch (e) {
      return null;
    }
  }

  // Refresh all building sign textures when webfonts finish loading
  // Refresh all building sign textures when webfonts finish loading
  refreshAllBuildingSignTextures() {
    const list = [
      { key: 'texSaurabhSprint', text: 'SAURABH SPRINT', style: 'gold' },
      { key: 'texSaurabhStation', text: 'SAURABH METRO STATION', style: 'station' },
      { key: 'texSaurabhTunnel', text: 'SAURABH METRO TUNNEL', style: 'tunnel' }
    ];

    list.forEach(item => {
      const tex = this[item.key];
      if (tex && tex.image) {
        const ctx = tex.image.getContext('2d');
        if (ctx) {
          this.renderSignToContext(ctx, item.text, item.style);
          tex.needsUpdate = true;
        }
      }
    });
  }

  renderSignToContext(ctx, text, style = 'gold') {
    ctx.clearRect(0, 0, 1024, 320);

    let line1 = 'SAURABH';
    let line2 = 'SPRINT';
    if (text) {
      const parts = text.trim().split(/\s+/);
      if (parts.length === 1) {
        line1 = parts[0];
        line2 = '';
      } else if (parts.length === 2) {
        line1 = parts[0];
        line2 = parts[1];
      } else {
        line1 = parts[0];
        line2 = parts.slice(1).join(' ');
      }
    }

    let bgGrad = ctx.createLinearGradient(0, 0, 0, 320);
    let outerStroke = '#00f5d4';
    let innerStroke = '#38bdf8';
    let line1Color = '#ffffff';
    let line1Glow = '#00f5d4';
    let line1Shadow = '#0369a1';
    let line2Color = '#38bdf8';
    let line2Glow = '#00f5d4';
    let line2Shadow = '#075985';
    let cornerColor = '#00f5d4';
    let topBadge = '★ RAPID TRANSIT SYSTEM ★';
    let topBadgeColor = '#38bdf8';

    if (style === 'tower') {
      bgGrad.addColorStop(0, '#040b17');
      bgGrad.addColorStop(0.5, '#0a1931');
      bgGrad.addColorStop(1, '#030812');
      outerStroke = '#00f5d4';
      innerStroke = '#38bdf8';
      line1Color = '#ffffff';
      line1Glow = '#00f5d4';
      line1Shadow = '#0369a1';
      line2Color = '#38bdf8';
      line2Glow = '#00f5d4';
      line2Shadow = '#075985';
      cornerColor = '#00f5d4';
      topBadge = '★ SKYSCRAPER APEX ★';
      topBadgeColor = '#38bdf8';
    } else if (style === 'neon') {
      bgGrad.addColorStop(0, '#0d0417');
      bgGrad.addColorStop(0.5, '#1e0934');
      bgGrad.addColorStop(1, '#07020d');
      outerStroke = '#ff007f';
      innerStroke = '#00f5d4';
      line1Color = '#ffffff';
      line1Glow = '#00f5d4';
      line1Shadow = '#831843';
      line2Color = '#ff007f';
      line2Glow = '#ff007f';
      line2Shadow = '#4c0519';
      cornerColor = '#ff007f';
      topBadge = '★ CYBER METROPOLIS ★';
      topBadgeColor = '#ff77c6';
    } else if (style === 'gold') {
      bgGrad.addColorStop(0, '#170e03');
      bgGrad.addColorStop(0.5, '#2e1c07');
      bgGrad.addColorStop(1, '#0f0902');
      outerStroke = '#f59e0b';
      innerStroke = '#fde047';
      line1Color = '#fef08a';
      line1Glow = '#f59e0b';
      line1Shadow = '#78350f';
      line2Color = '#ffffff';
      line2Glow = '#facc15';
      line2Shadow = '#451a03';
      cornerColor = '#fbbf24';
      topBadge = '★ GRAND CENTRAL ★';
      topBadgeColor = '#fde047';
    } else if (style === 'station') {
      bgGrad.addColorStop(0, '#062038');
      bgGrad.addColorStop(0.5, '#0b3964');
      bgGrad.addColorStop(1, '#04172a');
      outerStroke = '#facc15';
      innerStroke = '#ffffff';
      line1Color = '#ffffff';
      line1Glow = '#facc15';
      line1Shadow = '#0c4a6e';
      line2Color = '#facc15';
      line2Glow = '#fde047';
      line2Shadow = '#713f12';
      cornerColor = '#facc15';
      topBadge = '★ SUBWAY PASSENGER TERMINAL ★';
      topBadgeColor = '#fde047';
    } else if (style === 'tunnel') {
      bgGrad.addColorStop(0, '#070b14');
      bgGrad.addColorStop(0.5, '#0e172a');
      bgGrad.addColorStop(1, '#05070d');
      outerStroke = '#00f5d4';
      innerStroke = '#f59e0b';
      line1Color = '#ffffff';
      line1Glow = '#00f5d4';
      line1Shadow = '#0369a1';
      line2Color = '#facc15';
      line2Glow = '#f59e0b';
      line2Shadow = '#713f12';
      cornerColor = '#00f5d4';
      topBadge = '★ TRANSIT TUNNEL SECTOR 1 ★';
      topBadgeColor = '#38bdf8';
    } else {
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(0.5, '#17223b');
      bgGrad.addColorStop(1, '#070a14');
      outerStroke = '#94a3b8';
      innerStroke = '#38bdf8';
      line1Color = '#f8fafc';
      line1Glow = '#38bdf8';
      line1Shadow = '#0f172a';
      line2Color = '#38bdf8';
      line2Glow = '#0284c7';
      line2Shadow = '#0369a1';
      cornerColor = '#38bdf8';
      topBadge = '★ METROPOLITAN HEADQUARTERS ★';
      topBadgeColor = '#38bdf8';
    }

    // Fill background
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 320);

    // Hazard chevrons for tunnel style
    if (style === 'tunnel') {
      const drawChevrons = (startX) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, 12, 42, 296);
        ctx.clip();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(startX, 12, 42, 296);
        ctx.fillStyle = '#0f172a';
        for (let y = -320; y < 640; y += 28) {
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + 42, y + 42);
          ctx.lineTo(startX + 42, y + 56);
          ctx.lineTo(startX, y + 14);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      };
      drawChevrons(12);
      drawChevrons(970);
    }

    // Outer Frame
    ctx.strokeStyle = outerStroke;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1004, 300);

    // Inner Beveled Frame
    ctx.strokeStyle = innerStroke;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 984, 280);

    // Corner Accents
    ctx.fillStyle = cornerColor;
    ctx.fillRect(12, 12, 28, 6);
    ctx.fillRect(12, 12, 6, 28);
    ctx.fillRect(984, 12, 28, 6);
    ctx.fillRect(1006, 12, 6, 28);
    ctx.fillRect(12, 302, 28, 6);
    ctx.fillRect(12, 280, 6, 28);
    ctx.fillRect(984, 302, 28, 6);
    ctx.fillRect(1006, 280, 6, 28);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top Subtitle Badge
    ctx.font = '800 22px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = topBadgeColor;
    ctx.fillText(topBadge, 512, 48);

    if (line2) {
      // LINE 1: "SAURABH"
      ctx.font = '900 110px "Lilita One", "Russo One", "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = line1Shadow;
      ctx.fillText(line1, 512, 130 + 6);
      ctx.shadowColor = line1Glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = line1Color;
      ctx.fillText(line1, 512, 130);
      ctx.shadowBlur = 0;

      // LINE 2: "SPRINT", "CENTRAL STATION", "METRO TUNNEL"
      let line2FontSize = 96;
      if (line2.length > 12) {
        line2FontSize = 66;
      } else if (line2.length > 8) {
        line2FontSize = 80;
      }
      ctx.font = `900 ${line2FontSize}px "Lilita One", "Russo One", "Outfit", "Segoe UI", sans-serif`;
      ctx.fillStyle = line2Shadow;
      ctx.fillText(line2, 512, 238 + 6);
      ctx.shadowColor = line2Glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = line2Color;
      ctx.fillText(line2, 512, 238);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = '900 120px "Lilita One", "Russo One", "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = line1Shadow;
      ctx.fillText(line1, 512, 185 + 6);
      ctx.shadowColor = line1Glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = line1Color;
      ctx.fillText(line1, 512, 185);
      ctx.shadowBlur = 0;
    }
  }

  // --- ADVANCED 3D ARCHITECTURAL BUILDING BUILDERS ---

  // 1. Multi-Tier High-Rise Apex Skyscraper (Glass, LED Fin Accents, SAURABH TOWER Crown Sign & Antenna Spire)
  createAdvancedSkyscraperApex(side, idx) {
    const group = new THREE.Group();

    // Base Podium (Ground Floor & Entrance Lobby)
    const podiumGeo = new THREE.BoxGeometry(9.0, 10, 10.4);
    const podium = new THREE.Mesh(podiumGeo, this.buildingMatGlass);
    podium.position.y = 5;
    group.add(podium);

    // Trackside Entrance Glass Band
    const entranceGeo = new THREE.BoxGeometry(0.25, 3.6, 8.4);
    const entrance = new THREE.Mesh(entranceGeo, this.windowCyanMat);
    entrance.position.set(-side * 4.58, 2.2, 0);
    group.add(entrance);

    // Central Tower Tier (Setback Glass Skyscraper Body)
    const towerGeo = new THREE.BoxGeometry(7.2, 22, 8.6);
    const tower = new THREE.Mesh(towerGeo, this.buildingMatDarkGlass);
    tower.position.y = 21;
    group.add(tower);

    // Illuminated Office Window Array on Track Facade (0.12m offset)
    const winGeo = new THREE.PlaneGeometry(6.4, 18);
    const win = new THREE.Mesh(winGeo, this.windowMatLit);
    win.position.set(-side * 3.72, 21, 0);
    win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(win);

    // Vertical Cyan Neon Edge Fins (Set outside windows)
    const finGeo = new THREE.BoxGeometry(0.14, 22, 0.14);
    for (let fz of [-4.2, 4.2]) {
      const fin = new THREE.Mesh(finGeo, this.neonFinCyanMat);
      fin.position.set(-side * 3.76, 21, fz);
      group.add(fin);
    }

    // Top Crown Tier (Penthouse & Executive Lounge)
    const crownGeo = new THREE.BoxGeometry(5.2, 7, 6.2);
    const crown = new THREE.Mesh(crownGeo, this.buildingMatCleanWhite);
    crown.position.y = 35.5;
    group.add(crown);

    // Rooftop HVAC Chiller Unit with Exhaust
    const hvacGeo = new THREE.BoxGeometry(2.4, 1.2, 2.2);
    const hvac = new THREE.Mesh(hvacGeo, this.buildingMatConcrete);
    hvac.position.set(0, 39.6, -1.2);
    group.add(hvac);

    // Dual Communication Antenna Masts with Red Flashing Beacons
    const spireGeo = new THREE.CylinderGeometry(0.08, 0.18, 9, 4);
    const beaconGeo = new THREE.SphereGeometry(0.18, 6, 6);
    for (let sx of [-1.0, 1.0]) {
      const spire = new THREE.Mesh(spireGeo, this.overheadMat);
      spire.position.set(sx, 43.5, 0.8);
      group.add(spire);

      const beacon = new THREE.Mesh(beaconGeo, this.beaconRedMat);
      beacon.position.set(sx, 48.0, 0.8);
      group.add(beacon);
    }

    return group;
  }

  // 2. Cyberpunk Neon Metrotower (Dual Neon Billboards with "SAURABH CORP", Rooftop Helipad & Elevator Penthouse)
  createAdvancedCyberTower(side, idx) {
    const group = new THREE.Group();

    // Main Stepped Cyber Monolith
    const towerGeo = new THREE.BoxGeometry(8.6, 28, 9.8);
    const tower = new THREE.Mesh(towerGeo, this.buildingMatDarkGlass);
    tower.position.y = 14;
    group.add(tower);



    // Vertical Glowing Japanese/Cyber Neon Ticker Strip (Positioned lower so it never overlaps the billboard)
    const tickerGeo = new THREE.BoxGeometry(0.16, 9.0, 0.85);
    const ticker = new THREE.Mesh(tickerGeo, this.neonFinCyanMat);
    ticker.position.set(-side * 4.42, 6.0, (side > 0 ? 3.4 : -3.4));
    group.add(ticker);

    // Rooftop Helipad Platform Deck
    const helipadDeckGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.35, 16);
    const helipadDeck = new THREE.Mesh(helipadDeckGeo, this.buildingMatConcrete);
    helipadDeck.position.set(0, 28.2, 0);
    group.add(helipadDeck);

    // Helipad Yellow Border Ring & Landing Markings
    const ringGeo = new THREE.RingGeometry(2.9, 3.3, 16);
    const ring = new THREE.Mesh(ringGeo, this.helipadLineMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 28.45, 0);
    group.add(ring);

    // Helipad 'H' Center Markings
    const hBar1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.2), this.helipadLineMat);
    hBar1.rotation.x = -Math.PI / 2;
    hBar1.position.set(-0.6, 28.46, 0);
    group.add(hBar1);

    const hBar2 = hBar1.clone();
    hBar2.position.x = 0.6;
    group.add(hBar2);

    const hCross = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.35), this.helipadLineMat);
    hCross.rotation.x = -Math.PI / 2;
    hCross.position.set(0, 28.46, 0);
    group.add(hCross);

    // Rooftop Elevator Shaft Housing
    const elevatorGeo = new THREE.BoxGeometry(2.0, 2.5, 2.0);
    const elevator = new THREE.Mesh(elevatorGeo, this.buildingMatCleanWhite);
    elevator.position.set(0, 29.5, -3.2);
    group.add(elevator);

    return group;
  }

  // 3. Classic Metropolitan Brick Loft (Architectural Cornices, "SAURABH PLAZA" & Manhattan Stilt Water Tower)
  createAdvancedBrickLoft(side, idx) {
    const group = new THREE.Group();

    // Main Brick Facade Body
    const loftGeo = new THREE.BoxGeometry(8.6, 24, 10.2);
    const loft = new THREE.Mesh(loftGeo, this.buildingMatBrick);
    loft.position.y = 12;
    group.add(loft);

    // Horizontal Architectural Stone Cornices & Floor Separators
    const ledgeGeo = new THREE.BoxGeometry(8.9, 0.35, 10.5);
    for (let ly of [6.0, 12.0, 18.0, 24.0]) {
      const ledge = new THREE.Mesh(ledgeGeo, this.buildingMatConcrete);
      ledge.position.y = ly;
      group.add(ledge);
    }

    // Warm Amber Lit Office Windows Plane (Sitting neatly between floor 1 & 3 cornices)
    const winGeo = new THREE.PlaneGeometry(7.2, 9.5);
    const win = new THREE.Mesh(winGeo, this.windowAmberMat);
    win.position.set(-side * 4.42, 11.5, 0);
    win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(win);



    // Manhattan Rooftop Cedar Water Tower on 4 Diagonal Structural Steel Legs
    const stiltLegGeo = new THREE.BoxGeometry(0.12, 2.8, 0.12);
    for (let lx of [-0.75, 0.75]) {
      for (let lz of [-0.75, 0.75]) {
        const leg = new THREE.Mesh(stiltLegGeo, this.overheadMat);
        leg.position.set(lx, 25.4, lz);
        group.add(leg);
      }
    }

    // Cedar Wood Water Storage Tank Cylinder
    const tankGeo = new THREE.CylinderGeometry(1.3, 1.3, 2.2, 10);
    const tank = new THREE.Mesh(tankGeo, this.waterTankWoodMat);
    tank.position.set(0, 27.9, 0);
    group.add(tank);

    // Steel Reinforcement Tension Bands
    const bandGeo = new THREE.CylinderGeometry(1.33, 1.33, 0.1, 10);
    for (let by of [27.3, 28.5]) {
      const band = new THREE.Mesh(bandGeo, this.waterTankBandMat);
      band.position.set(0, by, 0);
      group.add(band);
    }

    // Conical Cedar Roof Cap with Finial
    const roofGeo = new THREE.ConeGeometry(1.5, 0.85, 10);
    const roof = new THREE.Mesh(roofGeo, this.waterTankWoodMat);
    roof.position.set(0, 29.4, 0);
    group.add(roof);

    // Rooftop Satellite Communication Dish & Condenser
    const dishGeo = new THREE.CylinderGeometry(0.7, 0.05, 0.4, 8);
    const dish = new THREE.Mesh(dishGeo, this.buildingMatCleanWhite);
    dish.position.set(2.2, 24.8, 2.2);
    dish.rotation.z = -0.4;
    group.add(dish);

    return group;
  }

  // 4. Modern Corporate Headquarters (Apex Titanium Horizon Center with "SAURABH GLOBAL" & Angled Atrium)
  createAdvancedCorporateCenter(side, idx) {
    const group = new THREE.Group();

    // Monolithic Corporate High-Rise
    const towerGeo = new THREE.BoxGeometry(8.2, 34, 9.4);
    const tower = new THREE.Mesh(towerGeo, this.buildingMatWarmTower);
    tower.position.y = 17;
    group.add(tower);

    // Vertical Dual Neon LED Accent Strip Channels running full height
    const stripGeo = new THREE.BoxGeometry(0.14, 34, 0.14);
    for (let sz of [-3.8, 3.8]) {
      const strip = new THREE.Mesh(stripGeo, this.neonFinCyanMat);
      strip.position.set(-side * 4.22, 17, sz);
      group.add(strip);
    }

    // Illuminated Executive Windows Plane
    const winGeo = new THREE.PlaneGeometry(6.6, 24);
    const win = new THREE.Mesh(winGeo, this.windowMatLit);
    win.position.set(-side * 4.20, 18, 0);
    win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(win);

    // Angled Architectural Crown Roof Atrium
    const crownGeo = new THREE.BoxGeometry(6.2, 4.0, 7.2);
    const crown = new THREE.Mesh(crownGeo, this.buildingMatBronze);
    crown.position.set(0, 36.0, 0);
    group.add(crown);

    // Crown Rooftop Antenna Tower
    const spireGeo = new THREE.CylinderGeometry(0.08, 0.22, 8, 4);
    const spire = new THREE.Mesh(spireGeo, this.overheadMat);
    spire.position.set(0, 41.0, 0);
    group.add(spire);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), this.beaconRedMat);
    beacon.position.set(0, 45.0, 0);
    group.add(beacon);

    return group;
  }

  // --- 3D WORLD WONDERS & LANDMARKS BUILDERS ---

  // 1. Eiffel Tower (Paris)
  createEiffelTower() {
    const group = new THREE.Group();

    // 4 Curved Steel Legs
    const legGeo = new THREE.CylinderGeometry(0.35, 0.65, 12, 5);
    for (let lx of [-3.2, 3.2]) {
      for (let lz of [-3.2, 3.2]) {
        const leg = new THREE.Mesh(legGeo, this.eiffelMat);
        leg.position.set(lx, 5.8, lz);
        leg.rotation.z = lx > 0 ? -0.22 : 0.22;
        leg.rotation.x = lz > 0 ? 0.22 : -0.22;
        group.add(leg);
      }
    }

    // 1st Floor Deck
    const deck1Geo = new THREE.BoxGeometry(7.5, 0.8, 7.5);
    const deck1 = new THREE.Mesh(deck1Geo, this.eiffelMat);
    deck1.position.y = 11.5;
    group.add(deck1);

    // Arch under 1st floor
    const archGeo = new THREE.CylinderGeometry(2.8, 2.8, 4.5, 8, 1, true, 0, Math.PI);
    const arch = new THREE.Mesh(archGeo, this.eiffelMat);
    arch.rotation.x = Math.PI / 2;
    arch.position.set(0, 3.5, 0);
    group.add(arch);

    // Middle tier
    const midGeo = new THREE.CylinderGeometry(1.8, 2.6, 11, 4);
    const mid = new THREE.Mesh(midGeo, this.eiffelMat);
    mid.position.y = 17.5;
    group.add(mid);

    // 2nd Floor Deck
    const deck2Geo = new THREE.BoxGeometry(4.2, 0.6, 4.2);
    const deck2 = new THREE.Mesh(deck2Geo, this.eiffelMat);
    deck2.position.y = 23.2;
    group.add(deck2);

    // Top Spire
    const spireGeo = new THREE.ConeGeometry(0.9, 18, 4);
    const spire = new THREE.Mesh(spireGeo, this.eiffelMat);
    spire.position.y = 32.2;
    group.add(spire);

    // Glowing Golden Beacon / Searchlight Tip
    const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const beacon = new THREE.Mesh(beaconGeo, this.eiffelLightMat);
    beacon.position.y = 41.5;
    group.add(beacon);

    return group;
  }

  // 2. Taj Mahal (India)
  createTajMahal() {
    const group = new THREE.Group();

    // Marble Plinth Base
    const baseGeo = new THREE.BoxGeometry(16, 2.0, 16);
    const base = new THREE.Mesh(baseGeo, this.tajMarbleMat);
    base.position.y = 1.0;
    group.add(base);

    // Main Tomb Block
    const bodyGeo = new THREE.BoxGeometry(10, 8.5, 10);
    const body = new THREE.Mesh(bodyGeo, this.tajMarbleMat);
    body.position.y = 6.25;
    group.add(body);

    // Grand Central Arched Iwan
    const archGeo = new THREE.CylinderGeometry(2.6, 2.6, 1.2, 8, 1, true, 0, Math.PI);
    const arch = new THREE.Mesh(archGeo, this.tajMarbleMat);
    arch.position.set(0, 5.8, 5.02);
    group.add(arch);

    // Central Onion Dome
    const domeGeo = new THREE.SphereGeometry(3.6, 12, 10);
    const dome = new THREE.Mesh(domeGeo, this.tajMarbleMat);
    dome.position.y = 13.0;
    dome.scale.set(1.0, 1.35, 1.0);
    group.add(dome);

    // Golden Finial
    const finialGeo = new THREE.ConeGeometry(0.25, 2.5, 6);
    const finial = new THREE.Mesh(finialGeo, this.tajGoldMat);
    finial.position.y = 18.5;
    group.add(finial);

    // 4 Corner Domed Chattris
    for (let cx of [-3.8, 3.8]) {
      for (let cz of [-3.8, 3.8]) {
        const cDome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), this.tajMarbleMat);
        cDome.position.set(cx, 11.2, cz);
        group.add(cDome);
      }
    }

    // 4 Corner Minarets
    const minaretGeo = new THREE.CylinderGeometry(0.5, 0.7, 16, 6);
    for (let mx of [-7.0, 7.0]) {
      for (let mz of [-7.0, 7.0]) {
        const minaret = new THREE.Mesh(minaretGeo, this.tajMarbleMat);
        minaret.position.set(mx, 10.0, mz);
        group.add(minaret);

        const mDome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), this.tajMarbleMat);
        mDome.position.set(mx, 18.5, mz);
        group.add(mDome);
      }
    }

    return group;
  }

  // 3. Great Pyramid of Giza (Egypt)
  createGreatPyramid() {
    const group = new THREE.Group();

    // Main Great Pyramid
    const pyrGeo = new THREE.ConeGeometry(18, 22, 4);
    const pyr = new THREE.Mesh(pyrGeo, this.pyramidMat);
    pyr.rotation.y = Math.PI / 4;
    pyr.position.y = 11;
    group.add(pyr);

    // Golden Capstone (Pyramidion)
    const capGeo = new THREE.ConeGeometry(3.5, 4.2, 4);
    const cap = new THREE.Mesh(capGeo, this.tajGoldMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 20.0;
    group.add(cap);

    // Smaller Companion Pyramid
    const smallGeo = new THREE.ConeGeometry(9, 11, 4);
    const smallPyr = new THREE.Mesh(smallGeo, this.pyramidMat);
    smallPyr.rotation.y = Math.PI / 4;
    smallPyr.position.set(12, 5.5, -10);
    group.add(smallPyr);

    return group;
  }

  // 4. Colosseum (Rome)
  createColosseum() {
    const group = new THREE.Group();

    // Tier 1 Base Cylinder
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 4.5, 16), this.colosseumMat);
    tier1.position.y = 2.25;
    group.add(tier1);

    // Tier 2 Middle
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.5, 4.0, 16), this.colosseumMat);
    tier2.position.y = 6.5;
    group.add(tier2);

    // Tier 3 Top Wall
    const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 3.5, 16, 1, false, 0, Math.PI * 1.5), this.colosseumMat);
    tier3.position.y = 10.25;
    group.add(tier3);

    // Arena Floor
    const arena = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.4, 14), this.pyramidMat);
    arena.position.y = 0.2;
    group.add(arena);

    return group;
  }

  // 5. Big Ben Clock Tower (London)
  createBigBen() {
    const group = new THREE.Group();

    // Main Tower Shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(4.8, 24, 4.8), this.bigBenMat);
    shaft.position.y = 12;
    group.add(shaft);

    // Clock Housing
    const clockBox = new THREE.Mesh(new THREE.BoxGeometry(5.4, 6.0, 5.4), this.bigBenMat);
    clockBox.position.y = 27;
    group.add(clockBox);

    // 4 Glowing Clock Faces
    const faceGeo = new THREE.CircleGeometry(1.6, 12);
    for (let f of [-1, 1]) {
      const faceZ = new THREE.Mesh(faceGeo, this.clockFaceMat);
      faceZ.position.set(0, 27, f * 2.72);
      if (f < 0) faceZ.rotation.y = Math.PI;
      group.add(faceZ);

      const faceX = new THREE.Mesh(faceGeo, this.clockFaceMat);
      faceX.position.set(f * 2.72, 27, 0);
      faceX.rotation.y = f * Math.PI / 2;
      group.add(faceX);
    }

    // Gothic Spire & Lantern Roof
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 12, 4), this.overheadMat);
    spire.rotation.y = Math.PI / 4;
    spire.position.y = 36;
    group.add(spire);

    return group;
  }

  // Grand Subway Passenger Station with Side Platforms & Clear Open Track
  addStationScenery(chunk, chunkInZone = 0) {
    // 1. Concrete Passenger Platforms with Yellow Warning Edges & Architectural Terminal Buildings
    for (let side of [-1, 1]) {
      const platGeo = new THREE.BoxGeometry(3.6, 0.85, this.CHUNK_LENGTH);
      const plat = new THREE.Mesh(platGeo, this.stationPlatformMat);
      plat.position.set(side * 5.6, 0.42, -this.CHUNK_LENGTH / 2);
      plat.receiveShadow = true;
      chunk.add(plat);

      // Yellow Tactile Caution Edge Stripe
      const edgeGeo = new THREE.BoxGeometry(0.25, 0.02, this.CHUNK_LENGTH);
      const edge = new THREE.Mesh(edgeGeo, this.stationYellowMat);
      edge.position.set(side * 3.85, 0.86, -this.CHUNK_LENGTH / 2);
      chunk.add(edge);

      // Modern Platform Cantilever Canopy (Above platform ONLY, never across tracks!)
      const canopyGeo = new THREE.BoxGeometry(3.8, 0.2, this.CHUNK_LENGTH);
      const canopy = new THREE.Mesh(canopyGeo, this.stationCanopyMat);
      canopy.position.set(side * 5.8, 5.2, -this.CHUNK_LENGTH / 2);
      chunk.add(canopy);

      // Station Light Pillars & Waiting Benches
      for (let p = 0; p < 3; p++) {
        const pz = -p * 14 - 7;

        // Pillar Light
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.2, 6);
        const post = new THREE.Mesh(postGeo, this.overheadMat);
        post.position.set(side * 6.2, 2.1, pz);
        chunk.add(post);

        const lanternGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const lantern = new THREE.Mesh(lanternGeo, this.stationLightMat);
        lantern.position.set(side * 6.2, 4.3, pz);
        chunk.add(lantern);

        // Bench
        const benchGeo = new THREE.BoxGeometry(1.8, 0.45, 0.6);
        const bench = new THREE.Mesh(benchGeo, this.stationBenchMat);
        bench.position.set(side * 6.0, 1.1, pz + 3.5);
        chunk.add(bench);
      }

      // Side Platform Station Billboards ("SAURABH STATION" on both sides of the station)
      const platBoardGroup = new THREE.Group();
      platBoardGroup.position.set(side * 6.3, 0.85, -22.5);

      // Dual Steel Mounting Stanchions on Platform Deck
      const legGeo = new THREE.BoxGeometry(0.12, 2.2, 0.12);
      for (let lx of [-1.5, 1.5]) {
        const leg = new THREE.Mesh(legGeo, this.overheadMat);
        leg.position.set(lx, 1.1, 0);
        platBoardGroup.add(leg);
      }

      // Billboard Frame & Sign Facing Approaching Runners
      const pbFrameGeo = new THREE.BoxGeometry(3.6, 1.4, 0.12);
      const pbFrame = new THREE.Mesh(pbFrameGeo, this.stationCanopyMat);
      pbFrame.position.set(0, 1.8, 0);
      platBoardGroup.add(pbFrame);

      const pbSignGeo = new THREE.PlaneGeometry(3.4, 1.22);
      const pbSign = new THREE.Mesh(pbSignGeo, this.matSaurabhStation);
      pbSign.position.set(0, 1.8, 0.08);
      platBoardGroup.add(pbSign);

      chunk.add(platBoardGroup);

      // Real Multi-Tier Background Terminal Skyline (Zero flat grey boxes / Zero gaps)
      this.addBackgroundSkylineRow(chunk, side, 'station');

      // Architectural Terminal High-Rise Blocks
      const bPositions = [-11, -33];
      bPositions.forEach((posZ, idx) => {
        const bGroup = new THREE.Group();
        bGroup.position.set(side * 11.5, 0, posZ);
        const bMat = idx === 0 ? this.buildingMatGlass : this.buildingMatConcrete;
        const building = new THREE.Mesh(this.bGeo0, bMat);
        building.position.y = 16;
        bGroup.add(building);

        const win = new THREE.Mesh(this.bWinGeo, this.windowMatLit);
        win.position.set(-side * 4.28, 16, 0);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        bGroup.add(win);

        chunk.add(bGroup);
      });
    }

    // 2. High Elevated Station Entrance Portal Gantry ("SAURABH CENTRAL STATION") - Placed only at zone start!
    if (chunkInZone === 0) {
      const stationGantry = new THREE.Group();
      stationGantry.position.set(0, 0, -3.5);

      // Elevated Tall Steel Pillars (9.6m height for clear jetpack flight)
      const stColGeo = new THREE.BoxGeometry(0.4, 9.6, 0.4);
      const stColL = new THREE.Mesh(stColGeo, this.overheadMat);
      stColL.position.set(-5.4, 4.8, 0);
      const stColR = new THREE.Mesh(stColGeo, this.overheadMat);
      stColR.position.set(5.4, 4.8, 0);
      stationGantry.add(stColL);
      stationGantry.add(stColR);

      // Elevated Cross Beam at 8.8m
      const stBeam = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.45, 0.45), this.overheadMat);
      stBeam.position.set(0, 8.8, 0);
      stationGantry.add(stBeam);

      const stSignGeo = new THREE.PlaneGeometry(6.8, 2.12);
      const stSign = new THREE.Mesh(stSignGeo, this.matSaurabhStation);
      stSign.position.set(0, 8.8, 0.26);
      stationGantry.add(stSign);

      const stSignFrame = new THREE.Mesh(new THREE.BoxGeometry(7.05, 2.3, 0.12), this.stationCanopyMat);
      stSignFrame.position.set(0, 8.8, 0.16);
      stationGantry.add(stSignFrame);

      chunk.add(stationGantry);
    }
  }

  // Rocky Alpine Mountain Canyon (Multi-Tiered Organic Mountain Ridges & Pines - 100% Zero Gaps)
  addMountainScenery(chunk, chunkInZone = 0) {
    // 1. Trackside Concrete Retaining Walls with Metallic Safety Fencing
    for (let side of [-1, 1]) {
      const wall = new THREE.Mesh(this.retainingWallGeo, this.retainingWallMat);
      wall.position.set(side * 4.9, 0.7, -this.CHUNK_LENGTH / 2);
      chunk.add(wall);

      const fence = new THREE.Mesh(this.fenceGeo, this.fenceMat);
      fence.position.set(side * 4.9, 1.8, -this.CHUNK_LENGTH / 2);
      chunk.add(fence);

      // Continuous Multi-Tier Mountain Ridge Rock Formations (Zero Gaps / Organic Geology)
      const mPositions = [-5.5, -16.5, -27.5, -38.5];
      mPositions.forEach((posZ, idx) => {
        const ridgeGroup = new THREE.Group();
        const rHeight = 36 + (idx % 3) * 8;

        // Massive stepped canyon rock mass (12m wide x 10m deep)
        const rockGeo = new THREE.BoxGeometry(12.0, rHeight, 11.5);
        const rock = new THREE.Mesh(rockGeo, idx % 2 === 0 ? this.canyonRockMat : this.canyonLedgeMat);
        rock.position.y = rHeight / 2;
        ridgeGroup.add(rock);

        // Canyon Rock Ledges and Strata
        const ledgeGeo = new THREE.BoxGeometry(12.4, 1.2, 11.8);
        const ledge1 = new THREE.Mesh(ledgeGeo, this.canyonLedgeMat);
        ledge1.position.y = rHeight * 0.45;
        ridgeGroup.add(ledge1);

        const ledge2 = new THREE.Mesh(ledgeGeo, this.canyonRockMat);
        ledge2.position.y = rHeight * 0.8;
        ridgeGroup.add(ledge2);

        ridgeGroup.position.set(side * 17.5, 0, posZ);
        chunk.add(ridgeGroup);
      });
    }

    // 2. Evergreen Pine Trees & Overlapping High Mountain Peaks
    for (let side of [-1, 1]) {
      for (let m = 0; m < 3; m++) {
        const mz = -m * 15 - 7.5;

        // Pine Tree
        const treeGroup = new THREE.Group();
        treeGroup.position.set(side * 7.5, 0, mz + (m % 2 === 0 ? 3.0 : -3.0));

        const trunkGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.4, 5);
        const trunk = new THREE.Mesh(trunkGeo, this.woodTrunkMat);
        trunk.position.y = 0.7;
        treeGroup.add(trunk);

        for (let l = 0; l < 3; l++) {
          const foliageGeo = new THREE.ConeGeometry(1.6 - l * 0.35, 1.9, 5);
          const foliage = new THREE.Mesh(foliageGeo, this.pineLeavesMat);
          foliage.position.y = 1.6 + l * 1.1;
          treeGroup.add(foliage);
        }
        chunk.add(treeGroup);

        // Majestic High Mountain Cones with Snow Caps in Far Background
        const peakGeo = m % 2 === 0 ? this.mountainGeo1 : this.mountainGeo2;
        const snowGeo = m % 2 === 0 ? this.mountainSnowGeo1 : this.mountainSnowGeo2;
        const peakHeight = m % 2 === 0 ? 44 : 54;

        const peakGroup = new THREE.Group();
        peakGroup.position.set(side * 22.0, 0, mz);

        const peak = new THREE.Mesh(peakGeo, m % 2 === 0 ? this.canyonRockMat : this.canyonLedgeMat);
        peak.position.y = peakHeight / 2;
        peakGroup.add(peak);

        const snow = new THREE.Mesh(snowGeo, this.snowMat);
        snow.position.y = peakHeight - (m % 2 === 0 ? 5 : 6);
        peakGroup.add(snow);

        chunk.add(peakGroup);
      }
    }

    // 3. Iconic World Landmarks in Mountain Backdrop
    const chunkNum = Math.abs(Math.floor(chunk.position.z / this.CHUNK_LENGTH));
    const landmarkCycle = chunkNum % 5;
    const landmarkSide = chunkNum % 2 === 0 ? 1 : -1;
    let landmarkMesh = null;

    if (landmarkCycle === 0) landmarkMesh = this.createEiffelTower();
    else if (landmarkCycle === 1) landmarkMesh = this.createTajMahal();
    else if (landmarkCycle === 2) landmarkMesh = this.createGreatPyramid();
    else if (landmarkCycle === 3) landmarkMesh = this.createColosseum();
    else if (landmarkCycle === 4) landmarkMesh = this.createBigBen();

    if (landmarkMesh) {
      landmarkMesh.position.set(landmarkSide * 24.0, 0, -this.CHUNK_LENGTH / 2);
      chunk.add(landmarkMesh);
    }
  }

  // Full 3D Tubular Subway Enclosed Tunnel with Overhead Fluorescent Lighting & Saurabh Entrance Portal
  addTunnelScenery(chunk, chunkInZone = 0) {
    // 1. Full 3D Tubular Subway Enclosure (Enclosing entire tracks from ground to ceiling)
    const tubeGeo = new THREE.CylinderGeometry(5.4, 5.4, this.CHUNK_LENGTH, 24, 1, true, 0, Math.PI * 2);
    const tunnelTube = new THREE.Mesh(tubeGeo, this.tunnelWallMat);
    tunnelTube.rotation.x = Math.PI / 2;
    tunnelTube.position.set(0, 2.5, -this.CHUNK_LENGTH / 2);
    chunk.add(tunnelTube);

    // 2. Continuous Solid Tunnel Retaining Walls & Background Skylines
    for (let side of [-1, 1]) {
      const wall = new THREE.Mesh(this.retainingWallGeo, this.retainingWallMat);
      wall.position.set(side * 4.9, 0.7, -this.CHUNK_LENGTH / 2);
      chunk.add(wall);

      // Real Background Skylines above Tunnel (Zero flat grey boxes / Zero gaps)
      this.addBackgroundSkylineRow(chunk, side, 'tunnel');
    }

    // 3. Central Overhead Fluorescent Lighting Tube Strip (Warm/Cyan Subway Glow)
    const tubeLightGeo = new THREE.CylinderGeometry(0.08, 0.08, this.CHUNK_LENGTH, 6);
    const tubeLight = new THREE.Mesh(tubeLightGeo, this.tunnelLightMat);
    tubeLight.rotation.x = Math.PI / 2;
    tubeLight.position.set(0, 5.2, -this.CHUNK_LENGTH / 2);
    chunk.add(tubeLight);

    // 4. Architecturally Integrated Front Tunnel Portal Entrance ("SAURABH METRO TUNNEL" Perfectly Fitted)
    if (chunkInZone === 0) {
      const portalGroup = new THREE.Group();
      portalGroup.position.set(0, 0, 0.2);

      // Left & Right Structural Portal Pillars (Grounded from Y=0 to Y=9.2)
      const pColGeo = new THREE.BoxGeometry(0.7, 9.2, 0.7);
      for (let s of [-5.8, 5.8]) {
        const col = new THREE.Mesh(pColGeo, this.overheadMat);
        col.position.set(s, 4.6, 0);
        portalGroup.add(col);
      }

      // Circular Entrance Arch Ring
      const portalArchGeo = new THREE.TorusGeometry(5.45, 0.35, 8, 24, Math.PI * 2);
      const portalArch = new THREE.Mesh(portalArchGeo, this.stationCanopyMat);
      portalArch.position.set(0, 2.5, 0);
      portalGroup.add(portalArch);

      // Transverse Heavy Portal Lintel Beam
      const pBeamGeo = new THREE.BoxGeometry(12.4, 0.5, 0.65);
      const pBeam = new THREE.Mesh(pBeamGeo, this.overheadMat);
      pBeam.position.set(0, 8.7, 0);
      portalGroup.add(pBeam);

      // Architectural Solid Pediment Mounting Header (Set in front of beam)
      const headerGeo = new THREE.BoxGeometry(7.6, 2.3, 0.25);
      const header = new THREE.Mesh(headerGeo, this.buildingMatConcrete);
      header.position.set(0, 8.4, 0.32);
      portalGroup.add(header);

      // Prominent Front Tunnel Portal Entrance Sign ("SAURABH METRO TUNNEL" - Mounted in FRONT of pillars and beam at Z=0.52)
      const portalSignFrame = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.3, 0.12), this.stationCanopyMat);
      portalSignFrame.position.set(0, 8.4, 0.44);
      portalGroup.add(portalSignFrame);

      const portalSignGeo = new THREE.PlaneGeometry(7.2, 2.12);
      const portalSign = new THREE.Mesh(portalSignGeo, this.matSaurabhTunnel);
      portalSign.position.set(0, 8.4, 0.52);
      portalGroup.add(portalSign);

      // Flashing Entrance Warning Lamps with Stanchion Mounts (In front at Z=0.50)
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
      for (let s of [-3.5, 3.5]) {
        const stem = new THREE.Mesh(stemGeo, this.overheadMat);
        stem.position.set(s, 9.6, 0.48);
        portalGroup.add(stem);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), this.beaconRedMat);
        beacon.position.set(s, 9.85, 0.48);
        portalGroup.add(beacon);
      }

      chunk.add(portalGroup);
    }

    // 5. Glowing Neon Tunnel Rib Rings throughout interior (Full 360-degree Tubular Rings)
    for (let r = 0; r < 3; r++) {
      const rz = -r * 15 - 7.5;
      const ribGeo = new THREE.TorusGeometry(5.35, 0.08, 6, 24, Math.PI * 2);
      const rib = new THREE.Mesh(ribGeo, (r % 2 === 0 ? this.neonCyanMat : this.neonSignMat));
      rib.position.set(0, 2.5, rz);
      chunk.add(rib);

      // Side Emergency Lighting Niches
      for (let s of [-4.8, 4.8]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), this.stationLightMat);
        lamp.position.set(s, 2.2, rz);
        chunk.add(lamp);
      }
    }
  }

  // Streamlined 3D Subway Bullet Train with Exact Rooftop Catwalk, Pantograph & Ramp
  createAdvancedTrainMesh(length = 18.0, height = 3.2, width = 2.0, isMoving = false, hasRamp = false) {
    const group = new THREE.Group();

    // 1. Main Metallic Subway Car Body (Ends flush below roof deck)
    const bodyHeight = height - 0.2;
    const bodyGeo = new THREE.BoxGeometry(width, bodyHeight, length);
    const body = new THREE.Mesh(bodyGeo, this.trainBodyMat);
    body.position.y = bodyHeight / 2 + 0.05;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Aerodynamic Tapered Front Cabin Nose
    const noseGeo = new THREE.BoxGeometry(width * 0.96, bodyHeight * 0.92, 1.2);
    const nose = new THREE.Mesh(noseGeo, this.trainBodyMat);
    nose.position.set(0, bodyHeight / 2 + 0.05, length / 2 + 0.55);
    nose.castShadow = true;
    group.add(nose);

    // Front Metallic Cowcatcher / Track Pilot Plow
    const plowGeo = new THREE.BoxGeometry(width * 0.94, 0.35, 0.45);
    const plow = new THREE.Mesh(plowGeo, this.trainChromeMat);
    plow.position.set(0, 0.2, length / 2 + 0.95);
    group.add(plow);

    // 3. Train Roof Deck (Exact top surface at y = height)
    const roofGeo = new THREE.BoxGeometry(width * 0.98, 0.15, length + 0.6);
    const roof = new THREE.Mesh(roofGeo, this.trainRoofMat);
    roof.position.set(0, height - 0.075, 0.2);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // 4. Rooftop Walkable Catwalk Deck (Subway Surfers signature anti-slip track)
    const catwalkGeo = new THREE.BoxGeometry(width * 0.72, 0.02, length * 0.98);
    const catwalkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, metalness: 0.2 });
    const catwalk = new THREE.Mesh(catwalkGeo, catwalkMat);
    catwalk.position.set(0, height + 0.01, 0);
    catwalk.receiveShadow = true;
    group.add(catwalk);

    // Catwalk Yellow Safety Border Lines
    for (let s of [-width * 0.35, width * 0.35]) {
      const lineGeo = new THREE.BoxGeometry(0.04, 0.025, length * 0.98);
      const line = new THREE.Mesh(lineGeo, this.trainWarningDoorMat);
      line.position.set(s, height + 0.012, 0);
      group.add(line);
    }

    // 5. Diamond Pantograph Overhead High-Voltage Power Collector
    const pantoGroup = new THREE.Group();
    const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), this.trainBogieMat);
    pantoBase.position.set(0, height + 0.05, -length * 0.35);
    pantoGroup.add(pantoBase);

    const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.75, 4);
    for (let s of [-0.25, 0.25]) {
      const pBar1 = new THREE.Mesh(barGeo, this.trainPantographMat);
      pBar1.rotation.x = Math.PI / 4;
      pBar1.position.set(s, height + 0.3, -length * 0.35 - 0.15);
      pantoGroup.add(pBar1);

      const pBar2 = new THREE.Mesh(barGeo, this.trainPantographMat);
      pBar2.rotation.x = -Math.PI / 4;
      pBar2.position.set(s, height + 0.3, -length * 0.35 + 0.15);
      pantoGroup.add(pBar2);
    }

    const pCollector = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.12), this.trainPantographMat);
    pCollector.position.set(0, height + 0.55, -length * 0.35);
    pantoGroup.add(pCollector);
    group.add(pantoGroup);

    // 6. Dual Rooftop HVAC Air Conditioning Units with Intake Grilles
    for (let ac of [-1, 1]) {
      const hvacGeo = new THREE.BoxGeometry(1.1, 0.14, 2.2);
      const hvac = new THREE.Mesh(hvacGeo, this.hvacMat);
      hvac.position.set(0, height + 0.07, ac * 4.6);
      group.add(hvac);

      const ventGeo = new THREE.BoxGeometry(0.85, 0.16, 1.8);
      const vent = new THREE.Mesh(ventGeo, this.trainBogieMat);
      vent.position.set(0, height + 0.08, ac * 4.6);
      group.add(vent);
    }

    // 7. Dynamic Multi-Layer Livery Racing Stripes
    const stripeGeo = new THREE.BoxGeometry(width + 0.04, 0.38, length + 0.8);
    const stripe = new THREE.Mesh(stripeGeo, this.trainStripeMat);
    stripe.position.set(0, 1.35, 0.3);
    group.add(stripe);

    const stripe2Geo = new THREE.BoxGeometry(width + 0.05, 0.1, length + 0.8);
    const stripe2 = new THREE.Mesh(stripe2Geo, this.trainWarningDoorMat);
    stripe2.position.set(0, 1.62, 0.3);
    group.add(stripe2);

    // 8. Cabin Aerodynamic Sloped Windshield
    const shieldGeo = new THREE.BoxGeometry(width - 0.22, 0.95, 0.25);
    const windshield = new THREE.Mesh(shieldGeo, this.trainWindshieldMat);
    windshield.position.set(0, height - 0.82, length / 2 + 1.12);
    group.add(windshield);

    // 9. Side Passenger Windows & Double Sliding Doors
    for (let side of [-1, 1]) {
      // Passenger Windows with frames
      for (let w = 0; w < 4; w++) {
        const wz = -length * 0.35 + w * (length * 0.23);
        const winFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.75), this.trainDoorTrimMat);
        winFrame.position.set(side * (width / 2 + 0.02), 2.0, wz);
        winFrame.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(winFrame);

        const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), this.trainWindowMat);
        winGlass.position.set(side * (width / 2 + 0.025), 2.0, wz);
        winGlass.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(winGlass);
      }

      // Double Passenger Sliding Doors with Caution Frames
      for (let d of [-3.2, 3.2]) {
        const doorFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), this.trainWarningDoorMat);
        doorFrame.position.set(side * (width / 2 + 0.02), 1.25, d);
        doorFrame.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(doorFrame);

        const doorInner = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.05), this.trainDoorTrimMat);
        doorInner.position.set(side * (width / 2 + 0.025), 1.25, d);
        doorInner.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(doorInner);
      }
    }

    // 10. Front Projector LED Headlights + Chrome Bezels
    for (let s of [-0.62, 0.62]) {
      const bezel = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), this.trainChromeMat);
      bezel.position.set(s, 0.8, length / 2 + 1.15);
      group.add(bezel);

      const light = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), this.trainLightMat);
      light.position.set(s, 0.8, length / 2 + 1.16);
      group.add(light);
    }

    // Red LED Rear Marker Lights
    for (let s of [-0.65, 0.65]) {
      const tailLight = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), this.trainTailLightMat);
      tailLight.position.set(s, 0.8, -length / 2 - 0.02);
      tailLight.rotation.y = Math.PI;
      group.add(tailLight);
    }

    if (isMoving) {
      const beamGeo = new THREE.ConeGeometry(2.2, 14, 12, 1, true);
      const beam = new THREE.Mesh(beamGeo, this.headlightBeamMat);
      beam.rotation.x = Math.PI / 2;
      beam.position.set(0, 0.8, length / 2 + 8.0);
      group.add(beam);
    }

    // 11. Heavy Steel Bogies & Rotating Metallic Wheel Discs
    for (let bg of [-1, 1]) {
      const bgZ = bg * (length / 2 - 2.8);
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.35, 2.8), this.trainBogieMat);
      bogie.position.set(0, 0.22, bgZ);
      group.add(bogie);

      // 4 Wheels per bogie
      for (let wx of [-width * 0.42, width * 0.42]) {
        for (let wz of [-0.9, 0.9]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10), this.trainChromeMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.24, bgZ + wz);
          group.add(wheel);
        }
      }
    }

    // 12. Climbable Subway Ramp (Starts at ground y=0, ascends flush to roof y=height)
    if (hasRamp) {
      const rampLength = 5.6;
      const rampZOffset = length / 2 + 2.4;
      const rampAngle = Math.atan2(height, 4.4);
      const rampGeo = new THREE.BoxGeometry(1.7, 0.18, rampLength);
      const ramp = new THREE.Mesh(rampGeo, this.barrierStripeMat);
      ramp.rotation.x = rampAngle;
      ramp.position.set(0, height / 2, rampZOffset);
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      group.add(ramp);
    }

    return group;
  }

  spawnTrain(x, z, isMoving = false, hasRamp = false) {
    const length = 18.0;
    const height = 3.2;
    const width = 2.0;

    const group = this.createAdvancedTrainMesh(length, height, width, isMoving, hasRamp);
    group.position.set(x, 0, z);
    this.scene.add(group);

    const obstacleObj = {
      type: 'train',
      mesh: group,
      isMoving: isMoving,
      moveSpeed: isMoving ? 12 : 0,
      hasRamp: hasRamp,
      width: width,
      height: height,
      length: length,
      topY: height,
      getBounds: () => {
        const pos = group.position;
        return {
          minX: pos.x - width / 2,
          maxX: pos.x + width / 2,
          minY: 0,
          maxY: height,
          minZ: pos.z - length / 2,
          maxZ: pos.z + length / 2 + (hasRamp ? 4.4 : 0)
        };
      }
    };

    this.activeObstacles.push(obstacleObj);
    if (isMoving) this.movingTrains.push(obstacleObj);
    return obstacleObj;
  }

  spawnHighGirder(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const beamGeo = new THREE.BoxGeometry(2.1, 1.1, 0.35);
    const beam = new THREE.Mesh(beamGeo, this.barrierMat);
    beam.position.y = 1.75;
    beam.castShadow = true;
    group.add(beam);

    const stripeGeo = new THREE.BoxGeometry(2.12, 0.25, 0.37);
    const stripe = new THREE.Mesh(stripeGeo, this.barrierStripeMat);
    stripe.position.y = 1.75;
    group.add(stripe);

    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6);
    const postL = new THREE.Mesh(postGeo, this.overheadMat);
    postL.position.set(-1.0, 1.2, 0);
    const postR = postL.clone();
    postR.position.x = 1.0;
    group.add(postL);
    group.add(postR);

    this.scene.add(group);

    const obstacleObj = {
      type: 'high_girder',
      mesh: group,
      getBounds: () => {
        const pos = group.position;
        return {
          minX: pos.x - 1.0,
          maxX: pos.x + 1.0,
          minY: 1.15,
          maxY: 2.4,
          minZ: pos.z - 0.25,
          maxZ: pos.z + 0.25
        };
      }
    };

    this.activeObstacles.push(obstacleObj);
    return obstacleObj;
  }

  spawnLowBarrier(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const boardGeo = new THREE.BoxGeometry(1.9, 0.55, 0.2);
    const board = new THREE.Mesh(boardGeo, this.barrierMat);
    board.position.y = 0.55;
    board.castShadow = true;
    group.add(board);

    const stripeGeo = new THREE.BoxGeometry(1.92, 0.18, 0.22);
    const stripe = new THREE.Mesh(stripeGeo, this.barrierStripeMat);
    stripe.position.y = 0.55;
    group.add(stripe);

    const legGeo = new THREE.BoxGeometry(0.12, 0.65, 0.5);
    const legL = new THREE.Mesh(legGeo, this.overheadMat);
    legL.position.set(-0.85, 0.32, 0);
    const legR = legL.clone();
    legR.position.x = 0.85;
    group.add(legL);
    group.add(legR);

    this.scene.add(group);

    const obstacleObj = {
      type: 'low_barrier',
      mesh: group,
      getBounds: () => {
        const pos = group.position;
        return {
          minX: pos.x - 0.95,
          maxX: pos.x + 0.95,
          minY: 0,
          maxY: 0.85,
          minZ: pos.z - 0.2,
          maxZ: pos.z + 0.2
        };
      }
    };

    this.activeObstacles.push(obstacleObj);
    return obstacleObj;
  }

  spawnStationLuggage(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Luggage Cart Base Frame
    const cartGeo = new THREE.BoxGeometry(1.8, 0.25, 1.2);
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8 });
    const cart = new THREE.Mesh(cartGeo, cartMat);
    cart.position.y = 0.25;
    cart.castShadow = true;
    group.add(cart);

    // Stacked Colorful Suitcases
    const colors = [0xff3838, 0x0984e3, 0xf1c40f, 0x2ed573];
    for (let s = 0; s < 3; s++) {
      const caseGeo = new THREE.BoxGeometry(0.55, 0.35, 0.85);
      const caseMat = new THREE.MeshLambertMaterial({ color: colors[s % colors.length] });
      const suitcase = new THREE.Mesh(caseGeo, caseMat);
      suitcase.position.set((s - 1) * 0.52, 0.55, (s % 2 === 0 ? 0.05 : -0.05));
      suitcase.castShadow = true;
      group.add(suitcase);
    }

    // Warning Beacon LED
    const ledGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xfffa65 }));
    led.position.set(0.7, 0.8, 0.4);
    group.add(led);

    this.scene.add(group);

    const obstacleObj = {
      type: 'station_luggage',
      mesh: group,
      getBounds: () => {
        const pos = group.position;
        return {
          minX: pos.x - 0.9,
          maxX: pos.x + 0.9,
          minY: 0,
          maxY: 0.95,
          minZ: pos.z - 0.6,
          maxZ: pos.z + 0.6
        };
      }
    };

    this.activeObstacles.push(obstacleObj);
    return obstacleObj;
  }

  spawnHazardBarricade(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Diagonal Striped Barrier Board
    const boardGeo = new THREE.BoxGeometry(1.9, 0.65, 0.15);
    const board = new THREE.Mesh(boardGeo, this.barrierMat);
    board.position.y = 0.6;
    board.castShadow = true;
    group.add(board);

    const stripeGeo = new THREE.BoxGeometry(1.92, 0.22, 0.17);
    const stripe = new THREE.Mesh(stripeGeo, this.barrierStripeMat);
    stripe.position.y = 0.6;
    group.add(stripe);

    // Tripod Legs & Amber Flashing Beacon Lamps
    for (let s of [-0.8, 0.8]) {
      const legGeo = new THREE.BoxGeometry(0.12, 0.7, 0.5);
      const leg = new THREE.Mesh(legGeo, this.overheadMat);
      leg.position.set(s, 0.35, 0);
      group.add(leg);

      const lampGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xff9f1a }));
      lamp.position.set(s, 1.05, 0);
      group.add(lamp);
    }

    this.scene.add(group);

    const obstacleObj = {
      type: 'hazard_barricade',
      mesh: group,
      getBounds: () => {
        const pos = group.position;
        return {
          minX: pos.x - 0.95,
          maxX: pos.x + 0.95,
          minY: 0,
          maxY: 0.9,
          minZ: pos.z - 0.3,
          maxZ: pos.z + 0.3
        };
      }
    };

    this.activeObstacles.push(obstacleObj);
    return obstacleObj;
  }

  spawnRoadblockCones(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const coneGeo = new THREE.ConeGeometry(0.3, 0.75, 6);
    for (let c of [-0.6, 0, 0.6]) {
      const cone = new THREE.Mesh(coneGeo, this.coneMat);
      cone.position.set(c, 0.37, 0);
      group.add(cone);
    }

    this.scene.add(group);

    const obstacleObj = {
      type: 'roadblock',
      mesh: group,
      getBounds: () => {
        const pos = group.position;
        return {
          minX: pos.x - 0.9,
          maxX: pos.x + 0.9,
          minY: 0,
          maxY: 0.8,
          minZ: pos.z - 0.3,
          maxZ: pos.z + 0.3
        };
      }
    };

    this.activeObstacles.push(obstacleObj);
    return obstacleObj;
  }

  populateObstacles(chunk, chunkZ) {
    const patterns = [
      'ONCOMING_EXPRESS',
      'TRAIN_LANE',
      'LOW_JUMP',
      'TRAIN_RAMP',
      'STATION_GAUNTLET',
      'SPLIT_HURDLES',
      'DOUBLE_TRAINS',
      'RAMP_TO_ROOF_RUN',
      'ZIGZAG_BARRIERS',
      'ROADBLOCK_SQUEEZE',
      'TRIPLE_CHALLENGE'
    ];
    const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const powerupTypes = ['magnet', 'multiplier', 'hoverboard', 'jetpack', 'sneakers'];

    if (chosenPattern === 'ONCOMING_EXPRESS') {
      const trainLane = Math.floor(Math.random() * 3);
      const trainX = this.LANES[trainLane];
      const trainZ = chunkZ - 28;

      this.spawnTrain(trainX, trainZ, true, false);
      const openLane1 = (trainLane + 1) % 3;
      const openLane2 = (trainLane + 2) % 3;
      this.collectibles.spawnCoinArc(this.LANES[openLane1], chunkZ - 15, 5);

      if (Math.random() > 0.5) {
        const pu = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        this.collectibles.spawnPowerUp(pu, this.LANES[openLane2], 0, chunkZ - 20);
      }

    } else if (chosenPattern === 'TRAIN_LANE') {
      const trainLane = Math.floor(Math.random() * 3);
      const isMoving = Math.random() > 0.45;
      const trainX = this.LANES[trainLane];
      const trainZ = chunkZ - 22;

      this.spawnTrain(trainX, trainZ, isMoving, false);
      const openLane = (trainLane + 1) % 3;
      this.collectibles.spawnCoinArc(this.LANES[openLane], chunkZ - 15, 5);

      if (Math.random() > 0.6) {
        const pu = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        this.collectibles.spawnPowerUp(pu, this.LANES[(trainLane + 2) % 3], 0, chunkZ - 22);
      }

    } else if (chosenPattern === 'DOUBLE_TRAINS') {
      const safeLane = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i++) {
        if (i !== safeLane) {
          const trainX = this.LANES[i];
          const trainZ = chunkZ - 22;
          this.spawnTrain(trainX, trainZ, false, Math.random() > 0.5);
        } else {
          this.collectibles.spawnCoinArc(this.LANES[i], chunkZ - 15, 5);
        }
      }

    } else if (chosenPattern === 'TRAIN_RAMP' || chosenPattern === 'RAMP_TO_ROOF_RUN') {
      const trainLane = Math.floor(Math.random() * 3);
      const trainX = this.LANES[trainLane];
      const trainZ = chunkZ - 22;

      this.spawnTrain(trainX, trainZ, false, true);

      this.collectibles.spawnCoin(trainX, 1.0, trainZ + 9.0);
      this.collectibles.spawnCoin(trainX, 2.0, trainZ + 7.0);
      this.collectibles.spawnCoin(trainX, 3.0, trainZ + 5.0);

      for (let c = 0; c < 4; c++) {
        this.collectibles.spawnCoin(trainX, 3.2, trainZ + 2.0 - c * 2.5);
      }

      if (Math.random() > 0.35) {
        const pu = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        this.collectibles.spawnPowerUp(pu, trainX, 3.2, trainZ - 11);
      }

    } else if (chosenPattern === 'STATION_GAUNTLET') {
      this.spawnStationLuggage(this.LANES[0], chunkZ - 16);
      this.spawnLowBarrier(this.LANES[1], chunkZ - 24);
      this.collectibles.spawnCoinArc(this.LANES[2], chunkZ - 18, 4);

    } else if (chosenPattern === 'LOW_JUMP') {
      const jumpLane = Math.floor(Math.random() * 3);
      const jumpX = this.LANES[jumpLane];
      const jumpZ = chunkZ - 20;

      this.spawnLowBarrier(jumpX, jumpZ);
      this.collectibles.spawnCoinArc(jumpX, jumpZ + 4, 5);

    } else if (chosenPattern === 'ZIGZAG_BARRIERS') {
      this.spawnLowBarrier(this.LANES[0], chunkZ - 12);
      this.spawnLowBarrier(this.LANES[2], chunkZ - 22);
      this.spawnStationLuggage(this.LANES[1], chunkZ - 32);
      this.collectibles.spawnCoinArc(this.LANES[1], chunkZ - 12, 3);
      this.collectibles.spawnCoinArc(this.LANES[0], chunkZ - 22, 3);
      this.collectibles.spawnCoinArc(this.LANES[2], chunkZ - 32, 3);

    } else if (chosenPattern === 'ROADBLOCK_SQUEEZE') {
      this.spawnRoadblockCones(this.LANES[0], chunkZ - 18);
      this.spawnLowBarrier(this.LANES[1], chunkZ - 18);
      this.collectibles.spawnCoinArc(this.LANES[2], chunkZ - 18, 4);

    } else if (chosenPattern === 'TRIPLE_CHALLENGE') {
      this.spawnLowBarrier(this.LANES[0], chunkZ - 20);
      this.spawnStationLuggage(this.LANES[1], chunkZ - 20);
      this.spawnTrain(this.LANES[2], chunkZ - 20, false, true);
      this.collectibles.spawnCoinArc(this.LANES[1], chunkZ - 16, 4);

      if (Math.random() > 0.5) {
        const pu = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        this.collectibles.spawnPowerUp(pu, this.LANES[0], 0, chunkZ - 26);
      }

    } else if (chosenPattern === 'SPLIT_HURDLES') {
      const freeLane = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i++) {
        if (i !== freeLane) {
          this.spawnLowBarrier(this.LANES[i], chunkZ - 22);
        } else {
          this.collectibles.spawnCoinArc(this.LANES[i], chunkZ - 22, 4);
        }
      }
    }

    // Daily Word Hunt Alphabet Letter Spawning
    if (Math.random() > 0.45) {
      let targetLetter = null;
      if (typeof Missions !== 'undefined' && Missions.getNextTargetLetter) {
        targetLetter = Missions.getNextTargetLetter();
      } else if (typeof window !== 'undefined' && window.Missions && window.Missions.getNextTargetLetter) {
        targetLetter = window.Missions.getNextTargetLetter();
      }

      if (targetLetter) {
        const letterLane = this.LANES[Math.floor(Math.random() * 3)];
        this.collectibles.spawnLetter(targetLetter, letterLane, 0.4, chunkZ - 32);
      }
    }

    // Collectible 3D Golden Key Spawning — every 4-7 chunks (infrequent but reliable)
    this.chunksSinceKey++;
    if (this.chunksSinceKey >= this.nextKeyAfterChunks) {
      this.chunksSinceKey = 0;
      this.nextKeyAfterChunks = 4 + Math.floor(Math.random() * 4); // Next key in 4-7 chunks
      const keyLane = this.LANES[Math.floor(Math.random() * 3)];
      this.collectibles.spawnKey(keyLane, 0.45, chunkZ - 24);
    }
  }

  update(delta, player, gameSpeed, onCrash, onStumble, totalDistance) {
    const playerPos = player.mesh.position;
    const playerCol = player.getCollider();

    // 1. Follow player with Sky & Animate Clouds smoothly
    this.skyGroup.position.z = playerPos.z;
    for (let c = 0; c < this.clouds.length; c++) {
      this.clouds[c].position.x += Math.sin(c + playerPos.z * 0.002) * delta * 1.5;
    }

    // 2. Keep Theme & Sky Colors constant from start to end (Sunny Metro Skyline)
    this.currentThemeIndex = 0;

    // 3. Update Moving Trains
    for (let i = 0; i < this.movingTrains.length; i++) {
      const train = this.movingTrains[i];
      train.mesh.position.z += (train.moveSpeed + gameSpeed * 0.15) * delta;
    }

    // 4. Collision, Accurate Rooftop Heights & Ramp Ascending
    let calculatedGroundHeight = 0;

    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      const bounds = obs.getBounds();

      // Check if Player is on Train Roof or climbing Ramp
      if (obs.type === 'train') {
        const onX = playerPos.x >= bounds.minX - 0.35 && playerPos.x <= bounds.maxX + 0.35;
        const onZ = playerPos.z >= bounds.minZ - 0.2 && playerPos.z <= bounds.maxZ;

        if (onX && onZ) {
          if (obs.hasRamp && playerPos.z > bounds.maxZ - 4.4) {
            // Ascending the ramp smoothly from 0 to topY
            const rampProgress = Math.max(0, Math.min(1, (bounds.maxZ - playerPos.z) / 4.2));
            calculatedGroundHeight = Math.max(calculatedGroundHeight, rampProgress * obs.topY);
          } else if (player.y >= obs.topY - 0.55 || (player.isGrounded && player.y >= obs.topY - 0.15)) {
            // Running cleanly on top of the train roof deck
            calculatedGroundHeight = Math.max(calculatedGroundHeight, obs.topY);
          }
        }
      }

      // Check Stumble Graze (Side collision)
      const isGlancingX = (Math.abs(playerCol.minX - bounds.maxX) < 0.15 || Math.abs(playerCol.maxX - bounds.minX) < 0.15);
      const isOverlappingZ = playerCol.maxZ > bounds.minZ + 0.2 && playerCol.minZ < bounds.maxZ - 0.2;
      const isOverlappingY = playerCol.minY < bounds.maxY && playerCol.maxY > bounds.minY;

      if (isGlancingX && isOverlappingZ && isOverlappingY && !player.hasJetpack) {
        if (onStumble) onStumble();
      }

      // Check Fatal Head-On Box Collision
      const overlapX = playerCol.maxX > bounds.minX + 0.18 && playerCol.minX < bounds.maxX - 0.18;
      const overlapY = playerCol.maxY > bounds.minY + 0.1 && playerCol.minY < bounds.maxY;
      const overlapZ = playerCol.maxZ > bounds.minZ + 0.2 && playerCol.minZ < bounds.maxZ - 0.2;

      if (overlapX && overlapY && overlapZ) {
        if (obs.type === 'train') {
          // If runner is on the roof or ramp, let them run safely!
          if (player.y >= obs.topY - 0.2) {
            continue; // Safely running on top of train
          }
          if (obs.hasRamp && playerPos.z > bounds.maxZ - 4.4 && player.y >= calculatedGroundHeight - 0.35) {
            continue; // Safely climbing ramp
          }
        }

        if (obs.type === 'high_girder' && player.isSliding) {
          continue; // Safely slid underneath
        }

        if (obs.type === 'low_barrier' || obs.type === 'hazard_barricade' || obs.type === 'station_luggage' || obs.type === 'roadblock') {
          if (player.isGrounded === false && player.y > 0.8) {
            continue; // Safely jumped over
          }
        }

        if (player.hasJetpack) {
          continue; // Flying safely in the sky
        }

        if (player.hasHoverboard) {
          player.breakHoverboard();
          this.removeObstacle(i);
          return;
        }

        // Fatal crash
        if (onCrash) {
          onCrash(obs);
          return;
        }
      }

      // Cleanup passed obstacles
      if (obs.mesh.position.z > playerPos.z + 25) {
        this.removeObstacle(i);
      }
    }

    player.setGroundHeight(calculatedGroundHeight);

    // 5. Procedural Infinite Chunk Recycling (Keep world endlessly spawning ahead)
    while (this.chunks.length > 0 && this.chunks[0].z > playerPos.z + this.CHUNK_LENGTH + 20) {
      const oldestChunk = this.chunks.shift();
      this.disposeChunk(oldestChunk.mesh);
      this.spawnChunk();
    }
  }

  disposeChunk(chunkGroup) {
    if (!chunkGroup) return;
    chunkGroup.traverse((child) => {
      if (child.isMesh && child.geometry && !child.geometry._isShared) {
        child.geometry.dispose();
      }
    });
    this.scene.remove(chunkGroup);
  }

  removeObstacle(index) {
    const obs = this.activeObstacles[index];
    if (obs) {
      if (obs.mesh) {
        obs.mesh.traverse((child) => {
          if (child.isMesh && child.geometry && !child.geometry._isShared) {
            child.geometry.dispose();
          }
        });
        this.scene.remove(obs.mesh);
      }
      this.activeObstacles.splice(index, 1);
      const mIdx = this.movingTrains.indexOf(obs);
      if (mIdx !== -1) this.movingTrains.splice(mIdx, 1);
    }
  }

  clear() {
    this.chunks.forEach(c => this.disposeChunk(c.mesh));
    this.chunks = [];
    while (this.activeObstacles.length > 0) {
      this.removeObstacle(0);
    }
    this.movingTrains = [];
    this.nextChunkZ = 0;
    this.currentThemeIndex = 0;
    this.initEnvironment();
  }
}

if (typeof window !== 'undefined') {
  window.WorldManager = WorldManager;
}
if (typeof globalThis !== 'undefined') {
  globalThis.WorldManager = WorldManager;
}
if (typeof global !== 'undefined') {
  global.WorldManager = WorldManager;
}
