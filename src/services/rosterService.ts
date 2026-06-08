import { CHARACTER_ROSTER_DEFAULT, CHARACTER_ROSTER_SIZE } from "../config/units";

const ROSTER_KEY = "hanzi-gongfangzhan:roster";

export function loadRoster(): (string | null)[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return [...CHARACTER_ROSTER_DEFAULT];
    const data = JSON.parse(raw) as (string | null)[];
    if (!Array.isArray(data) || data.length !== CHARACTER_ROSTER_SIZE) {
      return [...CHARACTER_ROSTER_DEFAULT];
    }
    const roster = [...CHARACTER_ROSTER_DEFAULT];
    for (let i = 0; i < CHARACTER_ROSTER_SIZE; i++) {
      if (i < 4) continue;
      roster[i] = typeof data[i] === "string" ? data[i] : null;
    }
    return roster;
  } catch {
    return [...CHARACTER_ROSTER_DEFAULT];
  }
}

/** 出战配置恢复默认（前 4 格兵卒盾伍，选配位清空） */
export function resetRoster(): boolean {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify([...CHARACTER_ROSTER_DEFAULT]));
    return true;
  } catch {
    return false;
  }
}

export function setRosterSlot(index: number, unitId: string | null): boolean {
  if (index < 4 || index >= CHARACTER_ROSTER_SIZE) return false;
  const roster = loadRoster();
  roster[index] = unitId;
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    return true;
  } catch {
    return false;
  }
}
