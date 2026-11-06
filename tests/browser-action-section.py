"""Local, reproducible gameplay evidence; API replies are explicitly fixtures."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,subprocess
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:8788')
OUT=Path(os.environ.get('EVIDENCE_DIR','/tmp/surfer-action-evidence'));OUT.mkdir(exist_ok=True)
controller=subprocess.check_output([str(ROOT/'upstream/node_modules/.bin/esbuild'),str(ROOT/'tests/traffic-controller.ts'),'--bundle','--format=iife','--global-name=Traffic'],text=True)
bank=json.loads((ROOT/'data/questions.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for seed,tutorial in [(7,False),(19,True)]:
  if os.environ.get('ONLY_SEED') and str(seed)!=os.environ['ONLY_SEED']:continue
  ctx=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,record_video_dir=str(OUT),record_video_size={'width':390,'height':844})
  page=ctx.new_page();errors=[];answers=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def api(route):
   if 'leaderboard' in route.request.url:result={'ranking':[]}
   elif route.request.url.endswith('/start'):result={'token':'local-evidence','question':bank[0]}
   else:
    answers.append(json.loads(route.request.post_data));result={'correct':True,'points':100,'penaltySeconds':0,'question':bank[min(len(answers),23)]}
   route.fulfill(json=result)
  page.route('**/api/**',api)
  page.goto(BASE+'/?test&quiz');page.wait_for_function('window.__run?.ready',timeout=60000);page.add_script_tag(content=controller)
  page.evaluate('(o)=>{__run.start(o);__run.clock.reset();__run.evidencePlans=[]}',{'seed':seed,'tutorial':tutorial})
  page.wait_for_function('__run.quiz.phase === "ready"')
  setup=page.evaluate('''()=>{const r=__run;return {start:r.sim.track.actionSectionStart,plans:Traffic.plansOf(r.sim).filter(p=>p.beat)}}''')
  start=setup['start'] if setup['start']>=0 else 340;end=start+400
  # Fast-forward the unchanged tutorial, not the action section itself.
  if tutorial:
   # Yield between batches so real asynchronous fixture responses do not get
   # artificially delayed by a synchronous fast-forward through a question.
   while True:
    tutorial_state=page.evaluate("""start=>{const r=__run,s=r.sim;for(let i=0;i<15&&s.d<start&&s.alive;i++){if(s.d<280&&s.lane!==2)s.right();if(s.d>=280&&s.lane!==1)s.left();r.frame(1/60);}return {d:s.d,alive:s.alive};}""",start)
    assert tutorial_state['alive'],tutorial_state
    if tutorial_state['d']>=start:break
    page.wait_for_timeout(10)
  seen=set();frames=0;entry=None;question_frames=0
  while True:
   state=page.evaluate('''()=>{const r=__run,s=r.sim;for(const plan of Traffic.plansOf(s))if(!r.evidencePlans.some(p=>p.start===plan.start))r.evidencePlans.push({...plan,lateEvade:plan.beat==='A'});Traffic.driveTraffic(s,r.evidencePlans);r.frame(1/30);r.render();const active=r.evidencePlans.find(p=>p.beat&&s.d>=p.start&&s.d<p.start+100);return {d:s.d,time:s.time,y:s.y,lane:s.lane,alive:s.alive,beat:active?.beat,variant:active?.variant,phase:r.quiz.phase,clip:r.world.player.current};}''')
   assert state['alive'],state
   if state['d']>=start and entry is None:entry=state['time']
   if state.get('beat'):seen.add(state['beat'])
   if state['phase']=='question':question_frames+=1
   if frames%40==0:page.screenshot(path=str(OUT/f'seed-{seed}-frame-{frames:04}.png'))
   if state['d']>=end:break
   frames+=1
   # Pacing keeps the video close to actual game time rather than a fast bot trace.
   page.wait_for_timeout(27)
  duration=state['time']-entry
  assert seen=={'A','B','C'} and question_frames>0 and len(answers)>=2 and not errors
  print(json.dumps({'seed':seed,'tutorial':tutorial,'sectionStart':start,'sectionEnd':end,'simulationSeconds':duration,'beats':sorted(seen),'questionFrames':question_frames,'fixtureAnswers':len(answers),'pageErrors':errors}),flush=True)
  video=page.video;await_path=video.path();ctx.close();video.save_as(str(OUT/f'section-seed-{seed}.webm'))
 browser.close()
