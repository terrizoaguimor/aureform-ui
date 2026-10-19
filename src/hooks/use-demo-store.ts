"use client";
import { useState, useEffect, useCallback, useRef } from "react";
/**
 * A replaceable browser demo adapter. No server/auth/payments are implied.
 * State begins from the same seed on server and client to avoid hydration mismatch.
 */
export function useDemoStore<T>(key: string, seed: T) {
  const initial = useRef(seed);
  const [value, setValue] = useState<T>(seed);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let data = initial.current;
    try {
      const stored = localStorage.getItem(`aureform:${key}`);
      if (stored) data = JSON.parse(stored) as T;
    } catch {}
    setValue(data);
    setReady(true);
  }, [key]);
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const result =
          typeof next === "function" ? (next as (p: T) => T)(previous) : next;
        try {
          localStorage.setItem(`aureform:${key}`, JSON.stringify(result));
        } catch {}
        return result;
      });
    },
    [key],
  );
  const reset = useCallback(() => update(initial.current), [update]);
  return [value, update, { ready, reset }] as const;
}
