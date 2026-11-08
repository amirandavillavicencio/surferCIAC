import type {Sim} from '../sim/sim';
import type {SimEvent} from '../sim/types';
import {laneX,PLAYER} from '../config';
export type ChaseMode='hidden'|'intro'|'distant'|'stumble'|'catching'|'captured';
export interface ChaseFrame {mode:ChaseMode;x:number;y:number;d:number;gap:number;phase:number;air:boolean;visible:boolean;reach:number; urgency:number;}
type Point={d:number;x:number;y:number;groundY:number;grounded:boolean};
const frame=():ChaseFrame=>({mode:'hidden',x:0,y:0,d:-2.4,gap:2.4,phase:0,air:false,visible:false,reach:0,urgency:0});
// State transitions adapted from Saurabh's Sprint (MIT, third_party license).
// The academic danger controls proximity; the simulator owns the actual capture.
export class ChaseState {
  previous=frame();current=frame();readonly view=frame();
  private timer=0;private history:Point[]=[];private lastD=-2.4;
  danger=0;
  shieldUntil=0;

  grantShield(distance:number) { this.shieldUntil=distance+150; }
  hasShield(distance:number) { return this.shieldUntil>distance; }
  absorbStumble(distance:number) {
    if(!this.hasShield(distance)) return false;
    this.shieldUntil=0;
    return true;
  }
  answer(correct:boolean){
    this.danger=Math.max(0,Math.min(4,this.danger+(correct?-1:1)));
    return this.danger;
  }
  reset(){this.previous=frame();this.current=frame();Object.assign(this.view,this.current);this.timer=0;this.history=[];this.lastD=-2.4;this.danger=0;this.shieldUntil=0;}
  observe(s:Sim,dt:number,events:SimEvent[]){
    Object.assign(this.previous,this.current);
    const c=this.current;
    if(!s.running){c.mode='hidden';c.visible=false;return;}
    if(c.mode==='hidden'){c.mode='intro';this.timer=6.5;this.history.push({d:0,x:0,y:0,groundY:0,grounded:true});}
    const point={d:s.d,x:s.x,y:s.y,groundY:s.groundY,grounded:s.grounded};
    if(!this.history.length||s.d>this.history[this.history.length-1].d+1e-6)this.history.push(point);
    while(this.history.length>2&&this.history[1].d<s.d-40)this.history.shift();
    if(!s.alive&&c.mode!=='catching'&&c.mode!=='captured'){c.mode='catching';this.timer=0;}
    if(s.alive&&events.some(e=>e.type==='stumble')){
      this.danger=Math.min(4,this.danger+1);
      c.mode='stumble';this.timer=.65;
    }
    if(s.alive&&this.danger>=4&&c.mode!=='captured'&&c.mode!=='catching'){
      c.mode='catching';this.timer=0;
    }
    if(s.alive&&this.danger<4&&c.mode==='catching')c.mode='distant';
    if(this.danger>0&&c.mode==='intro')c.mode='distant';
    if(c.mode==='intro'||c.mode==='stumble'){this.timer=Math.max(0,this.timer-dt);if(this.timer===0)c.mode='distant';}
    if(c.mode==='catching'){this.timer+=dt;if(c.gap<.76){c.mode='captured';}}
    const target=c.mode==='distant'?[14,6.4,4.4,2.1,1.2][this.danger]
      :c.mode==='catching'||c.mode==='captured'?.65:c.mode==='stumble'?Math.max(2.1,8-this.danger*1.8):2.4;
    const change=(target-c.gap)*(1-Math.exp(-dt*(c.mode==='distant'?1.5:6)));
    // A falling-back guard still runs forward; it must not moonwalk backwards.
    c.gap+=Math.max(-dt*(c.mode==='catching'?18:Math.max(3,s.speed*.6)),Math.min(dt*s.speed*.45,change));
    const d=s.d-c.gap;c.d=d;
    let a=this.history[0]||point,b=a;
    for(const p of this.history){if(p.d<=d)a=p;if(p.d>=d){b=p;break;}b=p;}
    const t=b.d>a.d?Math.max(0,Math.min(1,(d-a.d)/(b.d-a.d))):1;
    c.x=a.x+(b.x-a.x)*t;c.y=a.y+(b.y-a.y)*t;c.air=!(t<.5?a:b).grounded;
    c.urgency += (this.danger / 4 - c.urgency) * (1 - Math.exp(-dt * 5));
    c.phase += Math.max(0, d - this.lastD) * (1.25 + .45 * c.urgency);
    this.lastD = d;
    c.reach=c.mode==='captured'?1:c.mode==='catching'?Math.max(0,Math.min(1,(2.4-c.gap)/1.75)):0;
    if(c.mode==='catching'||c.mode==='captured'){c.y=Math.min(c.y,s.y);c.x+=(s.x-c.x)*c.reach;}
    // Replaying the runner's path handles ramps/roofs. Suppress only geometry
    // genuinely occluded by a passing vehicle, rather than draw through it.
    c.visible=c.gap<16;
    const gx=c.x-.55;
    for(const o of s.obs){
      if(d+PLAYER.halfD<o.d0||d-PLAYER.halfD>o.d1||Math.abs(gx-laneX(o.lane))>o.halfW+.3)continue;
      const top=o.kind==='ramp'?Math.max(0,Math.min(1,(d-o.d0)/(o.d1-o.d0)))*o.yt:o.yt;
      if(c.y<top-.15 && c.y+1.8>o.yb)c.visible=false;
    }
  }
  sample(t:number){const a=this.previous,b=this.current,v=this.view;Object.assign(v,t<1?a:b);v.visible=a.visible&&b.visible;
    for(const key of ['x','y','d','gap','phase','reach','urgency'] as const)v[key]=a[key]+(b[key]-a[key])*t;
    return v;
  }
}
