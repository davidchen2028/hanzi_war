const GENERAL_KEY = "hanzi-gongfangzhan:general";

export function loadGeneral(): string | null {
  try {
    const raw = localStorage.getItem(GENERAL_KEY);
    if (!raw) return null;
    const id = JSON.parse(raw) as string | null;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

export function setGeneral(unitId: string | null): boolean {
  try {
    if (unitId === null) {
      localStorage.removeItem(GENERAL_KEY);
      return true;
    }
    localStorage.setItem(GENERAL_KEY, JSON.stringify(unitId));
    return true;
  } catch {
    return false;
  }
}

export function resetGeneral(): boolean {
  return setGeneral(null);
}
