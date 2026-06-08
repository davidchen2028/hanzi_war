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
  pu: {
    id: "pu",
    char: "仆",
    cost: 11,
    hp: 110,
    attack: 9,
    attackRange: 2,
    moveSpeed: 1.6,
    attackInterval: 1.1,
    role: "melee",
    icon: "🔱",
  },
  lrc: {
    id: "lrc",
    char: "吕",
    name: "吕若辰",
    kind: "general",
    cost: 0,
    hp: 450,
    attack: 22,
    attackRange: 2,
    moveSpeed: 1.8,
    attackInterval: 1.1,
    role: "melee",
    icon: "🔪",
    weaponLabel: "刀",
    critRate: 0.2,
    missRate: 0.5,
    activeSkill: {
      id: "qiannian_sha",
      name: "千年杀",
      skillIcon: "👆",
      areaSize: 3,
      baseDamage: 60,
      doubleChanceMin: 0.2,
      doubleChanceMax: 0.7,
      cooldownSec: 25,
      implemented: true,
    },
  },
};

export const DECK_IDS = ["bing", "zu", "dun", "wu"] as const;

/** 角色页出战格子默认配置（前 4 格固定，后 4 格可由玩家选配） */
export const CHARACTER_ROSTER_DEFAULT: (string | null)[] = [
  "bing",
  "zu",
  "dun",
  "wu",
  null,
  null,
  null,
  null,
];

/** 角色碎片：集齐后可出战 */
export const UNIT_FRAGMENTS_REQUIRED: Record<string, number> = {
  pu: 6,
  lrc: 10,
};

/** 通关奖励：关卡 → 碎片 */
export const LEVEL_CLEAR_FRAGMENT_REWARDS: Record<number, { id: string; count: number }[]> = {
  1: [{ id: "pu", count: 2 }],
  2: [{ id: "lrc", count: 5 }],
  3: [{ id: "lrc", count: 5 }],
};

/** 将领连续未命中该次数后，在身边召唤援军 */
export const GENERAL_MISS_STREAK_TRIGGER = 3;
export const GENERAL_MISS_SUMMON_UNIT = "jun";
export const GENERAL_MISS_SUMMON_COUNT = 5;

/** 敌方大本营血量低于该比例时触发空城增援（第二关） */
export const BLUE_BASE_LOW_HP_TRIGGER_RATIO = 0.5;
/** 第二关：大本营低血量空城增援（流程同穿云箭空城之计） */
export const LEVEL_2_ENEMY_EMPTY_FORT_WAVE: { id: string; count: number }[] = [
  { id: "jun", count: 5 },
  { id: "ma", count: 2 },
  { id: "pu", count: 2 },
];

/** 出战空位选配弹窗：4×2 */
export const CHARACTER_PICKER_POOL: (string | null)[] = [
  "pu",
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

/** 出战将领选配弹窗：4×2 */
export const GENERAL_PICKER_POOL: (string | null)[] = [
  "lrc",
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

export function getUnitDisplayName(unitId: string): string {
  const cfg = UNIT_CONFIGS[unitId];
  return cfg?.name ?? cfg?.char ?? unitId;
}

export const CHARACTER_ROSTER_SIZE = 8;

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

/** 第二关：破釜沉舟（红方攻击 +50%，蓝方攻击/移速 -50%，持续 45 秒，冷却 90 秒） */
export const BURN_BOATS_QUOTE = "破釜沉舟";
export const BURN_BOATS_ATTACK_MULTIPLIER = 1.5;
export const BURN_BOATS_ENEMY_MULTIPLIER = 0.5;
export const BURN_BOATS_DURATION_SEC = 45;
export const BURN_BOATS_COOLDOWN_SEC = 90;

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
