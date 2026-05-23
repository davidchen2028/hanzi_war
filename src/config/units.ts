import type { UnitConfig } from "../types";

export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  bing: {
    id: "bing",
    char: "兵",
    cost: 10,
    hp: 80,
    attack: 12,
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
  jun: {
    id: "jun",
    char: "军",
    cost: 0,
    hp: 90,
    attack: 14,
    attackRange: 1,
    moveSpeed: 2.0,
    attackInterval: 1.0,
    role: "melee",
    icon: "🚩",
  },
  ma: {
    id: "ma",
    char: "马",
    cost: 0,
    hp: 55,
    attack: 13,
    attackRange: 1,
    moveSpeed: 3.9,
    attackInterval: 0.75,
    role: "melee",
    icon: "🐎",
  },
};

export const DECK_IDS = ["bing", "zu", "dun", "wu"] as const;

/** 穿云箭召唤：军×7 马×7 卒×4 伍×3 盾×2 */
export const CLOUD_ARROW_SUMMON: { id: string; count: number }[] = [
  { id: "jun", count: 7 },
  { id: "ma", count: 7 },
  { id: "zu", count: 4 },
  { id: "wu", count: 3 },
  { id: "dun", count: 2 },
];

export const CLOUD_ARROW_QUOTE = "一支穿云箭，千军万马来相见";
export const CLOUD_ARROW_QUOTE_DURATION_MS = 4000;
export const CLOUD_ARROW_SUMMON_DELAY_MS = 100;

/** 敌方穿云箭反击：第一波 6盾；六盾全灭后空城之计，第二波 6伍+3马+6军+3盾 */
export const CLOUD_ARROW_BLUE_WAVE1: { id: string; count: number }[] = [{ id: "dun", count: 6 }];
export const CLOUD_ARROW_BLUE_WAVE2: { id: string; count: number }[] = [
  { id: "wu", count: 6 },
  { id: "ma", count: 3 },
  { id: "jun", count: 6 },
  { id: "dun", count: 3 },
];
export const EMPTY_FORT_QUOTE = "对方使用空城之计";
/** 第二波全部生成完毕后，经过该时长清除第二波蓝方兵力 */
export const CLOUD_ARROW_BLUE_WAVE2_CLEAR_DELAY_MS = 10000;

/** 第一关双方大本营血量 */
export const BASE_HP_LEVEL_1 = 200;
/** 第二关及之后双方大本营血量 */
export const BASE_HP_DEFAULT = 60;

export function getBaseMaxHpForLevel(level: number): number {
  return level <= 1 ? BASE_HP_LEVEL_1 : BASE_HP_DEFAULT;
}
export const MAX_ENERGY = 25;
export const ENERGY_REGEN = 4;
