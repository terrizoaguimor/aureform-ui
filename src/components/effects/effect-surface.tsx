"use client";

import {
  Children,
  Fragment,
  cloneElement,
  createElement,
  isValidElement,
  useCallback,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

export type EffectSurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section";
  /** Apply the effect to one ref-forwarding element, such as an a or button. */
  asChild?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
};

type SurfaceElementProps = HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>;
};

export function useComposedEffectRef(
  outerRef?: Ref<HTMLElement>,
  innerRef?: Ref<HTMLElement>,
) {
  return useCallback(
    (node: HTMLElement | null) => {
      const refs = [outerRef, innerRef];
      const cleanups = refs.map((ref) => {
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      });
      return () => {
        refs.forEach((ref, index) => {
          const cleanup = cleanups[index];
          if (typeof cleanup === "function") cleanup();
          else if (typeof ref === "function") ref(null);
          else if (ref) ref.current = null;
        });
      };
    },
    [outerRef, innerRef],
  );
}

/**
 * Preserve the child's semantics, handlers and ref. Cards do not acquire a
 * tab stop or a button role simply because they have a decorative effect.
 */
export function EffectSurface({
  as = "div",
  asChild = false,
  children,
  ref,
  ...props
}: Omit<EffectSurfaceProps, "as"> & {
  as?: EffectSurfaceProps["as"] | "button";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  const child = asChild ? Children.only(children) : null;
  if (asChild && (!isValidElement(child) || child.type === Fragment)) {
    throw new Error("An effect with asChild needs one ref-forwarding element.");
  }

  const element = child as ReactElement<SurfaceElementProps> | null;
  const childRef = element?.props.ref;
  const mergedRef = useComposedEffectRef(ref, childRef);

  if (!element) {
    return createElement(as, { ...props, ref: mergedRef }, children);
  }

  const merged: Record<string, unknown> = { ...props, ...element.props };
  for (const key of Object.keys(props)) {
    const outside = (props as Record<string, unknown>)[key];
    const inside = (element.props as Record<string, unknown>)[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof outside === "function" &&
      typeof inside === "function"
    ) {
      merged[key] = (event: { defaultPrevented?: boolean }) => {
        inside(event);
        if (!event.defaultPrevented) outside(event);
      };
    }
  }
  merged.className = cn(props.className, element.props.className);
  merged.style = { ...props.style, ...element.props.style };
  merged.ref = mergedRef;
  return cloneElement(element, merged);
}
