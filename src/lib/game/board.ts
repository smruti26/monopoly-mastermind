export type SpaceType = "go" | "property" | "railroad" | "utility" | "tax" | "chance" | "chest" | "jail" | "free" | "gotojail";

export interface BoardSpace {
  id: number;
  name: string;
  type: SpaceType;
  price?: number;
  rent?: number[];
  color?: string;
  group?: string;
}

export const BOARD: BoardSpace[] = [
  { id: 0, name: "GO", type: "go" },
  { id: 1, name: "Mediterranean Ave", type: "property", price: 60, rent: [2,10,30,90,160,250], color: "#8b4513", group: "brown" },
  { id: 2, name: "Community Chest", type: "chest" },
  { id: 3, name: "Baltic Ave", type: "property", price: 60, rent: [4,20,60,180,320,450], color: "#8b4513", group: "brown" },
  { id: 4, name: "Income Tax", type: "tax", price: 200 },
  { id: 5, name: "Reading Railroad", type: "railroad", price: 200, rent: [25,50,100,200] },
  { id: 6, name: "Oriental Ave", type: "property", price: 100, rent: [6,30,90,270,400,550], color: "#87ceeb", group: "lightblue" },
  { id: 7, name: "Chance", type: "chance" },
  { id: 8, name: "Vermont Ave", type: "property", price: 100, rent: [6,30,90,270,400,550], color: "#87ceeb", group: "lightblue" },
  { id: 9, name: "Connecticut Ave", type: "property", price: 120, rent: [8,40,100,300,450,600], color: "#87ceeb", group: "lightblue" },
  { id: 10, name: "Jail / Just Visiting", type: "jail" },
  { id: 11, name: "St. Charles Place", type: "property", price: 140, rent: [10,50,150,450,625,750], color: "#d946a4", group: "pink" },
  { id: 12, name: "Electric Company", type: "utility", price: 150 },
  { id: 13, name: "States Ave", type: "property", price: 140, rent: [10,50,150,450,625,750], color: "#d946a4", group: "pink" },
  { id: 14, name: "Virginia Ave", type: "property", price: 160, rent: [12,60,180,500,700,900], color: "#d946a4", group: "pink" },
  { id: 15, name: "Pennsylvania Railroad", type: "railroad", price: 200, rent: [25,50,100,200] },
  { id: 16, name: "St. James Place", type: "property", price: 180, rent: [14,70,200,550,750,950], color: "#f59e0b", group: "orange" },
  { id: 17, name: "Community Chest", type: "chest" },
  { id: 18, name: "Tennessee Ave", type: "property", price: 180, rent: [14,70,200,550,750,950], color: "#f59e0b", group: "orange" },
  { id: 19, name: "New York Ave", type: "property", price: 200, rent: [16,80,220,600,800,1000], color: "#f59e0b", group: "orange" },
  { id: 20, name: "Free Parking", type: "free" },
  { id: 21, name: "Kentucky Ave", type: "property", price: 220, rent: [18,90,250,700,875,1050], color: "#ef4444", group: "red" },
  { id: 22, name: "Chance", type: "chance" },
  { id: 23, name: "Indiana Ave", type: "property", price: 220, rent: [18,90,250,700,875,1050], color: "#ef4444", group: "red" },
  { id: 24, name: "Illinois Ave", type: "property", price: 240, rent: [20,100,300,750,925,1100], color: "#ef4444", group: "red" },
  { id: 25, name: "B&O Railroad", type: "railroad", price: 200, rent: [25,50,100,200] },
  { id: 26, name: "Atlantic Ave", type: "property", price: 260, rent: [22,110,330,800,975,1150], color: "#eab308", group: "yellow" },
  { id: 27, name: "Ventnor Ave", type: "property", price: 260, rent: [22,110,330,800,975,1150], color: "#eab308", group: "yellow" },
  { id: 28, name: "Water Works", type: "utility", price: 150 },
  { id: 29, name: "Marvin Gardens", type: "property", price: 280, rent: [24,120,360,850,1025,1200], color: "#eab308", group: "yellow" },
  { id: 30, name: "Go To Jail", type: "gotojail" },
  { id: 31, name: "Pacific Ave", type: "property", price: 300, rent: [26,130,390,900,1100,1275], color: "#10b981", group: "green" },
  { id: 32, name: "North Carolina Ave", type: "property", price: 300, rent: [26,130,390,900,1100,1275], color: "#10b981", group: "green" },
  { id: 33, name: "Community Chest", type: "chest" },
  { id: 34, name: "Pennsylvania Ave", type: "property", price: 320, rent: [28,150,450,1000,1200,1400], color: "#10b981", group: "green" },
  { id: 35, name: "Short Line", type: "railroad", price: 200, rent: [25,50,100,200] },
  { id: 36, name: "Chance", type: "chance" },
  { id: 37, name: "Park Place", type: "property", price: 350, rent: [35,175,500,1100,1300,1500], color: "#3b82f6", group: "darkblue" },
  { id: 38, name: "Luxury Tax", type: "tax", price: 100 },
  { id: 39, name: "Boardwalk", type: "property", price: 400, rent: [50,200,600,1400,1700,2000], color: "#3b82f6", group: "darkblue" },
];

export const TOKENS = [
  { id: "hat", icon: "🎩", name: "Top Hat" },
  { id: "car", icon: "🚗", name: "Race Car" },
  { id: "dog", icon: "🐕", name: "Scottie Dog" },
  { id: "ship", icon: "⛵", name: "Battleship" },
  { id: "boot", icon: "👢", name: "Boot" },
  { id: "cat", icon: "🐈", name: "Cat" },
  { id: "thimble", icon: "🪡", name: "Thimble" },
  { id: "wheelbarrow", icon: "🛒", name: "Wheelbarrow" },
];

export const AI_NAMES = ["Rockefeller", "Vanderbilt", "Carnegie", "Morgan", "Astor", "Hearst", "Getty", "Onassis"];

export const CHANCE_CARDS = [
  { text: "Advance to GO. Collect $200", action: (p: any) => { p.position = 0; p.money += 200; } },
  { text: "Bank pays you a dividend of $50", action: (p: any) => { p.money += 50; } },
  { text: "Speeding fine: pay $15", action: (p: any) => { p.money -= 15; } },
  { text: "Go back 3 spaces", action: (p: any) => { p.position = (p.position - 3 + 40) % 40; } },
  { text: "Advance to Illinois Ave", action: (p: any) => { p.position = 24; } },
  { text: "Building repairs: pay $40", action: (p: any) => { p.money -= 40; } },
];

export const CHEST_CARDS = [
  { text: "Bank error in your favor: collect $200", action: (p: any) => { p.money += 200; } },
  { text: "Doctor's fees: pay $50", action: (p: any) => { p.money -= 50; } },
  { text: "From sale of stock: $50", action: (p: any) => { p.money += 50; } },
  { text: "Holiday fund matures: receive $100", action: (p: any) => { p.money += 100; } },
  { text: "Income tax refund: $20", action: (p: any) => { p.money += 20; } },
  { text: "Life insurance matures: $100", action: (p: any) => { p.money += 100; } },
];
