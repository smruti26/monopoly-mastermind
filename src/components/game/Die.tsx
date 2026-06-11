import { useReducedMotion } from "@/lib/game/store";

interface Props { value: number; rolling: boolean; label?: string; }
const DOTS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};
export function Die({ value, rolling, label }: Props) {
  const reduced = useReducedMotion();
  return (
    <div
      role="img"
      aria-label={label ?? `Die showing ${value}`}
      className={`size-14 sm:size-16 rounded-2xl die-3d text-black p-2.5 ${rolling && !reduced ? "animate-dice" : ""}`}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-full h-full">
        {Array.from({length: 9}).map((_, i) => {
          const r = Math.floor(i/3), c = i%3;
          const on = DOTS[value]?.some(([dr,dc]) => dr===r && dc===c);
          return (
            <div key={i} className="grid place-items-center">
              {on && (
                <div
                  className="size-2 sm:size-2.5 rounded-full"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #4a4a52, #0a0a0d 70%)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.25), 0 1px 1px rgba(0,0,0,0.4)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
