import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../upstream/src/sim/sim';
import {ChaseState} from '../upstream/src/ciac/chase';
import {trafficKind} from '../upstream/src/ciac/encounters';

test('academic danger responds to verified answers and resets on a new run',()=>{
 const chase=new ChaseState();
 assert.equal(chase.danger,0);
 assert.equal(chase.answer(false),1);
 assert.equal(chase.answer(false),2);
 assert.equal(chase.answer(true),1);
 for(let i=0;i<7;i++)chase.answer(false);
 assert.equal(chase.danger,4);
 chase.reset();
 assert.equal(chase.danger,0);
 assert.equal(chase.answer(true),0);
});

test('four wrong answers lead to the real simulator caught event',()=>{
 const sim=new Sim(4);
 sim.noSpawn=true;sim.reset(4,false);sim.clearWorld();sim.start();
 const chase=new ChaseState();
 for(let i=0;i<4;i++)chase.answer(false);
 for(let i=0;i<180&&chase.current.mode!=='captured';i++){
   sim.update(1/120);
   chase.observe(sim,1/120,sim.drainEvents());
 }
 assert.equal(chase.current.mode,'captured');
 sim.caughtByGuard();
 assert.equal(sim.alive,false);
 const crashes=sim.drainEvents().filter(e=>e.type==='crash');
 assert.equal(crashes.length,1);
 assert.equal((crashes[0] as any).kind,'caught');
 sim.caughtByGuard();
 assert.equal(sim.drainEvents().length,0);
});

test('stumble pressure can be reduced with a correct academic answer',()=>{
 const sim=new Sim(5);sim.noSpawn=true;sim.reset(5,false);sim.clearWorld();sim.start();
 const chase=new ChaseState();
 chase.observe(sim,1/60,[{type:'stumble',x:0,y:0}]);
 assert.equal(chase.danger,1);
 chase.answer(true);
 assert.equal(chase.danger,0);
});

test('later traffic includes more double-train encounter families and recovery',()=>{
 const earlier=Array.from({length:20},(_,i)=>trafficKind(i,500));
 const later=Array.from({length:20},(_,i)=>trafficKind(i,1600));
 assert.ok(later.filter(x=>x==='double').length>earlier.filter(x=>x==='double').length);
 assert.ok(later.includes('recovery'));
});
