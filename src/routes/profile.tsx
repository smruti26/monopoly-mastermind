import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useProfile, clearReports, setReducedMotion } from "@/lib/game/store";
import { EndGameReport } from "@/components/game/EndGameReport";
import { ArrowLeft, Trophy, Trash2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Your Profile — Monopoly Royale" },
    { name: "description", content: "Past games, statistics, and accessibility preferences." },
  ]}),
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useProfile();
  const [openId, setOpenId] = useState<string | null>(profile.games[0]?.id ?? null);
  const selected = profile.games.find((g) => g.id === openId) ?? profile.games[0] ?? null;

  return (
    <main className="min-h-dvh px-6 py-10 max-w-5xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold mb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </Link>

      <h1 className="text-4xl md:text-5xl mb-2">Your profile</h1>
      <p className="text-muted-foreground mb-8">Game history and preferences saved on this device.</p>

      <section className="mb-8 p-4 rounded-2xl border border-border bg-card/60" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Preferences</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
            className="accent-gold size-4"
          />
          <span>Reduced motion (disable dice rolls and animations)</span>
        </label>
      </section>

      <section aria-labelledby="games-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="games-heading" className="text-2xl">Past games</h2>
          {profile.games.length > 0 && (
            <button
              onClick={() => { if (confirm("Delete all saved reports?")) clearReports(); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded px-2 py-1"
            >
              <Trash2 className="size-3" aria-hidden="true" /> Clear all
            </button>
          )}
        </div>

        {profile.games.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
            No games yet. <Link to="/setup" className="text-gold hover:underline">Start one</Link>.
          </div>
        ) : (
          <div className="grid md:grid-cols-[260px_1fr] gap-4">
            <ul className="space-y-2 max-h-[600px] overflow-y-auto" aria-label="Game history list">
              {profile.games.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setOpenId(g.id)}
                    aria-pressed={openId === g.id}
                    className={`w-full text-left p-3 rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      openId === g.id ? "border-gold bg-gold/10" : "border-border hover:border-gold/50 bg-card/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Trophy className="size-3 text-gold" aria-hidden="true" />
                      {g.winnerName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(g.playedAt).toLocaleString()} · {g.turns} turns · {g.players.length} players
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-border bg-card/40 p-4">
              {selected ? <EndGameReport report={selected} /> : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
