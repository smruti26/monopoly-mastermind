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

export function Board({ state, selectedSpace, onSelectSpace }: Props) {
  const reduced = useReducedMotion();
  return (
    <div
      className="relative aspect-square w-full max-w-[720px] mx-auto bg-felt rounded-2xl border-4 border-gold/40 shadow-luxe p-2"
      role="grid"
      aria-label="Monopoly board"
    >
      <div className="grid grid-cols-11 grid-rows-11 gap-0.5 w-full h-full">
        {BOARD.map((space) => {
          const { col, row } = spaceToGrid(space.id);
          const isCorner = [0, 10, 20, 30].includes(space.id);
          const owner = state.ownership[space.id];
          const ownerPlayer = owner ? state.players.find((p) => p.id === owner) : null;
          const playersHere = state.players.filter((p) => p.position === space.id && !p.bankrupt);
          const sel = selectedSpace === space.id;
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
              style={{ gridColumn: col, gridRow: row }}
              className={`relative bg-background/90 border ${sel ? "border-gold ring-2 ring-gold/50" : "border-border/50"} rounded-sm overflow-hidden text-[8px] sm:text-[9px] flex flex-col hover:border-gold/70 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:z-10`}
            >
              {space.color && <div className="h-2 sm:h-3 w-full shrink-0" style={{ background: space.color }} aria-hidden="true" />}
              <div className="p-0.5 flex-1 flex flex-col justify-between min-h-0">
                <div className="font-semibold leading-tight line-clamp-2 text-foreground">
                  {isCorner ? <span className="text-[10px] sm:text-xs">{space.name}</span> : space.name}
                </div>
                {space.price && <div className="text-gold text-[7px] sm:text-[8px]">${space.price}</div>}
              </div>
              {ownerPlayer && (
                <div className="absolute top-0 right-0 size-2 sm:size-2.5 rounded-bl" style={{ background: ownerPlayer.color }} aria-hidden="true" />
              )}
              {playersHere.length > 0 && (
                <div className="absolute bottom-0.5 left-0.5 right-0.5 flex flex-wrap gap-0.5" aria-hidden="true">
                  {playersHere.map((p) => (
                    <span key={p.id} className={`text-[10px] sm:text-sm ${reduced ? "" : "animate-token"}`} title={p.name}>{p.tokenIcon}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
        <div className="col-start-2 col-end-11 row-start-2 row-end-11 grid place-items-center text-center p-4" aria-hidden="true">
          <div>
            <div className="font-display text-3xl sm:text-5xl text-gold drop-shadow-lg">MONOPOLY</div>
            <div className="text-xs text-muted-foreground mt-1">ROYALE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
