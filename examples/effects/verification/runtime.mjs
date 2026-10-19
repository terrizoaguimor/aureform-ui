import assert from "node:assert/strict";
import { resolve } from "node:path";
import { root, serverModule } from "./support.mjs";

/** Deterministic timing checks complement the real-browser shader checks. */
export async function runtimeChecks() {
  const { createShaderRenderer } = await serverModule(
    resolve(root, "src/components/effects/shader-runtime.ts"),
  );
  const previous = new Map();
  const globals = {
    window: { devicePixelRatio: 3 },
    CSS: { supports: () => true },
    getComputedStyle: (element) => ({ color: element.style.color }),
  };
  let now = 0;
  let nextFrame = 1;
  let colorFailure = false;
  const pending = new Map();
  const draws = [];
  const phases = [];
  const programs = new Set();
  const shaders = new Set();
  const arrays = new Set();
  Object.assign(globals, {
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      const id = nextFrame++;
      pending.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    document: {
      createElement: (tag) =>
        tag === "span"
          ? { style: {}, setAttribute() {}, remove() {} }
          : {
              width: 0,
              height: 0,
              getContext: () => ({
                clearRect() {},
                fillRect() {},
                getImageData() {
                  if (colorFailure) throw new Error("Color allocation failed");
                  return { data: [139, 92, 246, 255] };
                },
              }),
            },
    },
  });
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    TRIANGLES: 5,
    isContextLost: () => false,
    createShader() {
      const shader = {};
      shaders.add(shader);
      return shader;
    },
    deleteShader: (shader) => shaders.delete(shader),
    shaderSource() {},
    compileShader() {},
    getShaderParameter: () => true,
    createProgram() {
      const program = {};
      programs.add(program);
      return program;
    },
    deleteProgram: (program) => programs.delete(program),
    attachShader() {},
    detachShader() {},
    linkProgram() {},
    getProgramParameter: () => true,
    createVertexArray() {
      const array = {};
      arrays.add(array);
      return array;
    },
    deleteVertexArray: (array) => arrays.delete(array),
    getUniformLocation: (_program, name) => name,
    disable() {},
    viewport() {},
    useProgram() {},
    bindVertexArray() {},
    uniform2f() {},
    uniform1f(name, value) {
      if (name === "uTime") phases.push(value);
    },
    uniform3fv() {},
    drawArrays: () => draws.push(now),
  };
  const host = {
    appendChild() {},
    getBoundingClientRect: () => ({ width: 6000, height: 3000 }),
  };
  const config = {
    colors: ["#8b5cf6", "#22d3ee", "#34d399"],
    speed: 0.2,
    scale: 1,
    intensity: 0.55,
    paused: false,
  };
  const step = (time) => {
    now = time;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(time));
  };
  let renderer;
  try {
    for (const [key, value] of Object.entries(globals)) {
      previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    }
    const canvas = { width: 1, height: 1, getContext: () => gl };
    let reported = 0;
    renderer = createShaderRenderer(canvas, host, "waves", config, () => {
      reported += 1;
    });
    assert(renderer);
    assert(canvas.width * canvas.height <= 1_300_000);
    assert(Math.max(canvas.width, canvas.height) <= 2048);
    assert.equal(shaders.size, 0);
    renderer.start();
    for (const time of [0, 20, 50, 67, 90, 101, 117, 151, 168, 185, 202])
      step(time);
    const beforeResume = draws.length;
    renderer.stop();
    assert.equal(pending.size, 0);
    now = 203;
    renderer.start();
    step(204);
    assert.equal(draws.length, beforeResume, "Quick resume cannot bypass the cap");
    step(220);
    assert(draws.length > beforeResume);
    for (let index = 1; index < draws.length; index++) {
      assert(
        draws[index] - draws[index - 1] >= 1000 / 30,
        `Actual draws were too close: ${draws[index - 1]} -> ${draws[index]}`,
      );
    }
    renderer.stop();
    const beforePause = phases.at(-1);
    now = 50_000;
    renderer.start();
    step(50_010);
    assert(phases.at(-1) - beforePause < 0.01, "Pause preserves active time");
    renderer.dispose();
    renderer.dispose();
    assert.equal(pending.size, 0);
    assert.equal(programs.size, 0);
    assert.equal(arrays.size, 0);
    assert.equal(canvas.width * canvas.height, 1);
    assert.equal(reported, draws.length);
    colorFailure = true;
    assert.throws(
      () => createShaderRenderer(canvas, host, "aurora", config, () => {}),
      /Color allocation failed/,
    );
    assert.equal(programs.size, 0, "Initialization failure releases the program");
    assert.equal(arrays.size, 0, "Initialization failure releases the VAO");
    assert.equal(shaders.size, 0);
    return { actualDrawSpacing: ">= 1/30s", pausePreservesTime: true, failedSetupResources: 0 };
  } finally {
    renderer?.dispose();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

if (process.argv[1] === resolve(root, "examples/effects/verification/runtime.mjs"))
  console.log(await runtimeChecks());
