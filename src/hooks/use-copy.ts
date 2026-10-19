"use client";
import { useState, useRef, useEffect } from "react";
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
}
