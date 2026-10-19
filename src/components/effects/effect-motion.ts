"use client";

import { useEffect, type RefObject } from "react";
import { effectFrameInterval } from "./effect-utils";

export type EffectEnvironment = {
  inView: boolean;
  visible: boolean;
  motion: boolean;
  finePointer: boolean;
};

/** Browser APIs are touched only by effects, never during an SSR render. */
export function watchEffectEnvironment(
  element: HTMLElement,
  notify: (environment: EffectEnvironment) => void,
) {
  const reduced =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const pointer =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : null;
  const forced =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(forced-colors: active)")
      : null;
  let disposed = false;
  let inView = false;

  const visible = () => {
    if (document.visibilityState === "hidden" || !element.isConnected)
      return false;
    const style = getComputedStyle(element);
    // checkVisibility checks the host box, but its own hidden content can still
    // leave that box visible while suppressing every decorative child.
    if (
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0" ||
      style.contentVisibility === "hidden"
    )
      return false;
    if (typeof element.checkVisibility === "function") {
      return element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
        contentVisibilityAuto: true,
      });
    }
    if (!element.getClientRects().length) return false;
    for (
      let ancestor: HTMLElement | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (
        ancestorStyle.opacity === "0" ||
        ancestorStyle.contentVisibility === "hidden"
      )
        return false;
    }
    return true;
  };

  const report = () => {
    if (disposed) return;
    notify({
      inView,
      visible: visible(),
      motion:
        reduced !== null &&
        !reduced.matches &&
        !forced?.matches &&
        (
          element.closest("[data-motion-level]") ?? document.documentElement
        ).getAttribute("data-motion-level") !== "off",
      finePointer: pointer?.matches ?? false,
    });
  };

  const observeMedia = (media: MediaQueryList | null) => {
    if (!media) return () => {};
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", report);
      return () => media.removeEventListener("change", report);
    }
    media.addListener(report);
    return () => media.removeListener(report);
  };
  const removeReduced = observeMedia(reduced);
  const removePointer = observeMedia(pointer);
  const removeForced = observeMedia(forced);
  document.addEventListener("visibilitychange", report);
  window.addEventListener("aureform:appearance-change", report);
  window.addEventListener("resize", report, { passive: true });

  // Observe only this element's ancestry, not every mutation in the document.
  // Ignore our own pointer variables, which otherwise retrigger the observer.
  const ownStyle = () =>
    Array.from(element.style)
      .filter((name) => !name.startsWith("--afx-"))
      .map(
        (name) =>
          `${name}:${element.style.getPropertyValue(name)}:${element.style.getPropertyPriority(name)}`,
      )
      .join(";");
  let previousStyle = ownStyle();
  const motionObserver =
    typeof MutationObserver !== "undefined"
      ? new MutationObserver((records) => {
          const nextStyle = ownStyle();
          const ownVariablesOnly =
            nextStyle === previousStyle &&
            records.every(
              (record) =>
                record.target === element && record.attributeName === "style",
            );
          previousStyle = nextStyle;
          if (!ownVariablesOnly) report();
        })
      : null;
  for (
    let ancestor: HTMLElement | null = element;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    motionObserver?.observe(ancestor, {
      attributes: true,
      attributeFilter: [
        "data-motion-level",
        "data-palette",
        "style",
        "class",
        "hidden",
        "open",
        "disabled",
      ],
    });
  }

  let intersection: IntersectionObserver | null = null;
  const measureView = () => {
    const bounds = element.getBoundingClientRect();
    inView =
      bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.bottom > 0 &&
      bounds.right > 0 &&
      bounds.top < window.innerHeight &&
      bounds.left < window.innerWidth;
    report();
  };
  if (typeof IntersectionObserver !== "undefined") {
    intersection = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0);
        report();
      },
      { threshold: 0 },
    );
    intersection.observe(element);
  } else {
    // Old embedded browsers still pause offscreen without a polyfill.
    window.addEventListener("scroll", measureView, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", measureView, { passive: true });
    measureView();
  }
  report();

  return () => {
    disposed = true;
    intersection?.disconnect();
    motionObserver?.disconnect();
    removeReduced();
    removePointer();
    removeForced();
    document.removeEventListener("visibilitychange", report);
    window.removeEventListener("aureform:appearance-change", report);
    window.removeEventListener("resize", report);
    window.removeEventListener("scroll", measureView, true);
    window.removeEventListener("resize", measureView);
  };
}

export function useEffectActivity(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const remove = watchEffectEnvironment(element, (environment) => {
      element.dataset.afxMotion =
        environment.motion && environment.visible && environment.inView
          ? "running"
          : "paused";
    });
    return () => {
      remove();
      element.dataset.afxMotion = "paused";
    };
  }, [ref]);
}

const editingTarget =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-effect-static]';
const disabledTarget = ':disabled, [aria-disabled="true"], [data-disabled]';

/**
 * One frame-coalesced write per pointer update. Never captures a pointer,
 * cancels an event, changes touch-action, or installs a wheel handler.
 */
export function useEffectPointer(
  ref: RefObject<HTMLElement | null>,
  mode: "spotlight" | "tilt" | "magnetic",
  amount: number,
  limit: number,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let environment: EffectEnvironment = {
      inView: false,
      visible: false,
      motion: false,
      finePointer: false,
    };
    let frame = 0;
    let lastWrite = -Infinity;
    let bounds: DOMRect | null = null;
    let point = { x: 0, y: 0 };

    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      element.dataset.afxPointer = "idle";
      element.style.setProperty("--afx-pointer-x", "50%");
      element.style.setProperty("--afx-pointer-y", "35%");
      element.style.setProperty("--afx-rotate-x", "0deg");
      element.style.setProperty("--afx-rotate-y", "0deg");
      element.style.setProperty("--afx-magnetic-x", "0px");
      element.style.setProperty("--afx-magnetic-y", "0px");
    };

    const allowed = () =>
      environment.inView &&
      environment.visible &&
      environment.motion &&
      environment.finePointer &&
      !element.matches(disabledTarget) &&
      // Keep a focused control stationary for keyboard and mixed-input users.
      (mode === "spotlight" || !element.contains(document.activeElement));

    const write = (now: number) => {
      frame = 0;
      if (!allowed() || !bounds || !bounds.width || !bounds.height) {
        reset();
        return;
      }
      if (now - lastWrite < effectFrameInterval) {
        frame = requestAnimationFrame(write);
        return;
      }
      lastWrite = now;
      const x = Math.min(
        1,
        Math.max(0, (point.x - bounds.left) / bounds.width),
      );
      const y = Math.min(
        1,
        Math.max(0, (point.y - bounds.top) / bounds.height),
      );
      element.dataset.afxPointer = "active";
      element.style.setProperty("--afx-pointer-x", `${(x * 100).toFixed(2)}%`);
      element.style.setProperty("--afx-pointer-y", `${(y * 100).toFixed(2)}%`);
      if (mode === "tilt") {
        element.style.setProperty(
          "--afx-rotate-x",
          `${((0.5 - y) * amount * 2).toFixed(2)}deg`,
        );
        element.style.setProperty(
          "--afx-rotate-y",
          `${((x - 0.5) * amount * 2).toFixed(2)}deg`,
        );
      } else if (mode === "magnetic") {
        const dx = Math.min(
          limit,
          Math.max(-limit, (x - 0.5) * bounds.width * amount),
        );
        const dy = Math.min(
          limit,
          Math.max(-limit, (y - 0.5) * bounds.height * amount),
        );
        element.style.setProperty("--afx-magnetic-x", `${dx.toFixed(2)}px`);
        element.style.setProperty("--afx-magnetic-y", `${dy.toFixed(2)}px`);
      }
    };

    const move = (event: PointerEvent) => {
      if (
        !allowed() ||
        event.defaultPrevented ||
        event.buttons !== 0 ||
        !["mouse", "pen"].includes(event.pointerType) ||
        (event.target instanceof Element && event.target.closest(editingTarget))
      ) {
        reset();
        return;
      }
      // A stable entry rectangle prevents feedback from the element's transform.
      bounds ??= element.getBoundingClientRect();
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(write);
    };
    const focus = () => reset();
    const removeEnvironment = watchEffectEnvironment(element, (next) => {
      environment = next;
      element.dataset.afxMotion =
        next.motion && next.inView && next.visible ? "running" : "paused";
      if (!allowed()) reset();
    });

    element.addEventListener("pointerenter", move, { passive: true });
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", reset, { passive: true });
    element.addEventListener("pointercancel", reset, { passive: true });
    element.addEventListener("pointerdown", reset, { passive: true });
    element.addEventListener("focusin", focus);
    window.addEventListener("scroll", reset, { passive: true, capture: true });
    window.addEventListener("resize", reset, { passive: true });

    // Native disabled/loading changes also settle an already active transform.
    const disabledObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            if (element.matches(disabledTarget)) reset();
          })
        : null;
    disabledObserver?.observe(element, {
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "data-disabled"],
    });

    return () => {
      removeEnvironment();
      disabledObserver?.disconnect();
      element.removeEventListener("pointerenter", move);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      element.removeEventListener("pointercancel", reset);
      element.removeEventListener("pointerdown", reset);
      element.removeEventListener("focusin", focus);
      window.removeEventListener("scroll", reset, true);
      window.removeEventListener("resize", reset);
      reset();
      element.dataset.afxMotion = "paused";
    };
  }, [ref, mode, amount, limit]);
}
