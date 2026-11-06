import { readFile, writeFile } from 'node:fs/promises';

// Se aplica DESPUÉS de preparar el motor original. No modifica el submódulo.
function patch(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error('Render de actores: cambió ' + label + ' (' + count + ')');
  return source.replace(before, after);
}

const worldPath = 'upstream/src/view/world.ts';
let world = await readFile(worldPath, 'utf8');
world = patch(world,
  '  private readonly movers: Ob[] = [];',
  '  private readonly movers: Ob[] = [];\n  private trainLinks: Instanced;',
  'pool de uniones');
world = patch(world,
  "    this.pools.train = new Instanced(node('train'), 60, s, { cast: true, receive: true, colors: true });",
  `    const trainProto = node('train');
    const originalSurface = (trainProto as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const trainSurface = originalSurface.clone();
    trainSurface.roughness = Math.min(trainSurface.roughness, 0.76);
    trainSurface.metalness = Math.max(trainSurface.metalness, 0.12);
    trainSurface.emissive.set(0x101923);
    trainSurface.emissiveIntensity = 0.08;
    this.pools.train = new Instanced(trainProto, 72, s, {
      cast: true, receive: true, colors: true, material: trainSurface
    });
    const coupler = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.64, CAR_GAP + 0.18),
      new THREE.MeshLambertMaterial({ color: 0x304654 })
    );
    this.trainLinks = new Instanced(coupler, 60, s, { name: 'train-coupler' });`,
  'material y uniones del tren');
world = patch(world,
  '    const movers = this.movers;\n    movers.length = 0;',
  '    const movers = this.movers;\n    movers.length = 0;\n    this.trainLinks.begin();',
  'inicio del render');
world = patch(world,
  'if (o.d0 > pd + VIEW_AHEAD || o.d1 < pd - 12) continue;',
  'if (o.d0 > pd + VIEW_AHEAD + CAR_LEN || o.d1 < pd - 26) continue;',
  'visibilidad del tren');
world = patch(world,
  `        for (let c = 0; c < o.cars; c++) {
          const dc = o.d0 + c * (CAR_LEN + CAR_GAP) + CAR_LEN / 2;
          m4.makeTranslation(x, 0, zOf(dc));
          this.pools.train.add(m4, TRAIN_TINTS[o.variant % 3]);
        }`,
  `        for (let c = 0; c < o.cars; c++) {
          const dc = o.d0 + c * (CAR_LEN + CAR_GAP) + CAR_LEN / 2;
          // Render completo por vagón: no se elimina el tren como una sola unidad.
          if (dc + CAR_LEN / 2 < pd - 26 || dc - CAR_LEN / 2 > pd + VIEW_AHEAD + CAR_LEN) continue;
          m4.makeTranslation(x, 0, zOf(dc));
          this.pools.train.add(m4, TRAIN_TINTS[o.variant % 3]);
          if (c > 0) {
            // Unir físicamente los vagones, sin inventar trenes en nuevas vías.
            const linkCenter = dc - (CAR_LEN + CAR_GAP) / 2;
            m4.makeTranslation(x, 0.43, zOf(linkCenter));
            this.trainLinks.add(m4);
          }
        }`,
  'render individual de vagones');
world = patch(world,
  '    for (const k in this.pools) this.pools[k].end();',
  '    for (const k in this.pools) this.pools[k].end();\n    this.trainLinks.end();',
  'cierre del render');
world = patch(world,
  'const all = [...Object.values(this.pools),',
  'const all = [this.trainLinks, ...Object.values(this.pools),',
  'precarga de materiales');
await writeFile(worldPath, world);

const playerPath = 'upstream/src/view/player.ts';
let player = await readFile(playerPath, 'utf8');
player = patch(player,
  '  private menuT = 0;',
  '  private menuT = 0;\n  private shadow: THREE.Mesh;\n  private runRate = 1;',
  'estado del personaje');
player = patch(player,
  '    scene.add(this.root);',
  `    scene.add(this.root);
    // Sombra sencilla de contacto: acompaña el suelo mientras el modelo salta.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 24),
      new THREE.MeshBasicMaterial({
        color: 0x172735, transparent: true, opacity: 0.22, depthWrite: false
      })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.035;
    this.shadow.scale.y = 0.65;
    scene.add(this.shadow);`,
  'sombra del personaje');
player = patch(player,
  '        m.frustumCulled = false;',
  `        m.frustumCulled = false;
        // Conserva skinning y texturas GLB, con lectura de volumen más clara.
        const finish = (material: THREE.Material): THREE.Material => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return material;
          const adjusted = material.clone();
          adjusted.roughness = Math.min(adjusted.roughness, 0.86);
          adjusted.emissive.set(0x101923);
          adjusted.emissiveIntensity = 0.08;
          return adjusted;
        };
        m.material = Array.isArray(m.material) ? m.material.map(finish) : finish(m.material);`,
  'superficie del personaje');
player = patch(player,
  '    this.stumbleT = 0;\n    this.root.scale.set(1, 1, 1);',
  `    this.stumbleT = 0;
    this.runRate = 1;
    this.shadow.position.set(0, 0.035, 0);
    this.shadow.scale.set(1, 0.65, 1);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.22;
    this.root.scale.set(1, 1, 1);`,
  'reinicio del personaje');
player = patch(player,
  '    this.root.position.set(0, 0, 0);',
  '    this.root.position.set(0, 0, 0);\n    this.shadow.position.set(0, 0.035, 0);',
  'personaje en menú');
player = patch(player,
  '    this.stumbleT = Math.max(0, this.stumbleT - dt);',
  `    this.stumbleT = Math.max(0, this.stumbleT - dt);
    // El clip de carrera cambia gradualmente incluso si la pista desacelera.
    const normal = speedAt(sim.d);
    const desiredRunRate = (0.9 + normal / 22) * (sim.speed / normal);
    this.runRate += (desiredRunRate - this.runRate) * (1 - Math.exp(-dt * 8));`,
  'cadencia continua');
const runExpression = '(0.9 + speedAt(sim.d) / 22) * sim.speed / speedAt(sim.d)';
if (player.split(runExpression).length !== 3) throw new Error('No se encontraron ambas cadencias originales');
player = player.replaceAll(runExpression, 'this.runRate');
player = patch(player,
  '    this.root.position.set(sim.x, sim.y, 0);',
  `    const lift = Math.max(0, sim.y - sim.groundY);
    this.shadow.position.set(sim.x, sim.groundY + 0.035, 0);
    this.shadow.scale.set(1 + lift * 0.1, 0.65 + lift * 0.05, 1);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.22 / (1 + lift * 0.45);
    this.root.position.set(sim.x, sim.y, 0);`,
  'sombra durante saltos');
await writeFile(playerPath, player);
