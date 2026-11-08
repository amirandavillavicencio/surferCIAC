import {readFile,writeFile,copyFile} from 'node:fs/promises';
await copyFile('ciac/presentation.ts','upstream/src/ciac/presentation.ts');
const patch=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Presentation anchor: '+a);return s.replace(a,b);};
let main=await readFile('upstream/src/main.ts','utf8');
main="import { Presentation } from './ciac/presentation';\n"+main;
main=patch(main,'  const sim = new Sim(1);','  const sim = new Sim(1);\n  const presentation = new Presentation(sim);');
main=main.replaceAll('    world.resetScenery();','    world.resetScenery();\n    presentation.reset(sim);');
main=patch(main,'    world.event(ev);','    // Visual events are dispatched at presentation time.');
a: {
 const from=main.indexOf("    if (state !== 'start') world.player.update");
 const until=main.indexOf('    audio.tempo',from);
 if(from<0||until<0)throw Error('Missing presentation inside tick');
 main=main.slice(0,from)+'    presentation.capture(sim, dt, events);\n'+main.slice(until);
}
main=main.replace('    if (draw) renderer.render(world.scene, world.camera);','    if (draw) present(1);');
const from=main.indexOf('  const clock = new FrameClock();');
const end=main.indexOf('  if (!TEST) requestAnimationFrame(loop);',from);
if(from<0||end<0)throw Error('Missing clock loop');
main=main.slice(0,from)+`  const clock = new FrameClock();
  let last = performance.now();
  let previousState: Screen = state;
  function present(alpha: number, draw = true) {
    const frame=presentation.sample(alpha);
    if (state !== 'start') world.player.update(frame.sim,frame.dt,frame.events);
    for(const event of frame.events)world.event(event);
    world.sync(frame.sim,frame.dt,state==='start');
    if(QUIZ && state!=='start' && sim.alive)quiz.render(frame.sim.d);
    quiz.presentLane(occupiedLane(frame.sim.x));
    if(!TEST)raceFX.update(frame.sim,world,frame.dt,state==='play',quiz.questionSlow);
    if(draw)renderer.render(world.scene,world.camera);
    return frame;
  }
  function displayFrame(elapsed: number, draw = true) {
    if(state==='pause'||document.hidden){clock.reset();if(draw)renderer.render(world.scene,world.camera);return 0;}
    const alpha=clock.advance(elapsed,dt=>tick(dt,false));
    present(alpha,draw);
    return alpha;
  }
  const resetClock=()=>{clock.reset();last=performance.now();};
  document.addEventListener('visibilitychange',resetClock);
  window.addEventListener('blur',resetClock);
  const loop=(now:number)=>{
    const elapsed=Math.max(0,(now-last)/1000);last=now;
    if(previousState!==state){clock.reset();previousState=state;}
    if(document.hidden || state==='pause') {
      clock.reset();renderer.render(world.scene,world.camera);
    } else {
      displayFrame(elapsed);
      if(elapsed<.25)watchPerf(elapsed);
    }
    requestAnimationFrame(loop);
  };
`+main.slice(end);
main=patch(main,'frame(elapsed: number) { return clock.advance(elapsed, dt=>tick(dt, false)); }','frame(elapsed: number) { return displayFrame(elapsed,false); },\n      presentation, presentFrame(elapsed:number) { return displayFrame(elapsed); }');
// The deterministic debug step still samples views, without making production
// physics callbacks update the renderer. These hooks are absent in normal play.
main=main.replace('        if (draw) renderer.render(world.scene, world.camera);\n        return sim.snapshot();','        present(1,draw);\n        return sim.snapshot();');
// stepTo has an identical tail; handle it after the first anchor is consumed.
main=main.replace('        if (draw) renderer.render(world.scene, world.camera);\n        return sim.snapshot();','        present(1,draw);\n        return sim.snapshot();');
await writeFile('upstream/src/main.ts',main);
let player=await readFile('upstream/src/view/player.ts','utf8');
player=patch(player,'  private runRate = 1;', '  private runRate = 1;\n  private previousX = 0;\n  private hasMotion = false;');
player=patch(player,'    this.runRate = 1;', '    this.runRate = 1;\n    this.hasMotion = false;');
player=patch(player,'    let t = Math.min(dt, 0.05);', '    let t = Math.min(dt, 0.25);');
player=patch(player,'    next.reset().setEffectiveWeight(1).fadeIn(fade).play();',`    // Running resumes the gait instead of snapping back to the first keyframe.
    if (name !== 'run') next.reset();
    next.enabled = true; next.paused = false;
    next.setEffectiveWeight(1).fadeIn(fade).play();`);
player=patch(player,"'jump', 'jumpup', 'roll', 'die', 'runlookback'", "'jump', 'jumpup', 'fall', 'roll', 'die', 'runlookback'");
player=patch(player,"this.current === 'jump' && !sim.grounded && !sim.fastFall && this.actions.jump.isRunning()", "this.current === 'jump' && !sim.grounded && sim.vy > 0 && !sim.fastFall && this.actions.jump.isRunning()");
player=patch(player,'    const toGo = laneX(sim.lane) - sim.x;\n    const dir = sim.alive && Math.abs(toGo) > 0.35 ? Math.sign(toGo) : 0;',`    const vx = this.hasMotion && dt > 0 ? (sim.x-this.previousX)/dt : 0;
    this.previousX=sim.x; this.hasMotion=true;
    const dir = sim.alive ? Math.max(-1,Math.min(1,vx/28)) : 0;`);
player=patch(player,"this.spring(dt, dir * air, 'lean', 'leanV', 700, 0.7);", "this.spring(dt, dir * air, 'lean', 'leanV', 160, 1);");
player=patch(player,"this.spring(dt, dir * 0.44 * air, 'yaw', 'yawV', 1000, 0.62);", "this.spring(dt, dir * 0.28 * air, 'yaw', 'yawV', 200, 1);");
player=patch(player,'this.squash = Math.min(0.15, 0.04 + e.fall * 0.035);', 'this.squash = Math.min(0.1, 0.025 + e.fall * 0.02);');
player=patch(player,'this.squash = Math.max(0, this.squash - dt * 1.4);', 'this.squash *= Math.exp(-dt*16);');
player=patch(player,'GRAVITY, laneX, speedAt', 'GRAVITY, speedAt');
player=patch(player,'    this.mixer.update(dt);\n    correctCampusContact(this.model, sim.groundY + .008);',`    this.mixer.update(dt);
    // Pose phase comes from the same interpolated physical state as the root.
    // This also prevents short clips from holding/restarting at a frame boundary.
    if (sim.alive) {
      const duration=this.actions.run.getClip().duration;
      const u=Math.max(0,sim.d)/2600;
      const gait=.9*2600/27*(u+Math.log(27-15*Math.exp(-u))-Math.log(12))+sim.d/22;
      this.actions.run.time=((gait%duration)+duration)%duration;
      if(this.current==='jump') {
        const air=2*(sim.power.shoes>0?SUPER_JUMP_V:JUMP_V)/GRAVITY;
        this.actions.jump.time=Math.min(this.actions.jump.getClip().duration*.99,
          sim.airTime*this.actions.jump.getClip().duration/(air*1.1));
      }
      if(this.current==='fall')this.actions.fall.time=Math.min(this.actions.fall.getClip().duration*.98,Math.max(0,-sim.vy/(GRAVITY*1.15)));
      if(this.current==='roll')this.actions.roll.time=this.actions.roll.getClip().duration*Math.max(0,Math.min(1,1-sim.slideT/PLAYER.slideTime));
      this.mixer.update(0);
    }
    correctCampusContact(this.model, sim.groundY + .008);`);
player=patch(player,'  private previousX = 0;', '  private previousX = 0;\n  private jumpVelocity = JUMP_V;');
player=patch(player,'        const air = (2 * v0) / GRAVITY;', '        this.jumpVelocity=v0;\n        const air = (2 * v0) / GRAVITY;');
player=patch(player,'const air=2*(sim.power.shoes>0?SUPER_JUMP_V:JUMP_V)/GRAVITY;', 'const air=2*this.jumpVelocity/GRAVITY;');
player=patch(player,'    for (const e of events) {', `    const mixerTime=this.mixer.time;
    let landedAge: number | null = null;
    for (const e of events) {
      const age=(e as SimEvent & {presentationAge?:number}).presentationAge;
      this.mixer.time=mixerTime+Math.max(0,dt-(age ?? dt));
      if(e.type==='land')landedAge=age ?? dt;
      if(e.type==='jump')landedAge=null;`);
player=patch(player,'    this.stumbleT = Math.max(0, this.stumbleT - dt);', '    this.mixer.time=mixerTime;\n    this.stumbleT = Math.max(0, this.stumbleT - dt);');
player=patch(player,'    if (sim.alive) {\n      const busy', `    if (sim.alive) {
      const transitionAge=sim.grounded?(landedAge ?? dt):Math.max(0,-sim.vy/(GRAVITY*1.15));
      this.mixer.time=mixerTime+Math.max(0,dt-transitionAge);
      const busy`);
player=patch(player,'    this.squash *= Math.exp(-dt*16);', '    this.squash *= Math.exp(-(landedAge ?? dt)*16);');
player=patch(player,'    this.mixer.update(dt);\n    // Pose phase', '    this.mixer.time=mixerTime;\n    this.mixer.update(dt);\n    // Pose phase');
await writeFile('upstream/src/view/player.ts',player);
let world=await readFile('upstream/src/view/world.ts','utf8');
world=patch(world,'(sim.groundY - this.camSupport) * (1 - Math.exp(-dt * 6))','(sim.groundY - this.camSupport) * (1 - Math.exp(-dt * (sim.groundY > this.camSupport ? 8 : 5)))');
world=patch(world,'(target - this.camY) * (1 - Math.exp(-dt * 5))','(target - this.camY) * (1 - Math.exp(-dt * (target > this.camY ? 8 : 5.5)))');
world=patch(world,'(sim.x * 0.66 - this.camX) * (1 - Math.exp(-dt * 10))','(sim.x * 0.66 - this.camX) * (1 - Math.exp(-dt * 14))');
await writeFile('upstream/src/view/world.ts',world);
