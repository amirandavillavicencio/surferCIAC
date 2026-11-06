import {readFile,writeFile,copyFile} from 'node:fs/promises';
await copyFile('ciac/train-dynamics.ts','upstream/src/ciac/train-dynamics.ts');
function patch(s,a,b){if(s.split(a).length!==2)throw Error('Train dynamics anchor: '+a);return s.replace(a,b);}
let types=await readFile('upstream/src/sim/types.ts','utf8');
types=patch(types,'  meet: number;', '  planKind?: string;\n  activation?: number;\n  trainSpeed?: number;\n  travelTime: number;\n  meetEnd: number;\n  meet: number;');
await writeFile('upstream/src/sim/types.ts',types);
let track=await readFile('upstream/src/sim/track.ts','utf8');
track=patch(track,'export interface Spec {','export interface Spec {\n  planKind?: string;\n  activation?: number;\n  trainSpeed?: number;');
track=patch(track,'if (d >= s.d0 && d <= s.d1) walkTrain[i * L + s.lane] = 1;', 'if (d >= s.d0 && d <= s.d1 + PLAYER.halfD) walkTrain[i * L + s.lane] = 1;');
await writeFile('upstream/src/sim/track.ts',track);
let sim=await readFile('upstream/src/sim/sim.ts','utf8');
sim="import { timedFront } from '../ciac/train-dynamics';\n"+sim;
sim=patch(sim,'      id: this.nextId++, kind: s.kind,', '      planKind:s.planKind, activation:s.activation, trainSpeed:s.trainSpeed, travelTime:0, meetEnd:s.d1,\n      id: this.nextId++, kind: s.kind,');
sim=patch(sim,`  private placeMover(o: Ob) {
    o.d0 = moverFront(o.meet, this.d);
    o.d1 = o.d0 + o.len;
  }`, `  private placeMover(o: Ob, dt = 0, previousD = this.d) {
    if (o.activation !== undefined && o.trainSpeed !== undefined) {
      const fraction = this.d <= o.activation ? 0 : previousD >= o.activation ? 1
        : (this.d-o.activation)/(this.d-previousD);
      o.travelTime += dt * fraction;
      o.d0 = timedFront(o.activation, o.trainSpeed, o.travelTime);
    } else o.d0 = moverFront(o.meet, this.d); // compatibility for explicit legacy fixtures
    o.d1 = o.d0 + o.len;
  }`);
sim=patch(sim,"if (o.kind === 'mtrain') this.placeMover(o);", "if (o.kind === 'mtrain') this.placeMover(o, dt, prevD);");
sim=patch(sim,"    if (o.kind === 'mtrain') return { kind: 'mtrain', lane: o.lane, d0: o.meet, d1: o.meet + moverSpan(o.len), cars: o.cars };", "    if (o.kind === 'mtrain') return { kind: 'mtrain', lane: o.lane, d0: o.meet, d1: o.trainSpeed ? o.meetEnd : o.meet + moverSpan(o.len), cars: o.cars, activation:o.activation, trainSpeed:o.trainSpeed };");
sim=patch(sim,'        c.d += (this.d - c.d) * k + this.speed * dt * 0.3;', `        const nextD = c.d + (this.d - c.d) * k + this.speed * dt * 0.3;
        if (this.track.course.intersects(nextD-1,nextD+1)) c.pulled=false;
        else c.d=nextD;`);
await writeFile('upstream/src/sim/sim.ts',sim);
