import type { Side } from "../types";

/** 棋盘列/行（整体放大） */
export const COLS = 9;
export const ROWS = 12;

/** 楚河汉界、主战场：中间 4 列 */
export const PLAY_COL_MIN = 3;
export const PLAY_COL_MAX = 6;
export const PLAY_COLS = PLAY_COL_MAX - PLAY_COL_MIN + 1;

/** 红方出兵区（含两侧黑色边距列） */
export const DEPLOY_COL_MIN = 1;
export const DEPLOY_COL_MAX = COLS - 2;

export const CENTER_COL = 4;

/** 大本营中心格 */
export const RED_BASE = { col: CENTER_COL, row: 10 };
export const BLUE_BASE = { col: CENTER_COL, row: 1 };

/** 大本营正门（可摧毁彩墙） */
export const RED_BASE_GATE = { col: CENTER_COL, row: 9 };
export const BLUE_BASE_GATE = { col: CENTER_COL, row: 2 };

/** 楚河汉界：4 行 × 4 列 */
export const RIVER_ROWS = [4, 5, 6, 7] as const;

/** 红方可部署行 */
export const RED_DEPLOY_MIN_ROW = 6;
export const RED_DEPLOY_MAX_ROW = 9;

/** 蓝方 AI 出兵行 */
export const BLUE_SPAWN_ROW = 3;

/** 大本营围墙血量 */
export const BASE_WALL_MAX_HP = 150;

export const RED_BASE_WALL_CELLS = [
  { col: 3, row: 9 },
  { col: 4, row: 9 },
  { col: 5, row: 9 },
  { col: 3, row: 10 },
  { col: 5, row: 10 },
] as const;

export const BLUE_BASE_WALL_CELLS = [
  { col: 3, row: 1 },
  { col: 5, row: 1 },
  { col: 3, row: 2 },
  { col: 4, row: 2 },
  { col: 5, row: 2 },
] as const;

const ALL_BASE_WALL_SET = new Set(
  [...RED_BASE_WALL_CELLS, ...BLUE_BASE_WALL_CELLS].map((c) => `${c.col},${c.row}`)
);

export function isPlayColumn(col: number): boolean {
  return col >= PLAY_COL_MIN && col <= PLAY_COL_MAX;
}

export function isDeployColumn(col: number): boolean {
  return col >= DEPLOY_COL_MIN && col <= DEPLOY_COL_MAX;
}

/** 棋盘内侧可通行列（外圈灰墙以外） */
export function isInnerColumn(col: number): boolean {
  return isDeployColumn(col);
}

/** 棋盘外圈永久灰墙 */
export function isBorderWall(col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  if (isBaseWallPosition(col, row)) return false;
  return col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
}

export function isBaseWallPosition(col: number, row: number): boolean {
  return ALL_BASE_WALL_SET.has(`${col},${row}`);
}

/** @deprecated */
export function isWall(col: number, row: number): boolean {
  return isBorderWall(col, row);
}

export function getBaseWallCells(side: Side): readonly { col: number; row: number }[] {
  const cells = side === "red" ? RED_BASE_WALL_CELLS : BLUE_BASE_WALL_CELLS;
  return cells.filter(({ col, row }) => !isBorderWall(col, row));
}

export function isBaseCell(col: number, row: number): boolean {
  if (col === RED_BASE.col && row === RED_BASE.row) return true;
  if (col === BLUE_BASE.col && row === BLUE_BASE.row) return true;
  return false;
}

export function isBaseGate(col: number, row: number): boolean {
  return (
    (col === RED_BASE_GATE.col && row === RED_BASE_GATE.row) ||
    (col === BLUE_BASE_GATE.col && row === BLUE_BASE_GATE.row)
  );
}

export function isRiverRow(row: number): boolean {
  return (RIVER_ROWS as readonly number[]).includes(row);
}

export function isRiverCell(col: number, row: number): boolean {
  return isRiverRow(row) && isPlayColumn(col);
}

export function canAttackEnemyBase(
  unitCol: number,
  unitRow: number,
  unitSide: Side,
  gateWallIntact: (col: number, row: number) => boolean
): boolean {
  if (unitSide === "red") {
    const g = BLUE_BASE_GATE;
    return unitCol === g.col && unitRow === g.row && !gateWallIntact(g.col, g.row);
  }
  const g = RED_BASE_GATE;
  return unitCol === g.col && unitRow === g.row && !gateWallIntact(g.col, g.row);
}
