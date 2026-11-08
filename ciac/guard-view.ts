import * as THREE from 'three';
import {OfficerModel} from './officer-model';
import type {ChaseFrame} from './chase';
export class GuardView {
  readonly root=new THREE.Group();readonly actor=new OfficerModel();
  private box=new THREE.Box3();
  constructor(scene:THREE.Scene){this.root.name='ciac-guard';this.root.add(this.actor.officerGroup);scene.add(this.root);this.root.visible=false;}
  reset(){this.root.visible=false;}
  update(state:ChaseFrame,distance:number){
    this.root.visible=state.visible&&state.mode!=='hidden';
    if(!this.root.visible)return;
    const a=this.actor,stop=state.mode==='captured'?0:1,stride=Math.sin(state.phase)*stop;
    const swing = .75 + .3 * state.urgency;
    a.officerLeftLeg.rotation.x = stride * swing;
    a.officerRightLeg.rotation.x = -stride * swing;
    a.officerGroup.rotation.x = -.08 * state.urgency - .16 * state.reach;
    a.officerLeftArm.rotation.x=-stride*.8*(1-state.reach)-state.reach*1.35;
    a.officerRightArm.rotation.x=stride*.8*(1-state.reach)-state.reach*1.35;
    if(state.air){a.officerLeftLeg.rotation.x=.55;a.officerRightLeg.rotation.x=-.3;}
    a.officerTorso.position.y=.98+Math.abs(Math.cos(state.phase))*.045*stop;
    a.officerHeadGroup.rotation.y=-stride*.06;
    this.root.position.set(state.x-.55,0,distance-state.d);
    this.root.updateMatrixWorld(true);this.box.setFromObject(a.officerGroup);
    this.root.position.y=state.y-this.box.min.y;
    this.root.updateMatrixWorld(true);
  }
}
