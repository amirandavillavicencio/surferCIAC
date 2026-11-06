from playwright.sync_api import sync_playwright
import json,os
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844})
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8788')+'/?test');page.wait_for_function('window.__run?.ready')
 result=page.evaluate('''()=>{const r=__run,s=r.sim;r.start({noSpawn:true,speed:12});r.clear();r.clock.reset();s.addOb({kind:'mtrain',lane:2,d0:16,d1:85,activation:0,trainSpeed:60,cars:4});r.presentation.reset(s);
 const intervals=[.002,.004,.018,.011,.035,.006,.027,.01,.045,.001,.12];let maxError=0,zeroSteps=0,lastTime=0;const clips=new Set();
 for(let frame=0;frame<220;frame++){
  if(frame===0||frame===50)r.input('up');if(frame===7||frame===25)r.input('right');if(frame===14||frame===80)r.input('down');if(frame===16)r.input('left');if(frame===35)r.input('left');
  const before=s.time;const alpha=r.presentFrame(intervals[frame%intervals.length]);if(s.time===before)zeroSteps++;
  const v=r.presentation.view;const guard=r.presentation.chase.sample(alpha);if(r.world.guard.root.visible&&(Math.abs(r.world.guard.root.position.x-(guard.x-.55))>1e-7||Math.abs(r.world.guard.root.position.z-(v.d-guard.d))>1e-7))throw Error('guard timestamp mismatch');if(v.time<lastTime-1e-8)throw Error('time reversed');lastTime=v.time;
  if(Math.abs(r.world.player.root.position.x-v.x)>1e-8||Math.abs(r.world.player.root.position.y-v.y)>1e-8)throw Error('root timestamp mismatch');
  if(!r.world.camera.position.toArray().every(Number.isFinite))throw Error('camera');
  if(Math.abs(r.world.player.root.rotation.z)>.2)throw Error('lean oscillation');
  clips.add(r.world.player.current);
  const expected=[];for(const o of v.obs){if(o.kind!=='mtrain')continue;if(o.d0>v.d+216.74||o.d1<v.d-26)continue;for(let c=0;c<o.cars;c++){const center=o.d0+c*7.04+3.37;if(center+3.37<v.d-26||center-3.37>v.d+216.74)continue;expected.push({x:(o.lane-1)*2.5,z:v.d-center});}}
  if(r.world.pools.train.count!==expected.length)throw Error('car lifetime');
  for(const part of r.world.pools.train.parts){const m=r.world.camera.matrixWorld.clone(),inverse=part.local.clone().invert();for(let i=0;i<part.mesh.count;i++){part.mesh.getMatrixAt(i,m);m.multiply(inverse);const error=Math.min(...expected.map(e=>Math.max(Math.abs(e.x-m.elements[12]),Math.abs(e.z-m.elements[14]))));maxError=Math.max(maxError,error);if(error>1e-4)throw Error('train timestamp mismatch');}}
  const physical=JSON.stringify(s.snapshot());r.presentFrame(0);if(physical!==JSON.stringify(s.snapshot()))throw Error('presentation wrote physics');
 }
 r.input('pause');const frozen=JSON.stringify({state:s.snapshot(),camera:r.world.camera.position.toArray(),clip:r.world.player.actions[r.world.player.current].time});r.presentFrame(.2);if(frozen!==JSON.stringify({state:s.snapshot(),camera:r.world.camera.position.toArray(),clip:r.world.player.actions[r.world.player.current].time}))throw Error('pause advanced presentation');
 if(!['run','jump','fall','roll'].every(c=>clips.has(c)))throw Error('missing action coverage '+JSON.stringify([...clips]));
 return {frames:220,zeroPhysicsStepFrames:zeroSteps,maxTrainMatrixError:maxError,clips:[...clips],pausedWithoutPoseDrift:true};}''')
 print(json.dumps(result));b.close()
