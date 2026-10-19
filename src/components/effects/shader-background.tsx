"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  boundedNumber,
  effectColors,
  gradientField,
  type EffectStyle,
  type ShaderKind,
} from "./effect-utils";
import {
  watchEffectEnvironment,
  type EffectEnvironment,
} from "./effect-motion";
import type { ShaderConfig, ShaderRenderer } from "./shader-runtime";
import "./effects.css";

export type ShaderBackgroundProps = {
  kind?: ShaderKind;
  colors?: string[];
  speed?: number;
  scale?: number;
  intensity?: number;
  paused?: boolean;
  className?: string;
  children?: ReactNode;
};

export type ShaderState = "loading" | "running" | "paused" | "fallback" | "off";

export function ShaderBackground({
  kind = "aurora",
  colors,
  speed = 0.2,
  scale = 1,
  intensity = 0.55,
  paused = false,
  className,
  children,
}: ShaderBackgroundProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<{
    update: (config: ShaderConfig) => void;
  } | null>(null);
  const config = useMemo<ShaderConfig>(
    () => ({
      colors: effectColors(colors),
      speed: boundedNumber(speed, 0, 1, 0.2),
      scale: boundedNumber(scale, 0.25, 4, 1),
      intensity: boundedNumber(intensity, 0, 1, 0.55),
      paused,
    }),
    [colors, speed, scale, intensity, paused],
  );
  const configRef = useRef(config);

  // Uniform and pause updates do not recompile the program or reset time.
  useEffect(() => {
    configRef.current = config;
    controllerRef.current?.update(config);
  }, [config]);

  useEffect(() => {
    const host = hostRef.current;
    const canvasElement = canvasRef.current;
    if (!host) return;
    if (kind === "none" || !canvasElement) {
      host.dataset.shaderState = "off";
      host.dataset.shaderFrame = "0";
      return;
    }
    const canvas = canvasElement;

    let disposed = false;
    let loading = false;
    let unavailable = false;
    let lost = false;
    let frames = 0;
    let renderer: ShaderRenderer | null = null;
    let current = configRef.current;
    let environment: EffectEnvironment = {
      inView: false,
      visible: false,
      motion: false,
      finePointer: false,
    };
    let idle: number | null = null;
    let idleCallback = false;
    host.dataset.shaderFrame = "0";
    canvas.dataset.shaderFrame = "0";

    const state = (value: ShaderState) => {
      host.dataset.shaderState = value;
      canvas.dataset.shaderState = value;
    };
    const fallback = () => {
      canvas.dataset.ready = "false";
    };
    const canRun = () =>
      !disposed &&
      !lost &&
      environment.motion &&
      environment.inView &&
      environment.visible &&
      !current.paused &&
      current.speed > 0 &&
      current.intensity > 0;

    const cancelInitialization = () => {
      if (idle === null) return;
      if (idleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      idle = null;
      loading = false;
    };

    const initialize = async () => {
      idle = null;
      if (!canRun()) {
        loading = false;
        synchronize();
        return;
      }
      try {
        // Literal dynamic import is included by the registry dependency graph.
        const { createShaderRenderer } = await import("./shader-runtime");
        if (disposed) return;
        loading = false;
        if (!canRun()) {
          synchronize();
          return;
        }
        renderer = createShaderRenderer(canvas, host, kind, current, () => {
          frames += 1;
          host.dataset.shaderFrame = String(frames);
          canvas.dataset.shaderFrame = String(frames);
          canvas.dataset.ready = "true";
          state("running");
        });
        unavailable = renderer === null;
        synchronize();
      } catch {
        if (disposed) return;
        loading = false;
        unavailable = true;
        fallback();
        synchronize();
      }
    };

    function synchronize() {
      if (disposed) return;
      if (!canRun() || unavailable) cancelInitialization();
      renderer?.configure(current);
      if (!environment.motion || current.intensity === 0) {
        renderer?.stop();
        fallback();
        state("off");
      } else if (unavailable || lost) {
        renderer?.stop();
        fallback();
        state("fallback");
      } else if (!canRun()) {
        renderer?.stop();
        state("paused");
      } else if (renderer) {
        if (renderer.resize()) fallback();
        renderer.start();
        // A newly compiled canvas remains on the fallback until its first draw.
        state(canvas.dataset.ready === "true" ? "running" : "loading");
      } else if (!loading) {
        loading = true;
        state("loading");
        if (typeof window.requestIdleCallback === "function") {
          idleCallback = true;
          idle = window.requestIdleCallback(() => void initialize(), {
            timeout: 600,
          });
        } else {
          idle = window.setTimeout(() => void initialize(), 0);
        }
      } else {
        state("loading");
      }
    }

    const controller = {
      update(next: ShaderConfig) {
        current = next;
        synchronize();
      },
    };
    controllerRef.current = controller;

    const contextLost = (event: Event) => {
      // Permit restoration; the attractive CSS field remains underneath.
      event.preventDefault();
      lost = true;
      cancelInitialization();
      renderer?.dispose();
      renderer = null;
      fallback();
      state("fallback");
    };
    const contextRestored = () => {
      lost = false;
      unavailable = false;
      synchronize();
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);

    const removeEnvironment = watchEffectEnvironment(host, (next) => {
      environment = next;
      synchronize();
    });
    const resize = () => {
      if (!canRun()) return;
      if (renderer?.resize()) {
        // Dormant buffers retain their frame and resize when running resumes.
        fallback();
        state("loading");
      }
    };
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    window.addEventListener("resize", resize, { passive: true });

    return () => {
      disposed = true;
      cancelInitialization();
      removeEnvironment();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      renderer?.dispose();
      fallback();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [kind]);

  const style: EffectStyle = { "--afx-intensity": config.intensity };
  return (
    <div
      ref={hostRef}
      data-slot="shader-background"
      data-shader-kind={kind}
      data-shader-state={kind === "none" ? "off" : "fallback"}
      data-shader-frame="0"
      className={cn("afx-background min-h-64 rounded-2xl", className)}
      style={style}
    >
      <div
        aria-hidden="true"
        className="afx-background-field"
        style={{ backgroundImage: gradientField("mesh", colors) }}
      />
      {kind !== "none" && (
        <canvas
          key={kind}
          ref={canvasRef}
          aria-hidden="true"
          role="presentation"
          width={1}
          height={1}
          data-shader-kind={kind}
          data-shader-state="fallback"
          data-shader-frame="0"
          data-ready="false"
          className="afx-shader-canvas"
        />
      )}
      <div aria-hidden="true" className="afx-background-scrim" />
      <div className="afx-background-content">{children}</div>
    </div>
  );
}
