import { useEffect, useState, useSyncExternalStore } from "react";
import type { GameState } from "./engine";

const KEY = "monopoly-game-v1";
let state: GameState | null = null;
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}
load();

export function getGame(): GameState | null { return state; }
export function setGame(next: GameState | null) {
  state = next;
  if (typeof window !== "undefined") {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  }
  listeners.forEach(l => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

export function useGame(): GameState | null {
  // SSR-safe
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const s = useSyncExternalStore(subscribe, getGame, () => null);
  return mounted ? s : null;
}
