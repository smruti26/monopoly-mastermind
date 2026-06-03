import type { GameReport, PlayerReport } from "@/lib/game/store";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-10" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 200, h = 40;
  const dx = w / (data.length - 1);
  const norm = (v: number) => h - ((v - min) / Math.max(1, max - min)) * (h - 4) - 2;
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"}${(i * dx).toFixed(1)},${norm(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EndGameReport({ report }: { report: GameReport }) {
  const sorted = [...report.players].sort((a, b) => b.finalNetWorth - a.finalNetWorth);
  const palette = ["#fbbf24", "#3b82f6", "#10b981", "#ef4444", "#a855f7", "#ec4899"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Stat label="Turns" value={report.turns} />
        <Stat label="Duration" value={formatDuration(report.durationMs)} />
        <Stat label="Players" value={report.players.length} />
        <Stat label="Winner" value={report.winnerName} />
      </div>

      <div className="space-y-3">
        {sorted.map((p, i) => (
          <PlayerCard key={p.name + i} p={p} color={palette[i % palette.length]} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

function PlayerCard({ p, color, rank }: { p: PlayerReport; color: string; rank: number }) {
  return (
    <div className={`p-4 rounded-xl border ${rank === 1 ? "border-gold bg-gold/5" : "border-border bg-background/40"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{p.tokenIcon}</span>
          <div>
            <div className="font-semibold flex items-center gap-2">
              <span className="text-xs text-muted-foreground">#{rank}</span>
              {p.name}{p.isAI && <span className="text-[10px] text-muted-foreground">AI</span>}
              {p.bankrupt && <span className="text-[10px] text-destructive">BANKRUPT</span>}
            </div>
            <div className="text-xs text-muted-foreground">{p.turnsTaken} turns</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Net worth</div>
          <div className="text-lg font-display text-gold">${p.finalNetWorth.toLocaleString()}</div>
        </div>
      </div>

      <Sparkline data={p.netWorthHistory} color={color} />

      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
        <div><span className="text-muted-foreground">Rent paid</span><div>${p.rentPaid}</div></div>
        <div><span className="text-muted-foreground">Rent collected</span><div>${p.rentCollected}</div></div>
        <div><span className="text-muted-foreground">Sets completed</span><div>{p.groupsCompleted.length}</div></div>
      </div>
      {p.groupsCompleted.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {p.groupsCompleted.map((g) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald/30 text-foreground capitalize">{g}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground truncate">{value}</div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}
