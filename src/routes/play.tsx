import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useGame, setGame, recordGameReport, useReducedMotion, setReducedMotion, useProfile } from "@/lib/game/store";
import {
  applyTurn, buyProperty, endTurn, rollDice, aiShouldBuy, calculateRent,
  aiProposeTrade, aiEvaluateTrade, executeTrade,
} from "@/lib/game/engine";
import type { GameReport } from "@/lib/game/store";
import { BOARD } from "@/lib/game/board";
import { Board } from "@/components/game/Board";
import { Die } from "@/components/game/Die";
import { TradeModal } from "@/components/game/TradeModal";
import { EndGameReport } from "@/components/game/EndGameReport";
import { ShortcutsOverlay } from "@/components/game/ShortcutsOverlay";
import { TurnTimer } from "@/components/game/TurnTimer";
import { Dice5, Home, Trophy, X, ArrowRightLeft, Accessibility, Keyboard } from "lucide-react";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [
    { title: "Play — Monopoly Royale" },
    { name: "description", content: "Roll, trade, and bankrupt your rivals." },
  ]}),
  component: Play,
});

function Play() {
  const game = useGame();
  const profile = useProfile();
  const reduced = useReducedMotion();
  const nav = useNavigate();
  const [rolling, setRolling] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [finalReport, setFinalReport] = useState<GameReport | null>(null);
  const lastLogRef = useRef<string | null>(null);
  const shortcutsBtnRef = useRef<HTMLButtonElement>(null);

  const current = game?.players[game.currentPlayerIndex];

  const announce = useCallback((msg: string) => setAnnouncement(msg), []);

  const doRoll = useCallback(() => {
    if (!game || game.phase !== "rolling" || rolling) return;
    setRolling(true);
    const dice = rollDice();
    const delay = reduced ? 0 : 700;
    setTimeout(() => {
      setGame(applyTurn(game, dice));
      setRolling(false);
    }, delay);
  }, [game, rolling, reduced]);

  // Mirror new log line to aria-live region
  useEffect(() => {
    if (!game || !game.log[0]) return;
    if (game.log[0] !== lastLogRef.current) {
      lastLogRef.current = game.log[0];
      setAnnouncement(game.log[0]);
    }
  }, [game]);

  // AI loop
  useEffect(() => {
    if (!game || game.winner || rolling) return;
    const p = game.players[game.currentPlayerIndex];
    if (!p.isAI) return;
    const delay = reduced ? 200 : 900;
    const t = setTimeout(() => {
      if (game.phase === "rolling") {
        doRoll();
      } else if (game.phase === "moved") {
        const space = BOARD[p.position];
        let next = game;
        if ((space.type === "property" || space.type === "railroad" || space.type === "utility") && !game.ownership[space.id] && aiShouldBuy(game)) {
          next = buyProperty(game);
        }
        // AI may propose a trade
        const offer = aiProposeTrade(next);
        if (offer) {
          const partner = next.players.find((pl) => pl.id === offer.toId);
          if (partner && partner.isAI) {
            if (aiEvaluateTrade(next, offer) === "accept") {
              next = executeTrade(next, offer);
              announce(`${p.name} traded with ${partner.name}.`);
            }
          } else if (partner && !partner.isAI) {
            // Auto-accept naive flow would be unfair to humans; surface as a notice instead
            announce(`${p.name} would like to trade — open the Trade panel.`);
          }
        }
        setGame(endTurn(next));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [game, rolling, doRoll, reduced, announce]);

  // Save report once on win
  useEffect(() => {
    if (game?.winner && !finalReport) {
      const r = recordGameReport(game);
      setFinalReport(r);
      announce(`Game over. ${r.winnerName} wins.`);
    }
  }, [game, finalReport, announce]);

  const space = current ? BOARD[current.position] : null;
  const canBuy = !!current && !current.isAI && game?.phase === "moved" && !!space
    && (space.type === "property" || space.type === "railroad" || space.type === "utility")
    && !game.ownership[space.id] && !!space.price && current.money >= space.price;

  // Keyboard shortcuts
  useEffect(() => {
    if (!game) return;
    const g = game;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Global: shortcuts overlay
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (tradeOpen || shortcutsOpen) return;
      if (g.winner) return;
      if (!current || current.isAI) return;
      if ((e.key === " " || e.key.toLowerCase() === "r") && g.phase === "rolling") {
        e.preventDefault(); doRoll();
      } else if (e.key.toLowerCase() === "e" && g.phase === "moved") {
        e.preventDefault(); setGame(endTurn(g));
      } else if (e.key.toLowerCase() === "b" && canBuy) {
        e.preventDefault(); setGame(buyProperty(g));
      } else if (e.key.toLowerCase() === "t" && g.phase === "moved") {
        e.preventDefault(); setTradeOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, current, canBuy, doRoll, tradeOpen, shortcutsOpen]);

  // Per-turn timer expiry — auto-resolve a stalled human turn.
  const handleTimerExpire = useCallback(() => {
    if (!game || game.winner) return;
    const p = game.players[game.currentPlayerIndex];
    if (!p || p.isAI) return;
    if (game.phase === "rolling") {
      const dice = rollDice();
      setGame(endTurn(applyTurn(game, dice)));
      announce(`Timer expired — auto-rolled for ${p.name}.`);
    } else {
      setGame(endTurn(game));
      announce(`Timer expired — turn ended for ${p.name}.`);
    }
  }, [game, announce]);

  if (!game) {
    return (
      <main className="min-h-dvh grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-3xl mb-3">No game in progress</h1>
          <p className="text-muted-foreground mb-6">Start a new one to play.</p>
          <Link to="/setup" className="inline-flex px-6 py-3 rounded-full bg-gold text-background font-semibold">New Game</Link>
        </div>
      </main>
    );
  }

  const selSpace = selected !== null ? BOARD[selected] : null;
  const selOwner = selSpace ? game.players.find((p) => p.id === game.ownership[selSpace.id]) : null;
  const canTrade = !!current && !current.isAI && game.phase === "moved" && !game.winner;

  return (
    <main className="min-h-dvh p-3 sm:p-6">
      {/* Live region for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <header className="flex items-center justify-between mb-4 max-w-[1400px] mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded">
          <Home className="size-4" aria-hidden="true" /> Home
        </Link>
        <div className="font-display text-gold text-lg sm:text-xl">Monopoly Royale</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReducedMotion(!profile.reducedMotion)}
            aria-pressed={profile.reducedMotion}
            aria-label={`Reduced motion ${profile.reducedMotion ? "on" : "off"}`}
            className="p-2 rounded-full border border-border hover:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            title="Toggle reduced motion"
          >
            <Accessibility className="size-4" aria-hidden="true" />
          </button>
          <Link to="/profile" className="text-xs text-muted-foreground hover:text-gold">Profile</Link>
          <button
            onClick={() => { if (confirm("Quit and erase this game?")) { setGame(null); nav({ to: "/" }); } }}
            className="text-sm text-muted-foreground hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
          >
            Quit
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 max-w-[1400px] mx-auto">
        <div>
          <Board state={game} selectedSpace={selected} onSelectSpace={setSelected} />

          <div className="mt-4 p-4 rounded-2xl border border-border bg-card/70 backdrop-blur flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <Die value={game.dice[0]} rolling={rolling} label={`First die ${game.dice[0]}`} />
              <Die value={game.dice[1]} rolling={rolling} label={`Second die ${game.dice[1]}`} />
              <div className="text-sm">
                <div className="text-muted-foreground">Turn</div>
                <div className="font-semibold" style={{ color: current?.color }}>{current?.tokenIcon} {current?.name}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {current?.isAI ? (
                <div className="text-sm text-muted-foreground italic" role="status">AI is thinking…</div>
              ) : game.phase === "rolling" ? (
                <button
                  onClick={doRoll}
                  disabled={rolling}
                  aria-keyshortcuts="Space R"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-background font-semibold shadow-luxe hover:scale-105 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <Dice5 className="size-4" aria-hidden="true" /> Roll Dice <kbd className="text-[10px] opacity-70">(R)</kbd>
                </button>
              ) : (
                <>
                  {canBuy && (
                    <button
                      onClick={() => setGame(buyProperty(game))}
                      aria-keyshortcuts="B"
                      className="px-5 py-2.5 rounded-full bg-emerald text-foreground font-semibold hover:scale-105 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      Buy {space?.name} (${space?.price}) <kbd className="text-[10px] opacity-70">(B)</kbd>
                    </button>
                  )}
                  {canTrade && (
                    <button
                      onClick={() => setTradeOpen(true)}
                      aria-keyshortcuts="T"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/50 text-gold hover:bg-gold/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <ArrowRightLeft className="size-4" aria-hidden="true" /> Trade <kbd className="text-[10px] opacity-70">(T)</kbd>
                    </button>
                  )}
                  <button
                    onClick={() => setGame(endTurn(game))}
                    aria-keyshortcuts="E"
                    className="px-5 py-2.5 rounded-full border border-border hover:border-gold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    End Turn <kbd className="text-[10px] opacity-70">(E)</kbd>
                  </button>
                </>
              )}
            </div>
          </div>

          {game.lastEvent && (
            <div className={`mt-3 p-3 rounded-xl border border-gold/40 bg-gold/10 text-sm text-center ${reduced ? "" : "animate-fade-in"}`} role="status">
              {game.lastEvent}
            </div>
          )}
        </div>

        <aside className="space-y-4" aria-label="Game sidebar">
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Players</h3>
            <ul className="space-y-2">
              {game.players.map((p, i) => {
                const active = i === game.currentPlayerIndex;
                return (
                  <li key={p.id} className={`p-2 rounded-lg flex items-center gap-3 ${active ? "bg-gold/15 ring-1 ring-gold" : ""} ${p.bankrupt ? "opacity-40" : ""}`} aria-current={active ? "true" : undefined}>
                    <span className="text-xl" style={{ filter: p.bankrupt ? "grayscale(1)" : "" }} aria-hidden="true">{p.tokenIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1">
                        <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                        {p.name} {p.isAI && <span className="text-[10px] text-muted-foreground">{p.difficulty ?? "med"} AI</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${p.money} · {p.properties.length} props {p.inJail && "· 🔒"} {p.getOutOfJailCards > 0 && `· 🎟️${p.getOutOfJailCards}`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {selSpace && (
            <div className={`rounded-2xl border border-border bg-card/70 backdrop-blur p-4 ${reduced ? "" : "animate-fade-in"}`} role="region" aria-label={`Details: ${selSpace.name}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  {selSpace.color && <div className="h-2 w-12 rounded mb-1" style={{ background: selSpace.color }} aria-hidden="true" />}
                  <h3 className="font-semibold">{selSpace.name}</h3>
                  <div className="text-xs text-muted-foreground capitalize">{selSpace.type}</div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close details" className="p-1 rounded hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"><X className="size-4 text-muted-foreground" aria-hidden="true" /></button>
              </div>
              {selSpace.price && <div className="text-sm">Price: <span className="text-gold">${selSpace.price}</span></div>}
              {selOwner ? (
                <div className="mt-2 text-xs">Owned by <span style={{ color: selOwner.color }}>{selOwner.name}</span> · rent ${calculateRent(game, selSpace, game.dice)}</div>
              ) : selSpace.price ? (
                <div className="mt-2 text-xs text-muted-foreground">Available</div>
              ) : null}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Activity</h3>
            <ol className="space-y-1 max-h-64 overflow-y-auto text-xs" aria-label="Activity log">
              {game.log.slice(0, 30).map((l, i) => (
                <li key={i} className="text-muted-foreground first:text-foreground">{l}</li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {tradeOpen && current && !current.isAI && (
        <TradeModal
          game={game}
          fromPlayer={current}
          onClose={() => setTradeOpen(false)}
          onCommit={setGame}
          announce={announce}
        />
      )}

      {game.winner && finalReport && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur p-4" role="dialog" aria-modal="true" aria-labelledby="winner-title">
          <div className="bg-card border border-gold rounded-3xl shadow-luxe w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center border-b border-border">
              <Trophy className="size-12 text-gold mx-auto mb-2" aria-hidden="true" />
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Champion</div>
              <h2 id="winner-title" className="text-3xl mb-1 text-shine">{finalReport.winnerName}</h2>
              <p className="text-xs text-muted-foreground">Saved to your profile.</p>
            </div>
            <div className="p-4">
              <EndGameReport report={finalReport} />
            </div>
            <div className="p-4 border-t border-border flex flex-wrap gap-2 justify-center">
              <button onClick={() => { setGame(null); setFinalReport(null); nav({ to: "/setup" }); }} className="px-5 py-2.5 rounded-full bg-gold text-background font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">Play Again</button>
              <Link to="/profile" className="px-5 py-2.5 rounded-full border border-gold/50 text-gold hover:bg-gold/10">View profile</Link>
              <Link to="/" className="px-5 py-2.5 rounded-full border border-border">Home</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
