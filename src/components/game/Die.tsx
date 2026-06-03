interface Props { value: number; rolling: boolean; }
const DOTS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};
export function Die({ value, rolling }: Props) {
  return (
    <div className={`size-14 sm:size-16 rounded-xl bg-gradient-to-br from-white to-zinc-200 text-black shadow-luxe p-2 ${rolling ? "animate-dice" : ""}`}>
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-full h-full">
        {Array.from({length: 9}).map((_, i) => {
          const r = Math.floor(i/3), c = i%3;
          const on = DOTS[value]?.some(([dr,dc]) => dr===r && dc===c);
          return <div key={i} className="grid place-items-center">{on && <div className="size-2 sm:size-2.5 rounded-full bg-zinc-900" />}</div>;
        })}
      </div>
    </div>
  );
}
