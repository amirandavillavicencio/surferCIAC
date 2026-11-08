from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/workspace/artifacts/surfer-resources');OUT.mkdir(exist_ok=True)
controller=subprocess.check_output([str(ROOT/'upstream/node_modules/.bin/esbuild'),str(ROOT/'tests/traffic-controller.ts'),'--bundle','--format=iife','--global-name=Traffic'],text=True)
bank=json.loads((ROOT/'data/questions.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for label,base in [('before',os.environ.get('BEFORE_URL','http://127.0.0.1:8790')),('after',os.environ.get('GAME_URL','http://127.0.0.1:8788'))]:
  page.goto(base+'/?test');page.wait_for_function('window.__run?.ready',timeout=60000)
  page.evaluate('''()=>{const r=__run;r.start({noSpawn:true,speed:12});r.clear();r.clock.reset();for(let i=0;i<60;i++)r.presentFrame(1/60);}''')
  page.screenshot(path=str(OUT/f'{label}-intro.png'))
  page.evaluate('''()=>{const r=__run;r.start({noSpawn:true,speed:12});r.clear();r.clock.reset();r.place('ramp',1,8);r.place('train',1,15,3);r.sim.addOb({kind:'mtrain',lane:2,d0:16,d1:85,activation:0,trainSpeed:52,cars:3});while(r.sim.d<19)r.presentFrame(1/60);}''')
  page.screenshot(path=str(OUT/f'{label}-train.png'))
 # Current game: real collision outcomes drive the observer.
 page.evaluate('''()=>{const r=__run;r.start({noSpawn:true});r.clear();r.clock.reset();for(let i=0;i<600;i++)r.frame(1/60);r.render();}''')
 distant=page.evaluate('({...__run.presentation.chase.current})');assert distant['mode']=='distant' and distant['gap']>9
 page.screenshot(path=str(OUT/'guard-distant.png'))
 first=page.evaluate('''()=>{const r=__run,s=r.sim;r.place('train',2,-2,4);r.input('right');for(let i=0;i<140;i++)r.frame(1/120);r.render();return {state:r.state(),guard:{...r.presentation.chase.current},leftLeg:r.world.guard.actor.officerLeftLeg.rotation.x};}''')
 assert first['state']['alive'] and first['guard']['mode']=='stumble',first
 page.screenshot(path=str(OUT/'guard-stumble.png'))
 caught=page.evaluate('''()=>{const r=__run;r.input('right');for(let i=0;i<125;i++)r.frame(1/120);r.render();return {state:r.state(),guard:{...r.presentation.chase.current}};}''')
 assert not caught['state']['alive'] and caught['guard']['mode']=='captured',caught
 page.screenshot(path=str(OUT/'guard-capture.png'))
 reset=page.evaluate('''()=>{const r=__run;r.start({noSpawn:true});r.clear();r.clock.reset();for(let i=0;i<20;i++)r.frame(1/120);r.render();return {...r.presentation.chase.current};}''')
 assert reset['mode']=='intro' and reset['gap']<2.5
 # The unchanged API client receives a wrong-answer fixture once. It must
 # trigger exactly the existing 55% penalty, not a chase/capture transition.
 answers=[]
 def api(route):
  if 'leaderboard' in route.request.url:result={'ranking':[]}
  elif route.request.url.endswith('/start'):result={'token':'resources-local','question':bank[0]}
  else:
   answers.append(json.loads(route.request.post_data));wrong=len(answers)==1
   result={'correct':not wrong,'points':0 if wrong else 100,'penaltySeconds':3 if wrong else 0,'question':bank[min(len(answers),23)]}
  route.fulfill(json=result)
 page.route('**/api/**',api);page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8788')+'/?test&quiz');page.wait_for_function('window.__run?.ready');page.add_script_tag(content=controller)
 page.evaluate('''()=>{const r=__run;r.start({seed:7,tutorial:false});r.clock.reset();r.plans=[];}''');page.wait_for_function('__run.quiz.phase === "ready"')
 factors=[];questionVisible=False
 for target in [65,80,100,145,179,185,205,230,260,295,335,400,445]:
  state=page.evaluate('''target=>{const r=__run,s=r.sim;while(s.d<target&&s.alive){for(const p of Traffic.plansOf(s))if(!r.plans.some(x=>x.start===p.start))r.plans.push(p);Traffic.driveTraffic(s,r.plans);r.frame(1/60);}r.render();const panel=document.querySelector('.ciac-dialog');const rect=panel.getBoundingClientRect();return {state:r.state(),factor:s.pace.factor,guard:{...r.presentation.chase.current},question:!panel.hidden,rect:{height:rect.height,bottom:rect.bottom},cars:r.world.pools.train.count+r.world.pools.trainCab.count};}''',target)
  assert state['state']['alive'] and state['guard']['mode'] not in ['catching','captured','stumble'],state
  factors.append(state['factor']);questionVisible|=state['question']
  if state['question']:assert state['rect']['bottom']<844 and state['rect']['height']<321
  page.screenshot(path=str(OUT/f'run-{target}.png'));page.wait_for_timeout(80)
 assert questionVisible and len(answers)>=2 and any(x<.56 for x in factors),factors
 assert factors[-1]>.99,factors
 assert not errors,errors
 print(json.dumps({'distant':distant,'firstStumble':first,'capture':caught,'restart':reset,'academicFactors':factors,'fixtureAnswers':answers,'pageErrors':errors}),flush=True)
 b.close()
