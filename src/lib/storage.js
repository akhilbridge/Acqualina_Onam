const EMPTY_DATABASE = {
  users: [],
  teams: [],
  players: [],
  games: [],
};

export const STORAGE_KEY = "aqualina-onam-games-db-v1";

export function loadLocalDatabase() {
  if (typeof window === "undefined") {
    return EMPTY_DATABASE;
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return EMPTY_DATABASE;
  }

  try {
    const parsed = JSON.parse(saved);
    if (
      parsed &&
      Array.isArray(parsed.users) &&
      Array.isArray(parsed.teams) &&
      Array.isArray(parsed.players) &&
      Array.isArray(parsed.games)
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn("Could not parse saved data, returning an empty local cache.", error);
  }

  return EMPTY_DATABASE;
}

export function saveLocalDatabase(database) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

export function resetLocalDatabase() {
  saveLocalDatabase(EMPTY_DATABASE);
  return EMPTY_DATABASE;
}
