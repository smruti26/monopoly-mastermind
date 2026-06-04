import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "R / Space", label: "Roll dice" },
  { keys: "B", label: "Buy current property" },
  { keys: "T", label: "Open trade modal" },
  { keys: "E", label: "End turn" },
  { keys: "?", label: "Toggle this shortcuts overlay" },
  { keys: "Esc", label: "Close any modal" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

export function ShortcutsOverlay({ open, onClose, returnFocusTo }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        // simple focus trap (close button is only focusable)
        e.preventDefault();
        closeRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (returnFocusTo ?? prev)?.focus?.();
    };
  }, [open, onClose, returnFocusTo]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      aria-describedby="shortcuts-desc"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-card border border-gold/40 rounded-2xl shadow-luxe w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="shortcuts-title" className="text-lg font-display text-gold flex items-center gap-2">
            <Keyboard className="size-5" aria-hidden="true" /> Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close shortcuts overlay"
            className="p-2 rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X className="size-4" />
          </button>
        </header>
        <p id="shortcuts-desc" className="sr-only">
          List of available keyboard shortcuts. Press Escape to close.
        </p>
        <ul className="p-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="px-2 py-1 rounded bg-muted text-foreground text-xs font-mono border border-border">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
