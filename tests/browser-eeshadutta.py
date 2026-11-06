from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/workspace/artifacts/eeshadutta');OUT.mkdir(exist_ok=True,parents=True)
BANK=json.loads((ROOT/'data/questions.json').read_text())
INIT="""window.__t=0;const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[1793990000000+__t]));}static now(){return 1793990000000+__t;}};performance.now=()=>__t;
window.requestAnimationFrame=fn=>{window.__frame=fn;return 1};window.frame=(dt=1000/60)=>{__t+=dt;__frame(__t)};let seed=17;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};"""
def fixture(page,answers,bank=BANK):
 def route(r):
  path=r.request.url.split('/api/')[1];body={'ranking':[]}
  def public(q):return {k:v for k,v in q.items() if k!='correcta'} if q else None
  if path=='start':body={'token':'eesha-local','question':public(bank[0])}
  if path=='answer':
   a=r.request.post_data_json;i=len(answers);answers.append(a);correct=a['lane']==bank[i]['correcta'];body={'correct':correct,'points':sum(answers[j]['lane']==bank[j]['correcta'] for j in range(len(answers)))*100,'penaltySeconds':0 if correct else 3,'question':public(bank[i+1]) if i+1<len(bank) else None}
  if path=='finish':body={'name':r.request.post_data_json['name'],'points':2300}
  r.fulfill(status=200,content_type='application/json',body=json.dumps(body))
 page.route('**/api/**',route)
def screenshot(page,name):
 page.evaluate('if(window.drawActual){const d=drawScene;drawScene=drawActual;frame();drawScene=d;}else frame()');page.screenshot(path=str(OUT/name))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 traces=[]
 for label,url in [('original','http://127.0.0.1:8792/'),('ciac','http://127.0.0.1:8788/')]:
  page=b.new_page(viewport={'width':390,'height':844},service_workers='block');errors=[];alerts=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(alerts.append(d.message),d.dismiss()));page.add_init_script(INIT);fixture(page,[])
  page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.player?.pos');
  if label=='ciac':page.locator('#ciac-play').click();page.wait_for_function('ciac.quiz.phase==="ready"',polling=50)
  page.evaluate('frame()');page.wait_for_timeout(300);screenshot(page,label+'-city-390.png');page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:50,bubbles:true}));frame()");page.wait_for_timeout(300);screenshot(page,label+'-neon-390.png')
  # Equal frame counts and real original keyboard handlers in both games.
  trace=page.evaluate('''()=>{window.drawActual=drawScene;drawScene=()=>{};const trace=[];function snap(){return {p:[...player.pos],v:player.speedy,s:player.speedz,police:[...police.pos],dog:[...dog.pos],jumping,ducking,cam:[cam_x,cam_y,cam_z],train:[...trainF[0].pos],theme};}function key(k){document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:k,bubbles:true}));}
   key(39);for(let i=0;i<16;i++)frame();trace.push(snap());key(38);for(let i=0;i<15;i++)frame();trace.push(snap());key(40);for(let i=0;i<8;i++)frame();trace.push(snap());return trace;}''')
  screenshot(page,label+'-movement.png')
  powers=page.evaluate('''()=>{const result=[];boots[0].pos=[player.pos[0],player.pos[1],player.pos[2]-.5];boots[0].exist=true;frame();result.push(player.jumping_boots);flying_boost[0].pos=[player.pos[0],player.pos[1],player.pos[2]-.5];flying_boost[0].exist=true;frame();result.push(player.fly_boost);hoverboard[0].pos=[player.pos[0],player.pos[1],player.pos[2]-.5];hoverboard[0].exist=true;frame();result.push(player.hoverboard);return result;}''')
  assert all(powers),powers;screenshot(page,label+'-powers.png')
  collision=page.evaluate('''()=>{player.hoverboard=false;player.fly_boost=false;player.pos[1]=-4;player.speedy=0;ducking=false;jumping=false;boxes[0].pos=[player.pos[0],-3.4,player.pos[2]-.5];frame();return {score,coins:coins_collected,ended:window.ciac?.ended||false};}''')
  if label=='original':assert any('YOU LOST' in a for a in alerts),alerts
  else:assert collision['ended'],collision
  screenshot(page,label+'-collision.png')
  assert not errors,errors;traces.append(trace);page.close()
 assert traces[0]==traces[1],json.dumps(traces)
 (OUT/'equivalence.json').write_text(json.dumps(traces,indent=2))
 # Full academic session using original flight power to traverse encounters.
 page=b.new_page(viewport={'width':390,'height':844},service_workers='block');answers=[];fixture(page,answers);page.add_init_script(INIT);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8788/',wait_until='domcontentloaded');page.wait_for_function('window.ciac');page.locator('.ciac-course select').select_option('Todos');page.locator('#ciac-play').click();page.wait_for_function('ciac.quiz.phase==="ready"',polling=50)
 page.evaluate('frame();window.drawActual=drawScene;drawScene=()=>{};')
 # Real pointer gestures dispatch the original key handler.
 touch=page.evaluate('''()=>{const c=glcanvas;function swipe(x,y,ex,ey){c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,clientX:x,clientY:y,bubbles:true,cancelable:true}));c.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,clientX:ex,clientY:ey,bubbles:true,cancelable:true}));}swipe(100,600,160,600);const right=player.pos[0];swipe(160,600,100,600);swipe(100,600,100,540);const jump=jumping;swipe(100,540,100,600);return {right,jump,duck:ducking};}''')
 assert touch=={'right':0,'jump':True,'duck':True},touch
 states=[]
 for i in range(24):
  desired=(BANK[i]['correcta']+1)%3 if i==0 else BANK[i]['correcta']
  if i in [0,5,12,23]:
   page.evaluate('''lane=>{const target=ciac.quiz.activeGate-15;while(ciac.distance<target&&ciac.running){if(target+15-ciac.distance>50){player.fly_boost=true;fb_acquired=Date.now()/1000;player.pos[1]=10;}else{player.fly_boost=false;player.pos[1]=-4;player.speedy=0;jumping=false;ducking=false;cam_y=5;target_y=0;}const desired=(lane-1)*6;if(player.pos[0]!==desired)document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:player.pos[0]<desired?39:37,bubbles:true}));frame();}}''',desired)
   screenshot(page,f'question-visible-{i+1}.png')
  state=page.evaluate('''({lane,index})=>{const gate=ciac.quiz.activeGate;let n=0;while(ciac.distance<gate+.01&&ciac.running&&n++<1500){
    if(gate-ciac.distance>50){player.fly_boost=true;fb_acquired=Date.now()/1000;player.pos[1]=10;cam_y=19;target_y=14;}
    else {player.fly_boost=false;player.pos[1]=-4;player.speedy=0;ducking=false;jumping=false;police.pos[1]=-4;cam_y=5;target_y=0;}
    const wanted=(lane-1)*6;if(player.pos[0]!==wanted)document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:player.pos[0]<wanted?39:37,bubbles:true}));
    frame(n%17===0?28:1000/60);
    if(ciac.distance>gate-1&&!document.querySelector('.ciac-dialog').hidden){const q=document.querySelector('.ciac-dialog').getBoundingClientRect();if(q.bottom>844||q.height>321)throw Error('question unreadable');}
   }return {d:ciac.distance,lap:ciac.lap,running:ciac.running,factor:ciac.factor,phase:ciac.quiz.phase,p:player.pos.slice()};}''',{'lane':desired,'index':i})
  assert state['running'],(i,state);page.wait_for_timeout(30);assert len(answers)==i+1,(i,state,answers);states.append(state)
  if i in [0,1,5,12,23]:screenshot(page,f'academic-{i+1}.png')
  if i==0:
   penalty=page.evaluate('''()=>{for(let i=0;i<20;i++)frame();return {factor:ciac.factor,remaining:ciac.pace.penaltyRemaining,running:ciac.running};}''');assert penalty['factor']==.55 and penalty['running'],penalty
 # The original win threshold remains per lap; academic continuation ends once bank is done.
 end=page.evaluate('''()=>{let n=0;while(ciac.running&&n++<2000){player.fly_boost=true;fb_acquired=Date.now()/1000;player.pos[1]=10;frame();}return {running:ciac.running,ended:ciac.ended,lap:ciac.lap,d:ciac.distance,title:document.querySelector('#ciac-result-title').textContent};}''')
 assert end['ended'] and end['title']=='Recorrido completado',end;screenshot(page,'academic-complete.png')
 page.locator('.ciac-result input').fill('Corredor CIAC');page.locator('.ciac-result button').click();page.wait_for_function('document.querySelector(".ciac-result span").textContent.includes("2300")',polling=50);screenshot(page,'academic-ranking.png')
 assert not errors,errors
 (OUT/'academic.json').write_text(json.dumps({'states':states,'answers':answers,'touch':touch,'penalty':penalty,'end':end,'errors':errors},indent=2))
 print(json.dumps({'equivalentPhysicalTraces':True,'questions':len(answers),'touch':touch,'penalty':penalty,'end':end,'errors':errors}));b.close()
