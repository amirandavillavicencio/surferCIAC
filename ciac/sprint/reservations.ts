import {QuizCourse, RETIRE_BEHIND} from './course';
export interface Bounds {minZ:number;maxZ:number}
// The source game moves the runner through absolute negative Z. CIAC gates
// retain their run-distance spacing even after the source crash/restore snap.
export function obstacleAllowed(course:QuizCourse,b:Bounds,offset:number,distance:number,moving:boolean) {
  if(!course.enabled)return true;
  if(!moving)return !course.intersects(offset-b.maxZ,offset-b.minZ+RETIRE_BEHIND);
  // Original trains: v_train = 12 + .15 * v_runner. Bound all possible meetings
  // across the full original 13..38 m/s curve, including the 55% CIAC penalty.
  const front=Math.max(0,offset-b.maxZ-distance),tail=Math.max(0,offset-b.minZ-distance);
  const earliest=distance+front/(1.15+12/(13*.55));
  const latest=distance+tail/(1.15+12/38);
  return !course.intersects(earliest-4,latest+RETIRE_BEHIND);
}
export function occupiedLane(x:number) {return Math.max(0,Math.min(2,Math.floor(x/2.2+1.5)));}
export function crossingLane(before:{d:number;x:number},after:{d:number;x:number},gate:number) {
  const t=after.d>before.d?Math.max(0,Math.min(1,(gate-before.d)/(after.d-before.d))):1;
  return occupiedLane(before.x+(after.x-before.x)*t);
}
