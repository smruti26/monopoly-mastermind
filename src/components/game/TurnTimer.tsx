import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  /** A key that changes whenever the turn changes — resets the timer. */
  turnKey: string;
  /** Seconds for the turn. Default 45. */
  duration?: number;
  /** Seconds remaining at which we start warning. */
  warnAt?: number;
  /** Called when timer expires. */
  onExpire: () => void;
  /** Disable timer (e.g., AI turn, game over, modals open). */
  paused?: boolean;
  /** Announcement callback for screen readers. */
  announce?: (msg: string) => void;
  label?: string;
}

export function TurnTimer({
  turnKey,
  duration = 45,
  warnAt = 10,
  onExpire,
  paused,
  announce,
  label = "Turn",
}: Props) {
  const [remaining, setRemaining] = useState(duration);
  const expiredRef = useRef(false);
  const warnedRef = useRef(false);

  useEffect(() => {
    setRemaining(duration);
    expiredRef.current = false;
    warnedRef.current = false;
  }, [turnKey, duration]);

  useEffect(() => {
    if (paused || expiredRef.current) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next === warnAt && !warnedRef.current) {
          warnedRef.current = true;
          announce?.(`${warnAt} seconds left in your turn.`);
        }
        if (next <= 0) {
          expiredRef.current = true;
          announce?.("Turn time expired.");
          onExpire();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, warnAt, onExpire, announce]);

  const warning = remaining <= warnAt;
  const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-mono tabular-nums transition-colors ${
        warning
          ? "border-destructive text-destructive bg-destructive/10 animate-pulse"
          : "border-border text-foreground bg-card/60"
      }`}
      role="timer"
      aria-live={warning ? "assertive" : "off"}
      aria-atomic="true"
      aria-label={`${label} timer: ${remaining} seconds remaining`}
      title={`${label} time remaining`}
    >
      <Clock className="size-4" aria-hidden="true" />
      <span className="min-w-[2ch] text-right">{remaining}s</span>
      <span className="relative inline-block h-1 w-16 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <span
          className={`absolute inset-y-0 left-0 ${warning ? "bg-destructive" : "bg-gold"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
