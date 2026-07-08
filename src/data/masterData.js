export const PLAYER_CATEGORY_OPTIONS = [
  "Gents",
  "Ladies",
  "Boys 6-9 yrs",
  "Girls 6-9 yrs",
  "Boys 10-15 yrs",
  "Girls 10-15 yrs",
];

const PLAYER_CATEGORY_ALIASES = new Map([
  ["gents", "Gents"],
  ["mens", "Gents"],
  ["men", "Gents"],
  ["ladies", "Ladies"],
  ["women", "Ladies"],
  ["jr boys", "Boys 6-9 yrs"],
  ["jr. boys", "Boys 6-9 yrs"],
  ["jrboys", "Boys 6-9 yrs"],
  ["boys 6-9 yrs", "Boys 6-9 yrs"],
  ["boys 6 to 9 yrs", "Boys 6-9 yrs"],
  ["boys 6-9", "Boys 6-9 yrs"],
  ["jr girls", "Girls 6-9 yrs"],
  ["jr. girls", "Girls 6-9 yrs"],
  ["jrgirls", "Girls 6-9 yrs"],
  ["girls 6-9 yrs", "Girls 6-9 yrs"],
  ["girls 6 to 9 yrs", "Girls 6-9 yrs"],
  ["girls 6-9", "Girls 6-9 yrs"],
  ["boys", "Boys 10-15 yrs"],
  ["boys 10-15 yrs", "Boys 10-15 yrs"],
  ["boys 10 to 15 yrs", "Boys 10-15 yrs"],
  ["boys 10-15", "Boys 10-15 yrs"],
  ["girls", "Girls 10-15 yrs"],
  ["girls 10-15 yrs", "Girls 10-15 yrs"],
  ["girls 10 to 15 yrs", "Girls 10-15 yrs"],
  ["girls 10-15", "Girls 10-15 yrs"],
]);

const EVENT_DEFINITIONS = [
  { eventName: "Foosball", playersPerSide: 2 },
  { eventName: "Carroms Singles", playersPerSide: 1 },
  { eventName: "Carroms Doubles", playersPerSide: 2 },
  { eventName: "Carroms Mixed", playersPerSide: 2 },
  { eventName: "Chess", playersPerSide: 1 },
  { eventName: "TT Singles", playersPerSide: 1 },
  { eventName: "TT Doubles", playersPerSide: 2 },
  { eventName: "TT Mixed", playersPerSide: 2 },
  { eventName: "Badminton Singles", playersPerSide: 1 },
  { eventName: "Badminton Doubles", playersPerSide: 2 },
  { eventName: "Badminton Mixed", playersPerSide: 2 },
  { eventName: "Pickleball Singles", playersPerSide: 1 },
  { eventName: "Pickleball Doubles", playersPerSide: 2 },
  { eventName: "Football", playersPerSide: 5 },
  { eventName: "Cricket", playersPerSide: 11 },
  { eventName: "Basketball", playersPerSide: 5 },
  { eventName: "Swimming", playersPerSide: 1 },
  { eventName: "Crads 28", playersPerSide: 1 },
  { eventName: "Crads 56", playersPerSide: 1 },
  { eventName: "Crads Rummy", playersPerSide: 1 },
];

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePlayerCategory(category) {
  const normalizedKey = normalizeText(category).toLowerCase();
  return PLAYER_CATEGORY_ALIASES.get(normalizedKey) ?? normalizeText(category);
}

export function normalizeEventCategory(category) {
  return normalizePlayerCategory(category);
}

export function getPlayersPerSideForEvent(eventName) {
  const normalizedEventName = normalizeText(eventName);
  const matchingDefinition = EVENT_DEFINITIONS.find(
    (definition) => definition.eventName === normalizedEventName,
  );
  return matchingDefinition?.playersPerSide ?? 1;
}

export function isPlayerEligibleForEvent(playerCategory, eventCategory) {
  const normalizedPlayerCategory = normalizePlayerCategory(playerCategory);
  const normalizedEventCategory = normalizeEventCategory(eventCategory);

  if (!normalizedEventCategory || normalizedEventCategory.toLowerCase() === "open") {
    return true;
  }

  return normalizedPlayerCategory === normalizedEventCategory;
}

export const SPORT_EVENT_TEMPLATES = EVENT_DEFINITIONS.flatMap((definition) =>
  PLAYER_CATEGORY_OPTIONS.map((category) => ({
    name: `${definition.eventName} - ${category}`,
    sportType: definition.eventName,
    eventCategory: category,
    playersPerSide: definition.playersPerSide,
    isActive: true,
    status: "registration_open",
  })),
);

export const SPORT_TYPE_OPTIONS = EVENT_DEFINITIONS.map((definition) => definition.eventName);

export const EVENT_CATEGORY_OPTIONS = [...PLAYER_CATEGORY_OPTIONS];
