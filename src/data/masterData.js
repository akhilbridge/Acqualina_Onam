export const PLAYER_CATEGORY_OPTIONS = [
  "Jr Girls",
  "Jr Boys",
  "Girls",
  "Boys",
  "Ladies",
  "Gents",
];

const PLAYER_CATEGORY_ALIASES = new Map([
  ["jr girls", "Jr Girls"],
  ["jr. girls", "Jr Girls"],
  ["jrgirls", "Jr Girls"],
  ["jr boys", "Jr Boys"],
  ["jr. boys", "Jr Boys"],
  ["jrboys", "Jr Boys"],
  ["girls", "Girls"],
  ["boys", "Boys"],
  ["ladies", "Ladies"],
  ["women", "Ladies"],
  ["gents", "Gents"],
  ["mens", "Gents"],
  ["men", "Gents"],
]);

const RAW_EVENT_DESCRIPTIONS = [
  "Foosball - Girls, 6-9 Doubles",
  "Foosball - Girls, 10-15 years Doubles",
  "Foosball - Boys, 6-9 years Doubles",
  "Foosball - Boys, 10-15 years Doubles",
  "Foosball - Ladies Doubles",
  "Foosball - Gents Doubles",
  "Swimming - Girls, 6-9 years",
  "Swimming - Girls, 10-15 years",
  "Swimming - Boys, 6-9 years",
  "Swimming - Boys, 10-15 years",
  "Football - Kids",
  "Football - Gents",
  "Football - Ladies",
  "Cricket - Gents",
  "Cricket - Ladies",
  "Cricket - Kids",
  "Basketball - Boys",
  "Basketball - Girls",
  "Basketball - Ladies",
  "Basketball - Gents",
  "Carroms - Girls Singles",
  "Carroms - Boys Singles",
  "Carroms - Girls Doubles",
  "Carroms - Boys Doubles",
  "Carroms - Kids Mixed Doubles",
  "Carroms - Gents Singles",
  "Carroms - Ladies Singles",
  "Carroms - Gents Doubles",
  "Carroms - Ladies Doubles",
  "Table Tennis - Boys Singles",
  "Table Tennis - Girls Singles",
  "Table Tennis - Gents Singles",
  "Table Tennis - Ladies Singles",
  "Table Tennis - Boys Doubles",
  "Table Tennis - Girls Doubles",
  "Table Tennis - Kids Mixed Doubles",
  "Table Tennis - Gents Doubles",
  "Table Tennis - Ladies Doubles",
  "Pickleball - Boys Singles",
  "Pickleball - Gents Singles",
  "Pickleball - Ladies Singles",
  "Pickleball - Boys Doubles",
  "Pickleball - Kids Mixed Doubles",
  "Pickleball - Gents Doubles",
  "Pickleball - Ladies Doubles",
  "Chess Kids",
  "Chess Adults",
  "Cards 28 Gents",
  "Cards 28 Ladies",
  "Rummy - Kids",
  "Rummy - Ladies",
  "Rummy - Gents",
  "Badminton - Boys Singles",
  "Badminton - Gents Singles",
  "Badminton - Ladies Singles",
  "Badminton - Boys Doubles",
  "Badminton - Kids Mixed Doubles",
  "Badminton - Gents Doubles",
  "Badminton - Ladies Doubles",
];

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveSportTypeAndCategory(description) {
  const normalizedDescription = normalizeText(description);
  const separatorMatch = normalizedDescription.match(/^(.*?)\s*-\s*(.+)$/);

  if (separatorMatch) {
    return {
      sportType: normalizeText(separatorMatch[1]),
      categoryText: normalizeText(separatorMatch[2]),
    };
  }

  const namedPrefixes = ["Chess", "Cards 28", "Rummy"];
  const matchingPrefix = namedPrefixes.find((prefix) =>
    normalizedDescription.startsWith(`${prefix} `),
  );

  if (matchingPrefix) {
    return {
      sportType: matchingPrefix,
      categoryText: normalizeText(normalizedDescription.slice(matchingPrefix.length)),
    };
  }

  return {
    sportType: normalizedDescription,
    categoryText: "Open",
  };
}

function derivePlayersPerSide(description, sportType) {
  const normalizedDescription = normalizeText(description).toLowerCase();

  if (normalizedDescription.includes("doubles")) {
    return 2;
  }

  if (normalizedDescription.includes("singles")) {
    return 1;
  }

  if (["Chess", "Swimming", "Cards 28", "Rummy"].includes(sportType)) {
    return 1;
  }

  return null;
}

function deriveEventCategory(categoryText) {
  const cleaned = normalizeText(categoryText)
    .replace(/\bSingles\b/gi, "")
    .replace(/\bDoubles Doubles\b/gi, "Doubles")
    .replace(/\bDoubles\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .replace(/,$/, "");

  return cleaned || "Open";
}

function buildSportEventTemplate(description) {
  const normalizedDescription = normalizeText(description);
  const { sportType, categoryText } = deriveSportTypeAndCategory(normalizedDescription);

  return {
    name: normalizedDescription,
    sportType,
    eventCategory: deriveEventCategory(categoryText),
    playersPerSide: derivePlayersPerSide(normalizedDescription, sportType),
  };
}

export function normalizePlayerCategory(category) {
  const normalizedKey = normalizeText(category).toLowerCase();
  return PLAYER_CATEGORY_ALIASES.get(normalizedKey) ?? normalizeText(category);
}

export const SPORT_EVENT_TEMPLATES = RAW_EVENT_DESCRIPTIONS.map(buildSportEventTemplate);

export const SPORT_TYPE_OPTIONS = Array.from(
  new Set(SPORT_EVENT_TEMPLATES.map((template) => template.sportType)),
);

export const EVENT_CATEGORY_OPTIONS = Array.from(
  new Set(SPORT_EVENT_TEMPLATES.map((template) => template.eventCategory)),
);
