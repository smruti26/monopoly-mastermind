import { useMemo, useState } from "react";
import { BOARD } from "@/lib/game/board";
import type { GameState, Player, TradeOffer } from "@/lib/game/engine";
import { aiCounterOffer, aiEvaluateTrade, executeTrade } from "@/lib/game/engine";
import { X, ArrowRightLeft } from "lucide-react";

interface Props {
  game: GameState;
  fromPlayer: Player;
  onClose: () => void;
  onCommit: (next: GameState) => void;
  announce: (msg: string) => void;
}

export function TradeModal({ game, fromPlayer, onClose, onCommit, announce }: Props) {
  const partners = game.players.filter((p) => p.id !== fromPlayer.id && !p.bankrupt);
  const [toId, setToId] = useState<string>(partners[0]?.id ?? "");
  const to = game.players.find((p) => p.id === toId);
  const [fromProps, setFromProps] = useState<number[]>([]);
  const [toProps, setToProps] = useState<number[]>([]);
  const [fromCash, setFromCash] = useState(0);
  const [toCash, setToCash] = useState(0);
  const [fromCards, setFromCards] = useState(0);
  const [toCards, setToCards] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const offer: TradeOffer | null = useMemo(() => to ? {
    fromId: fromPlayer.id, toId: to.id,
    fromProps, fromCash, fromCards,
    toProps, toCash, toCards,
  } : null, [to, fromPlayer.id, fromProps, fromCash, fromCards, toProps, toCash, toCards]);

  const empty = !offer || (
    offer.fromProps.length === 0 && offer.toProps.length === 0 &&
    offer.fromCash === 0 && offer.toCash === 0 &&
    offer.fromCards === 0 && offer.toCards === 0
  );

  function commit(next: GameState, msg: string) {
    announce(msg);
    setStatus(msg);
    onCommit(next);
  }

  function submit() {
    if (!offer || !to) return;
    if (to.isAI) {
      const verdict = aiEvaluateTrade(game, offer);
      if (verdict === "accept") {
        commit(executeTrade(game, offer), `${to.name} accepted the trade.`);
        setTimeout(onClose, 800);
      } else {
        const counter = aiCounterOffer(game, offer);
        if (counter) {
          setFromCash(counter.fromCash);
          setStatus(`${to.name} countered: needs $${counter.fromCash} cash.`);
          announce(`${to.name} countered: needs $${counter.fromCash} cash.`);
        } else {
          setStatus(`${to.name} rejected the trade.`);
          announce(`${to.name} rejected the trade.`);
        }
      }
    } else {
      // human partner: instant accept (hot-seat)
      commit(executeTrade(game, offer), `Trade between ${fromPlayer.name} and ${to.name} executed.`);
      setTimeout(onClose, 600);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur p-4" role="dialog" aria-modal="true" aria-labelledby="trade-title">
      <div className="bg-card border border-gold/40 rounded-2xl shadow-luxe w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 id="trade-title" className="text-xl font-display text-gold flex items-center gap-2"><ArrowRightLeft className="size-5" aria-hidden="true" /> Propose Trade</h2>
          <button onClick={onClose} aria-label="Close trade dialog" className="p-2 rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"><X className="size-4" /></button>
        </header>

        <div className="p-4 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Trade with</span>
            <select
              value={toId}
              onChange={(e) => { setToId(e.target.value); setToProps([]); setToCash(0); setToCards(0); }}
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Trade partner"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.tokenIcon} {p.name} {p.isAI ? "(AI)" : ""}</option>
              ))}
            </select>
          </label>

          {to && (
            <div className="grid md:grid-cols-2 gap-4">
              <Side
                title={`${fromPlayer.name} offers`}
                player={fromPlayer}
                game={game}
                selected={fromProps}
                onToggle={(id) => setFromProps((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                cash={fromCash} setCash={setFromCash}
                cards={fromCards} setCards={setFromCards}
              />
              <Side
                title={`${to.name} gives`}
                player={to}
                game={game}
                selected={toProps}
                onToggle={(id) => setToProps((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                cash={toCash} setCash={setToCash}
                cards={toCards} setCards={setToCards}
              />
            </div>
          )}

          {status && (
            <div role="status" aria-live="polite" className="p-3 rounded-lg border border-gold/40 bg-gold/10 text-sm">{status}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full border border-border hover:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">Cancel</button>
            <button
              onClick={submit}
              disabled={empty}
              className="px-5 py-2 rounded-full bg-gold text-background font-semibold disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {to?.isAI ? "Send to AI" : "Execute trade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Side({
  title, player, game, selected, onToggle, cash, setCash, cards, setCards,
}: {
  title: string;
  player: Player;
  game: GameState;
  selected: number[];
  onToggle: (id: number) => void;
  cash: number; setCash: (n: number) => void;
  cards: number; setCards: (n: number) => void;
}) {
  return (
    <div className="border border-border rounded-xl p-3 bg-background/40">
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      <div className="text-xs text-muted-foreground mb-2">Cash: ${player.money} · Jail cards: {player.getOutOfJailCards}</div>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 mb-3" role="group" aria-label={`${player.name} properties`}>
        {player.properties.length === 0 && <div className="text-xs text-muted-foreground italic">No properties</div>}
        {player.properties.map((id) => {
          const sp = BOARD[id];
          const sel = selected.includes(id);
          return (
            <label key={id} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${sel ? "bg-gold/20 ring-1 ring-gold" : "hover:bg-muted"}`}>
              <input type="checkbox" checked={sel} onChange={() => onToggle(id)} className="accent-gold" />
              {sp.color && <span className="inline-block size-3 rounded" style={{ background: sp.color }} aria-hidden="true" />}
              <span className="flex-1 truncate">{sp.name}</span>
              <span className="text-gold">${sp.price}</span>
            </label>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="block text-muted-foreground mb-1">Cash $</span>
          <input
            type="number" min={0} max={player.money} value={cash}
            onChange={(e) => setCash(Math.max(0, Math.min(player.money, Number(e.target.value) || 0)))}
            className="w-full bg-input border border-border rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </label>
        <label className="text-xs">
          <span className="block text-muted-foreground mb-1">Jail cards</span>
          <input
            type="number" min={0} max={player.getOutOfJailCards} value={cards}
            onChange={(e) => setCards(Math.max(0, Math.min(player.getOutOfJailCards, Number(e.target.value) || 0)))}
            className="w-full bg-input border border-border rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </label>
      </div>
    </div>
  );
}
