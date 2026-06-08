export type Side = "red" | "blue";

export type UnitRole = "melee" | "ranged" | "tank";
export type UnitKind = "unit" | "general";

export interface ActiveSkillConfig {
  id: string;
  name: string;
  /** 技能表现图标（如千年杀 👆） */
  skillIcon?: string;
  /** 以目标为中心的范围边长（格） */
  areaSize: number;
  baseDamage: number;
  /** 伤害翻倍概率下限（含） */
  doubleChanceMin: number;
  /** 伤害翻倍概率上限（含） */
  doubleChanceMax: number;
  /** 技能冷却（秒） */
  cooldownSec: number;
  /** 是否已在战斗中实装 */
  implemented: boolean;
}

export interface UnitConfig {
  id: string;
  char: string;
  /** 将领全名（如吕若辰） */
  name?: string;
  kind?: UnitKind;
  cost: number;
  hp: number;
  attack: number;
  attackRange: number;
  moveSpeed: number;
  attackInterval: number;
  role: UnitRole;
  icon: string;
  /** 普攻武器名（将领弹窗展示，如「刀」） */
  weaponLabel?: string;
  /** 暴击率 0~1，暴击时伤害×2 */
  critRate?: number;
  /** 普攻未命中率 0~1 */
  missRate?: number;
  activeSkill?: ActiveSkillConfig;
}

export interface UnitState {
  id: string;
  configId: string;
  side: Side;
  col: number;
  row: number;
  hp: number;
  attackTimer: number;
  moveTimer: number;
  targetId: string | null;
  wallTargetId: string | null;
}

export interface BaseWallState {
  id: string;
  side: Side;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
}

export interface BaseState {
  side: Side;
  hp: number;
  maxHp: number;
}
