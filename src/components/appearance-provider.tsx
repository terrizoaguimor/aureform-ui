"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { appearanceStorageKey, presetsStorageKey, defaultAppearance, createAppearance, normalizeAppearance, parseAppearance, resolveAppearance, type AppearanceConfig, type SavedAppearance } from "@/lib/appearance";
import "@/styles/effects.css";

interface AppearanceContextValue {
  appearance: AppearanceConfig;
  setAppearance: Dispatch<SetStateAction<AppearanceConfig>>;
  resetAppearance: () => void;
  presets: SavedAppearance[];
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => void;
  importAppearance: (text: string) => void;
}
const noop = () => {};
const Context = createContext<AppearanceContextValue>({ appearance: defaultAppearance, setAppearance: noop, resetAppearance: noop, presets: [], savePreset: noop, deletePreset: noop, applyPreset: noop, importAppearance: noop });
export function useAppearance() { return useContext(Context); }

export function applyAppearanceToDocument(config: AppearanceConfig) {
  const root = document.documentElement;
  root.classList.toggle("dark", config.theme === "dark");
  root.style.colorScheme = config.theme;
  root.dataset.palette = config.palette;
  root.dataset.material = config.material;
  root.dataset.motionLevel = config.motion;
  root.dataset.hoverEffect = config.hover;
  root.dataset.density = config.density;
  root.dataset.typography = config.typography;
  for (const [name, value] of Object.entries(resolveAppearance(config))) root.style.setProperty(name, value);
  window.dispatchEvent(new CustomEvent("aureform:appearance-change", { detail: config }));
}
function loadAppearance(): AppearanceConfig {
  try {
    const raw = localStorage.getItem(appearanceStorageKey);
    if (raw) return parseAppearance(raw);
    const legacy = localStorage.getItem("aureform:theme");
    return createAppearance("aurora", legacy === "light" ? "light" : "dark");
  } catch { return createAppearance(); }
}
function loadPresets(): SavedAppearance[] {
  try {
    const input: unknown = JSON.parse(localStorage.getItem(presetsStorageKey) || "[]");
    if (!Array.isArray(input)) return [];
    return input.slice(0, 100).flatMap((item) => {
      try {
        if (typeof item?.id !== "string" || typeof item?.name !== "string") return [];
        return [{ id: item.id.slice(0, 80), name: item.name.slice(0, 80), config: normalizeAppearance(item.config) }];
      } catch { return []; }
    });
  } catch { return []; }
}
export function AppearanceProvider({ children, initialAppearance = defaultAppearance, applyToDocument = true }: {
  children: ReactNode; initialAppearance?: AppearanceConfig; applyToDocument?: boolean;
}) {
  const [appearance, setState] = useState<AppearanceConfig>(initialAppearance);
  const [initialProps, setInitialProps] = useState({ initialAppearance, applyToDocument });
  const [presets, setPresets] = useState<SavedAppearance[]>([]);
  const appearanceRef = useRef(initialAppearance);
  const presetsRef = useRef<SavedAppearance[]>([]);
  // A controlled scope must expose new props before its children commit.
  // Adjusting this provider's state during its own render avoids a second,
  // passive state update for every color or range input in the Studio.
  if (initialProps.initialAppearance !== initialAppearance || initialProps.applyToDocument !== applyToDocument) {
    setInitialProps({ initialAppearance, applyToDocument });
    if (!applyToDocument) setState(initialAppearance);
  }
  useEffect(() => {
    if (!applyToDocument) return;
    const hydrate = () => {
      const next = loadAppearance();
      appearanceRef.current = next;
      setState(next);
      const saved = loadPresets();
      presetsRef.current = saved;
      setPresets(saved);
      applyAppearanceToDocument(next);
    };
    hydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === appearanceStorageKey || event.key === presetsStorageKey || event.key === "aureform:theme") hydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyToDocument]);
  useEffect(() => {
    if (!applyToDocument) {
      appearanceRef.current = initialAppearance;
    }
  }, [initialAppearance, applyToDocument]);
  const setAppearance = useCallback<Dispatch<SetStateAction<AppearanceConfig>>>((update) => {
    const next = normalizeAppearance(typeof update === "function" ? update(appearanceRef.current) : update);
    appearanceRef.current = next;
    setState(next);
    if (applyToDocument) {
      applyAppearanceToDocument(next);
      try {
        const serialized = JSON.stringify(next);
        localStorage.setItem(appearanceStorageKey, serialized);
        localStorage.setItem("aureform:appearance-paint:v1", JSON.stringify({ config: serialized, variables: resolveAppearance(next) }));
        localStorage.setItem("aureform:theme", next.theme);
      } catch { /* A blocked storage leaves the current appearance usable. */ }
    }
  }, [applyToDocument]);
  const updatePresets = useCallback((update: (previous: SavedAppearance[]) => SavedAppearance[]) => {
    const next = update(presetsRef.current);
    presetsRef.current = next;
    setPresets(next);
    if (applyToDocument) { try { localStorage.setItem(presetsStorageKey, JSON.stringify(next)); } catch {} }
  }, [applyToDocument]);
  const resetAppearance = useCallback(() => setAppearance(createAppearance()), [setAppearance]);
  const savePreset = useCallback((name: string) => {
    const label = name.trim().slice(0, 80);
    if (!label) throw new Error("Give your preset a name.");
    updatePresets((previous) => [...previous.slice(-99), { id: crypto.randomUUID(), name: label, config: normalizeAppearance(appearance) }]);
  }, [appearance, updatePresets]);
  const deletePreset = useCallback((id: string) => updatePresets((previous) => previous.filter((p) => p.id !== id)), [updatePresets]);
  const applyPreset = useCallback((id: string) => { const preset = presets.find((p) => p.id === id); if (preset) setAppearance(preset.config); }, [presets, setAppearance]);
  const importAppearance = useCallback((text: string) => setAppearance(parseAppearance(text)), [setAppearance]);
  const value = useMemo(() => ({ appearance, setAppearance, resetAppearance, presets, savePreset, deletePreset, applyPreset, importAppearance }), [appearance, setAppearance, resetAppearance, presets, savePreset, deletePreset, applyPreset, importAppearance]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function AppearanceScope({ appearance, children, className = "" }: { appearance: AppearanceConfig; children: ReactNode; className?: string }) {
  const normalized = useMemo(() => normalizeAppearance(appearance), [appearance]);
  return (
    <AppearanceProvider initialAppearance={normalized} applyToDocument={false}>
      <div className={`af-appearance-scope ${normalized.theme === "dark" ? "dark" : ""} ${className}`}
        data-palette={normalized.palette} data-material={normalized.material} data-motion-level={normalized.motion}
        data-hover-effect={normalized.hover} data-density={normalized.density} data-typography={normalized.typography}
        style={{ ...resolveAppearance(normalized), colorScheme: normalized.theme } as CSSProperties}>
        {children}
      </div>
    </AppearanceProvider>
  );
}
