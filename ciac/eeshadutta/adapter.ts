import {CIACQuiz} from './quiz';
import {QuizCourse,RETIRE_BEHIND} from './course';
import {RacePace} from './pace';
declare const Track:any;
const source=globalThis as any;
const laneOf=(x:number)=>Math.max(0,Math.min(2,Math.floor(x/6+1.5)));
const groups=[['trainF','trainT','trainL','trainR','train_speeds'],['boxes'],['manholes'],['duck_obs_stop','duck_obs_stand1','duck_obs_stand2'],['jump_obs'],['rope_stop','rope_stand1','rope_stand2']];
const pickupNames=['coins','boots','flying_boost','hoverboard'];
type Saved={array:any[];items:any[];positions:any[][];exists:any[]};
class EeshaduttaCIAC {
 readonly course=new QuizCourse();readonly pace=new RacePace();readonly quiz:CIACQuiz;
 running=false;started=false;ended=false;factor=1;distance=0;lap=0;
 private apron:any[]=[];
 private saved:Saved[]=[];private before={d:0,x:-6};private noticeTimer=0;
 constructor(private gl:WebGLRenderingContext){
  for(const name of [...groups.flat(),...pickupNames]){const a=source[name] as any[];this.saved.push({array:a,items:a.slice(),positions:a.map(v=>v?.pos?.slice()),exists:a.map(v=>v?.exist)});}
  // Cover the extra near-ground area exposed by portrait projection using
  // original Track geometry/materials; no physical entities are added.
  for(const x of [-6,0,6])for(const z of [5,10,15,20,25])this.apron.push(new Track(gl,[x,0,z]));
  this.quiz=new CIACQuiz({scene:gl,course:this.course,frontier:()=>this.distance+100,notice:m=>this.notice(m),penalize:s=>this.pace.penalize(s)});
  document.getElementById('ciac-play')!.addEventListener('click',()=>this.start());
  document.getElementById('ciac-restart')!.addEventListener('click',()=>location.reload());
  document.getElementById('ciac-pause')!.addEventListener('click',()=>this.pause());
  document.getElementById('ciac-resume')!.addEventListener('click',()=>this.pause());
  for(const type of ['keydown','touchstart','touchend','touchmove'])for(const el of document.querySelectorAll('select,input,.ciac-result'))el.addEventListener(type,e=>e.stopPropagation());
  for(const theme of [1,2])document.getElementById('ciac-theme-'+theme)!.addEventListener('click',()=>this.key(48+theme));
  this.touch();
 }
 start(){if(this.started)return;this.started=true;this.running=true;this.course.reset();this.pace.reset();this.quiz.reset();
  source.startTime=source.policeCaughtUp=Date.now()/1000;
  this.reserve();(document.getElementById('ciac-start') as HTMLElement).hidden=true;
  void (document.getElementById('music') as HTMLAudioElement).play().catch(()=>{});void this.quiz.start();
 }
 pause(){if(!this.started||this.ended)return;this.running=!this.running;
  (document.getElementById('ciac-paused') as HTMLElement).hidden=this.running;
  if(!this.running)this.quiz.suspend();else this.quiz.resume();
 }
 step(dt:number){
  this.before={d:this.distance,x:source.player.pos[0]};
  this.factor=this.pace.step(Math.max(0,Math.min(.1,dt)),this.distance,this.quiz.activeGate);
 }
 afterStep(){if(!this.running)return;
  this.distance=this.lap*796-source.player.pos[2]-4;
  const gate=this.quiz.activeGate;let x=source.player.pos[0];
  if(this.before.d<gate&&this.distance>=gate){const t=(gate-this.before.d)/(this.distance-this.before.d);x=this.before.x+(x-this.before.x)*t;}
  this.quiz.tick(this.distance,laneOf(x));this.quiz.presentLane(laneOf(source.player.pos[0]));
  this.quiz.setOrigin(source.player.pos[2]);this.quiz.render(this.distance);
  document.getElementById('ciac-stats')!.textContent=`${Math.floor(this.distance)} m · ${source.coins_collected} monedas`;
 }
 get pending(){return this.quiz.pendingAcademic;}
 nextLap(){
  // The original ends at Z=-800. Repeat its complete layout using the same
  // objects/buffers, rather than invent a generator or shorten CIAC strips.
  this.lap++;for(const s of this.saved){s.array.splice(0,s.array.length,...s.items);s.items.forEach((v,i)=>{if(v?.pos){v.pos.splice(0,3,...s.positions[i]);if(s.exists[i]!==undefined)v.exist=s.exists[i];}});}
  for(const v of [source.player,source.police,source.dog])v.pos[2]+=796;
  source.cam_z+=796;this.reserve();this.notice('Continúa el recorrido · tramo '+(this.lap+1));
 }
 finish(kind:string,score:number,coins:number){if(this.ended)return;this.ended=true;this.running=false;this.quiz.endRun();
  (document.getElementById('ciac-over') as HTMLElement).hidden=false;
  document.getElementById('ciac-result-title')!.textContent=kind==='won'?'Recorrido completado':'Fin de la carrera';
  document.getElementById('ciac-result-stats')!.textContent=`${Math.floor(this.lap*796+score)} puntos de carrera · ${coins} monedas. El ranking usa los puntos académicos.`;
 }
 viewport(){const canvas=this.gl.canvas as HTMLCanvasElement,ratio=Math.min(devicePixelRatio||1,1.5),w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}this.gl.viewport(0,0,w,h);}
 fov(aspect:number){return 2*Math.atan(Math.tan(Math.PI/8)*Math.max(1,(1280/720)/aspect));}
 draw(matrix:Float32Array,program:any,dt:number){for(const track of this.apron)track.drawCube(this.gl,matrix,program,dt);this.quiz.drawTrack(matrix);}
 private reserve(){
  const offset=this.lap*796;
  groups.forEach((names,groupIndex)=>{
   const a=source[names[0]],keep:number[]=[];
   for(let i=0;i<a.length;i++){
    const z=a[i].pos[2],half=[0,3.5,2.8,1,1,1][groupIndex];let from=offset-4-z-half,until=offset-4-z+half+RETIRE_BEHIND;
    if(groupIndex===0){const v=source.train_speeds[i],front=Math.max(0,-4-z);from=offset+front/(1+v/(.25*.55))-4;until=offset+(front+20)/(1+v/.5)+RETIRE_BEHIND;}
    if(!this.course.intersects(from,until))keep.push(i);
   }
   for(const name of names){const values=keep.map(i=>source[name][i]);source[name].splice(0,source[name].length,...values);}
  });
  for(const name of pickupNames)for(const item of source[name])if(!this.course.allowsPickup(offset-4-item.pos[2]))item.exist=false;
 }
 private notice(message:string){const el=document.getElementById('ciac-notice')!;el.textContent=message;el.hidden=false;clearTimeout(this.noticeTimer);this.noticeTimer=window.setTimeout(()=>{el.hidden=true;},3000);}
 private key(code:number){const event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true});Object.defineProperty(event,'keyCode',{value:code});document.dispatchEvent(event);}
 private touch(){const canvas=this.gl.canvas as HTMLCanvasElement;let gesture:{id:number;x:number;y:number}|null=null;
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(!this.running||gesture)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch{};});
  canvas.addEventListener('pointermove',e=>e.preventDefault());
  canvas.addEventListener('pointercancel',()=>{gesture=null;});
  canvas.addEventListener('pointerup',e=>{e.preventDefault();if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(!this.running||Math.max(Math.abs(dx),Math.abs(dy))<24)return;
   if(Math.abs(dx)>Math.abs(dy)*1.2)this.key(dx>0?39:37);else if(Math.abs(dy)>Math.abs(dx)*1.2)this.key(dy<0?38:40);
  });
  canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
 }
}
source.EeshaduttaCIAC=EeshaduttaCIAC;
