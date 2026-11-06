"""Identical A/B/C inputs; direct 30Hz frames, no speed-up of recorded footage."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,subprocess
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:8788')
LABEL=os.environ.get('LABEL','after')
OUT=Path('/workspace/artifacts/surfer-motion');OUT.mkdir(exist_ok=True)
controller=subprocess.check_output([str(ROOT/'upstream/node_modules/.bin/esbuild'),str(ROOT/'tests/traffic-controller.ts'),'--bundle','--format=iife','--global-name=Traffic'],text=True)
bank=json.loads((ROOT/'data/questions.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1);errors=[];answers=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def api(route):
  if 'leaderboard' in route.request.url:result={'ranking':[]}
  elif route.request.url.endswith('/start'):result={'token':'motion-local','question':bank[0]}
  else:answers.append(json.loads(route.request.post_data));result={'correct':True,'points':100,'penaltySeconds':0,'question':bank[min(len(answers),23)]}
  route.fulfill(json=result)
 page.route('**/api/**',api);page.goto(BASE+'/?test&quiz');page.wait_for_function('window.__run?.ready',timeout=60000);page.add_script_tag(content=controller)
 page.evaluate('''()=>{const r=__run;r.start({seed:7,tutorial:false});r.clock.reset();r.motionPlans=[];
 if(!r.presentFrame){const prev=r.world.player.root.position.clone(),curr=prev.clone();r.presentFrame=(elapsed)=>{const alpha=r.clock.advance(elapsed,dt=>{prev.copy(r.world.player.root.position);r.step(dt,dt,false);});curr.copy(r.world.player.root.position);r.world.player.root.position.lerpVectors(prev,curr,alpha);if(r.sim.grounded)r.world.player.root.position.y=curr.y;r.quiz.presentLane(Math.max(0,Math.min(2,Math.floor(r.world.player.root.position.x/2.5+1.5))));r.render();r.world.player.root.position.copy(curr);return alpha;};}
 }''')
 page.wait_for_function('__run.quiz.phase === "ready"')
 encoder=subprocess.Popen(['ffmpeg','-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/(LABEL+'.mp4'))],stdin=subprocess.PIPE)
 trace=[]
 while True:
  state=page.evaluate('''()=>{const r=__run,s=r.sim;for(const plan of Traffic.plansOf(s))if(!r.motionPlans.some(p=>p.start===plan.start))r.motionPlans.push({...plan,lateEvade:plan.beat==='A'});Traffic.driveTraffic(s,r.motionPlans);r.presentFrame(1/30);return {d:s.d,x:s.x,y:s.y,lane:s.lane,alive:s.alive,clip:r.world.player.current,camera:r.world.camera.position.toArray(),viewD:r.presentation?.view.d??s.d,root:r.world.player.root.position.toArray(),phase:r.quiz.phase};}''')
  assert state['alive'],state
  trace.append(state);encoder.stdin.write(page.screenshot(type='jpeg',quality=78))
  if len(trace)%120==0:print(json.dumps({'label':LABEL,'frame':len(trace),'distance':state['d']}),flush=True)
  if len(trace) in [200,560,600,700,980]:page.screenshot(path=str(OUT/f'{LABEL}-{len(trace)}.png'))
  if state['d']>=440:break
 encoder.stdin.close();assert encoder.wait()==0
 (OUT/(LABEL+'.json')).write_text(json.dumps({'api':'local fixtures','dt':1/30,'trace':trace,'answers':answers,'pageErrors':errors}))
 assert not errors and len(answers)>=2
 print(json.dumps({'label':LABEL,'frames':len(trace),'seconds':len(trace)/30,'errors':errors}),flush=True)
 b.close()
