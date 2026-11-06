import type { Sim } from '../upstream/src/sim/sim';
export type Plan={start:number;from:number;kind:string;jumped?:boolean;exited?:boolean};
export function plansOf(s:Sim):Plan[]{return s.obs.filter(o=>o.planKind&&Math.abs((o.d0-48)%150)<.001)
 .map(o=>({start:o.d0-8,from:o.lane,kind:o.planKind!}));}
export function driveTraffic(s:Sim,plans:Plan[]){
 const p=plans.find(p=>s.d>=p.start-40&&s.d<p.start+110);
 const move=(lane:number)=>{if(s.lane!==lane)s.lane<lane?s.right():s.left();};
 if(!p)return;
 const local=s.d-p.start;
 if(local<12){move(1);return;}
 if(local<30)move(p.from);
 if((p.kind==='transfer'||p.kind==='roof-traffic')&&local>=36&&!p.jumped){s.jump();move(1);p.jumped=true;}
 if(p.kind==='dodge'&&local>=52-s.speed*.2&&!p.jumped){s.jump();p.jumped=true;}
 if(local>=82-s.speed*.2&&!p.exited){if(p.kind==='double')s.jump();else s.down();p.exited=true;}
 if(local>=100)move(1);
}

export { trafficEncounter } from "../upstream/src/ciac/encounters";
