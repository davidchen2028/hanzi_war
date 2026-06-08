import {
  LEVEL_CLEAR_FRAGMENT_REWARDS,
  UNIT_FRAGMENTS_REQUIRED,
  getUnitDisplayName,
} from "../config/units";

export interface FragmentReward {
  unitId: string;
  amount: number;
  label: string;
}

const FRAGMENTS_KEY = "hanzi-gongfangzhan:fragments";

function loadAll(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FRAGMENTS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, number>;
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, number>): boolean {
  try {
    localStorage.setItem(FRAGMENTS_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function getFragmentsRequired(unitId: string): number | null {
  return UNIT_FRAGMENTS_REQUIRED[unitId] ?? null;
}

export function getFragments(unitId: string): number {
  return loadAll()[unitId] ?? 0;
}

export function isUnitUnlocked(unitId: string): boolean {
  const required = getFragmentsRequired(unitId);
  if (required === null) return true;
  return getFragments(unitId) >= required;
}

export function resetFragments(): boolean {
  return saveAll({});
}

/** 通关关卡时发放碎片奖励 */
export function grantLevelClearRewards(level: number): FragmentReward[] {
  const rewards = LEVEL_CLEAR_FRAGMENT_REWARDS[level];
  if (!rewards?.length) return [];

  const granted: FragmentReward[] = [];
  for (const { id, count } of rewards) {
    if (count <= 0) continue;
    if (!addFragments(id, count)) continue;
    granted.push({
      unitId: id,
      amount: count,
      label: `${getUnitDisplayName(id)}碎片 +${count}`,
    });
  }
  return granted;
}

/** 日后获得碎片时调用 */
export function addFragments(unitId: string, amount: number): boolean {
  if (amount <= 0) return false;
  const all = loadAll();
  all[unitId] = (all[unitId] ?? 0) + amount;
  return saveAll(all);
}
