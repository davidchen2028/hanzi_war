export type Side = "red" | "blue";

export type UnitRole = "melee" | "ranged" | "tank";

export interface UnitConfig {
  id: string;
  char: string;
  cost: number;
  hp: number;
  attack: number;
  attackRange: number;
  moveSpeed: number;
  attackInterval: number;
  role: UnitRole;
  icon: string;
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
