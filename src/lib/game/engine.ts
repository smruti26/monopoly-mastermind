import { BOARD, CHANCE_CARDS, CHEST_CARDS, type BoardSpace } from "./board";

export type Difficulty = "easy" | "medium" | "hard";

export interface Player {
  id: string;
  name: string;
  token: string;
  tokenIcon: string;
  isAI: boolean;
  difficulty?: Difficulty;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  color: string;
  // stats
  rentPaid: number;
  rentCollected: number;
  turnsTaken: number;
  netWorthHistory: number[];
  getOutOfJailCards: number;
}

export interface TradeOffer {
  fromId: string;
  toId: string;
  fromProps: number[];
  fromCash: number;
  fromCards: number;
  toProps: number[];
  toCash: number;
  toCards: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  dice: [number, number];
  phase: "rolling" | "moved" | "ended";
  ownership: Record<number, string>;
  log: string[];
  winner: string | null;
  lastEvent: string | null;
  startedAt: number;
  turnCount: number;
}

export const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ec4899"];

export function createInitialState(
  players: Pick<Player, "id" | "name" | "token" | "tokenIcon" | "isAI" | "color" | "difficulty">[],
): GameState {
  return {
    players: players.map((p) => ({
      ...p,
      money: 1500,
      position: 0,
      properties: [],
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
      rentPaid: 0,
      rentCollected: 0,
      turnsTaken: 0,
      netWorthHistory: [1500],
      getOutOfJailCards: 0,
    })),
    currentPlayerIndex: 0,
    dice: [1, 1],
    phase: "rolling",
    ownership: {},
    log: ["Game started. Good luck."],
    winner: null,
    lastEvent: null,
    startedAt: Date.now(),
    turnCount: 0,
  };
}

export function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

export function netWorth(state: GameState, p: Player): number {
  const propVal = p.properties.reduce((sum, id) => sum + (BOARD[id].price ?? 0), 0);
  return p.money + propVal;
}

function ownedInGroup(state: GameState, group: string, playerId: string): number {
  return BOARD.filter((s) => s.group === group && state.ownership[s.id] === playerId).length;
}
function groupSize(group: string): number {
  return BOARD.filter((s) => s.group === group).length;
}

export function calculateRent(state: GameState, space: BoardSpace, dice: [number, number]): number {
  const ownerId = state.ownership[space.id];
  if (!ownerId) return 0;
  if (space.type === "property" && space.rent && space.group) {
    let rent = space.rent[0];
    if (ownedInGroup(state, space.group, ownerId) === groupSize(space.group)) rent *= 2;
    return rent;
  }
  if (space.type === "railroad") {
    const count = BOARD.filter((s) => s.type === "railroad" && state.ownership[s.id] === ownerId).length;
    return [0, 25, 50, 100, 200][count];
  }
  if (space.type === "utility") {
    const count = BOARD.filter((s) => s.type === "utility" && state.ownership[s.id] === ownerId).length;
    return (dice[0] + dice[1]) * (count === 2 ? 10 : 4);
  }
  return 0;
}

export function applyTurn(state: GameState, dice: [number, number]): GameState {
  const s = structuredClone(state);
  const p = s.players[s.currentPlayerIndex];
  s.dice = dice;
  s.lastEvent = null;
  s.turnCount++;
  p.turnsTaken++;

  if (p.inJail) {
    if (dice[0] === dice[1]) {
      p.inJail = false;
      p.jailTurns = 0;
      s.log.unshift(`${p.name} rolled doubles and escaped jail!`);
    } else if (p.getOutOfJailCards > 0) {
      p.getOutOfJailCards--;
      p.inJail = false;
      p.jailTurns = 0;
      s.log.unshift(`${p.name} used a Get Out of Jail card.`);
    } else {
      p.jailTurns++;
      if (p.jailTurns >= 3) {
        p.money -= 50;
        p.inJail = false;
        p.jailTurns = 0;
        s.log.unshift(`${p.name} paid $50 to leave jail.`);
      } else {
        s.log.unshift(`${p.name} stays in jail (${p.jailTurns}/3).`);
        s.phase = "moved";
        recordNetWorth(s);
        return s;
      }
    }
  }

  const oldPos = p.position;
  p.position = (p.position + dice[0] + dice[1]) % 40;
  if (p.position < oldPos) {
    p.money += 200;
    s.log.unshift(`${p.name} passed GO. +$200`);
  }

  const space = BOARD[p.position];
  s.log.unshift(`${p.name} rolled ${dice[0]}+${dice[1]} → ${space.name}`);

  if (space.type === "gotojail") {
    p.position = 10;
    p.inJail = true;
    s.log.unshift(`${p.name} sent to jail!`);
  } else if (space.type === "tax") {
    p.money -= space.price!;
    s.log.unshift(`${p.name} paid $${space.price} tax.`);
  } else if (space.type === "chance") {
    const c = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
    c.action(p);
    s.lastEvent = `Chance: ${c.text}`;
    s.log.unshift(`Chance: ${c.text}`);
  } else if (space.type === "chest") {
    const c = CHEST_CARDS[Math.floor(Math.random() * CHEST_CARDS.length)];
    c.action(p);
    s.lastEvent = `Chest: ${c.text}`;
    s.log.unshift(`Chest: ${c.text}`);
  } else if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
    const ownerId = s.ownership[space.id];
    if (ownerId && ownerId !== p.id) {
      const owner = s.players.find((pl) => pl.id === ownerId)!;
      const rent = calculateRent(s, space, dice);
      p.money -= rent;
      p.rentPaid += rent;
      owner.money += rent;
      owner.rentCollected += rent;
      s.log.unshift(`${p.name} paid $${rent} rent to ${owner.name}.`);
    }
  }

  if (p.money < 0) {
    p.bankrupt = true;
    p.properties.forEach((id) => delete s.ownership[id]);
    p.properties = [];
    s.log.unshift(`💀 ${p.name} went bankrupt!`);
  }

  recordNetWorth(s);

  const alive = s.players.filter((pl) => !pl.bankrupt);
  if (alive.length === 1) {
    s.winner = alive[0].id;
    s.phase = "ended";
  } else {
    s.phase = "moved";
  }
  return s;
}

function recordNetWorth(s: GameState) {
  s.players.forEach((pl) => {
    pl.netWorthHistory.push(pl.bankrupt ? 0 : netWorth(s, pl));
    if (pl.netWorthHistory.length > 200) pl.netWorthHistory.shift();
  });
}

export function buyProperty(state: GameState): GameState {
  const s = structuredClone(state);
  const p = s.players[s.currentPlayerIndex];
  const space = BOARD[p.position];
  if (!space.price || s.ownership[space.id] || p.money < space.price) return s;
  p.money -= space.price;
  p.properties.push(space.id);
  s.ownership[space.id] = p.id;
  s.log.unshift(`${p.name} bought ${space.name} for $${space.price}.`);
  return s;
}

export function endTurn(state: GameState): GameState {
  const s = structuredClone(state);
  let next = (s.currentPlayerIndex + 1) % s.players.length;
  while (s.players[next].bankrupt) next = (next + 1) % s.players.length;
  s.currentPlayerIndex = next;
  s.phase = "rolling";
  s.lastEvent = null;
  return s;
}

export function executeTrade(state: GameState, offer: TradeOffer): GameState {
  const s = structuredClone(state);
  const from = s.players.find((p) => p.id === offer.fromId);
  const to = s.players.find((p) => p.id === offer.toId);
  if (!from || !to) return state;
  if (from.money < offer.fromCash || to.money < offer.toCash) return state;
  if (from.getOutOfJailCards < offer.fromCards || to.getOutOfJailCards < offer.toCards) return state;
  if (!offer.fromProps.every((id) => s.ownership[id] === from.id)) return state;
  if (!offer.toProps.every((id) => s.ownership[id] === to.id)) return state;

  from.money += offer.toCash - offer.fromCash;
  to.money += offer.fromCash - offer.toCash;
  from.getOutOfJailCards += offer.toCards - offer.fromCards;
  to.getOutOfJailCards += offer.fromCards - offer.toCards;

  for (const id of offer.fromProps) {
    s.ownership[id] = to.id;
    from.properties = from.properties.filter((p) => p !== id);
    to.properties.push(id);
  }
  for (const id of offer.toProps) {
    s.ownership[id] = from.id;
    to.properties = to.properties.filter((p) => p !== id);
    from.properties.push(id);
  }

  s.log.unshift(`🤝 Trade: ${from.name} ⇄ ${to.name} (${offer.fromProps.length + offer.toProps.length} props, $${Math.abs(offer.fromCash - offer.toCash)})`);
  return s;
}

// Value a trade from a player's perspective (positive = good for them).
function valueFor(state: GameState, playerId: string, offer: TradeOffer): number {
  const me = state.players.find((p) => p.id === playerId)!;
  const giving = playerId === offer.fromId;
  const myProps = giving ? offer.fromProps : offer.toProps;
  const theirProps = giving ? offer.toProps : offer.fromProps;
  const myCash = giving ? offer.fromCash : offer.toCash;
  const theirCash = giving ? offer.toCash : offer.fromCash;

  const sumPrice = (ids: number[]) => ids.reduce((s, id) => s + (BOARD[id].price ?? 0), 0);
  let v = sumPrice(theirProps) - sumPrice(myProps) + (theirCash - myCash);

  // Synergy bonus: gaining a property that completes a color group
  for (const id of theirProps) {
    const sp = BOARD[id];
    if (sp.group) {
      const owned = ownedInGroup(state, sp.group, me.id);
      if (owned + 1 === groupSize(sp.group)) v += (sp.price ?? 0) * 0.8;
    }
  }
  // Penalty: giving away a property in a group we partially own
  for (const id of myProps) {
    const sp = BOARD[id];
    if (sp.group) {
      const owned = ownedInGroup(state, sp.group, me.id);
      if (owned >= 2) v -= (sp.price ?? 0) * 0.5;
    }
  }
  return v;
}

export function aiEvaluateTrade(state: GameState, offer: TradeOffer): "accept" | "reject" {
  const responder = state.players.find((p) => p.id === offer.toId)!;
  const v = valueFor(state, responder.id, offer);
  const diff = responder.difficulty ?? "medium";
  const threshold = diff === "easy" ? -50 : diff === "hard" ? 20 : 0;
  return v >= threshold ? "accept" : "reject";
}

export function aiCounterOffer(state: GameState, offer: TradeOffer): TradeOffer | null {
  // Simple counter: ask for more cash to reach acceptance.
  const responder = state.players.find((p) => p.id === offer.toId)!;
  const proposer = state.players.find((p) => p.id === offer.fromId)!;
  const v = valueFor(state, responder.id, offer);
  if (v >= 0) return null; // already acceptable
  const needed = Math.min(proposer.money, Math.ceil(-v + 25));
  if (needed <= offer.fromCash) return null;
  return { ...offer, fromCash: needed };
}

export function aiShouldBuy(state: GameState): boolean {
  const p = state.players[state.currentPlayerIndex];
  const space = BOARD[p.position];
  if (!space.price || state.ownership[space.id]) return false;
  const diff: Difficulty = p.difficulty ?? "medium";
  const reserve = diff === "easy" ? 100 : diff === "medium" ? 200 : 300;
  const remaining = p.money - space.price;

  // Always buy if completes a set
  if (space.group) {
    const owned = ownedInGroup(state, space.group, p.id);
    if (owned + 1 === groupSize(space.group) && remaining >= 0) return true;
  }
  if (remaining < 0) return false;
  if (remaining < reserve) {
    if (diff === "easy") return Math.random() < 0.5;
    if (diff === "medium") return Math.random() < 0.3;
    // hard: only buy if cheap or strategic
    return (space.price ?? 0) <= 160 && Math.random() < 0.4;
  }
  if (diff === "hard") {
    // hard skips utilities sometimes
    if (space.type === "utility") return Math.random() < 0.5;
    return true;
  }
  return diff === "easy" ? Math.random() < 0.85 : true;
}

// AI may propose a trade after its turn (medium/hard only).
export function aiProposeTrade(state: GameState): TradeOffer | null {
  const me = state.players[state.currentPlayerIndex];
  if (!me.isAI) return null;
  const diff: Difficulty = me.difficulty ?? "medium";
  if (diff === "easy") return null;
  if (Math.random() > (diff === "hard" ? 0.35 : 0.15)) return null;

  // Find a property I want to complete a set
  for (const sp of BOARD) {
    if (!sp.group || sp.type !== "property") continue;
    const ownerId = state.ownership[sp.id];
    if (!ownerId || ownerId === me.id) continue;
    const owner = state.players.find((p) => p.id === ownerId);
    if (!owner || owner.bankrupt) continue;
    const owned = ownedInGroup(state, sp.group, me.id);
    if (owned >= 1 && owned + 1 === groupSize(sp.group)) {
      // Offer cash 1.4x price + maybe one of my orphan props
      const offerCash = Math.min(me.money - 100, Math.round((sp.price ?? 100) * 1.5));
      if (offerCash <= 0) continue;
      const offer: TradeOffer = {
        fromId: me.id,
        toId: owner.id,
        fromProps: [],
        fromCash: offerCash,
        fromCards: 0,
        toProps: [sp.id],
        toCash: 0,
        toCards: 0,
      };
      if (aiEvaluateTrade(state, offer) === "accept") return offer;
    }
  }
  return null;
}
