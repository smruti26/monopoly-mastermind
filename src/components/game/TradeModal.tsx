import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD } from "@/lib/game/board";
import type { GameState, Player, TradeOffer } from "@/lib/game/engine";
import { aiCounterOffer, aiEvaluateTrade, executeTrade, tradeValueFor } from "@/lib/game/engine";
import { X, ArrowRightLeft, Scale, RotateCcw, GripVertical } from "lucide-react";

interface Props {
  game: GameState;
  fromPlayer: Player;
  onClose: () => void;
  onCommit: (next: GameState) => void;
  announce: (msg: string) => void;
}

type Side = "from" | "to";

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
  const [counter, setCounter] = useState<TradeOffer | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus management on open
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

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

  const myValue = offer ? tradeValueFor(game, fromPlayer.id, offer) : 0;
  const theirValue = offer && to ? tradeValueFor(game, to.id, offer) : 0;

  function commit(next: GameState, msg: string) {
    announce(msg);
    setStatus(msg);
    onCommit(next);
  }

  function moveProp(id: number, target: Side) {
    if (target === "from") {
      setToProps((p) => p.filter((x) => x !== id));
      setFromProps((p) => (p.includes(id) ? p : [...p, id]));
    } else {
      setFromProps((p) => p.filter((x) => x !== id));
      setToProps((p) => (p.includes(id) ? p : [...p, id]));
    }
  }

  function removeProp(id: number, side: Side) {
    if (side === "from") setFromProps((p) => p.filter((x) => x !== id));
    else setToProps((p) => p.filter((x) => x !== id));
  }

  // Presets
  function presetClear() {
    setFromProps([]); setToProps([]); setFromCash(0); setToCash(0); setFromCards(0); setToCards(0);
    setStatus(null); setCounter(null);
    announce("Trade cleared.");
  }
  function presetEqualCash() {
    if (!to) return;
    const sumPrice = (ids: number[]) => ids.reduce((s, id) => s + (BOARD[id].price ?? 0), 0);
    const mineVal = sumPrice(fromProps);
    const theirVal = sumPrice(toProps);
    // If they offer more value, fromPlayer adds cash to balance; else other side adds cash.
    const diff = theirVal - mineVal;
    if (diff > 0) {
      setFromCash(Math.min(fromPlayer.money, diff));
      setToCash(0);
      announce(`Equal cash preset: ${fromPlayer.name} adds $${Math.min(fromPlayer.money, diff)}.`);
    } else if (diff < 0) {
      setToCash(Math.min(to.money, -diff));
      setFromCash(0);
      announce(`Equal cash preset: ${to.name} adds $${Math.min(to.money, -diff)}.`);
    } else {
      setFromCash(0); setToCash(0);
      announce("Equal cash preset: no cash needed.");
    }
  }
  function applyCounter() {
    if (!counter) return;
    setFromProps(counter.fromProps);
    setToProps(counter.toProps);
    setFromCash(counter.fromCash);
    setToCash(counter.toCash);
    setFromCards(counter.fromCards);
    setToCards(counter.toCards);
    setStatus("Counter-offer loaded. Review and resend.");
    announce("Counter-offer loaded. Review and resend.");
    setCounter(null);
  }

  function submit() {
    if (!offer || !to) return;
    if (to.isAI) {
      const verdict = aiEvaluateTrade(game, offer);
      if (verdict === "accept") {
        commit(executeTrade(game, offer), `${to.name} accepted the trade.`);
        setTimeout(onClose, 800);
      } else {
        const c = aiCounterOffer(game, offer);
        if (c) {
          setCounter(c);
          const cashDelta = c.fromCash - offer.fromCash;
          const msg = `${to.name} countered: needs $${cashDelta > 0 ? cashDelta + " more" : c.fromCash} cash. Their value: $${tradeValueFor(game, to.id, c).toFixed(0)}.`;
          setStatus(msg);
          announce(msg);
        } else {
          const msg = `${to.name} rejected the trade. Their value: $${theirValue.toFixed(0)}.`;
          setStatus(msg);
          announce(msg);
        }
      }
    } else {
      commit(executeTrade(game, offer), `Trade between ${fromPlayer.name} and ${to.name} executed.`);
      setTimeout(onClose, 600);
    }
  }

  if (!to) return null;

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-title"
      aria-describedby="trade-desc"
      onClick={onClose}
    >
      <div
        className="bg-card border border-gold/40 rounded-2xl shadow-luxe w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 ref={titleRef} tabIndex={-1} id="trade-title" className="text-xl font-display text-gold flex items-center gap-2 focus:outline-none">
            <ArrowRightLeft className="size-5" aria-hidden="true" /> Propose Trade
          </h2>
          <button onClick={onClose} aria-label="Close trade dialog" className="p-2 rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <X className="size-4" />
          </button>
        </header>

        <p id="trade-desc" className="sr-only">
          Build a trade by selecting properties, cash and Get Out of Jail cards. Drag properties between sides, or use the buttons. Press Escape to close.
        </p>

        <div className="p-4 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Trade with</span>
            <select
              value={toId}
              onChange={(e) => { setToId(e.target.value); setToProps([]); setToCash(0); setToCards(0); setCounter(null); setStatus(null); }}
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Trade partner"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.tokenIcon} {p.name} {p.isAI ? "(AI)" : ""}</option>
              ))}
            </select>
          </label>

          {/* Presets */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Trade presets">
            <button
              onClick={presetEqualCash}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Scale className="size-3.5" aria-hidden="true" /> Equal cash
            </button>
            <button
              onClick={presetClear}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs hover:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> Clear
            </button>
            <span className="text-[11px] text-muted-foreground self-center">Tip: drag properties between sides.</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <SideBox
              side="from"
              title={`${fromPlayer.name} offers`}
              owner={fromPlayer}
              selectedHere={fromProps}
              onDropProp={(id) => moveProp(id, "from")}
              onRemove={(id) => removeProp(id, "from")}
              onToggleOwn={(id) => setFromProps((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              cash={fromCash} setCash={(n) => setFromCash(Math.max(0, Math.min(fromPlayer.money, n)))}
              cards={fromCards} setCards={(n) => setFromCards(Math.max(0, Math.min(fromPlayer.getOutOfJailCards, n)))}
            />
            <SideBox
              side="to"
              title={`${to.name} gives`}
              owner={to}
              selectedHere={toProps}
              onDropProp={(id) => moveProp(id, "to")}
              onRemove={(id) => removeProp(id, "to")}
              onToggleOwn={(id) => setToProps((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              cash={toCash} setCash={(n) => setToCash(Math.max(0, Math.min(to.money, n)))}
              cards={toCards} setCards={(n) => setToCards(Math.max(0, Math.min(to.getOutOfJailCards, n)))}
            />
          </div>

          {/* Valuation summary */}
          {!empty && (
            <div className="grid grid-cols-2 gap-2 text-xs" aria-label="Trade valuation">
              <ValueChip label={`Value to ${fromPlayer.name}`} value={myValue} />
              <ValueChip label={`Value to ${to.name}`} value={theirValue} />
            </div>
          )}

          {status && (
            <div role="status" aria-live="polite" className="p-3 rounded-lg border border-gold/40 bg-gold/10 text-sm space-y-2">
              <div>{status}</div>
              {counter && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Counter:</span>
                  <span>{fromPlayer.name} pays <span className="text-gold">${counter.fromCash}</span></span>
                  <button
                    onClick={applyCounter}
                    className="ml-auto px-3 py-1 rounded-full bg-gold text-background font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    Load counter
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full border border-border hover:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">Cancel</button>
            <button
              onClick={submit}
              disabled={empty}
              className="px-5 py-2 rounded-full bg-gold text-background font-semibold disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {to.isAI ? "Send to AI" : "Execute trade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueChip({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className={`p-2 rounded-lg border ${positive ? "border-emerald/40 bg-emerald/10" : "border-destructive/40 bg-destructive/10"}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-mono ${positive ? "text-emerald" : "text-destructive"}`}>
        {positive ? "+" : ""}${value.toFixed(0)}
      </div>
    </div>
  );
}

function SideBox({
  side, title, owner, selectedHere, onDropProp, onRemove, onToggleOwn, cash, setCash, cards, setCards,
}: {
  side: Side;
  title: string;
  owner: Player;
  selectedHere: number[];
  onDropProp: (id: number) => void;
  onRemove: (id: number) => void;
  onToggleOwn: (id: number) => void;
  cash: number; setCash: (n: number) => void;
  cards: number; setCards: (n: number) => void;
}) {
  const [over, setOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const raw = e.dataTransfer.getData("application/x-monopoly-prop");
    if (!raw) return;
    const id = Number(raw);
    if (Number.isFinite(id)) onDropProp(id);
  }

  return (
    <div
      className={`border rounded-xl p-3 bg-background/40 transition-colors ${over ? "border-gold ring-2 ring-gold/40" : "border-border"}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      aria-label={`${title} drop zone`}
    >
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      <div className="text-xs text-muted-foreground mb-2">Cash: ${owner.money} · Jail cards: {owner.getOutOfJailCards}</div>

      {/* Selected (in this side) */}
      {selectedHere.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider text-gold mb-1">Included</div>
          <ul className="flex flex-wrap gap-1">
            {selectedHere.map((id) => {
              const sp = BOARD[id];
              return (
                <li key={id}>
                  <button
                    onClick={() => onRemove(id)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gold/20 ring-1 ring-gold text-foreground hover:bg-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label={`Remove ${sp.name}`}
                  >
                    {sp.color && <span className="size-2 rounded-full" style={{ background: sp.color }} aria-hidden="true" />}
                    {sp.name}
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Owned list (only their own properties) */}
      <div className="space-y-1 max-h-44 overflow-y-auto pr-1 mb-3" role="group" aria-label={`${owner.name} properties`}>
        {owner.properties.length === 0 && <div className="text-xs text-muted-foreground italic">No properties</div>}
        {owner.properties.map((id) => {
          const sp = BOARD[id];
          const sel = selectedHere.includes(id);
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/x-monopoly-prop", String(id))}
              className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-grab active:cursor-grabbing ${sel ? "bg-gold/20 ring-1 ring-gold" : "hover:bg-muted"}`}
              aria-grabbed={sel}
            >
              <GripVertical className="size-3 text-muted-foreground" aria-hidden="true" />
              <input
                type="checkbox"
                checked={sel}
                onChange={() => onToggleOwn(id)}
                className="accent-gold"
                aria-label={`Include ${sp.name} from ${owner.name}`}
              />
              {sp.color && <span className="inline-block size-3 rounded" style={{ background: sp.color }} aria-hidden="true" />}
              <span className="flex-1 truncate">{sp.name}</span>
              <span className="text-gold">${sp.price}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="block text-muted-foreground mb-1">Cash $</span>
          <input
            type="number" min={0} max={owner.money} value={cash}
            onChange={(e) => setCash(Number(e.target.value) || 0)}
            className="w-full bg-input border border-border rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </label>
        <label className="text-xs">
          <span className="block text-muted-foreground mb-1">Jail cards</span>
          <input
            type="number" min={0} max={owner.getOutOfJailCards} value={cards}
            onChange={(e) => setCards(Number(e.target.value) || 0)}
            className="w-full bg-input border border-border rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </label>
      </div>
    </div>
  );
}
