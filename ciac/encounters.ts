import { OB, trainLength, MOVER } from '../config';
import type { Spec } from '../sim/track';

// One encounter fits the unchanged usable interval between two quiz reserves.
// The outside lane remains an escape after the oncoming train has passed.
export function encounter(start: number, from: number, mode: 'rest' | 'flow' | 'challenge' = 'flow'): Spec[] {
  const other = 2 - from;
  const roof = trainLength(3);
  const specs: Spec[] = [
    mode === 'challenge'
      ? {kind:'train',lane:1,d0:start+8,d1:start+8+trainLength(1),cars:1}
      : {kind:'low',lane:1,d0:start+8,d1:start+8+OB.low.depth},
    {kind:'ramp',lane:from,d0:start+24,d1:start+31},
    {kind:'train',lane:from,d0:start+31,d1:start+31+roof,cars:3},
    {kind:'train',lane:1,d0:start+40,d1:start+40+roof,cars:3},
    {kind:'mtrain',lane:other,d0:start+18,d1:start+18+trainLength(2)/(1+MOVER.ratio),cars:2},
    {kind:'low',lane:from,d0:start+82,d1:start+82+OB.low.depth},
    {kind:'overhead',lane:1,d0:start+82,d1:start+82+OB.overhead.depth},
  ];
  return mode === 'rest' ? specs.filter(s => s.kind !== 'mtrain' && !(s.kind === 'low' && s.lane === from)) : specs;
}

// Timestamped by distance, not frame number. Used for reward placement and
// replayed through Sim in tests; it deliberately includes a real roof jump.
export function encounterRoute(start: number, from: number, d: number, speed: number) {
  const jumpAt = start + 36;
  const apexTime = .34;
  const flightTime = apexTime + apexTime / Math.sqrt(1.15);
  const landAt = jumpAt + speed * flightTime;
  if (d < jumpAt) return {lane:from, y:d>=start+24 ? Math.min(3.4,(d-start-24)/7*3.4) : 0};
  if (d < landAt) {
    const t=(d-jumpAt)/speed;
    const gravity=2*1.75/(.34*.34);
    const y = t <= apexTime ? gravity*apexTime*t-.5*gravity*t*t
      : 1.75-.5*gravity*1.15*(t-apexTime)*(t-apexTime);
    // Cubic lane easing crosses the halfway point after ~31ms, not 75ms.
    return {lane:t < .15*(1-Math.cbrt(.5)) ? from : 1, y:3.4+Math.max(0,y)};
  }
  if (d <= start+40+trainLength(3)) return {lane:1,y:3.4};
  const t=(d-start-40-trainLength(3))/speed;
  return {lane:1,y:Math.max(0,3.4-.5*30.3*1.15*t*t)};
}

export type TrafficKind = 'pass' | 'dodge' | 'double' | 'roof-traffic' | 'transfer' | 'recovery';
export function trafficKind(index: number, start: number): TrafficKind {
  // A shuffled family, with recovery after a multi-decision encounter. The
  // caller supplies a seeded index; difficulty never increases vehicle speed.
  const kinds: TrafficKind[] = start < 1000
    ? ['pass','dodge','roof-traffic','recovery','transfer']
    : ['pass','double','transfer','recovery','dodge','roof-traffic'];
  return kinds[((index % kinds.length)+kinds.length)%kinds.length];
}
export function trafficEncounter(start: number, from: number, kind: TrafficKind, variant = 0): Spec[] {
  const other=2-from;
  const mover=(lane:number,offset:number):Spec=>({kind:'mtrain',lane,d0:start+16,d1:start+85,
    activation:start, trainSpeed:52+((variant+offset)%5)*4,cars:1+((variant+offset)%4)});
  const anchor:Spec={kind:'overhead',lane:from,d0:start+8,d1:start+8+OB.overhead.depth};
  // Regular dodges now alternate the actual required actions: jump/slide or
  // slide/jump. A/B/C keeps its independently scripted action sequence.
  const reverseDodge=kind==='dodge' && variant%2===1;
  const exitKind=kind==='double'||reverseDodge?'low':'overhead';
  const exit:Spec={kind:exitKind,lane:from,d0:start+82,
    d1:start+82+OB[exitKind].depth};
  const specs:Spec[]=[anchor,exit];
  if(kind==='pass') {
    // Two separate oncoming waves pass beside the escape lane. Alternating
    // relative speeds changes the order of the two near-misses, not their
    // reachable path or the academic reservations.
    const center=mover(1,0), outside=mover(other,1);
    center.trainSpeed=variant%2===0?68:60; center.cars=1;
    outside.trainSpeed=variant%2===0?52:68; outside.cars=variant%2===0?3:2;
    return [...specs,center,outside];
  }
  if(kind==='dodge') {
    const middleKind=reverseDodge?'overhead':'low';
    return [...specs,{kind:middleKind,lane:from,d0:start+52,d1:start+52+OB[middleKind].depth},mover(1,0)];
  }
  if(kind==='double') {
    const a=mover(1,0), b=mover(other,2);
    // Short, fast convoys clear before the exit barrier: a ground escape
    // remains available even when the player elects not to jump.
    a.trainSpeed=variant%2===0?64:68; a.cars=1; a.d1=start+71;
    b.trainSpeed=variant%2===0?68:64; b.cars=2; b.d1=start+71;
    specs.push(a,b);
  }
  if(kind==='double'||kind==='recovery') {
    specs.push({kind:'ramp',lane:from,d0:start+24,d1:start+31},
      {kind:'train',lane:from,d0:start+31,d1:start+31+trainLength(3),cars:3});
    return specs;
  }
  // Moving vehicles remain in the third lane, beside the rooftop transfer.
  specs.push({kind:'ramp',lane:from,d0:start+24,d1:start+31},
    {kind:'train',lane:from,d0:start+31,d1:start+31+trainLength(kind==='transfer'?4:3),cars:kind==='transfer'?4:3},
    {kind:'train',lane:1,d0:start+40,d1:start+40+trainLength(3),cars:3},mover(other,3));
  // Exit after the transfer is on the center lane; the third lane is a moving hazard.
  exit.lane=1;
  return specs;
}

export function trafficRoute(start:number,from:number,kind:TrafficKind,d:number,speed:number) {
  if(d<start+12)return {lane:1,y:0};
  if(kind==='roof-traffic'||kind==='transfer')return encounterRoute(start,from,d,speed);
  let y=0;
  if(kind==='double'||kind==='recovery') {
    if(d>=start+24&&d<start+31)y=(d-start-24)/7*3.4;
    else if(d>=start+31&&d<=start+31+trainLength(3))y=3.4;
    else if(d>start+31+trainLength(3)) {const t=(d-start-31-trainLength(3))/speed;y=Math.max(0,3.4-.5*34.9*t*t);}
  }
  const jump=kind==='dodge'&&!reverseDodge?52:82;
  if((kind==='dodge'||kind==='double')&&Math.abs(d-start-jump)<speed*.3) {
    const t=(d-(start+jump-speed*.2))/speed;
    if(t>0)y=Math.max(y,Math.max(0,30.3*.34*t-.5*30.3*t*t));
  }
  return {lane:from,y};
}
