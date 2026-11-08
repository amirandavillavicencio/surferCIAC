from playwright.sync_api import sync_playwright
import json, os, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:8788')
questions=json.load(open(ROOT/'data/questions.json'))
controller=subprocess.check_output([str(ROOT/'upstream/node_modules/.bin/esbuild'),str(ROOT/'tests/traffic-controller.ts'),'--bundle','--format=iife','--global-name=Traffic'],text=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/?test');page.wait_for_function('window.__run?.ready',timeout=60000);page.add_script_tag(content=controller)
 results=page.evaluate('''()=>{const r=__run,s=r.sim;const out=[];
 function soleMinimum(){r.world.scene.updateMatrixWorld(true);let min=Infinity;const v=r.world.camera.position.clone();r.world.player.model.traverse(o=>{if(!o.name.endsWith('-zapatilla')&&!o.name.endsWith('-puntera'))return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);min=Math.min(min,v.y)}});return min-s.groundY;}
 for(const lane of [0,1,2]){
  r.start({noSpawn:true,speed:12});r.clear();s.lane=lane;s.x=(lane-1)*2.5;s.laneT=1;
  r.place('ramp',lane,8);r.place('train',lane,15,3);
  let min=Infinity;for(let i=0;i<115;i++){r.step(1/120,1/120);min=Math.min(min,soleMinimum());}
  r.stepTo(18,1/120);r.input('up');r.step(.75,1/120);r.input('down');
  for(let i=0;i<90;i++){r.step(1/120,1/120);min=Math.min(min,soleMinimum());}
  r.stepTo(50,1/120,true);
  out.push({lane,minSoleAboveSupport:min,alive:s.alive,grounded:s.grounded,y:s.y,wires:r.world.scene.children.filter(o=>o.name==='distant-wire').map(o=>({near:o.position.z+o.geometry.parameters.depth/2}))});
  if(min<-.00001||!s.alive)throw Error(JSON.stringify(out));
 }
 return out;}''')
 print('CONTACTS '+json.dumps(results))
 # Animation and physics advance with the same fixed steps at every display rate.
 timing=page.evaluate("""()=>{const r=__run;const out=[];for(const schedule of [[1/15],[1/20],[1/30],[1/60],[.01,.08,.025,.12,.015]]){r.start({noSpawn:true});r.clear();r.clock.reset();r.sim.pace.penalize(3);r.input('up');let wall=0,i=0;while(wall<8-1e-9){const dt=Math.min(schedule[i++%schedule.length],8-wall);wall+=dt;r.frame(dt);}out.push({d:r.sim.d,time:r.sim.time,penalty:r.sim.pace.penaltyRemaining,clip:r.world.player.current,clipTime:r.world.player.actions[r.world.player.current].time});}return out;}""")
 for result in timing[1:]:
  for key in ['d','time','penalty','clipTime']:assert abs(result[key]-timing[0][key])<1e-8,(key,timing)
  assert result['clip']==timing[0]['clip']
 print('FRAME_AND_ANIMATION '+json.dumps(timing))
 # Fast command chains exercise real animation selection, camera and touch dispatch.
 maneuvers=page.evaluate("""()=>{const r=__run,s=r.sim;r.start({noSpawn:true,speed:12});r.clear();
 r.place('train',1,0,3);s.y=s.groundY=3.4;r.step(.1,1/120);r.input('down');s.d=20.9;r.step(1/120,1/120);const edgeClip=r.world.player.current;if(s.grounded||edgeClip!=='fall')throw Error('roll held in air');
 for(let i=0;i<100&&!s.grounded;i++)r.step(1/120,1/120);if(!s.sliding||r.world.player.current!=='roll'||r.world.player.actions.roll.time<r.world.player.actions.roll.getClip().duration*.5)throw Error('roll restarted on landing');
 r.start({noSpawn:true,speed:12});r.clear();r.input('up');let buffered=false,rebounded=false;for(let i=0;i<200;i++){if(!buffered&&s.y<.25&&s.vy<0){r.input('up');buffered=true;}r.step(1/120,1/120);if(buffered&&s.vy>0){rebounded=true;break;}}if(!rebounded||r.world.player.root.scale.y<.999)throw Error('buffered landing squash');
 r.start({noSpawn:true,speed:12});r.clear();const ui=document.getElementById('ui');let prevented=0;const touch=(type,x,y)=>{const t=new Touch({identifier:9,target:ui,clientX:x,clientY:y});const e=new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]});ui.dispatchEvent(e);if(e.defaultPrevented)prevented++;};
 for(const dx of [-20,20,-20,20]){touch('touchstart',195,600);touch('touchmove',195+dx,600);touch('touchend',195+dx,600);}const lane=s.lane;
 touch('touchstart',195,600);touch('touchmove',215,620);touch('touchend',215,620);if(s.lane!==lane||prevented<12)throw Error('touch regression');
 const style=getComputedStyle(ui);if(style.touchAction!=='none'||getComputedStyle(document.body).overflow!=='hidden')throw Error('scroll containment');
 // FOV should not zoom in/out as the unchanged quiz speed factor activates.
 s.d=150;r.step(1,1/120);const fovBefore=r.world.camera.fov;s.pace.penalize(3);r.step(.1,1/120);const fovAfter=r.world.camera.fov;if(Math.abs(fovAfter-fovBefore)>.05)throw Error('quiz zoom');
 return {edgeClip,rebounded,prevented,diagonalIgnored:true,touchAction:style.touchAction,fovBefore,fovAfter};}""")
 print('RAPID_MOVEMENT_AND_TOUCH '+json.dumps(maneuvers))
 # Reproduce the formerly occluded central roof.
 page.evaluate("()=>{const r=__run;r.start({noSpawn:true,speed:12});r.clear();r.place('ramp',1,8);r.place('train',1,15,3);r.stepTo(19,1/120,true)}")
 page.screenshot(path='/tmp/surfer-roof-corrected.png')
 # Distinct traffic families: real moving bodies and complete wagon matrices.
 for kind in ['pass','dodge','double','roof-traffic','transfer','recovery']:
  page.evaluate("""kind=>{const r=__run;r.start({noSpawn:true,speed:12});r.clear();r.clock.reset();r.trafficPlan=[{start:40,from:0,kind}];for(const spec of Traffic.trafficEncounter(40,0,kind,4))r.sim.addOb(spec);}""",kind)
  samples=[]
  for target in [40,65,77,95,123,150]:
   result=page.evaluate("""target=>{const r=__run,s=r.sim;let guard=0;while(s.d<target&&s.alive&&guard++<10000){Traffic.driveTraffic(s,r.trafficPlan);r.frame(1/60);}r.render();
    const shown=r.presentation?.view||s;const expected=[];for(const o of shown.obs){if(o.kind!=='train'&&o.kind!=='mtrain')continue;if(o.d0>shown.d+216.74||o.d1<shown.d-26)continue;for(let c=0;c<o.cars;c++){const center=o.d0+c*7.04+3.37;if(center+3.37<shown.d-26||center-3.37>shown.d+216.74)continue;expected.push({x:(o.lane-1)*2.5,z:shown.d-center});}}
    const pools=[r.world.pools.train,r.world.pools.trainCab];if(pools.reduce((n,p)=>n+p.count,0)!==expected.length)throw Error('missing wagon');
    for(const pool of pools)for(const part of pool.parts){const m=r.world.camera.matrixWorld.clone(),inverse=part.local.clone().invert();for(let i=0;i<part.mesh.count;i++){part.mesh.getMatrixAt(i,m);m.multiply(inverse);if(!expected.some(e=>Math.abs(e.x-m.elements[12])<1e-4&&Math.abs(e.z-m.elements[14])<1e-4))throw Error('render/physics mismatch');}}
    return {d:s.d,alive:s.alive,y:s.y,cars:expected.length,moving:s.obs.filter(o=>o.kind==='mtrain').map(o=>({front:o.d0,tail:o.d1,speed:o.trainSpeed,cars:o.cars,time:o.travelTime}))};}""",target)
   assert result['alive'],(kind,result)
   samples.append(result)
   if target in [65,77,95]:page.screenshot(path=f'/tmp/surfer-traffic-{kind}-{target}.png')
  print('TRAFFIC_VISUAL '+json.dumps({'kind':kind,'samples':samples}))
 # Same inputs, runner speed, length and distance: legacy profile versus timed.
 comparison=page.evaluate("""()=>{const out=[];for(const timed of [false,true]){const r=__run;r.start({noSpawn:true,speed:12});r.clear();r.clock.reset();r.sim.addOb(timed?{kind:'mtrain',lane:2,d0:56,d1:125,activation:40,trainSpeed:60,cars:4}:{kind:'mtrain',lane:2,d0:58,d1:72,cars:4});const samples=[];for(const d of [40,65,77]){r.stepTo(d,1/120);const o=r.sim.obs.find(o=>o.kind==='mtrain');samples.push({d:r.sim.d,front:o?.d0??null,tail:o?.d1??null});}out.push({timed,samples});}return out;}""")
 print('BEFORE_AFTER_TRAINS '+json.dumps(comparison))
 # Continuous actual generator with the real quiz class and a local API fixture.
 calls=[]
 def api(route):
  url=route.request.url
  if 'leaderboard' in url: result={'ranking':[]}
  elif url.endswith('/start'):result={'token':'local-diagnostic','question':questions[0]}
  else:
   calls.append(json.loads(route.request.post_data));result={'correct':True,'points':100,'penaltySeconds':0,'question':questions[min(len(calls),23)]}
  route.fulfill(json=result)
 page.route('**/api/**',api)
 page.goto(BASE+'/?test&quiz');page.wait_for_function('window.__run?.ready');page.add_script_tag(content=controller)
 page.evaluate('__run.start({seed:7,tutorial:false})');page.wait_for_function('__run.quiz.phase === "ready"')
 for target in [65,77,95,145,181,224,238,258,295,331]:
  state=page.evaluate('''target=>{const r=__run,s=r.sim;let guard=0;while(s.d<target&&s.alive&&guard++<40000){const start=40+Math.max(0,Math.floor((s.d-40)/150))*150;r.plans ||= [];for(const plan of Traffic.plansOf(s))if(!r.plans.some(p=>p.start===plan.start))r.plans.push(plan);Traffic.driveTraffic(s,r.plans);r.frame(1/60);}r.render();return {d:s.d,alive:s.alive,y:s.y,clip:r.world.player.current,phase:r.quiz.phase,questionVisible:!document.querySelector('.ciac-dialog').hidden};}''',target)
  print('SEQUENCE '+json.dumps(state))
  assert state['alive']
  page.screenshot(path=f'/tmp/surfer-sequence-{target}.png')
  page.wait_for_timeout(150)
 print('API_FIXTURE_ANSWERS '+json.dumps(calls));print('PAGE_ERRORS '+json.dumps(errors));assert len(calls)>=2;assert not errors
 b.close()
