import {
  defaultEffectColors,
  effectFrameInterval,
  type ShaderKind,
} from "./effect-utils";
import { shaderFragmentSources, shaderVertexSource } from "./shaders";

export type ShaderConfig = {
  colors: [string, string, string];
  speed: number;
  scale: number;
  intensity: number;
  paused: boolean;
};

export type ShaderRenderer = {
  configure: (config: ShaderConfig) => void;
  resize: () => boolean;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

const pixelBudget = 1_300_000;
const maxDimension = 2048;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader allocation failed.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(reason || "Shader compilation failed.");
  }
  return shader;
}

function readColors(host: HTMLElement, colors: ShaderConfig["colors"]) {
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.display = "none";
  host.appendChild(probe);
  try {
    return colors.map((color, index) => {
      probe.style.color = defaultEffectColors[index];
      // Resolve CSS variables against the nearest AppearanceScope.
      if (CSS.supports("color", color)) probe.style.color = color;
      return getComputedStyle(probe).color;
    });
  } finally {
    probe.remove();
  }
}

/**
 * Small WebGL2 renderer with an owned program/VAO and no global ticker.
 * Callers create it only after visibility and motion checks have passed.
 */
export function createShaderRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  kind: Exclude<ShaderKind, "none">,
  initial: ShaderConfig,
  onFrame: () => void,
): ShaderRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl || gl.isContextLost()) return null;

  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;

  try {
    vertex = compileShader(gl, gl.VERTEX_SHADER, shaderVertexSource);
    fragment = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      shaderFragmentSources[kind],
    );
    program = gl.createProgram();
    if (!program) throw new Error("Program allocation failed.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        gl.getProgramInfoLog(program) || "Program linking failed.",
      );
    }
    vertexArray = gl.createVertexArray();
    if (!vertexArray) throw new Error("Vertex array allocation failed.");
  } catch (error) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    if (vertexArray) gl.deleteVertexArray(vertexArray);
    throw error;
  }

  // Linked programs retain their code; the intermediate shaders are released.
  gl.detachShader(program, vertex);
  gl.detachShader(program, fragment);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  const uniforms = Object.fromEntries(
    [
      "uResolution",
      "uTime",
      "uScale",
      "uIntensity",
      "uColorA",
      "uColorB",
      "uColorC",
    ].map((name) => [name, gl.getUniformLocation(program, name)]),
  );
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorContext = colorCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  let colorKey = "";
  let rgbColors = defaultEffectColors.map((color) =>
    [1, 3, 5].map(
      (offset) => parseInt(color.slice(offset, offset + 2), 16) / 255,
    ),
  );
  let config = initial;
  let disposed = false;
  let running = false;
  let frame = 0;
  let lastDraw = -1;
  let lastTick = 0;
  let phase = 0;

  const configure = (next: ShaderConfig) => {
    config = next;
    const resolved = readColors(host, next.colors);
    const key = resolved.join("|");
    if (key === colorKey || !colorContext) return;
    colorKey = key;
    rgbColors = resolved.map((color) => {
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = color;
      colorContext.fillRect(0, 0, 1, 1);
      return Array.from(colorContext.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map((channel) => channel / 255);
    });
  };

  const resize = () => {
    if (disposed || gl.isContextLost()) return false;
    const bounds = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, bounds.width * dpr);
    const height = Math.max(1, bounds.height * dpr);
    const fit = Math.min(
      1,
      Math.sqrt(pixelBudget / (width * height)),
      maxDimension / width,
      maxDimension / height,
    );
    const nextWidth = Math.max(1, Math.floor(width * fit));
    const nextHeight = Math.max(1, Math.floor(height * fit));
    if (canvas.width === nextWidth && canvas.height === nextHeight)
      return false;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    gl.viewport(0, 0, nextWidth, nextHeight);
    return true;
  };

  const tick = (now: number) => {
    if (!running || disposed) return;
    frame = requestAnimationFrame(tick);
    if (gl.isContextLost()) return;
    phase += (Math.min(Math.max(0, now - lastTick), 100) / 1000) * config.speed;
    lastTick = now;
    if (lastDraw >= 0 && now - lastDraw < effectFrameInterval) return;
    // Space actual draws by at least 1/30s, including jitter and quick resumes.
    lastDraw = now;
    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, phase);
    gl.uniform1f(uniforms.uScale, config.scale);
    gl.uniform1f(uniforms.uIntensity, config.intensity);
    gl.uniform3fv(uniforms.uColorA, rgbColors[0]);
    gl.uniform3fv(uniforms.uColorB, rgbColors[1]);
    gl.uniform3fv(uniforms.uColorC, rgbColors[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    onFrame();
  };

  const stop = () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  try {
    configure(initial);
    resize();
  } catch (error) {
    gl.deleteVertexArray(vertexArray);
    gl.deleteProgram(program);
    colorCanvas.width = 0;
    colorCanvas.height = 0;
    throw error;
  }
  return {
    configure,
    resize,
    start() {
      if (running || disposed || gl.isContextLost()) return;
      running = true;
      lastTick = performance.now();
      frame = requestAnimationFrame(tick);
    },
    stop,
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      if (!gl.isContextLost()) {
        gl.bindVertexArray(null);
        gl.useProgram(null);
        gl.deleteVertexArray(vertexArray);
        gl.deleteProgram(program);
        canvas.width = 1;
        canvas.height = 1;
      }
      // Do not force context loss: React Strict Mode can reuse this canvas.
      colorCanvas.width = 0;
      colorCanvas.height = 0;
    },
  };
}
