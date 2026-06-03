import { BOARD, CHANCE_CARDS, CHEST_CARDS, type BoardSpace } from "./board";

export interface Player {
  id: string;
  name: string;
  token: string;
  tokenIcon: string;
  isAI: boolean;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  color: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  dice: [number, number];
  phase: "rolling" | "moved" | "ended";
  ownership: Record<number, string>; // spaceId -> playerId
  log: string[];
  winner: string | null;
  lastEvent: string | null;
}

export const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ec4899"];

export function createInitialState(players: Omit<Player, "money"|"position"|"properties"|"inJail"|"jailTurns"|"bankrupt">[]): GameState {
  return {
    players: players.map(p => ({
      ...p, money: 1500, position: 0, properties: [], inJail: false, jailTurns: 0, bankrupt: false,
    })),
    currentPlayerIndex: 0,
    dice: [1, 1],
    phase: "rolling",
    ownership: {},
    log: ["Game started! Good luck."],
    winner: null,
    lastEvent: null,
  };
}

export function rollDice(): [number, number] {
  return [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
}

function ownedInGroup(state: GameState, group: string, playerId: string): number {
  return BOARD.filter(s => s.group === group && state.ownership[s.id] === playerId).length;
}
function groupSize(group: string): number {
  return BOARD.filter(s => s.group === group).length;
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
    const count = BOARD.filter(s => s.type === "railroad" && state.ownership[s.id] === ownerId).length;
    return [0, 25, 50, 100, 200][count];
  }
  if (space.type === "utility") {
    const count = BOARD.filter(s => s.type === "utility" && state.ownership[s.id] === ownerId).length;
    return (dice[0] + dice[1]) * (count === 2 ? 10 : 4);
  }
  return 0;
}

export function applyTurn(state: GameState, dice: [number, number]): GameState {
  const s = structuredClone(state);
  const p = s.players[s.currentPlayerIndex];
  s.dice = dice;
  s.lastEvent = null;

  if (p.inJail) {
    if (dice[0] === dice[1]) {
      p.inJail = false; p.jailTurns = 0;
      s.log.unshift(`${p.name} rolled doubles and escaped jail!`);
    } else {
      p.jailTurns++;
      if (p.jailTurns >= 3) {
        p.money -= 50; p.inJail = false; p.jailTurns = 0;
        s.log.unshift(`${p.name} paid $50 to leave jail.`);
      } else {
        s.log.unshift(`${p.name} stays in jail (${p.jailTurns}/3).`);
        s.phase = "moved";
        return s;
      }
    }
  }

  const oldPos = p.position;
  p.position = (p.position + dice[0] + dice[1]) % 40;
  if (p.position < oldPos) { p.money += 200; s.log.unshift(`${p.name} passed GO. +$200`); }

  const space = BOARD[p.position];
  s.log.unshift(`${p.name} rolled ${dice[0]}+${dice[1]} → ${space.name}`);

  if (space.type === "gotojail") {
    p.position = 10; p.inJail = true;
    s.log.unshift(`${p.name} sent to jail!`);
  } else if (space.type === "tax") {
    p.money -= space.price!;
    s.log.unshift(`${p.name} paid $${space.price} tax.`);
  } else if (space.type === "chance") {
    const c = CHANCE_CARDS[Math.floor(Math.random()*CHANCE_CARDS.length)];
    c.action(p);
    s.lastEvent = `Chance: ${c.text}`;
    s.log.unshift(`Chance: ${c.text}`);
  } else if (space.type === "chest") {
    const c = CHEST_CARDS[Math.floor(Math.random()*CHEST_CARDS.length)];
    c.action(p);
    s.lastEvent = `Chest: ${c.text}`;
    s.log.unshift(`Chest: ${c.text}`);
  } else if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
    const ownerId = s.ownership[space.id];
    if (ownerId && ownerId !== p.id) {
      const owner = s.players.find(pl => pl.id === ownerId)!;
      const rent = calculateRent(s, space, dice);
      p.money -= rent;
      owner.money += rent;
      s.log.unshift(`${p.name} paid $${rent} rent to ${owner.name}.`);
    }
  }

  if (p.money < 0) {
    p.bankrupt = true;
    p.properties.forEach(id => delete s.ownership[id]);
    p.properties = [];
    s.log.unshift(`💀 ${p.name} went bankrupt!`);
  }

  const alive = s.players.filter(pl => !pl.bankrupt);
  if (alive.length === 1) { s.winner = alive[0].id; s.phase = "ended"; }
  else s.phase = "moved";
  return s;
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

export function aiShouldBuy(state: GameState): boolean {
  const p = state.players[state.currentPlayerIndex];
  const space = BOARD[p.position];
  if (!space.price || state.ownership[space.id]) return false;
  if (p.money < space.price + 200) return Math.random() < 0.3;
  return true;
}
