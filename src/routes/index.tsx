import { createFileRoute, Link } from "@tanstack/react-router";
import { Dice5, Sparkles, Trophy, Users, Brain, Coins } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monopoly Royale — Modern Board Game" },
      { name: "description", content: "Play Monopoly online with up to 6 players. Smart AI opponents, beautiful board, save & resume anytime." },
      { property: "og:title", content: "Monopoly Royale" },
      { property: "og:description", content: "Modern Monopoly with smart AI opponents and gorgeous visuals." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 text-9xl rotate-12">🎩</div>
        <div className="absolute top-40 right-20 text-9xl -rotate-12">🎲</div>
        <div className="absolute bottom-20 left-1/3 text-9xl rotate-6">🏠</div>
      </div>

      <nav className="flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-full bg-gold grid place-items-center text-background font-bold shadow-luxe">M</div>
          <span className="font-display text-xl text-gold">Monopoly Royale</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/profile" className="text-muted-foreground hover:text-gold transition">Profile</Link>
          <Link to="/setup" className="text-muted-foreground hover:text-gold transition">New Game →</Link>
        </div>
      </nav>

      <section className="px-6 md:px-12 pt-16 md:pt-24 pb-24 max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-card/50 backdrop-blur text-xs text-gold mb-6">
          <Sparkles className="size-3" /> Reimagined for the modern web
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95]">
          Buy. Build. <span className="text-shine">Bankrupt them all.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
          The classic property-trading game, rebuilt with smart AI opponents, smooth dice rolls, and a board that actually looks like one. Up to 6 players. No login. No setup.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/setup"
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gold text-background font-semibold text-lg shadow-luxe hover:scale-105 transition-transform"
          >
            <Dice5 className="size-5 group-hover:animate-dice" />
            Enter Game
          </Link>
          <Link
            to="/play"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-border bg-card/50 backdrop-blur hover:border-gold/50 transition"
          >
            Resume saved game
          </Link>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: "Up to 6 players", body: "Mix humans and AI in any combo. Pick your token and roll." },
            { icon: Brain, title: "Smart AI rivals", body: "Each AI has its own name, persona, and buying strategy." },
            { icon: Coins, title: "Auto-save", body: "Step away anytime. Your empire is waiting when you return." },
            { icon: Dice5, title: "Animated dice", body: "Tactile rolls with sound and motion." },
            { icon: Trophy, title: "Win conditions", body: "Bankrupt every rival to claim the board." },
            { icon: Sparkles, title: "Chance & Chest", body: "The cards you remember, with the twists you don't." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur hover:border-gold/40 transition">
              <Icon className="size-6 text-gold mb-3" />
              <h3 className="text-xl mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
