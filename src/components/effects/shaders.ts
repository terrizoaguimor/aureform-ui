import type { ShaderKind } from "./effect-utils";

/**
 * Original Aureform UI 1.1 procedural shaders. No textures, remote assets or
 * third-party shader code. This module is loaded only when a shader can run.
 * See docs/shaders.md for the uniform contract and GLSL -> WGSL port notes.
 */
export const shaderVertexSource = `#version 300 es
precision highp float;

void main() {
  vec2 corners[3] = vec2[3](
    vec2(-1.0, -1.0),
    vec2( 3.0, -1.0),
    vec2(-1.0,  3.0)
  );
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}
`;

export const shaderCommonSource = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uIntensity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
out vec4 fragColor;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.x, p.y, p.x) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise21(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 blend = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), blend.x),
    mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0)), blend.x),
    blend.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float weight = 0.5;
  mat2 octave = mat2(1.67, 1.12, -1.12, 1.67);
  for (int i = 0; i < 4; i++) {
    total += noise21(p) * weight;
    p = octave * p + vec2(3.2, 7.1);
    weight *= 0.5;
  }
  return total;
}

vec3 spectrum(float phase) {
  vec3 weights = 0.5 + 0.5 * cos(vec3(0.0, 2.094395, 4.188790) + phase);
  weights *= weights;
  return (
    uColorA * weights.x + uColorB * weights.y + uColorC * weights.z
  ) / max(dot(weights, vec3(1.0)), 0.001);
}

vec2 scenePoint() {
  return (2.0 * gl_FragCoord.xy - uResolution)
    / max(min(uResolution.x, uResolution.y), 1.0) * uScale;
}

vec3 finishLight(vec3 light, vec2 uv) {
  vec3 ink = vec3(0.018, 0.023, 0.052);
  float vignette = 1.0 - 0.36 * smoothstep(
    0.18, 0.82, length((uv - 0.5) * vec2(1.04, 1.0))
  );
  vec3 color = (ink + max(light, vec3(0.0)) * uIntensity) * vignette;
  color = vec3(1.0) - exp(-color * 1.28);
  // Fixed spatial grain avoids temporal flicker and gradient banding.
  color += (hash21(gl_FragCoord.xy) - 0.5) * 0.008;
  return clamp(color, 0.0, 1.0);
}
`;

export const auroraFragmentSource =
  shaderCommonSource +
  `
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = scenePoint();
  float t = uTime;
  p.x += 0.22 * p.y;
  vec3 light = vec3(0.0);

  for (int i = 0; i < 3; i++) {
    float lane = float(i);
    float turbulence = fbm(vec2(
      p.y * 0.62 + lane * 3.4 - t * 0.13,
      p.x * 0.38 + t * 0.09
    ));
    float center = -0.85 + lane * 0.94
      + 0.26 * sin(p.y * 1.35 + lane * 1.7 + t * 0.28)
      + (turbulence - 0.46) * 0.72;
    float distance = p.x - center;
    float curtain = exp(-distance * distance * (7.5 + lane * 2.0));
    float bloom = exp(-distance * distance * 1.7) * 0.16;
    float filament = pow(
      0.5 + 0.5 * sin(distance * 64.0 + turbulence * 9.0), 6.0
    );
    float drape = 0.58 + 0.42 * smoothstep(-1.5, 1.1, p.y);
    vec3 tint = spectrum(lane * 2.094395 + p.y * 0.3 + t * 0.09);
    light += tint * (curtain * (1.1 + filament * 0.32) + bloom) * drape;
  }

  light += spectrum(p.y * 0.7 + 1.4) * 0.13 * exp(-dot(p, p) * 0.16);
  fragColor = vec4(finishLight(light, uv), 1.0);
}
`;

export const wavesFragmentSource =
  shaderCommonSource +
  `
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = scenePoint();
  float t = uTime;
  p.y += p.x * 0.16;
  vec3 light = vec3(0.0);

  for (int i = 0; i < 3; i++) {
    float lane = float(i);
    float swell = 0.28 * sin(p.x * 1.38 + lane * 0.9 + t * 0.32)
      + 0.13 * sin(p.x * 2.7 - lane * 1.15 - t * 0.23);
    float center = -0.62 + lane * 0.61 + swell;
    float distance = p.y - center;
    float ribbon = exp(-distance * distance * 17.0);
    float edgeDistance = abs(distance) - 0.14;
    float edge = exp(-edgeDistance * edgeDistance * 310.0);
    float engraving = pow(
      0.5 + 0.5 * cos(distance * 92.0 + p.x * 0.65), 16.0
    );
    vec3 tint = spectrum(lane * 2.094395 + p.x * 0.26 - t * 0.08);
    light += tint * (ribbon * 0.98 + edge * 0.28);
    light += mix(tint, vec3(0.82, 0.94, 1.0), 0.48)
      * engraving * ribbon * 0.12;
  }

  light += spectrum(p.x * 0.35 + 2.6) * 0.1
    * exp(-p.y * p.y * 0.45);
  fragColor = vec4(finishLight(light, uv), 1.0);
}
`;

export const iridescentFragmentSource =
  shaderCommonSource +
  `
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = scenePoint();
  float t = uTime;
  vec2 q = p + 0.24 * vec2(
    sin(p.y * 1.25 + t * 0.19),
    cos(p.x * 1.08 - t * 0.17)
  );
  float fold = q.x * 1.8 + 0.75 * sin(q.y * 1.1 + t * 0.17);
  float crossFold = q.y * 2.1 - q.x * 0.8 - t * 0.23;
  float height = sin(fold) + 0.52 * cos(crossFold);
  float dx = 1.8 * cos(fold) + 0.416 * sin(crossFold);
  float dy = 0.825 * cos(q.y * 1.1 + t * 0.17) * cos(fold)
    - 1.092 * sin(crossFold);
  vec3 normal = normalize(vec3(-dx * 0.46, -dy * 0.46, 1.0));
  vec3 keyLight = normalize(vec3(-0.35, 0.6, 0.85));
  float diffuse = max(dot(normal, keyLight), 0.0);
  float pearl = pow(
    max(dot(normal, normalize(vec3(0.25, -0.15, 1.0))), 0.0), 22.0
  );
  float fresnel = pow(1.0 - normal.z, 2.0);
  float contour = pow(
    0.5 + 0.5 * cos(height * 13.0 + p.x * 0.2), 22.0
  );
  vec3 tint = spectrum(height * 1.55 + p.x * 0.32 + t * 0.08);
  vec3 light = tint * (0.3 + diffuse * 0.86 + fresnel * 0.6)
    + vec3(0.78, 0.9, 1.0) * pearl * 0.62
    + mix(tint, vec3(0.9), 0.35) * contour * 0.06;
  fragColor = vec4(finishLight(light, uv), 1.0);
}
`;

export const shaderFragmentSources: Record<
  Exclude<ShaderKind, "none">,
  string
> = {
  aurora: auroraFragmentSource,
  waves: wavesFragmentSource,
  iridescent: iridescentFragmentSource,
};
