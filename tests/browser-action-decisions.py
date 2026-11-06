"""Wrong choices and alternative routes in the actual local rendered game."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,subprocess
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/surfer-action-evidence');OUT.mkdir(exist_ok=True)
controller=subprocess.check_output([str(ROOT/'upstream/node_modules/.bin/esbuild'),str(ROOT/'tests/traffic-controller.ts'),'--bundle','--format=iife','--global-name=Traffic'],text=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8788')+'/?test');page.wait_for_function('window.__run?.ready');page.add_script_tag(content=controller)
 for beat in ['A','C']:
  state=page.evaluate('''beat=>{const r=__run;r.start({noSpawn:true,speed:15});r.clear();r.clock.reset();for(const spec of Traffic.actionEncounter(40,0,beat,1))r.sim.addOb(spec);if(beat==='C')r.input('right');r.stepTo(150,1/120,true);return r.state();}''',beat)
  assert not state['alive'],state
  page.screenshot(path=str(OUT/f'wrong-decision-{beat}.png'))
  print(json.dumps({'wrongDecision':beat,'state':state}))
 for beat in ['B','C']:
  page.evaluate('''beat=>{const r=__run;r.start({noSpawn:true,speed:15});r.clear();r.clock.reset();for(const spec of Traffic.actionEncounter(40,0,beat,2))r.sim.addOb(spec);}''',beat)
  for target in [75,95,145]:
   state=page.evaluate('''({beat,target})=>{const r=__run,s=r.sim;while(s.d<target&&s.alive){if(s.d>=52&&s.d<114&&s.lane!==0)r.input('left');if(beat==='C'&&s.d>=114&&s.lane!==1)r.input('right');r.frame(1/60);}r.render();return r.state();}''',{'beat':beat,'target':target})
   assert state['alive'],state
   page.screenshot(path=str(OUT/f'alternative-{beat}-{target}.png'))
  print(json.dumps({'alternativeRoute':beat,'state':state}))
 b.close()
