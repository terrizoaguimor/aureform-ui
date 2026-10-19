import { defineProperties } from "figma:shaders"

export default function AuroraFill() {}

export function setup(device, frame) {
  var wgsl = `diagnostic(off,derivative_uniformity);
struct Uniforms {
  colorA: vec4f,
  colorB: vec4f,
  colorC: vec4f,
  scene: vec4f,
  motion: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
struct VsIn { @location(0) pos: vec2f, @location(1) uv: vec2f };
struct VsOut { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vs_main(input: VsIn) -> VsOut {
  var result: VsOut;
  result.position = vec4f(input.pos, 0.0, 1.0);
  result.uv = input.uv;
  return result;
}
fn hash21(p: vec2f) -> f32 {
  var q = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  q = q + vec3f(dot(q, q.yzx + vec3f(33.33)));
  return fract((q.x + q.y) * q.z);
}
fn noise21(p: vec2f) -> f32 {
  let cell = floor(p);
  let f = fract(p);
  let blend = f * f * (vec2f(3.0) - 2.0 * f);
  return mix(mix(hash21(cell), hash21(cell + vec2f(1.0, 0.0)), blend.x),
    mix(hash21(cell + vec2f(0.0, 1.0)), hash21(cell + vec2f(1.0)), blend.x), blend.y);
}
fn fbm(start: vec2f) -> f32 {
  var p = start;
  var total = 0.0;
  var weight = 0.5;
  let octave = mat2x2f(vec2f(1.67, 1.12), vec2f(-1.12, 1.67));
  for (var i = 0; i < 4; i = i + 1) {
    total = total + noise21(p) * weight;
    p = octave * p + vec2f(3.2, 7.1);
    weight = weight * 0.5;
  }
  return total;
}
fn spectrum(phase: f32) -> vec3f {
  var weights = vec3f(0.5) + 0.5 * cos(vec3f(0.0, 2.094395, 4.188790) + vec3f(phase));
  weights = weights * weights;
  return (u.colorA.rgb * weights.x + u.colorB.rgb * weights.y + u.colorC.rgb * weights.z) / max(dot(weights, vec3f(1.0)), 0.001);
}
fn finishLight(light: vec3f, uv: vec2f) -> vec3f {
  let ink = vec3f(0.018, 0.023, 0.052);
  let vignette = 1.0 - 0.36 * smoothstep(0.18, 0.82, length((uv - vec2f(0.5)) * vec2f(1.04, 1.0)));
  var color = (ink + max(light, vec3f(0.0)) * u.scene.w) * vignette;
  color = vec3f(1.0) - exp(-color * 1.28);
  color = color + vec3f((hash21(uv * u.scene.yz) - 0.5) * 0.008);
  return clamp(color, vec3f(0.0), vec3f(1.0));
}
@fragment fn fs_main(@location(0) inputUV: vec2f) -> @location(0) vec4f {
  let uv = vec2f(inputUV.x, 1.0 - inputUV.y);
  var p = (2.0 * uv * u.scene.yz - u.scene.yz) / max(min(u.scene.y, u.scene.z), 1.0) * u.motion.x;
  let t = u.scene.x * u.motion.y;
  p = vec2f(p.x + 0.22 * p.y, p.y);
  var light = vec3f(0.0);
  for (var i = 0; i < 3; i = i + 1) {
    let lane = f32(i);
    let turbulence = fbm(vec2f(p.y * 0.62 + lane * 3.4 - t * 0.13, p.x * 0.38 + t * 0.09));
    let center = -0.85 + lane * 0.94 + 0.26 * sin(p.y * 1.35 + lane * 1.7 + t * 0.28) + (turbulence - 0.46) * 0.72;
    let distance = p.x - center;
    let curtain = exp(-distance * distance * (7.5 + lane * 2.0));
    let bloom = exp(-distance * distance * 1.7) * 0.16;
    let filament = pow(0.5 + 0.5 * sin(distance * 64.0 + turbulence * 9.0), 6.0);
    let drape = 0.58 + 0.42 * smoothstep(-1.5, 1.1, p.y);
    let tint = spectrum(lane * 2.094395 + p.y * 0.3 + t * 0.09);
    light = light + tint * (curtain * (1.1 + filament * 0.32) + bloom) * drape;
  }
  light = light + spectrum(p.y * 0.7 + 1.4) * 0.13 * exp(-dot(p, p) * 0.16);
  return vec4f(finishLight(light, uv), 1.0);
}`;
  frame.state.module = device.createShaderModule({ code: wgsl })
  frame.state.quad = device.createBuffer({ size: 96, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true })
  new Float32Array(frame.state.quad.getMappedRange()).set([-1,-1,0,1, 1,-1,1,1, -1,1,0,0, -1,1,0,0, 1,-1,1,1, 1,1,1,0])
  frame.state.quad.unmap()
  frame.state.uniforms = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
}

export function render(device, frame) {
  var p = frame.params || {}
  var a = p.colorA || { r: 0.545, g: 0.361, b: 0.965, a: 1 }
  var b = p.colorB || { r: 0.133, g: 0.827, b: 0.933, a: 1 }
  var c = p.colorC || { r: 0.204, g: 0.827, b: 0.6, a: 1 }
  if (p.paused && frame.state.freezeTime == null) frame.state.freezeTime = Number(frame.time) * 0.001
  if (!p.paused) frame.state.freezeTime = null
  var seconds = p.paused ? frame.state.freezeTime : Number(frame.time) * 0.001
  device.queue.writeBuffer(frame.state.uniforms, 0, new Float32Array([
    a.r,a.g,a.b,1, b.r,b.g,b.b,1, c.r,c.g,c.b,1,
    seconds,frame.output.width,frame.output.height,Number(p.intensity == null ? .55 : p.intensity),
    Number(p.scale == null ? 1 : p.scale),Number(p.speed == null ? .2 : p.speed),0,0,
  ]))
  if (frame.state.pipelineFormat !== frame.output.format) {
    frame.state.pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: frame.state.module, entryPoint: "vs_main", buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }, { shaderLocation: 1, format: "float32x2", offset: 8 }] }] },
      fragment: { module: frame.state.module, entryPoint: "fs_main", targets: [{ format: frame.output.format }] },
      primitive: { topology: "triangle-list" },
    })
    frame.state.pipelineFormat = frame.output.format
  }
  var encoder = device.createCommandEncoder()
  var pass = encoder.beginRenderPass({ colorAttachments: [{ view: frame.output.createView(), loadOp: "clear", clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: "store" }] })
  pass.setPipeline(frame.state.pipeline)
  pass.setBindGroup(0, device.createBindGroup({ layout: frame.state.pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: frame.state.uniforms } }] }))
  pass.setVertexBuffer(0, frame.state.quad)
  pass.draw(6)
  pass.end()
  device.queue.submit([encoder.finish()])
}

defineProperties(AuroraFill, {
  colorA: { type: "color", label: "Primary light", defaultValue: { r: .545, g: .361, b: .965, a: 1 } },
  colorB: { type: "color", label: "Secondary light", defaultValue: { r: .133, g: .827, b: .933, a: 1 } },
  colorC: { type: "color", label: "Third light", defaultValue: { r: .204, g: .827, b: .6, a: 1 } },
  speed: { type: "number", label: "Speed", control: "slider", min: 0, max: 1, step: .01, defaultValue: .2 },
  scale: { type: "number", label: "Scale", control: "slider", min: .25, max: 4, step: .05, defaultValue: 1 },
  intensity: { type: "number", label: "Intensity", control: "slider", min: 0, max: 1, step: .01, defaultValue: .55 },
  paused: { type: "boolean", label: "Pause", defaultValue: false },
})
