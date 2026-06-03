import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useGame, setGame } from "@/lib/game/store";
import { applyTurn, buyProperty, endTurn, rollDice, aiShouldBuy, calculateRent } from "@/lib/game/engine";
import { BOARD } from "@/lib/game/board";
import { Board } from "@/components/game/Board";
import { Die } from "@/components/game/Die";
import { Dice5, Home, Trophy, X } from "lucide-react";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play — Monopoly Royale" }, { name: "description", content: "Roll, buy and bankrupt your rivals." }] }),
  component: Play,
});

function Play() {
  const game = useGame();
  const nav = useNavigate();
  const [rolling, setRolling] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const current = game?.players[game.currentPlayerIndex];

  const doRoll = useCallback(() => {
    if (!game || game.phase !== "rolling" || rolling) return;
    setRolling(true);
    const dice = rollDice();
    setTimeout(() => {
      setGame(applyTurn(game, dice));
      setRolling(false);
    }, 700);
  }, [game, rolling]);

  // AI loop
  useEffect(() => {
    if (!game || game.winner || rolling) return;
    const p = game.players[game.currentPlayerIndex];
    if (!p.isAI) return;
    const t = setTimeout(() => {
      if (game.phase === "rolling") {
        doRoll();
      } else if (game.phase === "moved") {
        const space = BOARD[p.position];
        let next = game;
        if ((space.type === "property" || space.type === "railroad" || space.type === "utility") && !game.ownership[space.id] && aiShouldBuy(game)) {
          next = buyProperty(game);
        }
        setGame(endTurn(next));
      }
    }, 900);
    return () => clearTimeout(t);
  }, [game, rolling, doRoll]);

  if (!game) {
    return (
      <main className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-3xl mb-3">No game in progress</h1>
          <p className="text-muted-foreground mb-6">Start a new one to play.</p>
          <Link to="/setup" className="inline-flex px-6 py-3 rounded-full bg-gold text-background font-semibold">New Game</Link>
        </div>
      </main>
    );
  }

  const space = current ? BOARD[current.position] : null;
  const canBuy = !current?.isAI && game.phase === "moved" && space && (space.type === "property" || space.type === "railroad" || space.type === "utility")
    && !game.ownership[space.id] && space.price && current.money >= space.price;
  const selSpace = selected !== null ? BOARD[selected] : null;
  const selOwner = selSpace ? game.players.find(p => p.id === game.ownership[selSpace.id]) : null;

  return (
    <main className="min-h-screen p-3 sm:p-6">
      <header className="flex items-center justify-between mb-4 max-w-[1400px] mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold">
          <Home className="size-4" /> Home
        </Link>
        <div className="font-display text-gold text-lg sm:text-xl">Monopoly Royale</div>
        <button onClick={() => { if (confirm("Quit and erase this game?")) { setGame(null); nav({ to: "/" }); } }} className="text-sm text-muted-foreground hover:text-destructive">Quit</button>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 max-w-[1400px] mx-auto">
        <div>
          <Board state={game} selectedSpace={selected} onSelectSpace={setSelected} />

          {/* Controls */}
          <div className="mt-4 p-4 rounded-2xl border border-border bg-card/70 backdrop-blur flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <Die value={game.dice[0]} rolling={rolling} />
              <Die value={game.dice[1]} rolling={rolling} />
              <div className="text-sm">
                <div className="text-muted-foreground">Turn</div>
                <div className="font-semibold" style={{ color: current?.color }}>{current?.tokenIcon} {current?.name}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {current?.isAI ? (
                <div className="text-sm text-muted-foreground italic">AI is thinking…</div>
              ) : game.phase === "rolling" ? (
                <button onClick={doRoll} disabled={rolling} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-background font-semibold shadow-luxe hover:scale-105 transition disabled:opacity-50">
                  <Dice5 className="size-4" /> Roll Dice
                </button>
              ) : (
                <>
                  {canBuy && (
                    <button onClick={() => setGame(buyProperty(game))} className="px-5 py-2.5 rounded-full bg-emerald text-foreground font-semibold hover:scale-105 transition">
                      Buy {space?.name} (${space?.price})
                    </button>
                  )}
                  <button onClick={() => setGame(endTurn(game))} className="px-5 py-2.5 rounded-full border border-border hover:border-gold transition">
                    End Turn
                  </button>
                </>
              )}
            </div>
          </div>

          {game.lastEvent && (
            <div className="mt-3 p-3 rounded-xl border border-gold/40 bg-gold/10 text-sm text-center animate-fade-in">
              {game.lastEvent}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Players</h3>
            <div className="space-y-2">
              {game.players.map((p, i) => {
                const active = i === game.currentPlayerIndex;
                return (
                  <div key={p.id} className={`p-2 rounded-lg flex items-center gap-3 ${active ? "bg-gold/15 ring-1 ring-gold" : ""} ${p.bankrupt ? "opacity-40" : ""}`}>
                    <span className="text-xl" style={{ filter: p.bankrupt ? "grayscale(1)" : "" }}>{p.tokenIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1">
                        <span className="size-2 rounded-full" style={{ background: p.color }} />
                        {p.name} {p.isAI && <span className="text-[10px] text-muted-foreground">AI</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${p.money} · {p.properties.length} props {p.inJail && "· 🔒"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selSpace && (
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <div>
                  {selSpace.color && <div className="h-2 w-12 rounded mb-1" style={{ background: selSpace.color }} />}
                  <h3 className="font-semibold">{selSpace.name}</h3>
                  <div className="text-xs text-muted-foreground capitalize">{selSpace.type}</div>
                </div>
                <button onClick={() => setSelected(null)}><X className="size-4 text-muted-foreground" /></button>
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
            <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
              {game.log.slice(0, 30).map((l, i) => (
                <div key={i} className="text-muted-foreground first:text-foreground">{l}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {game.winner && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur animate-fade-in">
          <div className="text-center p-10 rounded-3xl border border-gold bg-card shadow-luxe max-w-md mx-4">
            <Trophy className="size-16 text-gold mx-auto mb-4" />
            <div className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Champion</div>
            <h2 className="text-4xl mb-2 text-shine">{game.players.find(p => p.id === game.winner)?.name}</h2>
            <p className="text-muted-foreground mb-6">Took the board. Bankrupted the rivals.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setGame(null); nav({ to: "/setup" }); }} className="px-5 py-2.5 rounded-full bg-gold text-background font-semibold">Play Again</button>
              <Link to="/" className="px-5 py-2.5 rounded-full border border-border">Home</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
