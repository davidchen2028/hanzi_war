import type { UnitConfig } from "../types";

export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  bing: {
    id: "bing",
    char: "兵",
    cost: 10,
    hp: 80,
    attack: 15,
    attackRange: 1,
    moveSpeed: 2.2,
    attackInterval: 0.9,
    role: "melee",
    icon: "⚔",
  },
  zu: {
    id: "zu",
    char: "卒",
    cost: 11,
    hp: 60,
    attack: 12,
    attackRange: 1,
    moveSpeed: 2.8,
    attackInterval: 0.7,
    role: "melee",
    icon: "🗡",
  },
  dun: {
    id: "dun",
    char: "盾",
    cost: 13,
    hp: 200,
    attack: 8,
    attackRange: 1,
    moveSpeed: 1.4,
    attackInterval: 1.2,
    role: "tank",
    icon: "🛡",
  },
  wu: {
    id: "wu",
    char: "伍",
    cost: 12,
    hp: 70,
    attack: 10,
    attackRange: 3,
    moveSpeed: 1.6,
    attackInterval: 1.0,
    role: "ranged",
    icon: "🏹",
  },
};

export const DECK_IDS = ["bing", "zu", "dun", "wu"] as const;

export const BASE_MAX_HP = 1000;
export const MAX_ENERGY = 25;
export const ENERGY_REGEN = 4;
export const CLOUD_ARROW_DAMAGE = 180;
export const CLOUD_ARROW_COOLDOWN = 12;
