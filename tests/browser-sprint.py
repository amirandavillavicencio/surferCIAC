"""Compare the pinned original and actual CIAC integration at 390x844.
Start original at :8791 and built dist at :8788. No original files are patched.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/workspace/artifacts/sprint-replica');OUT.mkdir(parents=True,exist_ok=True)
BANK=json.loads((ROOT/'data/questions.json').read_text())
INIT="""window.requestAnimationFrame=()=>0;window.__now=0;performance.now=()=>window.__now;
window.seedRandom=(seed)=>{Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};seedRandom(77);"""
SETUP="""()=>{const g=game;window.renderActual=g.renderer.render.bind(g.renderer);g.renderer.render=()=>{};
window.frame=(dt=1/60)=>{__now+=dt*1000;g.clock.getDelta=()=>dt;g.animate();};
window.draw=()=>renderActual(g.scene,g.camera);
window.snap=()=>({state:g.currentState,d:g.distance,speed:g.currentSpeed,score:g.score,coins:g.coins,x:g.player.mesh.position.x,y:g.player.y,ground:g.player.groundHeight,cycle:g.player.runCycle,sliding:g.player.isSliding,chase:g.chaser.state,gap:g.chaser.currentFollowDistance,guard:g.chaser.officerGroup.position.toArray(),dog:g.chaser.dogGroup.position.toArray(),camera:g.camera.position.toArray(),fov:g.camera.fov,moving:g.world.movingTrains.map(t=>t.mesh.position.toArray())});
frame();draw();return {heroes:Object.keys(g.player.skins).filter(k=>!['default','saurabh'].includes(k)).length,boards:Object.keys(g.player.boards).length,menus:document.querySelectorAll('.modal-layer').length};}"""
def fixtures(page, answers, wrong=False):
 def route(r):
  path=r.request.url.split('/api/')[1];body={}
  if path=='start':body={'token':'local-sprint','question':BANK[0],'points':0}
  elif path=='answer':
   answers.append(r.request.post_data_json);i=len(answers)
   body={'correct':not(wrong and i==1),'points':max(0,i-(1 if wrong else 0))*100,'penaltySeconds':3 if wrong and i==1 else 0,'question':BANK[i] if i<len(BANK) else None}
  elif path=='finish':body={'points':100,'name':r.request.post_data_json['name']}
  else:body={'ranking':[]}
  r.fulfill(status=200,content_type='application/json',body=json.dumps(body))
 page.route('**/api/**',route)
def capture(page,name):
 page.evaluate('draw()');page.screenshot(path=str(OUT/name))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 comparison=json.loads((OUT/'comparison.json').read_text()) if os.environ.get('SKIP_COMPARISON') else [];all_errors=[]
 for label,url in ([] if os.environ.get('SKIP_COMPARISON') else [('original',os.environ.get('ORIGINAL_URL','http://127.0.0.1:8791/')),('ciac',os.environ.get('GAME_URL','http://127.0.0.1:8788/')+'?test')]):
  page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,service_workers='block');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));fixtures(page,[]);page.add_init_script(INIT)
  page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.game?.player');catalog=page.evaluate(SETUP)
  assert catalog['heroes']==26 and catalog['boards']==26,catalog
  capture(page,label+'-menu.png')
  for name in ['skins','boards','shop','missions','daily','spin','achievements','help','settings']:
   page.locator('#btn-open-'+name).click(force=True)
   assert page.evaluate('game.ui.activeModalId') is not None
   if name in ['skins','boards']:capture(page,label+'-'+name+'.png')
   page.locator('#btn-close-'+name).click(force=True)
  # Use the exact original generators/geometry and identical seeded commands.
  page.evaluate('''()=>{seedRandom(918);game.world.populateObstacles=()=>{};game.startGame();game.world.spawnTrain(-2.2,-24,false,true);game.world.spawnTrain(2.2,-75,true,false);game.world.spawnHighGirder(0,-220);window.trace=[];}''')
  page.wait_for_timeout(50)
  for i in range(510):
   # All gameplay frames use the actual unmodified player, chaser, world and camera.
   page.evaluate('''i=>{if(i===1)game.input.onSwipeLeft();if(i===140)game.input.onSwipeUp();if(i===175)game.input.onSwipeRight();if(i===270)game.input.onSwipeDown();if(i===440)game.onPlayerStumble();frame(i%13===0?.029:1/60);if([40,110,155,200,300,420,460,500].includes(i))trace.push(snap());}''',i)
   if i in [40,110,155,200,300,420,460,500]:capture(page,f'{label}-frame-{i}.png')
  trace=page.evaluate('trace');assert all(s['state']=='PLAYING' for s in trace),trace
  assert any(s['y']>3 for s in trace),'roof/jump missing'
  assert trace[-1]['chase']=='STUMBLE_CHASE',trace[-1]
  powers=page.evaluate('''()=>{const g=game;for(const k of ['Magnet','Multiplier','Hoverboard','Sneakers','Jetpack'])g.player['activate'+k]();frame();return ['hasMagnet','hasMultiplier','hasHoverboard','hasSneakers','hasJetpack'].map(k=>g.player[k]);}''')
  assert all(powers),powers
  capture(page,label+'-powers.png')
  # True touch handlers and original keyboard bindings.
  touch=page.evaluate('''()=>{const g=game;g.player.currentLane=0;g.player.targetX=0;const target=document.querySelector('canvas');function touch(type,x,y){const t=new Touch({identifier:4,target,clientX:x,clientY:y});target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]}));}touch('touchstart',190,600);touch('touchend',260,600);const lane=g.player.currentLane;window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowLeft',bubbles:true}));return {touchLane:lane,keyboardLane:g.player.currentLane};}''')
  assert touch=={'touchLane':1,'keyboardLane':0},touch
  retention=page.evaluate('''()=>{const g=game;Storage.addCoins(100000);
   g.ui.modalSkinIndex=1;g.ui.renderSkins();document.querySelector('#btn-showcase-equip-skin').click();const hero=Storage.getSelectedSkin();
   g.ui.modalBoardIndex=1;g.ui.renderBoards();document.querySelector('#btn-showcase-equip-board').click();const board=Storage.getSelectedBoard();
   g.ui.claimDailyRewardAction();const daily=Storage.getDailyRewardsData();
   const word=Missions.getWordHunt().word;for(const letter of word)g.onCollectLetter(letter);
   const wordDone=Missions.getWordHunt();return {hero,heroUnlocked:Storage.getUnlockedSkins().includes(hero),board,boardUnlocked:Storage.getUnlockedBoards().includes(board),dailyClaimed:!daily.canClaim,wordDone};}''')
  assert retention['heroUnlocked'] and retention['boardUnlocked'] and retention['dailyClaimed'],retention
  assert not errors,errors
  comparison.append({'label':label,'catalog':catalog,'trace':trace,'powers':powers,'touch':touch,'retention':retention});all_errors+=errors;page.close()
 # Numerical equivalence corroborates the directly inspected screenshots.
 assert comparison[0]['trace']==comparison[1]['trace'],json.dumps(comparison,indent=2)
 (OUT/'comparison.json').write_text(json.dumps(comparison,indent=2))
 # Academic integration with normal source generation, including wrong answer and revival.
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,service_workers='block');answers=[];fixtures(page,answers,wrong=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script(INIT)
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8788/')+'?test',wait_until='domcontentloaded');page.wait_for_function('window.game?.ciac');page.evaluate(SETUP)
 page.locator('.ciac-academics summary').click(force=True);page.locator('.ciac-course select').select_option('Todos');capture(page,'ciac-ranking-menu.png');page.locator('.ciac-academics summary').click(force=True)
 page.locator('#btn-start').dispatch_event('click')
 try:page.wait_for_function('game.ciac.quiz.phase==="ready"',polling=50,timeout=5000)
 except Exception:
  print('START_FAILURE',page.evaluate('({state:game.currentState,phase:game.ciac.quiz.phase,token:game.ciac.quiz.token,enabled:game.ciac.enabled,toast:document.querySelector("#toast-message").textContent})'),errors,flush=True);capture(page,'start-failure.png');raise
 academic=[]
 for target in [100,139,150,179,181,195,220,289,310,331,350,410]:
  result=page.evaluate('''target=>{const g=game;let n=0;while(g.distance<target&&g.currentState==='PLAYING'&&n++<10000){
   const toGate=g.ciac.quiz.activeGate-g.distance;
   // Source jetpack safely traverses dense sections; land before answering.
   if(toGate>55&&!g.player.hasJetpack){g.player.activateJetpack();g.player.jetpackTimer=999;}
   if(toGate<50){g.player.hasJetpack=false;g.player.jetpackTimer=0;g.player.moveRight();}
   frame(n%19===0?.029:1/60);
  }const q=document.querySelector('.ciac-dialog'),rect=q.getBoundingClientRect();const s=snap();return {...s,factor:g.ciac.factor,phase:g.ciac.quiz.phase,panel:q.hidden?null:{top:rect.top,bottom:rect.bottom,height:rect.height},physicalLane:g.player.mesh.position.x,penalty:g.ciac.pace.penaltyRemaining};}''',target)
  page.wait_for_timeout(40);academic.append(result);assert result['state']=='PLAYING',result
  if result['panel']:assert result['panel']['height']<321 and result['panel']['bottom']<844,result
  capture(page,f'ciac-question-{target}.png')
  if target==150:
   page.evaluate('game.togglePause()');assert page.evaluate('document.querySelector(".ciac-dialog").hidden');page.evaluate('game.togglePause();frame()');assert not page.evaluate('document.querySelector(".ciac-dialog").hidden')
 assert len(answers)>=2,answers
 assert all(a['lane']==2 for a in answers),answers
 assert any(s['factor']==.55 for s in academic),academic
 assert academic[-1]['factor']>.99,academic[-1]
 assert all(s['chase']!='CATCHING' for s in academic),academic
 # A real original fatal obstacle and original revive, preserving CIAC session.
 capture_state=page.evaluate('''()=>{const g=game;g.player.hasJetpack=false;g.player.hasHoverboard=false;g.player.hasSneakers=false;g.player.y=0;g.player.mesh.position.y=0;g.player.isGrounded=true;g.player.vy=0;const obs=g.world.spawnLowBarrier(g.player.mesh.position.x,g.player.mesh.position.z-1);if(!obs)throw Error('capture test must be outside reservation');for(let i=0;i<20&&g.currentState==='PLAYING';i++)frame();return {state:g.currentState,chase:g.chaser.state};}''')
 assert capture_state=={'state':'GAMEOVER','chase':'CATCHING'},capture_state
 page.wait_for_timeout(350);capture(page,'ciac-capture.png')
 page.locator('#btn-revive-skip').dispatch_event('click');page.locator('.ciac-result input').fill('Corredor CIAC');page.locator('.ciac-result button').click(force=True);page.wait_for_function('document.querySelector(".ciac-result span").textContent.includes("Puntaje guardado")',polling=50);capture(page,'ciac-score-saved.png')
 page.evaluate('game.revivePlayer();frame()');assert page.evaluate('game.currentState')=='PLAYING';assert page.evaluate('game.ciac.quiz.token')=='local-sprint'
 page.evaluate('game.quitToMenu();game.startGame()');page.wait_for_function('game.ciac.quiz.phase==="ready"',polling=50);assert page.evaluate('game.ciac.pace.penaltyRemaining')==0
 assert page.evaluate('game.chaser.state')=='INTRO_CHASE'
 assert not errors,errors
 (OUT/'academic.json').write_text(json.dumps({'states':academic,'answers':answers,'capture':capture_state,'errors':errors},indent=2))
 print(json.dumps({'comparison':'identical source gameplay traces and comparable screenshots','catalog':comparison[0]['catalog'],'touch':comparison[0]['touch'],'academicAnswers':answers,'capture':capture_state,'errors':all_errors+errors}))
 b.close()
