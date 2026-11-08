import type { Sim } from '../upstream/src/sim/sim';
export type Plan={start:number;from:number;kind:string;beat?:string;variant?:number;jumpTime?:number;lateEvade?:boolean;evaded?:boolean;fastTransfer?:boolean;jumped?:boolean;exited?:boolean};
export function plansOf(s:Sim):Plan[]{return s.obs.filter(o=>o.planKind&&Math.abs((o.d0-48)%150)<.001)
 .map(o=>({start:o.d0-8,from:o.lane,kind:o.planKind!,beat:o.actionBeat,variant:o.actionVariant}));}
export function driveTraffic(s:Sim,plans:Plan[]){
 const p=plans.find(p=>s.d>=p.start-40&&s.d<p.start+110);
 const move=(lane:number)=>{if(s.lane!==lane)s.lane<lane?s.right():s.left();};
 const entry = s.obs.find(o => (!p || !['railway', 'evasion'].includes(p.kind) || o.d0 < p.start) && !o.planKind && (o.kind==='low'||o.kind==='overhead') &&
   o.lane===s.lane && o.d0>s.d && o.d0-s.d<=s.speed*.22);
 if(entry && s.grounded && !s.sliding) {
  if(entry.kind==='low')s.jump();else s.down();
 }
 if(!p)return;
 if (p.kind === 'railway' || p.kind === 'evasion') {
  const roof = s.obs.find(o => o.kind === 'train' && o.d0 >= p.start + 42 && o.d0 <= p.start + 44);
  const local = s.d - p.start;
  if (p.kind === 'railway' && local >= 37) {
   if (roof && !p.jumped && s.d >= roof.d0 + 1) {
    s.jump();
    p.jumped = true;
    p.jumpTime = s.time;
    p.fastTransfer = s.power.shoes > 0;
   }
   if (roof && p.jumpTime !== undefined && !p.exited && p.fastTransfer &&
       s.lane === roof.lane && s.time - p.jumpTime >= .25 && !s.grounded) {
    s.down();
    p.exited = true;
   }
   if (roof && p.jumped && local < 75 && (s.laneT >= .55 || s.time === p.jumpTime)) move(roof.lane);
  } else if ((p.start > 40 || s.d >= 30) && s.laneT >= .55) move(p.from);
  if (p.kind === 'evasion' && s.y > 2 && !s.grounded && !s.fastFall &&
      s.obs.some(o => o.kind === 'overhead' && o.lane === s.lane &&
        o.d0 > s.d && o.d0 - s.d <= s.speed * .43)) s.down();
  const barrier = s.obs.find(o => (o.kind === 'low' || o.kind === 'overhead') &&
   o.lane === s.lane && o.d0 >= p.start + 8 && o.d0 <= p.start + 84 &&
   o.d0 > s.d && o.d0 - s.d <= s.speed * .22);
  if (barrier && s.grounded && s.y < .2 && !s.sliding) {
   if (barrier.kind === 'low') s.jump();
   else s.down();
  }
  return;
 }
 const local=s.d-p.start;
 if(local<12){move(1);return;}
 if(local<30&&!p.lateEvade)move(p.from);
 if(p.beat){
  const variant=p.variant||0,shift=(variant%3-1)*3;
  if(p.beat==='A'){if(p.lateEvade&&!p.evaded){const vehicle=s.obs.find(o=>o.activation===p.start&&o.lane===1);if(vehicle&&(vehicle.d0-s.d)/(s.speed+(vehicle.trainSpeed||0))<=.45)p.evaded=true;else {move(1);return;}}if(p.lateEvade&&local<82)move(p.from);const slide=Math.floor(variant/3)%2===1;if(local>=52+shift-s.speed*.2&&!p.jumped){if(slide)s.down();else s.jump();p.jumped=true;}if(local>=82-s.speed*.2&&!p.exited){if(slide)s.jump();else s.down();p.exited=true;}}
  else if(p.beat==='B'){if(local>=36+shift&&!p.jumped){s.jump();move(2-p.from);p.jumped=true;p.jumpTime=s.time;}if(p.jumped&&local<90&&s.time>=(p.jumpTime||0)+.08)move(2-p.from);if(local>=82-s.speed*.2&&!p.exited){s.down();p.exited=true;}}
  else if(local>=82-s.speed*.2&&!p.exited){s.jump();p.exited=true;}
  if(local>=100)move(1);return;
 }
 if((p.kind==='transfer'||p.kind==='roof-traffic')&&local>=36&&!p.jumped){s.jump();move(1);p.jumped=true;}
 if(p.kind==='dodge'&&local>=52-s.speed*.2&&!p.jumped){if((p.variant||0)%2===1)s.down();else s.jump();p.jumped=true;}
 if(local>=82-s.speed*.2&&!p.exited){if(p.kind==='double'||(p.kind==='dodge'&&(p.variant||0)%2===1))s.jump();else s.down();p.exited=true;}
 if(local>=100)move(1);
}

export { trafficEncounter } from "../upstream/src/ciac/encounters";

export { actionEncounter } from "../upstream/src/ciac/action-section";
