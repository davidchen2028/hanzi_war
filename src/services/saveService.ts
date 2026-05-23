const STORAGE_KEY = "hanzi-gongfangzhan:save";
const SAVE_VERSION = 1;

export interface GameSave {
  version: number;
  maxLevelUnlocked: number;
  savedAt: string;
}

function defaultSave(): GameSave {
  return {
    version: SAVE_VERSION,
    maxLevelUnlocked: 1,
    savedAt: "",
  };
}

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw) as GameSave;
    if (typeof data.maxLevelUnlocked !== "number" || data.maxLevelUnlocked < 1) {
      return defaultSave();
    }
    return data;
  } catch {
    return defaultSave();
  }
}

/** 将进度重置为第一关 */
export function resetProgressToLevel1(): boolean {
  const data: GameSave = {
    version: SAVE_VERSION,
    maxLevelUnlocked: 1,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** 通关第 clearedLevel 关后保存进度 */
export function saveProgress(clearedLevel: number): boolean {
  const existing = loadSave();
  const nextLevel = Math.max(existing.maxLevelUnlocked, clearedLevel + 1);
  const data: GameSave = {
    version: SAVE_VERSION,
    maxLevelUnlocked: nextLevel,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
