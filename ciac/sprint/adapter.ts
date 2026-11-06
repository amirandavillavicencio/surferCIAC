import {CIACQuiz} from './quiz';
import {QuizCourse} from './course';
import {RacePace} from './pace';
import {obstacleAllowed,occupiedLane,crossingLane} from './reservations';

// This bridge leaves all original systems and resources in charge of gameplay.
// It adds only academic reservations, physical lane answers and academic pace.
class SprintCIAC {
  readonly course=new QuizCourse();
  readonly pace=new RacePace();
  readonly quiz:CIACQuiz;
  factor=1;
  private before={d:0,x:0};
  private enabled=true;
  constructor(private game:any) {
    const g=game;
    this.quiz=new CIACQuiz({scene:g.scene,course:this.course,
      frontier:()=>this.offset-g.world.nextChunkZ,
      notice:(message:string)=>g.ui.showToast(message),
      penalize:(seconds:number)=>this.pace.penalize(seconds)});
    const details=document.createElement('details');details.className='ciac-academics';
    const summary=document.createElement('summary');summary.textContent='CIAC · Semestre y ranking';details.append(summary);
    const start=document.querySelector('#start-screen')!;
    for(const el of start.querySelectorAll('.ciac-course,.ciac-prize,.ciac-ranking'))details.append(el);
    start.append(details);
    // Native text/select controls must not trigger the original swipe shortcuts.
    for(const type of ['keydown','touchstart','touchend','touchmove']){
      details.addEventListener(type,event=>event.stopPropagation());
      document.querySelector('.ciac-result')!.addEventListener(type,event=>event.stopPropagation());
    }
    const showScreen=g.ui.showScreen.bind(g.ui);
    g.ui.showScreen=(screen:any)=>{if(screen)this.quiz.suspend();else this.quiz.resume();return showScreen(screen);};
    this.reserveOriginalSpawns();
  }
  get offset(){return this.game.distance+this.game.player.mesh.position.z;}
  startRun(){
    this.pace.reset();this.factor=1;this.before={d:0,x:0};this.quiz.reset();
    this.course.reset(this.enabled);
    if(this.enabled)void this.quiz.start();
  }
  beforeStep(dt:number){
    const g=this.game;
    this.before={d:g.distance,x:g.player.mesh.position.x};
    if(!this.enabled)return;
    this.factor=this.pace.step(dt,g.distance,this.quiz.activeGate);
    g.currentSpeed=Math.min(g.maxSpeed,g.baseSpeed+(g.distance/100)*g.speedAcceleration)*this.factor;
  }
  afterStep(){
    if(!this.enabled)return;
    const g=this.game;
    if(g.currentState!==g.STATE.PLAYING){this.suspend();return;}
    const after={d:g.distance,x:g.player.mesh.position.x},gate=this.quiz.activeGate;
    const lane=this.before.d<gate&&after.d>=gate?crossingLane(this.before,after,gate):occupiedLane(after.x);
    this.quiz.tick(g.distance,lane);
    this.quiz.presentLane(occupiedLane(after.x));
    this.quiz.setOrigin(g.player.mesh.position.z);
    this.quiz.render(g.distance);
  }
  suspend(){this.quiz.suspend();}
  resume(){this.quiz.resume();}
  endRun(){this.quiz.endRun();}
  private reserveOriginalSpawns(){
    const world=this.game.world;
    for(const name of ['spawnTrain','spawnHighGirder','spawnLowBarrier','spawnStationLuggage','spawnHazardBarricade','spawnRoadblockCones']){
      const original=world[name];
      world[name]=(...args:any[])=>{
        const obstacle=original.apply(world,args);
        if(this.game.currentState===this.game.STATE.PLAYING&&this.enabled&&obstacle&&!obstacleAllowed(this.course,obstacle.getBounds(),this.offset,this.game.distance,!!obstacle.isMoving)){
          world.removeObstacle(world.activeObstacles.indexOf(obstacle));
          return null;
        }
        return obstacle;
      };
    }
    // Coin arcs, letters and power-ups keep their original implementation.
    // Exclude only pickups in the existing CIAC reserved answer corridors.
    const manager=this.game.collectibles;
    for(const [name,zIndex] of [['spawnCoin',2],['spawnPowerUp',3],['spawnLetter',3],['spawnKey',2]] as const){
      const original=manager[name];
      manager[name]=(...args:any[])=>{
        if(this.game.currentState===this.game.STATE.PLAYING&&this.enabled&&!this.course.allowsPickup(this.offset-Number(args[zIndex])))return;
        return original.apply(manager,args);
      };
    }
  }
}
(globalThis as any).SprintCIAC=SprintCIAC;
