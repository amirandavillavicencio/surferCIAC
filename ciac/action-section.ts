import { laneX, OB, trainLength } from '../config';
import type { Spec } from '../sim/track';
import { trafficEncounter } from './encounters';
import { occupiedLane } from './physical-lane';
export type ActionBeat='A'|'B'|'C';
export const ACTION_BEATS:ActionBeat[]=['A','B','C'];
export function actionShift(variant:number) { return (variant%3-1)*3; }
export function actionEncounter(start:number,from:number,beat:ActionBeat,variant:number):Spec[] {
  const kind=beat==='A'?'dodge':beat==='B'?'transfer':'double';
  const specs=trafficEncounter(start,from,kind,variant);
  const shift=actionShift(variant);
  if(beat==='A') {
    const middle=specs.find(s=>s.kind==='low'&&s.d0===start+52)!;
    const sliding=Math.floor(variant/3)%2===1;
    middle.kind=sliding?'overhead':'low';middle.d0+=shift;
    middle.d1=middle.d0+OB[middle.kind].depth;
    const exit=specs.find(s=>s.d0===start+82)!;
    exit.kind=sliding?'low':'overhead';exit.d1=exit.d0+OB[exit.kind].depth;
  } else if(beat==='B') {
    // The central track remains clear of stationary trains: the preceding
    // oncoming vehicle uses that physical approach corridor. Transfer between
    // the two outer roofs is a real two-lane jump, with moving traffic below.
    for(const s of specs) {
      if(s.kind==='mtrain') { s.lane=1; continue; }
      if(s.kind==='ramp'||s.kind==='train'){s.d0+=shift;s.d1+=shift;}
      if(s.kind==='train'&&s.lane===1)s.lane=2-from;
      if(s.d0===start+82)s.lane=2-from;
    }
  } else {
    const vehicles=specs.filter(s=>s.kind==='mtrain');
    const delay=variant%3;
    vehicles[1].activation!+=delay;vehicles[1].d0+=delay;vehicles[1].d1+=delay;
    if(Math.floor(variant/3)%2) {
      const cars=vehicles[0].cars;vehicles[0].cars=vehicles[1].cars;vehicles[1].cars=cars;
    }
    const roof=specs.find(s=>s.kind==='train')!;
    roof.cars=2+variant%2;roof.d1=roof.d0+trainLength(roof.cars);
  }
  return specs.map(s=>({...s,actionBeat:beat,actionVariant:variant}));
}
export function actionRoute(start:number,from:number,beat:ActionBeat,variant:number,d:number,speed:number) {
  const shift=actionShift(variant), local=d-start;
  let lane=local<12?1:from, y=0, sliding=false;
  const arc=(t:number)=> t<.34 ? 30.3*.34*t-.5*30.3*t*t : 1.75-.5*30.3*1.15*(t-.34)*(t-.34);
  if(beat==='A') {
    const vehicleSpeed=52+(variant%5)*4;
    const meet=speed*218/(speed+vehicleSpeed);
    lane=local<meet-speed*.45?1:from;
    const middle=52+shift;
    const middleSlide=Math.floor(variant/3)%2===1;
    sliding=middleSlide ? Math.abs(local-middle)<4 : Math.abs(local-82)<4;
    const jump=middleSlide?82:middle;
    const t=(local-jump+speed*.2)/speed;
    if(t>0&&t<.66)y=Math.max(0,arc(t));
  } else {
    const ramp=beat==='B'?24+shift:24;
    const sourceEnd=ramp+7+trainLength(beat==='B'?4:2+variant%2);
    if(local>=ramp&&local<ramp+7)y=(local-ramp)/7*3.4;
    else if(local>=ramp+7&&local<=sourceEnd)y=3.4;
    else if(local>sourceEnd)y=Math.max(0,3.4-.5*34.9*((local-sourceEnd)/speed)**2);
    if(beat==='B') {
      const jump=36+shift,t=(local-jump)/speed,target=2-from;
      if(t>=0&&t<.66){
        const k=Math.min(1,t/.3);const x=laneX(from)+(laneX(target)-laneX(from))*(1-(1-k)**3);
        lane=occupiedLane(x);y=3.4+Math.max(0,arc(t));
      } else if(t>=.66){
        lane=target;const end=40+shift+trainLength(3);
        y=local<=end?3.4:Math.max(0,3.4-.5*34.9*((local-end)/speed)**2);
      }
      sliding=Math.abs(local-82)<4;
    } else {
      const t=(local-82+speed*.2)/speed;
      if(t>0&&t<.66)y=Math.max(y,Math.max(0,arc(t)));
    }
  }
  return {lane,y:y+(sliding?.45:.85)};
}
