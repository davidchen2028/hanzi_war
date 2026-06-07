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

/** 角色页出战格子（8 格，仅手牌兵种；null 表示空位） */
export const CHARACTER_ROSTER: (string | null)[] = [
  "bing",
  "zu",
  "dun",
  "wu",
  null,
  null,
  null,
  null,
];

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
/** 空城之计标语显示与停战持续时间（第一关、第二关均为 3 秒） */
export const EMPTY_FORT_DURATION_MS = 3000;
/** 第二关：空城之计结束后，再过该时长清除第二波蓝方兵力 */
export const CLOUD_ARROW_BLUE_WAVE2_CLEAR_DELAY_LEVEL_2_MS = 20000;
/** 第一关第二波清除延迟 */
export const CLOUD_ARROW_BLUE_WAVE2_CLEAR_DELAY_LEVEL_1_MS = 10000;

/** 第一关大本营血量（双方） */
export const BASE_HP_LEVEL_1 = 200;
/** 第二关起：蓝方大本营 = 第一关 + 该加成 */
export const BASE_HP_BLUE_LEVEL_2_BONUS = 100;

export function getRedBaseMaxHp(_level: number): number {
  return BASE_HP_LEVEL_1;
}

export function getBlueBaseMaxHp(level: number): number {
  if (level <= 1) return BASE_HP_LEVEL_1;
  return BASE_HP_LEVEL_1 + BASE_HP_BLUE_LEVEL_2_BONUS;
}

export function getEmptyFortDurationMs(_level: number): number {
  return EMPTY_FORT_DURATION_MS;
}

export function getCloudArrowBlueWave2ClearDelayMs(level: number): number {
  return level >= 2
    ? CLOUD_ARROW_BLUE_WAVE2_CLEAR_DELAY_LEVEL_2_MS
    : CLOUD_ARROW_BLUE_WAVE2_CLEAR_DELAY_LEVEL_1_MS;
}
export const MAX_ENERGY = 25;
export const ENERGY_REGEN = 4;
