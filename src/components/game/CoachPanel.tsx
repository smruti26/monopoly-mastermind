import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { getCoachAdvice } from "@/lib/api/coach.functions";
import type { GameState } from "@/lib/game/engine";
import { BOARD } from "@/lib/game/board";
import { calculateRent } from "@/lib/game/engine";

interface Advice {
  headline: string;
  tips: string[];
}

function summarize(game: GameState) {
  const cur = game.players[game.currentPlayerIndex];
  const propName = (id: number) => BOARD[id]?.name ?? `#${id}`;
  const colorGroups = (playerId: string) => {
    const groups = new Set<string>();
    for (const [sid, oid] of Object.entries(game.ownership)) {
      if (oid !== playerId) continue;
      const s = BOARD[Number(sid)];
      if (s?.color) groups.add(s.color);
    }
    return [...groups];
  };
  const playerSummary = (p: (typeof game.players)[number]) => ({
    name: p.name,
    money: p.money,
    properties: p.properties.map(propName),
    colorGroups: colorGroups(p.id),
    inJail: p.inJail,
    isYou: p.id === cur.id,
  });
  const space = BOARD[cur.position];
  const ownerId = game.ownership[space.id];
  const owner = ownerId ? game.players.find((p) => p.id === ownerId) : null;
  return {
    you: playerSummary(cur),
    rivals: game.players.filter((p) => p.id !== cur.id && !p.bankrupt).map(playerSummary),
    phase: game.phase,
    currentSpace: {
      name: space.name,
      type: space.type,
      price: space.price ?? null,
      owned: !!ownerId,
      rentIfLanded: owner && owner.id !== cur.id ? calculateRent(game, space, game.dice) : null,
      ownerName: owner?.name ?? null,
    },
    turnCount: game.turnCount,
  };
}

export function CoachPanel({ game, disabled }: { game: GameState; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const data = summarize(game);
      const res = await getCoachAdvice({ data });
      setAdvice(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={ask}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/50 text-gold hover:bg-gold/10 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Ask AI coach for a strategy tip"
        title="AI Coach"
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        AI Coach
      </button>

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="coach-title">
          <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-card shadow-luxe overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-gold/15 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold" aria-hidden="true" />
                <h3 id="coach-title" className="font-semibold">AI Coach</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close coach" className="p-1 rounded hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 min-h-[140px]">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Reading the board…
                </div>
              )}
              {!loading && error && <p className="text-sm text-destructive">{error}</p>}
              {!loading && advice && (
                <div>
                  <p className="text-lg font-display text-gold mb-3">{advice.headline}</p>
                  <ul className="space-y-2 text-sm">
                    {advice.tips.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-gold" aria-hidden="true">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={ask}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Ask again
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs px-3 py-1.5 rounded-full bg-gold text-background font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
