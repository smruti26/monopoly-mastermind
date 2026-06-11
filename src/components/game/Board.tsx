import { BOARD } from "@/lib/game/board";
import type { GameState } from "@/lib/game/engine";
import { useReducedMotion } from "@/lib/game/store";

interface Props {
  state: GameState;
  selectedSpace: number | null;
  onSelectSpace: (id: number) => void;
}

function spaceToGrid(id: number): { col: number; row: number } {
  if (id <= 10) return { col: 11 - id, row: 11 };
  if (id <= 20) return { col: 1, row: 11 - (id - 10) };
  if (id <= 30) return { col: (id - 20) + 1, row: 1 };
  return { col: 11, row: (id - 30) + 1 };
}

function typeIcon(type: string): string | null {
  switch (type) {
    case "chance": return "❓";
    case "chest": return "🎁";
    case "tax": return "💸";
    case "railroad": return "🚂";
    case "utility": return "💡";
    case "gotojail": return "👮";
    case "jail": return "🔒";
    case "free": return "🅿️";
    case "go": return "➡️";
    default: return null;
  }
}

export function Board({ state, selectedSpace, onSelectSpace }: Props) {
  const reduced = useReducedMotion();
  return (
    <div className="relative aspect-square w-full max-w-[760px] mx-auto">
      {/* outer wood / leather frame */}
      <div
        className="absolute -inset-2 rounded-[1.75rem] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #3a2618 0%, #1f1208 50%, #3a2618 100%)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.75), 0 10px 25px -10px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(212,165,80,0.25)",
        }}
        aria-hidden="true"
      />
      <div
        className="relative aspect-square w-full bg-felt rounded-2xl border-2 border-gold/50 p-2"
        role="grid"
        aria-label="Monopoly board"
      >
        <div className="grid grid-cols-11 grid-rows-11 gap-[3px] w-full h-full">
          {BOARD.map((space) => {
            const { col, row } = spaceToGrid(space.id);
            const isCorner = [0, 10, 20, 30].includes(space.id);
            const owner = state.ownership[space.id];
            const ownerPlayer = owner ? state.players.find((p) => p.id === owner) : null;
            const playersHere = state.players.filter((p) => p.position === space.id && !p.bankrupt);
            const sel = selectedSpace === space.id;
            const icon = typeIcon(space.type);
            const ariaLabel = [
              space.name,
              space.price ? `price $${space.price}` : null,
              ownerPlayer ? `owned by ${ownerPlayer.name}` : space.price ? "unowned" : null,
              playersHere.length ? `${playersHere.map((p) => p.name).join(", ")} here` : null,
            ].filter(Boolean).join(", ");
            return (
              <button
                key={space.id}
                type="button"
                role="gridcell"
                onClick={() => onSelectSpace(space.id)}
                aria-label={ariaLabel}
                aria-pressed={sel}
                style={{
                  gridColumn: col,
                  gridRow: row,
                  background: "linear-gradient(180deg, #fbfaf5 0%, #ece7d8 100%)",
                  color: "#1a1a1a",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.4)",
                }}
                className={`group relative border ${sel ? "border-gold ring-2 ring-gold/70 z-10" : "border-black/20"} rounded-[3px] overflow-hidden text-[8px] sm:text-[9px] flex flex-col hover:ring-2 hover:ring-gold/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:z-10`}
              >
                {space.color && (
                  <div
                    className="h-2.5 sm:h-3.5 w-full shrink-0 relative"
                    style={{
                      background: `linear-gradient(180deg, ${space.color}, color-mix(in oklab, ${space.color} 75%, black))`,
                      boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
                    }}
                    aria-hidden="true"
                  />
                )}
                <div className="p-0.5 flex-1 flex flex-col items-center justify-between min-h-0 text-center">
                  {isCorner ? (
                    <span className="font-display text-[10px] sm:text-xs leading-tight pt-1 text-zinc-800">
                      {space.name}
                    </span>
                  ) : (
                    <>
                      {icon && !space.color && (
                        <span className="text-base sm:text-lg leading-none mt-0.5" aria-hidden="true">{icon}</span>
                      )}
                      <div className="font-semibold leading-tight line-clamp-2 px-0.5 text-zinc-800">
                        {space.name}
                      </div>
                      {space.price && (
                        <div className="text-[7px] sm:text-[8px] font-bold tracking-wide text-zinc-700">
                          ${space.price}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {ownerPlayer && (
                  <div
                    className="absolute top-0 right-0 size-2.5 sm:size-3 rounded-bl-md"
                    style={{
                      background: ownerPlayer.color,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.4)",
                    }}
                    aria-hidden="true"
                  />
                )}
                {playersHere.length > 0 && (
                  <div className="absolute bottom-0.5 left-0.5 right-0.5 flex flex-wrap gap-0.5 justify-center" aria-hidden="true">
                    {playersHere.map((p) => (
                      <span
                        key={p.id}
                        className={`text-[11px] sm:text-base drop-shadow ${reduced ? "" : "animate-token"}`}
                        title={p.name}
                        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
                      >
                        {p.tokenIcon}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
          <div className="col-start-2 col-end-11 row-start-2 row-end-11 grid place-items-center text-center p-6" aria-hidden="true">
            <div className="relative">
              <div
                className="absolute -inset-10 rounded-full opacity-40 blur-3xl"
                style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)" }}
              />
              <div className="relative">
                <div className="text-[10px] uppercase tracking-[0.4em] text-gold/70 mb-2">Est. 1935</div>
                <div className="font-display text-4xl sm:text-6xl text-shine drop-shadow-lg" style={{ transform: "rotate(-45deg)" }}>
                  MONOPOLY
                </div>
                <div className="text-xs sm:text-sm tracking-[0.6em] text-gold/80 mt-3" style={{ transform: "rotate(-45deg)" }}>
                  ROYALE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
