import type { Side } from "../types";

export const COLS = 9;
export const ROWS = 12;

export const PLAY_COL_MIN = 3;
export const PLAY_COL_MAX = 6;

export const DEPLOY_COL_MIN = 1;
export const DEPLOY_COL_MAX = COLS - 2;

export const CENTER_COL = 4;

/** 大本营块：3×3 U 形围墙（顶栏 + 左右柱 + 底角与中门，朝敌营一侧开口） */
export const PALACE_COL_MIN = 3;
export const PALACE_COL_MAX = 5;

export const BLUE_PALACE_ROW_MIN = 1;
export const BLUE_PALACE_ROW_MAX = 3;
export const RED_PALACE_ROW_MIN = 8;
export const RED_PALACE_ROW_MAX = 10;

export const BLUE_BASE = { col: CENTER_COL, row: 2 };
export const RED_BASE = { col: CENTER_COL, row: 9 };

export const BLUE_BASE_GATE = { col: CENTER_COL, row: BLUE_PALACE_ROW_MAX };
export const RED_BASE_GATE = { col: CENTER_COL, row: RED_PALACE_ROW_MIN };

export const RIVER_ROWS = [4, 5, 6, 7] as const;

/** 红方出兵：大本营所在 3 行（与宫殿同高，宫殿列内为墙/本营，两侧列可出兵） */
export const RED_DEPLOY_MIN_ROW = RED_PALACE_ROW_MIN;
export const RED_DEPLOY_MAX_ROW = RED_PALACE_ROW_MAX;

/** 蓝方 AI 出兵：对应宫殿 3 行 */
export const BLUE_SPAWN_MIN_ROW = BLUE_PALACE_ROW_MIN;
export const BLUE_SPAWN_MAX_ROW = BLUE_PALACE_ROW_MAX;

export const BASE_WALL_MAX_HP = 150;

/**
 * U 形围墙（如图）：顶栏 — 左柱 — 右柱 — 底角；底边中格为可破坏城门
 * ```
 * 墙 墙 墙
 * 墙 本营 墙
 * 墙 门 墙
 * ```
 */
function uShapePalaceWalls(
  rowMin: number,
  rowMax: number,
  gateCol: number
): { col: number; row: number }[] {
  const c0 = PALACE_COL_MIN;
  const c1 = PALACE_COL_MAX;
  const cells: { col: number; row: number }[] = [];

  for (let c = c0; c <= c1; c++) {
    cells.push({ col: c, row: rowMin });
  }

  for (let r = rowMin + 1; r <= rowMax; r++) {
    cells.push({ col: c0, row: r });
    cells.push({ col: c1, row: r });
  }

  cells.push({ col: gateCol, row: rowMax });

  return cells;
}

export const BLUE_BASE_WALL_CELLS = uShapePalaceWalls(
  BLUE_PALACE_ROW_MIN,
  BLUE_PALACE_ROW_MAX,
  CENTER_COL
) as readonly { col: number; row: number }[];

export const RED_BASE_WALL_CELLS = uShapePalaceWalls(
  RED_PALACE_ROW_MIN,
  RED_PALACE_ROW_MAX,
  CENTER_COL
) as readonly { col: number; row: number }[];

const ALL_BASE_WALL_SET = new Set(
  [...RED_BASE_WALL_CELLS, ...BLUE_BASE_WALL_CELLS].map((c) => `${c.col},${c.row}`)
);

export function isPlayColumn(col: number): boolean {
  return col >= PLAY_COL_MIN && col <= PLAY_COL_MAX;
}

export function isDeployColumn(col: number): boolean {
  return col >= DEPLOY_COL_MIN && col <= DEPLOY_COL_MAX;
}

export function isInnerColumn(col: number): boolean {
  return isDeployColumn(col);
}

export function isBorderWall(col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  if (isBaseWallPosition(col, row)) return false;
  return col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
}

export function isBaseWallPosition(col: number, row: number): boolean {
  return ALL_BASE_WALL_SET.has(`${col},${row}`);
}

export function isWall(col: number, row: number): boolean {
  return isBorderWall(col, row);
}

export function getBaseWallCells(side: Side): readonly { col: number; row: number }[] {
  const cells = side === "red" ? RED_BASE_WALL_CELLS : BLUE_BASE_WALL_CELLS;
  return cells.filter(({ col, row }) => !isBorderWall(col, row));
}

export function isBaseCell(col: number, row: number): boolean {
  return (
    (col === BLUE_BASE.col && row === BLUE_BASE.row) ||
    (col === RED_BASE.col && row === RED_BASE.row)
  );
}

export function isBaseGate(col: number, row: number): boolean {
  return (
    (col === RED_BASE_GATE.col && row === RED_BASE_GATE.row) ||
    (col === BLUE_BASE_GATE.col && row === BLUE_BASE_GATE.row)
  );
}

export function isPalaceInnerBlocked(_col: number, _row: number): boolean {
  return false;
}

export function isRiverRow(row: number): boolean {
  return (RIVER_ROWS as readonly number[]).includes(row);
}

/** 城门已破：中门或任一侧翼墙被拆即可从两侧涌入 */
function isEnemyGateBreached(
  unitSide: Side,
  gateWallIntact: (col: number, row: number) => boolean
): boolean {
  const gate = unitSide === "red" ? BLUE_BASE_GATE : RED_BASE_GATE;
  if (!gateWallIntact(gate.col, gate.row)) return true;
  if (!gateWallIntact(PALACE_COL_MIN, gate.row)) return true;
  if (!gateWallIntact(PALACE_COL_MAX, gate.row)) return true;
  return false;
}

function isBlockingPalaceWall(
  col: number,
  row: number,
  gateWallIntact: (col: number, row: number) => boolean
): boolean {
  return isBaseWallPosition(col, row) && gateWallIntact(col, row);
}

/** L 形路径上是否没有完好的大本营围墙（横走 / 竖走至少一条通畅） */
function hasClearPathToBase(
  unitCol: number,
  unitRow: number,
  unitSide: Side,
  gateWallIntact: (col: number, row: number) => boolean
): boolean {
  const base = unitSide === "red" ? BLUE_BASE : RED_BASE;

  const pathClear = (horizontalFirst: boolean): boolean => {
    const cells: { col: number; row: number }[] = [];
    if (horizontalFirst) {
      let c = unitCol;
      const stepC = Math.sign(base.col - unitCol);
      while (c !== base.col) {
        c += stepC;
        cells.push({ col: c, row: unitRow });
      }
      let r = unitRow;
      const stepR = Math.sign(base.row - unitRow);
      while (r !== base.row) {
        r += stepR;
        cells.push({ col: base.col, row: r });
      }
    } else {
      let r = unitRow;
      const stepR = Math.sign(base.row - unitRow);
      while (r !== base.row) {
        r += stepR;
        cells.push({ col: unitCol, row: r });
      }
      let c = unitCol;
      const stepC = Math.sign(base.col - unitCol);
      while (c !== base.col) {
        c += stepC;
        cells.push({ col: c, row: base.row });
      }
    }
    return !cells.some(({ col, row }) => isBlockingPalaceWall(col, row, gateWallIntact));
  };

  return pathClear(true) || pathClear(false);
}

export function canAttackEnemyBase(
  unitCol: number,
  unitRow: number,
  unitSide: Side,
  attackRange: number,
  gateWallIntact: (col: number, row: number) => boolean
): boolean {
  const base = unitSide === "red" ? BLUE_BASE : RED_BASE;
  const gate = unitSide === "red" ? BLUE_BASE_GATE : RED_BASE_GATE;
  if (!isEnemyGateBreached(unitSide, gateWallIntact)) return false;

  const distToBase = Math.abs(unitCol - base.col) + Math.abs(unitRow - base.row);
  if (distToBase < 1) return false;

  const onBattlefieldSide =
    unitSide === "red" ? unitRow >= gate.row : unitRow <= gate.row;
  if (!onBattlefieldSide) return false;

  if (!hasClearPathToBase(unitCol, unitRow, unitSide, gateWallIntact)) return false;

  // 城门行 / 门外前一排：仅宫殿列（3–5）可围攻，且路径上不能有墙
  const approachRow = unitSide === "red" ? gate.row + 1 : gate.row - 1;
  const onPalaceSiegeRow =
    unitCol >= PALACE_COL_MIN &&
    unitCol <= PALACE_COL_MAX &&
    (unitRow === gate.row || unitRow === approachRow);

  if (onPalaceSiegeRow) return true;

  return distToBase <= attackRange;
}
