import {JUMP_V,SUPER_JUMP_V,PLAYER,laneX} from '../config';
import type { Sim } from '../sim/sim';
import type { SimEvent } from '../sim/types';
const numeric=['d','x','y','vy','groundY','speed','slideT','airTime','time'] as const;
const discrete=['lane','grounded','fastFall','alive','running'] as const;
function entities<T extends {id:number}>(target:T[],source:T[]) {
  for(let i=0;i<source.length;i++)target[i]=Object.assign(target[i]||{},source[i]);
  target.length=source.length;
}
function create(sim:Sim):Sim {
  const result=Object.create(Object.getPrototypeOf(sim)) as Sim;
  result.obs=[];result.coinList=[];result.powers=[];
  result.power={magnet:0,shoes:0,double:0};
  copy(result,sim);return result;
}
function copy(target:Sim,source:Sim) {
  for(const key of numeric)(target as any)[key]=source[key];
  for(const key of discrete)(target as any)[key]=source[key];
  Object.assign(target.power,source.power);
  entities(target.obs,source.obs);entities(target.coinList,source.coinList);entities(target.powers,source.powers);
}
// Presentation owns its snapshots. It never writes to Sim or passes an
// interpolated state to collision, input, question validation or generation.
export class Presentation {
  private previous:Sim;
  private current:Sim;
  readonly view:Sim;
  private at=0;
  private span=0;
  private shown=0;
  private readonly index=new Map<number,any>();
  private pending:{at:number;event:SimEvent}[]=[];
  constructor(sim:Sim){this.previous=create(sim);this.current=create(sim);this.view=create(sim);}
  reset(sim:Sim){copy(this.previous,sim);copy(this.current,sim);copy(this.view,sim);this.at=this.span=this.shown=0;this.pending.length=0;}
  capture(sim:Sim,dt:number,events:SimEvent[]) {
    const old=this.previous;this.previous=this.current;this.current=old;
    copy(this.current,sim);this.at+=dt;this.span=dt;
    const landing=events.some(e=>e.type==='land');
    for(const event of events){
      const input=!landing&&(event.type==='jump'||event.type==='slide'||event.type==='lane');
      // Inputs were applied before this integration step; land/buffered-jump
      // events belong to its end. Never restart an input clip a tick later.
      if(input&&event.type==='jump'){
        this.previous.grounded=false;this.previous.vy=event.super?SUPER_JUMP_V:JUMP_V;
        this.previous.slideT=0;this.previous.airTime=0;this.previous.fastFall=false;
      }
      if(input&&event.type==='slide')this.previous.slideT=PLAYER.slideTime;
      this.pending.push({at:input?this.at-dt:this.at,event});
    }
    this.pending.sort((a,b)=>a.at-b.at);
  }
  sample(alpha:number) {
    const raw=this.at-this.span+Math.max(0,Math.min(1,alpha))*this.span;
    const time=Math.max(this.shown,raw);
    const t=this.span?Math.max(0,Math.min(1,(time-this.at+this.span)/this.span)):1;
    const dt=time-this.shown;this.shown=time;
    const a=this.previous,b=this.current,v=this.view;
    for(const key of numeric)(v as any)[key]=a[key]+(b[key]-a[key])*t;
    for(const key of discrete)(v as any)[key]=(t<1?a:b)[key];
    Object.assign(v.power,(t<1?a:b).power);
    this.blend(v.obs,a.obs,b.obs,t,['d0','d1','pd0','pd1']);
    this.blend(v.coinList,a.coinList,b.coinList,t,['d','x','y']);
    this.blend(v.powers,a.powers,b.powers,t,[]);
    // A support plane must be an actual visible surface, never a lerp between
    // a roof and the ground when crossing its edge. Physics remains untouched.
    let support=0;
    for(const o of v.obs){
      if(!o.walk||v.d+PLAYER.halfD*.5<o.d0||v.d-PLAYER.halfD*.5>o.d1)continue;
      if(Math.abs(v.x-laneX(o.lane))>o.halfW+PLAYER.halfW-.25)continue;
      const top=o.kind==='ramp'?Math.max(0,Math.min(1,(v.d-o.d0)/(o.d1-o.d0)))*o.yt:o.yt;
      if(top<=v.y+.02)support=Math.max(support,top);
    }
    v.groundY=support;
    const events:SimEvent[]=[];
    while(this.pending.length&&this.pending[0].at<=time+1e-9){const queued=this.pending.shift()!;events.push(Object.assign({},queued.event,{presentationAge:Math.max(0,time-queued.at)}));}
    return {sim:v,dt,time,events};
  }
  private blend(target:any[],a:any[],b:any[],t:number,keys:string[]) {
    this.index.clear();for(const item of b)this.index.set(item.id,item);
    // Retain the previous set until its timestamp, so collection/despawn does
    // not happen a physics tick ahead of the rest of the scene.
    const source=t<1?a:b;
    for(let i=0;i<source.length;i++){
      const first=source[i],last=this.index.get(first.id)||first;
      const item=target[i]=Object.assign(target[i]||{},first);
      for(const key of keys)item[key]=first[key]+(last[key]-first[key])*t;
    }
    target.length=source.length;
  }
}
