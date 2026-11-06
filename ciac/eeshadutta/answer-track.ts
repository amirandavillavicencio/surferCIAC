import {QuizCourse,GATE_SPACING,STRIP_LENGTH,RETIRE_BEHIND} from './course';
// Only the academic lane strips use this small additional WebGL program.
// All original entities, shaders, textures and collision code remain original.
export class QuizAnswerTrack {
  readonly root={position:{z:0}};
  private program:WebGLProgram;private vertices:WebGLBuffer;private position:number;
  private matrix:WebGLUniformLocation;private tint:WebGLUniformLocation;private offset:WebGLUniformLocation;
  private distance=0;private course:QuizCourse|null=null;
  constructor(private gl:WebGLRenderingContext){
    const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Academic shader failed');return s;};
    this.program=gl.createProgram()!;
    gl.attachShader(this.program,shader(gl.VERTEX_SHADER,'attribute vec3 p;uniform mat4 m;uniform vec3 o;void main(){gl_Position=m*vec4(p+o,1.);}'));
    gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform vec4 c;void main(){gl_FragColor=c;}'));
    gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Academic shader link failed');
    this.position=gl.getAttribLocation(this.program,'p');this.matrix=gl.getUniformLocation(this.program,'m')!;this.tint=gl.getUniformLocation(this.program,'c')!;this.offset=gl.getUniformLocation(this.program,'o')!;
    this.vertices=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);
    const z=STRIP_LENGTH/2;gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-2.89,0,-z,2.89,0,-z,-2.89,0,z,-2.89,0,z,2.89,0,-z,2.89,0,z]),gl.STATIC_DRAW);
  }
  update(distance:number,course:QuizCourse){this.distance=distance;this.course=course;}
  hide(){this.course=null;}
  draw(matrix:Float32Array){
    if(!this.course?.enabled)return;
    const gl=this.gl,first=this.course.gateAtOrAfter(this.distance-RETIRE_BEHIND);
    const program=gl.getParameter(gl.CURRENT_PROGRAM),blend=gl.isEnabled(gl.BLEND);
    gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,0,0);
    gl.uniformMatrix4fv(this.matrix,false,matrix);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    const colors=[[.204,.435,.859],[.133,.584,.475],[.506,.310,.812]];
    for(let slot=0;slot<3;slot++){
      const gate=first+slot*GATE_SPACING;if(!this.course.canShow(gate,this.distance))continue;
      for(let lane=0;lane<3;lane++){
        gl.uniform4f(this.tint,colors[lane][0],colors[lane][1],colors[lane][2],.75);
        gl.uniform3f(this.offset,(lane-1)*6,-4.96,this.root.position.z+this.distance-gate+STRIP_LENGTH/2);gl.drawArrays(gl.TRIANGLES,0,6);
      }
    }
    gl.depthMask(true);if(!blend)gl.disable(gl.BLEND);gl.useProgram(program);
  }
}
