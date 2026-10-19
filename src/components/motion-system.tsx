"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useAppearance } from "@/components/appearance-provider";

const motionSelector = '[data-motion="intro"], [data-motion="reveal"]';
const nativeScrollSelector = [
  "[data-lenis-prevent]",
  "[data-lenis-prevent-wheel]",
  "dialog",
  '[role="dialog"]',
  '[role="alertdialog"]',
  "pre",
  "textarea",
  "select",
  '[contenteditable]:not([contenteditable="false"])',
].join(", ");
const scrollKeys = new Set([
  "Tab",
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

export function MotionSystem({
  children,
  smoothScroll = false,
  className,
}: {
  children: ReactNode;
  smoothScroll?: boolean;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(new WeakSet<HTMLElement>());
  const { appearance } = useAppearance();

  useEffect(() => {
    const scope = wrapperRef.current;
    if (!scope || typeof window.matchMedia !== "function") return;

    const seen = seenRef.current;
    const media = gsap.matchMedia(scope);
    const owns = (element: HTMLElement) =>
      scope.contains(element) &&
      element.closest("[data-motion-system]") === scope;

    media.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const motionAllowed =
          context.conditions?.motion && !context.conditions?.reduced && appearance.motion !== "off";
        scope.dataset.motionMode = motionAllowed ? "animated" : "reduced";

        if (!motionAllowed) return;

        let disposed = false;
        const registered = new Set<HTMLElement>();
        const active = new Map<HTMLElement, gsap.core.Tween>();
        let observer: IntersectionObserver | undefined;

        // Named context callbacks also collect tweens created by observers.
        const enter = context.add(
          "enter",
          (element: HTMLElement, delay: number, distance: 8 | 10) => {
            if (disposed || !owns(element) || seen.has(element)) return;
            seen.add(element);
            observer?.unobserve(element);

            if (element.contains(document.activeElement)) return;

            const baseline = Number(gsap.getProperty(element, "y")) || 0;
            const tween = gsap.fromTo(
              element,
              { y: baseline + distance * (appearance.motion === "expressive" ? 2 : 1), force3D: false },
              {
                y: baseline,
                force3D: false,
                duration: appearance.motion === "expressive" ? 0.64 : distance === 8 ? 0.42 : 0.46,
                delay,
                ease: "power2.out",
                repeat: 0,
                onComplete: () => {
                  active.delete(element);
                  // Restore the original inline styles, including transforms.
                  tween.revert();
                },
              },
            );
            active.set(element, tween);
          },
        );

        if (typeof IntersectionObserver !== "undefined") {
          observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  enter(entry.target as HTMLElement, 0, 10);
                }
              }
            },
            { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
          );
        }

        const register = () => {
          if (disposed) return;

          for (const element of registered) {
            if (!owns(element) || !element.matches(motionSelector)) {
              observer?.unobserve(element);
              active.get(element)?.revert();
              active.delete(element);
              registered.delete(element);
            }
          }

          const intro: HTMLElement[] = [];
          for (const element of scope.querySelectorAll<HTMLElement>(
            motionSelector,
          )) {
            if (
              !owns(element) ||
              registered.has(element) ||
              seen.has(element)
            ) {
              continue;
            }
            registered.add(element);

            if (element.dataset.motion === "intro") {
              intro.push(element);
            } else if (observer) {
              // Nothing is hidden or transformed while waiting for entry.
              observer.observe(element);
            } else {
              seen.add(element);
            }
          }

          intro.forEach((element, index) =>
            enter(element, Math.min(index * 0.045, 0.135), 8),
          );
        };

        const onFocus = (event: FocusEvent) => {
          if (!(event.target instanceof HTMLElement) || !owns(event.target)) {
            return;
          }
          // Settle every marked ancestor before its focus ring is painted.
          let element: HTMLElement | null = event.target;
          while (element && element !== scope) {
            if (element.matches(motionSelector)) {
              seen.add(element);
              observer?.unobserve(element);
              active.get(element)?.revert();
              active.delete(element);
            }
            element = element.parentElement;
          }
        };

        const mutations = new MutationObserver(register);
        mutations.observe(scope, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-motion"],
        });
        scope.addEventListener("focusin", onFocus);
        register();

        return () => {
          disposed = true;
          mutations.disconnect();
          observer?.disconnect();
          scope.removeEventListener("focusin", onFocus);
          registered.clear();
          active.clear();
          // matchMedia reverts its own collected tweens automatically.
        };
      },
    );

    media.add(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        if (
          !smoothScroll ||
          appearance.motion === "off" ||
          document.documentElement.classList.contains("lenis")
        ) {
          return;
        }

        const lenis = new Lenis({
          eventsTarget: scope,
          anchors: true,
          syncTouch: false,
          smoothWheel: true,
          autoRaf: false,
          infinite: false,
          lerp: 0.16,
          allowNestedScroll: true,
          prevent: (element) => element.closest(nativeScrollSelector) !== null,
          virtualScroll: ({ event }) => !event.ctrlKey && !event.shiftKey,
        });
        const tick = (time: number) => lenis.raf(time * 1000);
        const settleScroll = () =>
          lenis.scrollTo(lenis.actualScroll, { immediate: true });
        const onKeyDown = (event: KeyboardEvent) => {
          if (scrollKeys.has(event.key)) settleScroll();
        };

        gsap.ticker.add(tick);
        scope.dataset.smoothScroll = "lenis";
        // Include portalled dialogs; no keyboard event is cancelled.
        document.addEventListener("focusin", settleScroll, true);
        document.addEventListener("keydown", onKeyDown, true);

        return () => {
          gsap.ticker.remove(tick);
          document.removeEventListener("focusin", settleScroll, true);
          document.removeEventListener("keydown", onKeyDown, true);
          lenis.destroy();
          scope.dataset.smoothScroll = "native";
        };
      },
    );

    return () => {
      media.revert();
      scope.dataset.motionMode = "static";
      scope.dataset.smoothScroll = "native";
    };
  }, [smoothScroll, appearance.motion]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ display: "contents" }}
      data-motion-system
      data-motion-mode="static"
      data-smooth-scroll="native"
    >
      {children}
    </div>
  );
}
