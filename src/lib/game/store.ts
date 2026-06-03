import { useEffect, useState, useSyncExternalStore } from "react";
import type { GameState, Player } from "./engine";
import { netWorth } from "./engine";
import { BOARD } from "./board";

// ---------- Game state ----------
const KEY = "monopoly-game-v2";
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
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

export function useGame(): GameState | null {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const s = useSyncExternalStore(subscribe, getGame, () => null);
  return mounted ? s : null;
}

// ---------- Profile / settings ----------
export interface PlayerReport {
  name: string;
  tokenIcon: string;
  isAI: boolean;
  finalNetWorth: number;
  netWorthHistory: number[];
  rentPaid: number;
  rentCollected: number;
  turnsTaken: number;
  propertyIds: number[]; // properties held at end (winner only normally)
  groupsCompleted: string[];
  bankrupt: boolean;
}

export interface GameReport {
  id: string;
  playedAt: number;
  durationMs: number;
  turns: number;
  winnerName: string;
  players: PlayerReport[];
}

export interface Profile {
  reducedMotion: boolean;
  games: GameReport[];
}

const PKEY = "monopoly-profile-v1";
let profile: Profile = { reducedMotion: false, games: [] };
const pListeners = new Set<() => void>();

function loadProfile() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) profile = { reducedMotion: false, games: [], ...JSON.parse(raw) };
  } catch {}
}
loadProfile();

function persistProfile() {
  if (typeof window !== "undefined") {
    localStorage.setItem(PKEY, JSON.stringify(profile));
  }
  pListeners.forEach((l) => l());
}

export function getProfile(): Profile { return profile; }
export function setReducedMotion(v: boolean) {
  profile = { ...profile, reducedMotion: v };
  persistProfile();
}
export function recordGameReport(g: GameState): GameReport {
  const winner = g.players.find((p) => p.id === g.winner);
  const groups: Record<string, { owned: number; size: number }> = {};
  for (const sp of BOARD) {
    if (sp.group) groups[sp.group] ||= { owned: 0, size: 0 };
    if (sp.group) groups[sp.group].size++;
  }
  const playerReports: PlayerReport[] = g.players.map((p: Player) => {
    const completed: string[] = [];
    const counts: Record<string, number> = {};
    p.properties.forEach((id) => {
      const sp = BOARD[id];
      if (sp.group) counts[sp.group] = (counts[sp.group] ?? 0) + 1;
    });
    for (const [grp, n] of Object.entries(counts)) {
      if (groups[grp] && n === groups[grp].size) completed.push(grp);
    }
    return {
      name: p.name,
      tokenIcon: p.tokenIcon,
      isAI: p.isAI,
      finalNetWorth: p.bankrupt ? 0 : netWorth(g, p),
      netWorthHistory: p.netWorthHistory.slice(-100),
      rentPaid: p.rentPaid,
      rentCollected: p.rentCollected,
      turnsTaken: p.turnsTaken,
      propertyIds: [...p.properties],
      groupsCompleted: completed,
      bankrupt: p.bankrupt,
    };
  });
  const report: GameReport = {
    id: `${g.startedAt}`,
    playedAt: Date.now(),
    durationMs: Date.now() - g.startedAt,
    turns: g.turnCount,
    winnerName: winner?.name ?? "—",
    players: playerReports,
  };
  // de-dupe (avoid double-save on re-render)
  profile = { ...profile, games: [report, ...profile.games.filter((r) => r.id !== report.id)].slice(0, 50) };
  persistProfile();
  return report;
}
export function clearReports() {
  profile = { ...profile, games: [] };
  persistProfile();
}

function subProfile(l: () => void) { pListeners.add(l); return () => pListeners.delete(l); }
export function useProfile(): Profile {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const p = useSyncExternalStore(subProfile, getProfile, () => profile);
  return mounted ? p : profile;
}

// Resolve reduced motion: profile flag OR system preference.
export function useReducedMotion(): boolean {
  const p = useProfile();
  const [sys, setSys] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSys(mq.matches);
    const h = (e: MediaQueryListEvent) => setSys(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return p.reducedMotion || sys;
}
