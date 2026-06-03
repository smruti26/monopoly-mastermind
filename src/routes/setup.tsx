import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TOKENS, AI_NAMES } from "@/lib/game/board";
import { createInitialState, PLAYER_COLORS, type Player, type Difficulty } from "@/lib/game/engine";
import { setGame } from "@/lib/game/store";
import { Minus, Plus, Play, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [
    { title: "Setup — Monopoly Royale" },
    { name: "description", content: "Configure players, AI opponents and tokens before starting." },
  ]}),
  component: Setup,
});

interface HumanCfg { name: string; tokenId: string; }

function Setup() {
  const nav = useNavigate();
  const [humanCount, setHumanCount] = useState(1);
  const [totalCount, setTotalCount] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [humans, setHumans] = useState<HumanCfg[]>([{ name: "You", tokenId: "hat" }]);

  function updateHumanCount(n: number) {
    n = Math.max(1, Math.min(6, n));
    setHumanCount(n);
    if (n > totalCount) setTotalCount(n);
    const next = [...humans];
    while (next.length < n) {
      const used = new Set(next.map((h) => h.tokenId));
      const free = TOKENS.find((t) => !used.has(t.id))!;
      next.push({ name: `Player ${next.length + 1}`, tokenId: free.id });
    }
    next.length = n;
    setHumans(next);
  }
  function updateTotal(n: number) {
    n = Math.max(humanCount, Math.min(6, n));
    setTotalCount(n);
  }
  function updateHuman(i: number, patch: Partial<HumanCfg>) {
    setHumans(humans.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  const aiCount = totalCount - humanCount;
  const usedTokens = new Set(humans.map((h) => h.tokenId));

  function start() {
    const players: Parameters<typeof createInitialState>[0] = [];
    humans.forEach((h, i) => {
      const tk = TOKENS.find((t) => t.id === h.tokenId)!;
      players.push({
        id: `h${i}`, name: h.name || `Player ${i + 1}`,
        token: tk.id, tokenIcon: tk.icon, isAI: false, color: PLAYER_COLORS[i],
      });
    });
    const aiTokens = TOKENS.filter((t) => !usedTokens.has(t.id));
    const aiNames = [...AI_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < aiCount; i++) {
      const tk = aiTokens[i % aiTokens.length];
      players.push({
        id: `a${i}`, name: `${aiNames[i]} AI`,
        token: tk.id, tokenIcon: tk.icon, isAI: true,
        color: PLAYER_COLORS[humans.length + i], difficulty,
      });
    }
    setGame(createInitialState(players));
    nav({ to: "/play" });
  }

  const diffMeta: Record<Difficulty, { label: string; desc: string }> = {
    easy: { label: "Easy", desc: "Cautious, often skips buying" },
    medium: { label: "Medium", desc: "Balanced, may propose trades" },
    hard: { label: "Hard", desc: "Strategic, hoards sets, drives hard bargains" },
  };

  return (
    <main className="min-h-dvh px-6 py-10 max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold mb-8">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </Link>

      <h1 className="text-4xl md:text-5xl mb-2">Set the table</h1>
      <p className="text-muted-foreground mb-10">Choose how many humans and AI rivals will play. Total 2–6.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Counter label="Human players" value={humanCount} onChange={updateHumanCount} min={1} max={6} />
        <Counter label="Total players" value={totalCount} onChange={updateTotal} min={Math.max(2, humanCount)} max={6} />
      </div>

      {aiCount > 0 && (
        <fieldset className="mb-8 p-4 rounded-2xl border border-border bg-card/60">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">AI difficulty</legend>
          <div className="grid sm:grid-cols-3 gap-2 mt-2" role="radiogroup" aria-label="AI difficulty">
            {(Object.keys(diffMeta) as Difficulty[]).map((d) => {
              const sel = difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setDifficulty(d)}
                  className={`text-left p-3 rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    sel ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"
                  }`}
                >
                  <div className="font-semibold">{diffMeta[d].label}</div>
                  <div className="text-xs text-muted-foreground">{diffMeta[d].desc}</div>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="rounded-2xl border border-border bg-card/60 p-2 mb-6 text-sm text-center text-muted-foreground">
        {humanCount} human{humanCount > 1 ? "s" : ""} · <span className="text-gold">{aiCount} {diffMeta[difficulty].label} AI</span>
      </div>

      <h2 className="text-2xl mb-4">Your tokens</h2>
      <div className="space-y-4 mb-10">
        {humans.map((h, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-3 mb-3">
              <span className="size-8 rounded-full grid place-items-center text-background font-bold text-sm" style={{ background: PLAYER_COLORS[i] }}>{i + 1}</span>
              <label className="sr-only" htmlFor={`pname-${i}`}>Player {i + 1} name</label>
              <input
                id={`pname-${i}`}
                value={h.name}
                onChange={(e) => updateHuman(i, { name: e.target.value })}
                className="flex-1 bg-transparent border-b border-border focus:border-gold outline-none py-1"
                placeholder={`Player ${i + 1}`}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Token for player ${i + 1}`}>
              {TOKENS.map((t) => {
                const taken = usedTokens.has(t.id) && t.id !== h.tokenId;
                const selected = t.id === h.tokenId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={taken}
                    aria-label={`${t.name}${taken ? " (taken)" : ""}`}
                    onClick={() => updateHuman(i, { tokenId: t.id })}
                    className={`size-14 rounded-xl border text-2xl grid place-items-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      selected ? "bg-gold border-gold scale-110 shadow-luxe" : taken ? "opacity-25 cursor-not-allowed" : "border-border hover:border-gold/50"
                    }`}
                    title={t.name}
                  >{t.icon}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={start}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gold text-background font-semibold text-lg shadow-luxe hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Play className="size-5" aria-hidden="true" /> Start Game
      </button>
    </main>
  );
}

function Counter({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/60">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <button onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Decrease ${label}`} className="size-10 rounded-full border border-border grid place-items-center hover:border-gold disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Minus className="size-4" aria-hidden="true" /></button>
        <span className="text-4xl font-display text-gold" aria-live="polite">{value}</span>
        <button onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`} className="size-10 rounded-full border border-border grid place-items-center hover:border-gold disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Plus className="size-4" aria-hidden="true" /></button>
      </div>
    </div>
  );
}
