import { GoogleGenAI } from "npm:@google/genai@^2.5.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TeamRow = {
  id: string;
  name: string;
};

type PlayerRow = {
  id: string;
  name: string;
  villa_number: string;
  category: string;
  team_id: string;
};

type SportEventRow = {
  id: string;
  name: string;
  sport_type: string;
  venue: string;
  players_per_side: number;
  status: string;
};

type EventTeamRow = {
  team_id: string;
  side: "A" | "B";
};

type EventPlayerRow = {
  team_id: string;
  player_id: string;
  side: "A" | "B";
};

type FixtureRow = {
  id: string;
  fixture_number: number;
  side_a_team_id: string;
  side_b_team_id: string;
};

type FixturePlayerRow = {
  fixture_id: string;
  team_id: string;
  player_id: string;
  side: "A" | "B";
};

type TeamPool = {
  team: TeamRow;
  side: "A" | "B";
  players: PlayerRow[];
};

type GroupPool = {
  exhaustive: boolean;
  groups: PlayerRow[][];
};

type FixtureSuggestion = {
  label: string;
  reason?: string;
  sideATeamId: string;
  sideAPlayerIds: string[];
  sideBTeamId: string;
  sideBPlayerIds: string[];
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function pairingKey(teamAPlayerId: string, teamBPlayerId: string) {
  return `${teamAPlayerId}::${teamBPlayerId}`;
}

function teamMatchupKey(sideATeamId: string, sideBTeamId: string) {
  return `${sideATeamId}::${sideBTeamId}`;
}

function sortPlayers(players: PlayerRow[]) {
  return [...players].sort((left, right) =>
    `${left.name}-${left.villa_number}`.localeCompare(`${right.name}-${right.villa_number}`),
  );
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function estimateCombinationCount(totalPlayers: number, groupSize: number, limit: number) {
  if (groupSize > totalPlayers || groupSize <= 0) {
    return 0;
  }

  let numerator = 1;
  let denominator = 1;

  for (let index = 1; index <= groupSize; index += 1) {
    numerator *= totalPlayers - (groupSize - index);
    denominator *= index;

    if (numerator / denominator > limit) {
      return limit + 1;
    }
  }

  return Math.round(numerator / denominator);
}

function generateGroupCombinations(players: PlayerRow[], groupSize: number, limit: number) {
  const combinations: PlayerRow[][] = [];
  const current: PlayerRow[] = [];

  function visit(startIndex: number) {
    if (combinations.length >= limit) {
      return;
    }

    if (current.length === groupSize) {
      combinations.push([...current]);
      return;
    }

    for (
      let index = startIndex;
      index <= players.length - (groupSize - current.length);
      index += 1
    ) {
      current.push(players[index]);
      visit(index + 1);
      current.pop();

      if (combinations.length >= limit) {
        return;
      }
    }
  }

  visit(0);
  return combinations;
}

function buildSequentialGroups(players: PlayerRow[], groupSize: number) {
  const groups: PlayerRow[][] = [];

  for (let index = 0; index + groupSize <= players.length; index += groupSize) {
    groups.push(players.slice(index, index + groupSize));
  }

  return groups;
}

function buildGroupPool(players: PlayerRow[], groupSize: number): GroupPool {
  const sortedPlayers = sortPlayers(players);
  const combinationLimit = 400;
  const combinationCount = estimateCombinationCount(
    sortedPlayers.length,
    groupSize,
    combinationLimit,
  );

  if (combinationCount > 0 && combinationCount <= combinationLimit) {
    return {
      exhaustive: true,
      groups: generateGroupCombinations(sortedPlayers, groupSize, combinationLimit),
    };
  }

  return {
    exhaustive: false,
    groups: buildSequentialGroups(sortedPlayers, groupSize),
  };
}

function buildPriorCounts(fixtures: FixtureRow[], fixturePlayers: FixturePlayerRow[]) {
  const priorPairCounts = new Map<string, number>();
  const priorTeamMatchupCounts = new Map<string, number>();
  const playersByFixtureId = new Map<string, FixturePlayerRow[]>();

  fixturePlayers.forEach((fixturePlayer) => {
    if (!playersByFixtureId.has(fixturePlayer.fixture_id)) {
      playersByFixtureId.set(fixturePlayer.fixture_id, []);
    }

    playersByFixtureId.get(fixturePlayer.fixture_id)?.push(fixturePlayer);
  });

  fixtures.forEach((fixture) => {
    const teamMatchKey = teamMatchupKey(fixture.side_a_team_id, fixture.side_b_team_id);
    priorTeamMatchupCounts.set(teamMatchKey, (priorTeamMatchupCounts.get(teamMatchKey) ?? 0) + 1);

    const fixtureAssignments = playersByFixtureId.get(fixture.id) ?? [];
    const sideAPlayers = fixtureAssignments.filter((assignment) => assignment.side === "A");
    const sideBPlayers = fixtureAssignments.filter((assignment) => assignment.side === "B");

    sideAPlayers.forEach((sideAPlayer) => {
      sideBPlayers.forEach((sideBPlayer) => {
        const key = pairingKey(sideAPlayer.player_id, sideBPlayer.player_id);
        priorPairCounts.set(key, (priorPairCounts.get(key) ?? 0) + 1);
      });
    });
  });

  return {
    priorPairCounts,
    priorTeamMatchupCounts,
  };
}

function scoreCandidate(params: {
  priorPairCounts: Map<string, number>;
  priorTeamMatchupCounts: Map<string, number>;
  sideATeamId: string;
  sideAPlayers: PlayerRow[];
  sideBTeamId: string;
  sideBPlayers: PlayerRow[];
}) {
  let playerRepeatScore = 0;

  params.sideAPlayers.forEach((sideAPlayer) => {
    params.sideBPlayers.forEach((sideBPlayer) => {
      playerRepeatScore +=
        params.priorPairCounts.get(pairingKey(sideAPlayer.id, sideBPlayer.id)) ?? 0;
    });
  });

  const teamRepeatScore =
    params.priorTeamMatchupCounts.get(teamMatchupKey(params.sideATeamId, params.sideBTeamId)) ?? 0;

  return playerRepeatScore * 100 + teamRepeatScore * 10;
}

function buildFallbackSuggestions(params: {
  playersPerSide: number;
  priorPairCounts: Map<string, number>;
  priorTeamMatchupCounts: Map<string, number>;
  sideATeams: TeamPool[];
  sideBTeams: TeamPool[];
  startingFixtureNumber: number;
}) {
  const sideAGroupPools = params.sideATeams.map((teamPool) => ({
    teamPool,
    groupPool: buildGroupPool(teamPool.players, params.playersPerSide),
  }));
  const sideBGroupPools = params.sideBTeams.map((teamPool) => ({
    teamPool,
    groupPool: buildGroupPool(teamPool.players, params.playersPerSide),
  }));

  const candidateFixtures = sideAGroupPools.flatMap((sideAGroupPool) =>
    sideBGroupPools.flatMap((sideBGroupPool) =>
      sideAGroupPool.groupPool.groups.flatMap((sideAPlayers) =>
        sideBGroupPool.groupPool.groups.map((sideBPlayers) => ({
          sideATeamId: sideAGroupPool.teamPool.team.id,
          sideAPlayers,
          sideBTeamId: sideBGroupPool.teamPool.team.id,
          sideBPlayers,
          score: scoreCandidate({
            priorPairCounts: params.priorPairCounts,
            priorTeamMatchupCounts: params.priorTeamMatchupCounts,
            sideATeamId: sideAGroupPool.teamPool.team.id,
            sideAPlayers,
            sideBTeamId: sideBGroupPool.teamPool.team.id,
            sideBPlayers,
          }),
        })),
      ),
    ),
  );

  candidateFixtures.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    return `${left.sideATeamId}-${left.sideBTeamId}`.localeCompare(
      `${right.sideATeamId}-${right.sideBTeamId}`,
    );
  });

  const usedPlayerIds = new Set<string>();
  const suggestions: FixtureSuggestion[] = [];

  candidateFixtures.forEach((candidate) => {
    const hasUsedSideAPlayer = candidate.sideAPlayers.some((player) => usedPlayerIds.has(player.id));
    const hasUsedSideBPlayer = candidate.sideBPlayers.some((player) => usedPlayerIds.has(player.id));

    if (hasUsedSideAPlayer || hasUsedSideBPlayer) {
      return;
    }

    candidate.sideAPlayers.forEach((player) => usedPlayerIds.add(player.id));
    candidate.sideBPlayers.forEach((player) => usedPlayerIds.add(player.id));

    suggestions.push({
      label: `Fixture ${params.startingFixtureNumber + suggestions.length}`,
      reason:
        candidate.score === 0
          ? "No earlier repeat opponents found for this grouping."
          : `Repeat-opponent score reduced to ${candidate.score}.`,
      sideATeamId: candidate.sideATeamId,
      sideAPlayerIds: candidate.sideAPlayers.map((player) => player.id),
      sideBTeamId: candidate.sideBTeamId,
      sideBPlayerIds: candidate.sideBPlayers.map((player) => player.id),
    });
  });

  return suggestions;
}

async function generateSuggestionsWithGemini(params: {
  apiKey: string;
  eventName: string;
  model: string;
  playersPerSide: number;
  priorPairCounts: Map<string, number>;
  priorTeamMatchupCounts: Map<string, number>;
  sideATeams: TeamPool[];
  sideBTeams: TeamPool[];
  startingFixtureNumber: number;
  venue: string;
}) {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const prompt = `
You are generating sports event fixtures.

Goal:
- Create fixtures between teams assigned to Side A and Side B.
- Each fixture must use exactly ${params.playersPerSide} player(s) from one Side A team and exactly ${params.playersPerSide} player(s) from one Side B team.
- Use each selected player at most once.
- Players in one fixture must all come from the same team on that side.
- Avoid repeat opponents and repeat team-vs-team matchups where possible.
- If a team has leftover players that cannot form a full group, do not use partial groups.
- Return only valid JSON with no markdown.

Sport event: ${params.eventName}
Venue: ${params.venue}
Players per side: ${params.playersPerSide}

Side A teams and selected players:
${JSON.stringify(
    params.sideATeams.map((teamPool) => ({
      teamId: teamPool.team.id,
      teamName: teamPool.team.name,
      players: teamPool.players.map((player) => ({
        id: player.id,
        name: player.name,
        villaNumber: player.villa_number,
        category: player.category,
      })),
    })),
    null,
    2,
  )}

Side B teams and selected players:
${JSON.stringify(
    params.sideBTeams.map((teamPool) => ({
      teamId: teamPool.team.id,
      teamName: teamPool.team.name,
      players: teamPool.players.map((player) => ({
        id: player.id,
        name: player.name,
        villaNumber: player.villa_number,
        category: player.category,
      })),
    })),
    null,
    2,
  )}

Previous team matchup counts keyed by "sideATeamId::sideBTeamId":
${JSON.stringify(Object.fromEntries(params.priorTeamMatchupCounts.entries()), null, 2)}

Previous player opponent counts keyed by "sideAPlayerId::sideBPlayerId":
${JSON.stringify(Object.fromEntries(params.priorPairCounts.entries()), null, 2)}

Return JSON in this exact shape:
{
  "fixtures": [
    {
      "label": "Fixture ${params.startingFixtureNumber}",
      "sideATeamId": "uuid",
      "sideAPlayerIds": ["uuid"],
      "sideBTeamId": "uuid",
      "sideBPlayerIds": ["uuid"],
      "reason": "short reason"
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: params.model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
      systemInstruction: [
        "You generate sport event fixtures for an Onam festival app.",
        "Return only valid JSON in the exact fixture schema requested.",
        "Do not include markdown, explanations, or extra text.",
        "Prefer cross-team matchups and avoid repeat opponents where possible.",
      ].join("\n"),
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.fixtures) ? (parsed.fixtures as FixtureSuggestion[]) : [];
}

function sanitizeSuggestions(params: {
  playersPerSide: number;
  sideATeams: TeamPool[];
  sideBTeams: TeamPool[];
  startingFixtureNumber: number;
  suggestions: FixtureSuggestion[];
}) {
  const sideATeamMap = new Map(params.sideATeams.map((teamPool) => [teamPool.team.id, teamPool]));
  const sideBTeamMap = new Map(params.sideBTeams.map((teamPool) => [teamPool.team.id, teamPool]));
  const usedPlayerIds = new Set<string>();

  return params.suggestions
    .filter((suggestion) => {
      const sideATeam = sideATeamMap.get(String(suggestion.sideATeamId ?? "").trim());
      const sideBTeam = sideBTeamMap.get(String(suggestion.sideBTeamId ?? "").trim());

      if (!sideATeam || !sideBTeam) {
        return false;
      }

      const sideAPlayerIds = normalizeIdList(suggestion.sideAPlayerIds);
      const sideBPlayerIds = normalizeIdList(suggestion.sideBPlayerIds);

      if (
        sideAPlayerIds.length !== params.playersPerSide ||
        sideBPlayerIds.length !== params.playersPerSide ||
        new Set(sideAPlayerIds).size !== params.playersPerSide ||
        new Set(sideBPlayerIds).size !== params.playersPerSide
      ) {
        return false;
      }

      const validSideAPlayers = new Set(sideATeam.players.map((player) => player.id));
      const validSideBPlayers = new Set(sideBTeam.players.map((player) => player.id));

      const sideAValid = sideAPlayerIds.every(
        (playerId) => validSideAPlayers.has(playerId) && !usedPlayerIds.has(playerId),
      );
      const sideBValid = sideBPlayerIds.every(
        (playerId) => validSideBPlayers.has(playerId) && !usedPlayerIds.has(playerId),
      );

      if (!sideAValid || !sideBValid) {
        return false;
      }

      sideAPlayerIds.forEach((playerId) => usedPlayerIds.add(playerId));
      sideBPlayerIds.forEach((playerId) => usedPlayerIds.add(playerId));

      return true;
    })
    .map((suggestion, index) => ({
      label: suggestion.label?.trim() || `Fixture ${params.startingFixtureNumber + index}`,
      reason: suggestion.reason?.trim() || "Gemini suggested this fixture.",
      sideATeamId: String(suggestion.sideATeamId).trim(),
      sideAPlayerIds: normalizeIdList(suggestion.sideAPlayerIds),
      sideBTeamId: String(suggestion.sideBTeamId).trim(),
      sideBPlayerIds: normalizeIdList(suggestion.sideBPlayerIds),
    }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Supabase function environment is incomplete." }, 500);
    }

    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "You must be logged in to generate fixtures." }, 401);
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerError) {
      return jsonResponse({ error: callerError.message }, 400);
    }

    if (callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Only admins can generate fixtures." }, 403);
    }

    const payload = await request.json();
    const sportEventId = String(payload.sportEventId ?? "").trim();
    const venueOverride = String(payload.venue ?? "").trim();

    if (!sportEventId) {
      return jsonResponse({ error: "Sport event is required." }, 400);
    }

    const [
      sportEventResponse,
      teamsResponse,
      playersResponse,
      sportEventTeamsResponse,
      sportEventPlayersResponse,
      fixturesResponse,
    ] = await Promise.all([
      adminClient.from("sports_events").select("*").eq("id", sportEventId).maybeSingle(),
      adminClient.from("teams").select("id, name"),
      adminClient.from("players").select("id, name, villa_number, category, team_id"),
      adminClient
        .from("sport_event_teams")
        .select("team_id, side")
        .eq("sport_event_id", sportEventId),
      adminClient
        .from("sport_event_players")
        .select("team_id, player_id, side")
        .eq("sport_event_id", sportEventId),
      adminClient
        .from("fixtures")
        .select("id, fixture_number, side_a_team_id, side_b_team_id")
        .eq("sport_event_id", sportEventId),
    ]);

    if (
      sportEventResponse.error ||
      teamsResponse.error ||
      playersResponse.error ||
      sportEventTeamsResponse.error ||
      sportEventPlayersResponse.error ||
      fixturesResponse.error
    ) {
      return jsonResponse(
        {
          error:
            sportEventResponse.error?.message ||
            teamsResponse.error?.message ||
            playersResponse.error?.message ||
            sportEventTeamsResponse.error?.message ||
            sportEventPlayersResponse.error?.message ||
            fixturesResponse.error?.message ||
            "Fixture generation query failed.",
        },
        400,
      );
    }

    const sportEvent = sportEventResponse.data as SportEventRow | null;
    if (!sportEvent) {
      return jsonResponse({ error: "Sport event was not found." }, 404);
    }

    const playersPerSide = Number(sportEvent.players_per_side ?? 1);
    if (!Number.isInteger(playersPerSide) || playersPerSide < 1) {
      return jsonResponse(
        { error: "This sport event has an invalid players-per-side setting." },
        400,
      );
    }

    const eventTeams = (sportEventTeamsResponse.data ?? []) as EventTeamRow[];
    const sideATeamIds = eventTeams.filter((team) => team.side === "A").map((team) => team.team_id);
    const sideBTeamIds = eventTeams.filter((team) => team.side === "B").map((team) => team.team_id);

    if (sideATeamIds.length === 0 || sideBTeamIds.length === 0) {
      return jsonResponse(
        { error: "Add at least one team on Side A and one team on Side B before generating fixtures." },
        400,
      );
    }

    const allFixtureIds = (fixturesResponse.data ?? []).map((fixture) => fixture.id);
    const fixturePlayersQuery =
      allFixtureIds.length === 0
        ? { data: [] as FixturePlayerRow[], error: null }
        : await adminClient
            .from("fixture_players")
            .select("fixture_id, team_id, player_id, side")
            .in("fixture_id", allFixtureIds);

    if (fixturePlayersQuery.error) {
      return jsonResponse({ error: fixturePlayersQuery.error.message }, 400);
    }

    const teamMap = new Map(
      ((teamsResponse.data ?? []) as TeamRow[]).map((team) => [team.id, team]),
    );
    const playerMap = new Map(
      ((playersResponse.data ?? []) as PlayerRow[]).map((player) => [player.id, player]),
    );
    const selectedEventPlayers = (sportEventPlayersResponse.data ?? []) as EventPlayerRow[];

    const buildTeamPool = (teamId: string, side: "A" | "B") => {
      const team = teamMap.get(teamId);
      if (!team) {
        return null;
      }

      const players = selectedEventPlayers
        .filter((eventPlayer) => eventPlayer.team_id === teamId && eventPlayer.side === side)
        .map((eventPlayer) => playerMap.get(eventPlayer.player_id))
        .filter((player): player is PlayerRow => Boolean(player && player.team_id === teamId));

      return {
        team,
        side,
        players: sortPlayers(players),
      };
    };

    const sideATeams = sideATeamIds
      .map((teamId) => buildTeamPool(teamId, "A"))
      .filter((teamPool): teamPool is TeamPool => Boolean(teamPool));
    const sideBTeams = sideBTeamIds
      .map((teamId) => buildTeamPool(teamId, "B"))
      .filter((teamPool): teamPool is TeamPool => Boolean(teamPool));

    const insufficientTeams = [...sideATeams, ...sideBTeams].filter(
      (teamPool) => teamPool.players.length < playersPerSide,
    );

    if (insufficientTeams.length > 0) {
      const details = insufficientTeams
        .map(
          (teamPool) =>
            `${teamPool.team.name} has ${teamPool.players.length} selected player${teamPool.players.length === 1 ? "" : "s"} but needs ${playersPerSide}`,
        )
        .join(". ");
      return jsonResponse(
        { error: `Cannot generate fixtures yet. ${details}.` },
        400,
      );
    }

    const { priorPairCounts, priorTeamMatchupCounts } = buildPriorCounts(
      (fixturesResponse.data ?? []) as FixtureRow[],
      fixturePlayersQuery.data ?? [],
    );

    const startingFixtureNumber =
      Math.max(
        0,
        ...((fixturesResponse.data ?? []) as FixtureRow[]).map((fixture) => fixture.fixture_number ?? 0),
      ) + 1;

    const fallbackSuggestions = buildFallbackSuggestions({
      playersPerSide,
      priorPairCounts,
      priorTeamMatchupCounts,
      sideATeams,
      sideBTeams,
      startingFixtureNumber,
    });

    let suggestions = fallbackSuggestions;
    let provider = "fallback";

    if (geminiApiKey) {
      try {
        const geminiSuggestions = await generateSuggestionsWithGemini({
          apiKey: geminiApiKey,
          eventName: sportEvent.name,
          model: geminiModel,
          playersPerSide,
          priorPairCounts,
          priorTeamMatchupCounts,
          sideATeams,
          sideBTeams,
          startingFixtureNumber,
          venue: venueOverride || sportEvent.venue || "TBD",
        });

        const sanitizedSuggestions = sanitizeSuggestions({
          playersPerSide,
          sideATeams,
          sideBTeams,
          startingFixtureNumber,
          suggestions: geminiSuggestions,
        });

        if (sanitizedSuggestions.length > 0) {
          suggestions = sanitizedSuggestions;
          provider = "gemini";
        }
      } catch {
        provider = "fallback";
      }
    }

    if (suggestions.length === 0) {
      return jsonResponse(
        {
          error:
            "No fixtures could be generated from the currently selected teams and players. Add more registered players or adjust the event format.",
        },
        400,
      );
    }

    for (const suggestion of suggestions) {
      const { data: createdFixture, error: createFixtureError } = await adminClient
        .from("fixtures")
        .insert({
          sport_event_id: sportEvent.id,
          fixture_number: startingFixtureNumber + suggestions.indexOf(suggestion),
          label: suggestion.label,
          venue: venueOverride || sportEvent.venue || "TBD",
          status: "draft",
          side_a_team_id: suggestion.sideATeamId,
          side_b_team_id: suggestion.sideBTeamId,
          notes: `AI generated fixture. ${suggestion.reason ?? ""}`.trim(),
        })
        .select("id")
        .single();

      if (createFixtureError || !createdFixture) {
        return jsonResponse(
          { error: createFixtureError?.message ?? "A generated fixture could not be saved." },
          400,
        );
      }

      const fixturePlayers = [
        ...suggestion.sideAPlayerIds.map((playerId) => ({
          fixture_id: createdFixture.id,
          team_id: suggestion.sideATeamId,
          player_id: playerId,
          side: "A",
        })),
        ...suggestion.sideBPlayerIds.map((playerId) => ({
          fixture_id: createdFixture.id,
          team_id: suggestion.sideBTeamId,
          player_id: playerId,
          side: "B",
        })),
      ];

      const { error: insertPlayersError } = await adminClient
        .from("fixture_players")
        .insert(fixturePlayers);

      if (insertPlayersError) {
        return jsonResponse({ error: insertPlayersError.message }, 400);
      }
    }

    return jsonResponse({
      createdCount: suggestions.length,
      playersPerSide,
      provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
