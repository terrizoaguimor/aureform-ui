import { defineProperties } from "figma:shaders"

export default function WavesFill() {}

export function setup(device, frame) {
  var wgsl = `diagnostic(off,derivative_uniformity);
struct Uniforms { colorA:vec4f, colorB:vec4f, colorC:vec4f, scene:vec4f, motion:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VsIn { @location(0) pos:vec2f, @location(1) uv:vec2f };
struct VsOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs_main(input:VsIn)->VsOut {
  var result:VsOut; result.position=vec4f(input.pos,0.0,1.0); result.uv=input.uv; return result;
}
fn hash21(p:vec2f)->f32 {
  var q=fract(vec3f(p.x,p.y,p.x)*0.1031);
  q=q+vec3f(dot(q,q.yzx+vec3f(33.33)));
  return fract((q.x+q.y)*q.z);
}
fn spectrum(phase:f32)->vec3f {
  var weights=vec3f(0.5)+0.5*cos(vec3f(0.0,2.094395,4.188790)+vec3f(phase));
  weights=weights*weights;
  return (u.colorA.rgb*weights.x+u.colorB.rgb*weights.y+u.colorC.rgb*weights.z)/max(dot(weights,vec3f(1.0)),0.001);
}
fn finishLight(light:vec3f,uv:vec2f)->vec3f {
  let vignette=1.0-0.36*smoothstep(0.18,0.82,length((uv-vec2f(0.5))*vec2f(1.04,1.0)));
  var color=(vec3f(0.018,0.023,0.052)+max(light,vec3f(0.0))*u.scene.w)*vignette;
  color=vec3f(1.0)-exp(-color*1.28);
  color=color+vec3f((hash21(uv*u.scene.yz)-0.5)*0.008);
  return clamp(color,vec3f(0.0),vec3f(1.0));
}
@fragment fn fs_main(@location(0) inputUV:vec2f)->@location(0) vec4f {
  let uv=vec2f(inputUV.x,1.0-inputUV.y);
  var p=(2.0*uv*u.scene.yz-u.scene.yz)/max(min(u.scene.y,u.scene.z),1.0)*u.motion.x;
  let t=u.scene.x*u.motion.y;
  p=vec2f(p.x,p.y+p.x*0.16);
  var light=vec3f(0.0);
  for(var i=0;i<3;i=i+1) {
    let lane=f32(i);
    let swell=0.28*sin(p.x*1.38+lane*0.9+t*0.32)+0.13*sin(p.x*2.7-lane*1.15-t*0.23);
    let center=-0.62+lane*0.61+swell;
    let distance=p.y-center;
    let ribbon=exp(-distance*distance*17.0);
    let edgeDistance=abs(distance)-0.14;
    let edge=exp(-edgeDistance*edgeDistance*310.0);
    let engraving=pow(0.5+0.5*cos(distance*92.0+p.x*0.65),16.0);
    let tint=spectrum(lane*2.094395+p.x*0.26-t*0.08);
    light=light+tint*(ribbon*0.98+edge*0.28);
    light=light+mix(tint,vec3f(0.82,0.94,1.0),0.48)*engraving*ribbon*0.12;
  }
  light=light+spectrum(p.x*0.35+2.6)*0.1*exp(-p.y*p.y*0.45);
  return vec4f(finishLight(light,uv),1.0);
}`;
  frame.state.module=device.createShaderModule({code:wgsl})
  frame.state.quad=device.createBuffer({size:96,usage:GPUBufferUsage.VERTEX,mappedAtCreation:true})
  new Float32Array(frame.state.quad.getMappedRange()).set([-1,-1,0,1,1,-1,1,1,-1,1,0,0,-1,1,0,0,1,-1,1,1,1,1,1,0])
  frame.state.quad.unmap()
  frame.state.uniforms=device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
}

export function render(device,frame) {
  var p=frame.params||{}
  var a=p.colorA||{r:139/255,g:92/255,b:246/255}
  var b=p.colorB||{r:34/255,g:211/255,b:238/255}
  var c=p.colorC||{r:52/255,g:211/255,b:153/255}
  if(p.paused&&frame.state.freezeTime==null) frame.state.freezeTime=Number(frame.time)*0.001
  if(!p.paused) frame.state.freezeTime=null
  var seconds=p.paused?frame.state.freezeTime:Number(frame.time)*0.001
  device.queue.writeBuffer(frame.state.uniforms,0,new Float32Array([
    a.r,a.g,a.b,1,b.r,b.g,b.b,1,c.r,c.g,c.b,1,
    seconds,frame.output.width,frame.output.height,Math.max(0,Math.min(1,Number(p.intensity==null ? .55 : p.intensity))),
    Math.max(.25,Math.min(4,Number(p.scale==null?1:p.scale))),Math.max(0,Math.min(1,Number(p.speed==null ? .2 : p.speed))),0,0,
  ]))
  if(frame.state.pipelineFormat!==frame.output.format) {
    frame.state.pipeline=device.createRenderPipeline({
      layout:"auto",
      vertex:{module:frame.state.module,entryPoint:"vs_main",buffers:[{arrayStride:16,attributes:[{shaderLocation:0,format:"float32x2",offset:0},{shaderLocation:1,format:"float32x2",offset:8}]}]},
      fragment:{module:frame.state.module,entryPoint:"fs_main",targets:[{format:frame.output.format}]},
      primitive:{topology:"triangle-list"},
    })
    frame.state.pipelineFormat=frame.output.format
  }
  var encoder=device.createCommandEncoder()
  var pass=encoder.beginRenderPass({colorAttachments:[{view:frame.output.createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]})
  pass.setPipeline(frame.state.pipeline)
  pass.setBindGroup(0,device.createBindGroup({layout:frame.state.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:frame.state.uniforms}}]}))
  pass.setVertexBuffer(0,frame.state.quad)
  pass.draw(6)
  pass.end()
  device.queue.submit([encoder.finish()])
}

defineProperties(WavesFill,{
  colorA:{type:"color",label:"Primary light",defaultValue:{r:139/255,g:92/255,b:246/255,a:1}},
  colorB:{type:"color",label:"Secondary light",defaultValue:{r:34/255,g:211/255,b:238/255,a:1}},
  colorC:{type:"color",label:"Third light",defaultValue:{r:52/255,g:211/255,b:153/255,a:1}},
  speed:{type:"number",label:"Speed",control:"slider",min:0,max:1,step:.01,defaultValue:.2},
  scale:{type:"number",label:"Scale",control:"slider",min:.25,max:4,step:.05,defaultValue:1},
  intensity:{type:"number",label:"Intensity",control:"slider",min:0,max:1,step:.01,defaultValue:.55},
  paused:{type:"boolean",label:"Pause",defaultValue:false},
})
