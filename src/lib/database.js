import { useEffect, useState } from "react";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase";
import { normalizePlayerCategory } from "../data/seed";

const EMPTY_DATABASE = {
  users: [],
  teams: [],
  players: [],
  games: [],
  sportsEvents: [],
  registrations: [],
  sportEventTeams: [],
  sportEventPlayers: [],
  sportEventEntries: [],
  eventFixtures: [],
  publicInterestSubmissions: [],
  appSettings: {
    publicRegistrationLocked: false,
    forceReauthAfter: null,
  },
};

function createFixtureAssignments(fixture) {
  const assignments = {
    A: [],
    B: [],
  };

  if (fixture.side_a_team_id) {
    assignments[fixture.side_a_team_id] = [];
  }

  if (fixture.side_b_team_id) {
    assignments[fixture.side_b_team_id] = [];
  }

  return assignments;
}

function mapSupabaseDatabase({
  assignmentRows,
  appSettingsRows,
  eventFixtureRows,
  eventEntryPlayerRows,
  eventEntryRows,
  fixturePlayerRows,
  gameModeratorRows,
  gameRows,
  playerRows,
  profileRows,
  registrationRows,
  sportEventPlayerRows,
  sportEventRows,
  sportEventTeamRows,
  teamRows,
}) {
  const users = profileRows.map((profile) => ({
    id: profile.user_id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
    teamId: profile.team_id,
  }));

  const appSettingsRow = appSettingsRows[0] ?? {};

  const players = playerRows.map((player) => ({
    id: player.id,
    name: player.name,
    villaNumber: player.villa_number,
    category: normalizePlayerCategory(player.category),
    teamId: player.team_id,
  }));

  const captainByTeamId = new Map(
    users
      .filter((user) => user.role === "captain" && user.teamId)
      .map((user) => [user.teamId, user.id]),
  );

  const teams = teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    captainUserId: captainByTeamId.get(team.id) ?? null,
  }));

  const games = gameRows.map((game) => ({
    id: game.id,
    title: game.title,
    fixtureLabel: game.fixture_label ?? "",
    venue: game.venue,
    date: game.game_date,
    scheduledStartAt: game.scheduled_start_at,
    scheduledEndAt: game.scheduled_end_at,
    status: game.status,
    resultSummary: game.result_summary ?? "",
    winnerTeamId: game.winner_team_id,
    moderatorUserIds: [],
    teamAId: game.team_a_id,
    teamBId: game.team_b_id,
    notes: game.notes ?? "",
    assignments: {
      [game.team_a_id]: [],
      [game.team_b_id]: [],
    },
  }));

  const gamesById = new Map(games.map((game) => [game.id, game]));

  assignmentRows.forEach((assignment) => {
    const targetGame = gamesById.get(assignment.game_id);
    if (!targetGame) {
      return;
    }

    if (!targetGame.assignments[assignment.team_id]) {
      targetGame.assignments[assignment.team_id] = [];
    }

    targetGame.assignments[assignment.team_id].push(assignment.player_id);
  });

  gameModeratorRows.forEach((assignment) => {
    const targetGame = gamesById.get(assignment.game_id);
    if (!targetGame) {
      return;
    }

    targetGame.moderatorUserIds.push(assignment.moderator_user_id);
  });

  const sportsEvents = sportEventRows.map((sportEvent) => ({
    id: sportEvent.id,
    name: sportEvent.name,
    sportType: sportEvent.sport_type ?? "General",
    eventCategory: sportEvent.event_category ?? "Open",
    venue: sportEvent.venue ?? "TBD",
    rules: sportEvent.rules ?? "",
    playersPerSide: sportEvent.players_per_side ?? 1,
    status: sportEvent.status ?? "draft",
    createdAt: sportEvent.created_at,
    updatedAt: sportEvent.updated_at ?? sportEvent.created_at,
  }));

  const sportEventTeams = sportEventTeamRows.map((row) => ({
    id: row.id,
    sportEventId: row.sport_event_id,
    teamId: row.team_id,
    side: row.side,
    createdAt: row.created_at,
  }));

  const sportEventPlayers = sportEventPlayerRows.map((row) => ({
    id: row.id,
    sportEventId: row.sport_event_id,
    teamId: row.team_id,
    playerId: row.player_id,
    side: row.side,
    createdAt: row.created_at,
  }));

  const sportEventEntries = eventEntryRows.map((entry) => ({
    id: entry.id,
    sportEventId: entry.sport_event_id,
    teamId: entry.team_id,
    createdAt: entry.created_at,
    playerIds: [],
  }));

  const sportEventEntriesById = new Map(
    sportEventEntries.map((entry) => [entry.id, entry]),
  );

  eventEntryPlayerRows.forEach((entryPlayer) => {
    const targetEntry = sportEventEntriesById.get(entryPlayer.entry_id);
    if (!targetEntry) {
      return;
    }

    targetEntry.playerIds.push(entryPlayer.player_id);
  });

  const eventFixtures = eventFixtureRows.map((fixture) => ({
    id: fixture.id,
    sportEventId: fixture.sport_event_id,
    fixtureNumber: fixture.fixture_number,
    label: fixture.label ?? "",
    fixtureDate: fixture.fixture_date ?? "",
    fixtureTime: typeof fixture.fixture_time === "string"
      ? fixture.fixture_time.slice(0, 5)
      : "",
    venue: fixture.venue ?? "TBD",
    status: fixture.status ?? "draft",
    winnerTeamId: fixture.winner_team_id ?? null,
    sideATeamId: fixture.side_a_team_id,
    sideBTeamId: fixture.side_b_team_id,
    sideASourceFixtureId: fixture.side_a_source_fixture_id ?? null,
    sideBSourceFixtureId: fixture.side_b_source_fixture_id ?? null,
    notes: fixture.notes ?? "",
    createdAt: fixture.created_at,
    updatedAt: fixture.updated_at ?? fixture.created_at,
    assignments: createFixtureAssignments(fixture),
  }));

  const eventFixturesById = new Map(eventFixtures.map((fixture) => [fixture.id, fixture]));

  fixturePlayerRows.forEach((row) => {
    const targetFixture = eventFixturesById.get(row.fixture_id);
    if (!targetFixture) {
      return;
    }

    if (!targetFixture.assignments[row.side]) {
      targetFixture.assignments[row.side] = [];
    }

    targetFixture.assignments[row.side].push(row.player_id);

    if (!targetFixture.assignments[row.team_id]) {
      targetFixture.assignments[row.team_id] = [];
    }

    targetFixture.assignments[row.team_id].push(row.player_id);
  });

  return {
    users,
    teams,
    players,
    games,
    sportsEvents,
    registrations: registrationRows.map((registration) => ({
      id: registration.id,
      sportEventId: registration.sport_event_id,
      teamId: registration.team_id,
      playerId: registration.player_id,
    })),
    sportEventTeams,
    sportEventPlayers,
    sportEventEntries,
    eventFixtures,
    publicInterestSubmissions: [],
    appSettings: {
      publicRegistrationLocked: Boolean(appSettingsRow.public_registration_locked),
      forceReauthAfter: appSettingsRow.force_reauth_after ?? null,
    },
  };
}

function mapPublicInterestSubmissions({
  submissionRows,
  submissionEventRows,
  sportsEvents,
  players,
}) {
  const sportsEventsById = new Map(sportsEvents.map((sportEvent) => [sportEvent.id, sportEvent]));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const submissions = submissionRows
    .map((submission) => ({
      id: submission.id,
      villaNumber: submission.villa_number,
      playerId: submission.player_id,
      playerName: submission.player_name,
      playerCategory: normalizePlayerCategory(submission.player_category),
      ipAddress: submission.ip_address ?? "",
      userAgent: submission.user_agent ?? "",
      createdAt: submission.created_at,
      sportEventIds: [],
    }))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

  const submissionsById = new Map(submissions.map((submission) => [submission.id, submission]));

  submissionEventRows.forEach((row) => {
    const targetSubmission = submissionsById.get(row.submission_id);
    if (!targetSubmission) {
      return;
    }

    targetSubmission.sportEventIds.push(row.sport_event_id);
  });

  const mergedSubmissionsByKey = new Map();

  submissions.forEach((submission) => {
    const personKey = [
      submission.villaNumber,
      submission.playerName.trim().toLowerCase(),
      submission.playerCategory.trim().toLowerCase(),
    ].join("::");

    if (!mergedSubmissionsByKey.has(personKey)) {
      mergedSubmissionsByKey.set(personKey, {
        ...submission,
        mergedSubmissionIds: [submission.id],
        sportEventIds: [...submission.sportEventIds],
      });
      return;
    }

    const mergedSubmission = mergedSubmissionsByKey.get(personKey);
    mergedSubmission.mergedSubmissionIds.push(submission.id);
    mergedSubmission.sportEventIds = Array.from(
      new Set([...mergedSubmission.sportEventIds, ...submission.sportEventIds]),
    );
  });

  return Array.from(mergedSubmissionsByKey.values()).map((submission) => ({
    ...submission,
    player:
      playersById.get(submission.playerId) ??
      null,
    sportEvents: submission.sportEventIds
      .map((sportEventId) => sportsEventsById.get(sportEventId))
      .filter(Boolean),
  }));
}

async function loadAdminPublicInterestSubmissions({ supabase, nextDatabase }) {
  const [submissionsResponse, submissionEventsResponse] = await Promise.all([
    supabase
      .from("public_event_interest_submissions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("public_event_interest_submission_events")
      .select("*"),
  ]);

  const interestError = submissionsResponse.error || submissionEventsResponse.error;
  if (interestError) {
    throw interestError;
  }

  return mapPublicInterestSubmissions({
    submissionRows: submissionsResponse.data ?? [],
    submissionEventRows: submissionEventsResponse.data ?? [],
    sportsEvents: nextDatabase.sportsEvents,
    players: nextDatabase.players,
  });
}

async function readSupabaseDatabase(client) {
  const [
    appSettingsResponse,
    profilesResponse,
    sportsEventsResponse,
    teamsResponse,
    playersResponse,
    gamesResponse,
    assignmentsResponse,
    registrationsResponse,
    gameModeratorsResponse,
    sportEventTeamsResponse,
    sportEventPlayersResponse,
    sportEventEntriesResponse,
    sportEventEntryPlayersResponse,
    fixturesResponse,
    fixturePlayersResponse,
  ] = await Promise.all([
    client.from("app_settings").select("*").eq("id", "global").maybeSingle(),
    client.from("profiles").select("*").order("full_name"),
    client.from("sports_events").select("*").order("name"),
    client.from("teams").select("*").order("name"),
    client.from("players").select("*").order("name"),
    client.from("games").select("*").order("game_date"),
    client.from("game_assignments").select("*"),
    client.from("sport_event_registrations").select("*"),
    client.from("game_moderators").select("*"),
    client.from("sport_event_teams").select("*"),
    client.from("sport_event_players").select("*"),
    client.from("sport_event_entries").select("*").order("created_at"),
    client.from("sport_event_entry_players").select("*").order("created_at"),
    client.from("fixtures").select("*").order("fixture_number"),
    client.from("fixture_players").select("*"),
  ]);

  const error =
    appSettingsResponse.error ||
    profilesResponse.error ||
    sportsEventsResponse.error ||
    teamsResponse.error ||
    playersResponse.error ||
    gamesResponse.error ||
    assignmentsResponse.error ||
    registrationsResponse.error ||
    gameModeratorsResponse.error ||
    sportEventTeamsResponse.error ||
    sportEventPlayersResponse.error ||
    sportEventEntriesResponse.error ||
    sportEventEntryPlayersResponse.error ||
    fixturesResponse.error ||
    fixturePlayersResponse.error;

  if (error) {
    throw error;
  }

  return mapSupabaseDatabase({
    assignmentRows: assignmentsResponse.data ?? [],
    appSettingsRows: appSettingsResponse.data ? [appSettingsResponse.data] : [],
    eventFixtureRows: fixturesResponse.data ?? [],
    eventEntryPlayerRows: sportEventEntryPlayersResponse.data ?? [],
    eventEntryRows: sportEventEntriesResponse.data ?? [],
    fixturePlayerRows: fixturePlayersResponse.data ?? [],
    gameModeratorRows: gameModeratorsResponse.data ?? [],
    gameRows: gamesResponse.data ?? [],
    playerRows: playersResponse.data ?? [],
    profileRows: profilesResponse.data ?? [],
    registrationRows: registrationsResponse.data ?? [],
    sportEventPlayerRows: sportEventPlayersResponse.data ?? [],
    sportEventRows: sportsEventsResponse.data ?? [],
    sportEventTeamRows: sportEventTeamsResponse.data ?? [],
    teamRows: teamsResponse.data ?? [],
  });
}

function mapEdgeFunctionError(functionError, data, functionName = "Edge Function") {
  if (data?.error) {
    return data.error;
  }

  const statusCode = functionError?.context?.status ?? functionError?.status ?? null;

  if (statusCode === 404 || String(functionError?.message ?? "").includes("404")) {
    return `The Supabase Edge Function \`${functionName}\` is not deployed yet. Deploy that function and try again.`;
  }

  if (!functionError?.message) {
    return "The request could not be completed.";
  }

  if (functionError.message.includes("Failed to send a request to the Edge Function")) {
    return `The app could not reach the Supabase Edge Function \`${functionName}\`. Deploy that function and try again.`;
  }

  return functionError.message;
}

export function useAuthSession() {
  const supabase = getSupabaseClient();
  const configured = hasSupabaseConfig();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) {
          return;
        }

        if (sessionError) {
          setError(sessionError.message);
        }

        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((sessionError) => {
        if (!active) {
          return;
        }

        setError(sessionError.message);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async ({ email, password }) => {
    if (!supabase) {
      return "Supabase environment variables are missing.";
    }

    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return signInError.message;
    }

    return "";
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw signOutError;
    }
  };

  return {
    configured,
    session,
    loading,
    error,
    signIn,
    signOut,
  };
}

export function usePublicInterestRegistration() {
  const supabase = getSupabaseClient();
  const configured = hasSupabaseConfig();
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [sportsEvents, setSportsEvents] = useState([]);
  const [appSettings, setAppSettings] = useState(EMPTY_DATABASE.appSettings);

  const refresh = async () => {
    if (!supabase) {
      setTeams([]);
      setPlayers([]);
      setSportsEvents([]);
      setAppSettings(EMPTY_DATABASE.appSettings);
      setError("Supabase is not configured.");
      return;
    }

    const [appSettingsResponse, teamsResponse, playersResponse, sportsEventsResponse] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", "global").maybeSingle(),
      supabase.from("teams").select("id, name").order("name"),
      supabase
        .from("players")
        .select("id, name, villa_number, category, team_id")
        .order("villa_number")
        .order("name"),
      supabase
        .from("sports_events")
        .select("id, name, sport_type, event_category, players_per_side, status, venue")
        .neq("status", "completed")
        .order("name"),
    ]);

    const publicError =
      appSettingsResponse.error ||
      teamsResponse.error ||
      playersResponse.error ||
      sportsEventsResponse.error;
    if (publicError) {
      throw publicError;
    }

    setAppSettings({
      publicRegistrationLocked: Boolean(appSettingsResponse.data?.public_registration_locked),
      forceReauthAfter: appSettingsResponse.data?.force_reauth_after ?? null,
    });
    setTeams(
      (teamsResponse.data ?? []).map((team) => ({
        id: team.id,
        name: team.name,
      })),
    );
    setPlayers(
      (playersResponse.data ?? []).map((player) => ({
        id: player.id,
        name: player.name,
        villaNumber: player.villa_number,
        category: normalizePlayerCategory(player.category),
        teamId: player.team_id,
      })),
    );
    setSportsEvents(
      (sportsEventsResponse.data ?? []).map((sportEvent) => ({
        id: sportEvent.id,
        name: sportEvent.name,
        sportType: sportEvent.sport_type ?? "General",
        eventCategory: sportEvent.event_category ?? "Open",
        playersPerSide: sportEvent.players_per_side ?? 1,
        status: sportEvent.status ?? "draft",
        venue: sportEvent.venue ?? "TBD",
      })),
    );
    setError("");
  };

  useEffect(() => {
    let active = true;

    async function loadPublicData() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await refresh();
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message ?? "Public registration data could not be loaded.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPublicData();

    return () => {
      active = false;
    };
  }, [supabase]);

  const submitInterest = async ({ villaNumber, playerId, sportEventIds }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    if (appSettings.publicRegistrationLocked) {
      throw new Error("Sports event registration is currently locked.");
    }

    const { data, error: functionError } = await supabase.functions.invoke(
      "submit-public-interest",
      {
        body: {
          villaNumber,
          playerId,
          sportEventIds,
        },
      },
    );

    if (functionError || data?.error) {
      throw new Error(mapEdgeFunctionError(functionError, data, "submit-public-interest"));
    }

    return data;
  };

  const getPlayerInterestSubmissions = async (playerDetails) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const normalizedPlayerId =
      typeof playerDetails === "string"
        ? String(playerDetails).trim()
        : String(playerDetails?.playerId ?? playerDetails?.id ?? "").trim();
    const normalizedVillaNumber =
      typeof playerDetails === "string"
        ? ""
        : String(playerDetails?.villaNumber ?? "").trim();
    const normalizedPlayerName =
      typeof playerDetails === "string"
        ? ""
        : String(playerDetails?.playerName ?? playerDetails?.name ?? "").trim();
    const normalizedPlayerCategory =
      typeof playerDetails === "string"
        ? ""
        : normalizePlayerCategory(playerDetails?.playerCategory ?? playerDetails?.category ?? "");

    if (!normalizedPlayerId && !normalizedVillaNumber && !normalizedPlayerName) {
      return [];
    }

    const { data, error: submissionsError } = await supabase
      .from("public_event_interest_submission_summary")
      .select("*")
      .eq("player_id", normalizedPlayerId)
      .order("created_at", { ascending: false });

    if (submissionsError) {
      throw submissionsError;
    }

    let rows = data ?? [];

    if (
      rows.length === 0 &&
      normalizedVillaNumber &&
      normalizedPlayerName &&
      normalizedPlayerCategory
    ) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("public_event_interest_submission_summary")
        .select("*")
        .eq("villa_number", normalizedVillaNumber)
        .eq("player_name", normalizedPlayerName)
        .eq("player_category", normalizedPlayerCategory)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        throw fallbackError;
      }

      rows = fallbackData ?? [];
    }

    const submissionsById = new Map();

    rows.forEach((row) => {
      if (!submissionsById.has(row.id)) {
        submissionsById.set(row.id, {
          id: row.id,
          villaNumber: row.villa_number,
          playerId: row.player_id,
          playerName: row.player_name,
          playerCategory: normalizePlayerCategory(row.player_category),
          createdAt: row.created_at,
          sportEvents: [],
        });
      }

      submissionsById.get(row.id).sportEvents.push({
        id: row.sport_event_id,
        name: row.sport_event_name,
        sportType: row.sport_type ?? "General",
        eventCategory: row.event_category ?? "Open",
        playersPerSide: row.players_per_side ?? 1,
      });
    });

    return Array.from(submissionsById.values());
  };

  return {
    configured,
    loading,
    error,
    teams,
    players,
    sportsEvents,
    appSettings,
    submitInterest,
    getPlayerInterestSubmissions,
    refresh,
  };
}

export function useAppDatabase(userId) {
  const supabase = getSupabaseClient();
  const [database, setDatabase] = useState(EMPTY_DATABASE);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const refresh = async () => {
    if (!supabase || !userId) {
      setDatabase(EMPTY_DATABASE);
      setViewerProfile(null);
      return;
    }

    const nextDatabase = await readSupabaseDatabase(supabase);
    const nextViewerProfile = nextDatabase.users.find((user) => user.id === userId) ?? null;

    if (["admin", "captain"].includes(nextViewerProfile?.role)) {
      nextDatabase.publicInterestSubmissions = await loadAdminPublicInterestSubmissions({
        supabase,
        nextDatabase,
      });
    }

    setDatabase(nextDatabase);
    setViewerProfile(nextViewerProfile);
    setError(
      nextViewerProfile
        ? ""
        : "Your account exists in Supabase Auth but no profile row was found. Run the supplied schema first.",
    );
  };

  useEffect(() => {
    let active = true;

    async function loadDatabase() {
      if (!supabase || !userId) {
        setDatabase(EMPTY_DATABASE);
        setViewerProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const nextDatabase = await readSupabaseDatabase(supabase);
        const nextViewerProfile =
          nextDatabase.users.find((user) => user.id === userId) ?? null;

        if (["admin", "captain"].includes(nextViewerProfile?.role)) {
          nextDatabase.publicInterestSubmissions = await loadAdminPublicInterestSubmissions({
            supabase,
            nextDatabase,
          });
        }

        if (!active) {
          return;
        }

        setDatabase(nextDatabase);
        setViewerProfile(nextViewerProfile);
        setError(
          nextViewerProfile
            ? ""
            : "Your account exists in Supabase Auth but no profile row was found. Run the supplied schema first.",
        );
      } catch (loadError) {
        if (!active) {
          return;
        }

        console.error("Supabase data load failed", loadError);
        setError(loadError.message ?? "App data could not be loaded from Supabase.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDatabase();

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const createUser = async ({ fullName, email, password, role, teamId }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error: functionError } = await supabase.functions.invoke(
      "create-staff",
      {
        body: {
          fullName,
          email,
          password,
          role,
          teamId: teamId || null,
        },
      },
    );

    if (functionError || data?.error) {
      throw new Error(mapEdgeFunctionError(functionError, data, "create-staff"));
    }

    await refresh();
  };

  const syncCaptainAssignment = async (teamId, captainUserId) => {
    const currentCaptains = database.users.filter((user) => user.role === "captain");
    const captainIdsToClear = currentCaptains
      .filter((user) => user.teamId === teamId && user.id !== captainUserId)
      .map((user) => user.id);
    const updates = [];

    if (captainIdsToClear.length > 0) {
      updates.push(
        supabase.from("profiles").update({ team_id: null }).in("user_id", captainIdsToClear),
      );
    }

    if (captainUserId) {
      updates.push(
        supabase.from("profiles").update({ team_id: teamId }).eq("user_id", captainUserId),
      );
    }

    const results = await Promise.all(updates);
    const failedUpdate = results.find((result) => result.error);
    if (failedUpdate?.error) {
      throw failedUpdate.error;
    }
  };

  const createTeam = async (name, captainUserId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data: teamRow, error: teamError } = await supabase
      .from("teams")
      .insert({ name })
      .select("id")
      .single();

    if (teamError) {
      throw teamError;
    }

    await syncCaptainAssignment(teamRow.id, captainUserId || null);
    await refresh();
  };

  const updateTeam = async ({ id, name, captainUserId }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: teamError } = await supabase.from("teams").update({ name }).eq("id", id);

    if (teamError) {
      throw teamError;
    }

    await syncCaptainAssignment(id, captainUserId || null);
    await refresh();
  };

  const deleteTeam = async (teamId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: teamError } = await supabase.from("teams").delete().eq("id", teamId);

    if (teamError) {
      throw teamError;
    }

    await refresh();
  };

  const addPlayer = async (player) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: playerError } = await supabase.from("players").insert({
      name: player.name,
      villa_number: player.villaNumber,
      category: normalizePlayerCategory(player.category),
      team_id: player.teamId,
    });

    if (playerError) {
      throw playerError;
    }

    await refresh();
  };

  const updatePlayer = async (player) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: playerError } = await supabase
      .from("players")
      .update({
        name: player.name,
        villa_number: player.villaNumber,
        category: normalizePlayerCategory(player.category),
        team_id: player.teamId,
      })
      .eq("id", player.id);

    if (playerError) {
      throw playerError;
    }

    await refresh();
  };

  const deletePlayer = async (playerId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: playerError } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (playerError) {
      throw playerError;
    }

    await refresh();
  };

  const createGame = async (game) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data: createdGame, error: gameError } = await supabase
      .from("games")
      .insert({
        title: game.title,
        fixture_label: game.fixtureLabel || "",
        venue: game.venue,
        game_date: game.date || null,
        scheduled_start_at: game.scheduledStartAt || null,
        scheduled_end_at: game.scheduledEndAt || null,
        status: game.status || "scheduled",
        result_summary: game.resultSummary || "",
        winner_team_id: game.winnerTeamId || null,
        team_a_id: game.teamAId,
        team_b_id: game.teamBId,
        notes: game.notes,
      })
      .select("id")
      .single();

    if (gameError || !createdGame) {
      throw gameError ?? new Error("Fixture could not be created.");
    }

    const sideAPlayerIds = Array.isArray(game.sideAPlayerIds) ? game.sideAPlayerIds : [];
    const sideBPlayerIds = Array.isArray(game.sideBPlayerIds) ? game.sideBPlayerIds : [];
    const assignmentRows = [
      ...sideAPlayerIds.map((playerId) => ({
        game_id: createdGame.id,
        team_id: game.teamAId,
        player_id: playerId,
      })),
      ...sideBPlayerIds.map((playerId) => ({
        game_id: createdGame.id,
        team_id: game.teamBId,
        player_id: playerId,
      })),
    ];

    if (assignmentRows.length > 0) {
      const { error: assignmentError } = await supabase
        .from("game_assignments")
        .insert(assignmentRows);

      if (assignmentError) {
        throw assignmentError;
      }
    }

    await refresh();
  };

  const createSportEvent = async (sportEvent) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: sportEventError } = await supabase.from("sports_events").insert({
      name: sportEvent.name,
      sport_type: sportEvent.sportType,
      event_category: sportEvent.eventCategory || "Open",
      venue: sportEvent.venue,
      rules: sportEvent.rules || "",
      players_per_side: sportEvent.playersPerSide,
      status: sportEvent.status,
    });

    if (sportEventError) {
      throw sportEventError;
    }

    await refresh();
  };

  const updateSportEvent = async (sportEvent) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: sportEventError } = await supabase
      .from("sports_events")
      .update({
        name: sportEvent.name,
        sport_type: sportEvent.sportType,
        event_category: sportEvent.eventCategory || "Open",
        venue: sportEvent.venue,
        rules: sportEvent.rules || "",
        players_per_side: sportEvent.playersPerSide,
        status: sportEvent.status,
      })
      .eq("id", sportEvent.id);

    if (sportEventError) {
      throw sportEventError;
    }

    if (sportEvent.previousName && sportEvent.previousName !== sportEvent.name) {
      const { error: gameUpdateError } = await supabase
        .from("games")
        .update({ title: sportEvent.name })
        .eq("title", sportEvent.previousName);

      if (gameUpdateError) {
        throw gameUpdateError;
      }
    }

    await refresh();
  };

  const deleteSportEvent = async ({ id }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: sportEventError } = await supabase
      .from("sports_events")
      .delete()
      .eq("id", id);

    if (sportEventError) {
      throw sportEventError;
    }

    await refresh();
  };

  const syncSportEventTeams = async ({ sportEventId, assignments }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const normalizedAssignments = assignments
      .filter((assignment) => assignment.teamId && assignment.side)
      .map((assignment) => ({
        sport_event_id: sportEventId,
        team_id: assignment.teamId,
        side: assignment.side,
      }));

    const currentRows = database.sportEventTeams.filter(
      (assignment) => assignment.sportEventId === sportEventId,
    );
    const currentByTeamId = new Map(currentRows.map((row) => [row.teamId, row]));
    const desiredByTeamId = new Map(normalizedAssignments.map((row) => [row.team_id, row]));
    const teamIdsToDelete = currentRows
      .filter((row) => !desiredByTeamId.has(row.teamId))
      .map((row) => row.teamId);

    if (teamIdsToDelete.length > 0) {
      const { error: deletePlayersError } = await supabase
        .from("sport_event_players")
        .delete()
        .eq("sport_event_id", sportEventId)
        .in("team_id", teamIdsToDelete);

      if (deletePlayersError) {
        throw deletePlayersError;
      }

      const { error: deleteLegacyRegistrationsError } = await supabase
        .from("sport_event_registrations")
        .delete()
        .eq("sport_event_id", sportEventId)
        .in("team_id", teamIdsToDelete);

      if (deleteLegacyRegistrationsError) {
        throw deleteLegacyRegistrationsError;
      }

      const { error: deleteTeamsError } = await supabase
        .from("sport_event_teams")
        .delete()
        .eq("sport_event_id", sportEventId)
        .in("team_id", teamIdsToDelete);

      if (deleteTeamsError) {
        throw deleteTeamsError;
      }
    }

    const rowsToInsert = normalizedAssignments.filter(
      (row) => !currentByTeamId.has(row.team_id),
    );
    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("sport_event_teams").insert(rowsToInsert);
      if (insertError) {
        throw insertError;
      }
    }

    const updates = normalizedAssignments
      .filter((row) => currentByTeamId.get(row.team_id)?.side !== row.side)
      .map((row) =>
        Promise.all([
          supabase
            .from("sport_event_teams")
            .update({ side: row.side })
            .eq("sport_event_id", sportEventId)
            .eq("team_id", row.team_id),
          supabase
            .from("sport_event_players")
            .update({ side: row.side })
            .eq("sport_event_id", sportEventId)
            .eq("team_id", row.team_id),
        ]),
      );

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const failedResult = results.flat().find((result) => result.error);
      if (failedResult?.error) {
        throw failedResult.error;
      }
    }

    await refresh();
  };

  const toggleSportEventPlayer = async ({ sportEventId, teamId, playerId, side }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const existingSelection = await supabase
      .from("sport_event_players")
      .select("id")
      .eq("sport_event_id", sportEventId)
      .eq("team_id", teamId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (existingSelection.error) {
      throw existingSelection.error;
    }

    if (existingSelection.data) {
      const { error: deleteError } = await supabase
        .from("sport_event_players")
        .delete()
        .eq("id", existingSelection.data.id);

      if (deleteError) {
        throw deleteError;
      }

      const { error: deleteLegacyError } = await supabase
        .from("sport_event_registrations")
        .delete()
        .eq("sport_event_id", sportEventId)
        .eq("player_id", playerId);

      if (deleteLegacyError) {
        throw deleteLegacyError;
      }
    } else {
      const { error: insertError } = await supabase.from("sport_event_players").insert({
        sport_event_id: sportEventId,
        team_id: teamId,
        player_id: playerId,
        side,
      });

      if (insertError) {
        throw insertError;
      }

      const { error: upsertLegacyError } = await supabase
        .from("sport_event_registrations")
        .upsert(
          {
            sport_event_id: sportEventId,
            team_id: teamId,
            player_id: playerId,
          },
          { onConflict: "sport_event_id,player_id" },
        );

      if (upsertLegacyError) {
        throw upsertLegacyError;
      }
    }

    await refresh();
  };

  const createSportEventEntry = async ({ sportEventId, teamId, playerIds }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const sportEvent = database.sportsEvents.find((event) => event.id === sportEventId);
    if (!sportEvent) {
      throw new Error("Choose a valid sport event first.");
    }

    if (!teamId) {
      throw new Error("Choose a team first.");
    }

    const existingFixtures = database.eventFixtures.filter(
      (fixture) => fixture.sportEventId === sportEventId,
    );
    if (existingFixtures.length > 0) {
      throw new Error("Fixtures already exist for this event. Delete all saved entries to reset and create again.");
    }

    const normalizedPlayerIds = Array.from(
      new Set(
        playerIds
          .map((playerId) => String(playerId ?? "").trim())
          .filter(Boolean),
      ),
    );

    if (normalizedPlayerIds.length !== sportEvent.playersPerSide) {
      throw new Error(
        `This event needs exactly ${sportEvent.playersPerSide} player${sportEvent.playersPerSide === 1 ? "" : "s"} in one entry.`,
      );
    }

    const teamPlayers = database.players.filter((player) => player.teamId === teamId);
    const validTeamPlayerIds = new Set(teamPlayers.map((player) => player.id));
    const hasInvalidPlayer = normalizedPlayerIds.some((playerId) => !validTeamPlayerIds.has(playerId));
    if (hasInvalidPlayer) {
      throw new Error("All selected players must belong to the chosen team.");
    }

    const existingEntriesForTeam = database.sportEventEntries.filter(
      (entry) => entry.sportEventId === sportEventId && entry.teamId === teamId,
    );
    const alreadyRegisteredPlayerIds = new Set(
      existingEntriesForTeam.flatMap((entry) => entry.playerIds),
    );

    const duplicatePlayer = normalizedPlayerIds.find((playerId) =>
      alreadyRegisteredPlayerIds.has(playerId),
    );
    if (duplicatePlayer) {
      throw new Error("One or more selected players are already used in another entry for this team.");
    }

    const { data: createdEntry, error: createEntryError } = await supabase
      .from("sport_event_entries")
      .insert({
        sport_event_id: sportEventId,
        team_id: teamId,
      })
      .select("id")
      .single();

    if (createEntryError || !createdEntry) {
      throw createEntryError ?? new Error("The registration entry could not be created.");
    }

    const { error: createEntryPlayersError } = await supabase
      .from("sport_event_entry_players")
      .insert(
        normalizedPlayerIds.map((playerId) => ({
          entry_id: createdEntry.id,
          player_id: playerId,
        })),
      );

    if (createEntryPlayersError) {
      throw createEntryPlayersError;
    }

    await refresh();
  };

  const createEventFixture = async ({
    sportEventId,
    label,
    fixtureDate,
    fixtureTime,
    venue,
    status,
    winnerTeamId,
    notes,
    sideAEntryId,
    sideBEntryId,
  }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const sportEvent = database.sportsEvents.find((event) => event.id === sportEventId);
    if (!sportEvent) {
      throw new Error("Choose a valid sport event first.");
    }

    const sideAEntry = database.sportEventEntries.find((entry) => entry.id === sideAEntryId);
    const sideBEntry = database.sportEventEntries.find((entry) => entry.id === sideBEntryId);

    if (!sideAEntry || !sideBEntry) {
      throw new Error("Choose valid saved entries for both sides.");
    }

    if (sideAEntry.sportEventId !== sportEventId || sideBEntry.sportEventId !== sportEventId) {
      throw new Error("Both entries must belong to the selected sport event.");
    }

    if (sideAEntry.id === sideBEntry.id) {
      throw new Error("Choose two different saved entries.");
    }

    if (sideAEntry.teamId === sideBEntry.teamId) {
      throw new Error("A fixture needs entries from two different teams.");
    }

    const normalizedWinnerTeamId = winnerTeamId || null;
    if (
      normalizedWinnerTeamId &&
      normalizedWinnerTeamId !== sideAEntry.teamId &&
      normalizedWinnerTeamId !== sideBEntry.teamId
    ) {
      throw new Error("Winner must match Entry A or Entry B.");
    }

    const eventFixtures = database.eventFixtures.filter(
      (fixture) => fixture.sportEventId === sportEventId,
    );
    const nextFixtureNumber =
      Math.max(0, ...eventFixtures.map((fixture) => fixture.fixtureNumber ?? 0)) + 1;

    const { data: createdFixture, error: createFixtureError } = await supabase
      .from("fixtures")
      .insert({
        sport_event_id: sportEventId,
        fixture_number: nextFixtureNumber,
        label: label?.trim() || `Fixture ${nextFixtureNumber}`,
        fixture_date: fixtureDate || null,
        fixture_time: fixtureTime || null,
        venue: venue?.trim() || "TBD",
        status: status || "draft",
        winner_team_id: normalizedWinnerTeamId,
        side_a_team_id: sideAEntry.teamId,
        side_b_team_id: sideBEntry.teamId,
        side_a_source_fixture_id: null,
        side_b_source_fixture_id: null,
        notes: notes?.trim() || "",
      })
      .select("id")
      .single();

    if (createFixtureError || !createdFixture) {
      throw createFixtureError ?? new Error("Fixture could not be created.");
    }

    const fixturePlayers = [
      ...sideAEntry.playerIds.map((playerId) => ({
        fixture_id: createdFixture.id,
        team_id: sideAEntry.teamId,
        player_id: playerId,
        side: "A",
      })),
      ...sideBEntry.playerIds.map((playerId) => ({
        fixture_id: createdFixture.id,
        team_id: sideBEntry.teamId,
        player_id: playerId,
        side: "B",
      })),
    ];

    const { error: fixturePlayersError } = await supabase
      .from("fixture_players")
      .insert(fixturePlayers);

    if (fixturePlayersError) {
      throw fixturePlayersError;
    }

    await refresh();
  };

  const updateEventFixture = async ({
    id,
    label,
    fixtureDate,
    fixtureTime,
    venue,
    status,
    winnerTeamId,
    notes,
    sideAEntryId,
    sideBEntryId,
  }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const existingFixture = database.eventFixtures.find((fixture) => fixture.id === id);
    if (!existingFixture) {
      throw new Error("The selected fixture was not found.");
    }

    const sideAEntry = database.sportEventEntries.find((entry) => entry.id === sideAEntryId);
    const sideBEntry = database.sportEventEntries.find((entry) => entry.id === sideBEntryId);

    if (!sideAEntry || !sideBEntry) {
      throw new Error("Choose valid saved entries for both sides.");
    }

    if (
      sideAEntry.sportEventId !== existingFixture.sportEventId ||
      sideBEntry.sportEventId !== existingFixture.sportEventId
    ) {
      throw new Error("Both entries must belong to the same sport event as this fixture.");
    }

    if (sideAEntry.id === sideBEntry.id) {
      throw new Error("Choose two different saved entries.");
    }

    if (sideAEntry.teamId === sideBEntry.teamId) {
      throw new Error("A fixture needs entries from two different teams.");
    }

    const normalizedWinnerTeamId = winnerTeamId || null;
    if (
      normalizedWinnerTeamId &&
      normalizedWinnerTeamId !== sideAEntry.teamId &&
      normalizedWinnerTeamId !== sideBEntry.teamId
    ) {
      throw new Error("Winner must match Entry A or Entry B.");
    }

    const { error: updateFixtureError } = await supabase
      .from("fixtures")
      .update({
        label: label?.trim() || existingFixture.label || `Fixture ${existingFixture.fixtureNumber}`,
        fixture_date: fixtureDate || null,
        fixture_time: fixtureTime || null,
        venue: venue?.trim() || "TBD",
        status: status || "draft",
        winner_team_id: normalizedWinnerTeamId,
        side_a_team_id: sideAEntry.teamId,
        side_b_team_id: sideBEntry.teamId,
        side_a_source_fixture_id: null,
        side_b_source_fixture_id: null,
        notes: notes?.trim() || "",
      })
      .eq("id", id);

    if (updateFixtureError) {
      throw updateFixtureError;
    }

    const { error: deletePlayersError } = await supabase
      .from("fixture_players")
      .delete()
      .eq("fixture_id", id);

    if (deletePlayersError) {
      throw deletePlayersError;
    }

    const fixturePlayers = [
      ...sideAEntry.playerIds.map((playerId) => ({
        fixture_id: id,
        team_id: sideAEntry.teamId,
        player_id: playerId,
        side: "A",
      })),
      ...sideBEntry.playerIds.map((playerId) => ({
        fixture_id: id,
        team_id: sideBEntry.teamId,
        player_id: playerId,
        side: "B",
      })),
    ];

    const { error: fixturePlayersError } = await supabase
      .from("fixture_players")
      .insert(fixturePlayers);

    if (fixturePlayersError) {
      throw fixturePlayersError;
    }

    await refresh();
  };

  const deleteEventFixture = async (fixtureId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: deleteFixtureError } = await supabase
      .from("fixtures")
      .delete()
      .eq("id", fixtureId);

    if (deleteFixtureError) {
      throw deleteFixtureError;
    }

    await refresh();
  };

  const deleteSportEventEntry = async (entryId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const entry = database.sportEventEntries.find((item) => item.id === entryId);
    if (!entry) {
      throw new Error("The selected registration entry was not found.");
    }

    const { error: deleteEntryError } = await supabase
      .from("sport_event_entries")
      .delete()
      .eq("id", entryId);

    if (deleteEntryError) {
      throw deleteEntryError;
    }

    const remainingEntries = database.sportEventEntries.filter(
      (item) => item.id !== entryId && item.sportEventId === entry.sportEventId,
    );

    if (remainingEntries.length === 0) {
      const { error: deleteFixturesError } = await supabase
        .from("fixtures")
        .delete()
        .eq("sport_event_id", entry.sportEventId);

      if (deleteFixturesError) {
        throw deleteFixturesError;
      }
    }

    await refresh();
  };

  const updatePublicInterestSubmission = async ({
    id,
    villaNumber,
    playerId,
    sportEventIds,
  }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const existingSubmission = database.publicInterestSubmissions.find(
      (submission) => submission.id === id,
    );
    if (!existingSubmission) {
      throw new Error("The selected submission was not found.");
    }

    const normalizedVillaNumber = String(villaNumber ?? "").trim();
    const normalizedPlayerId = String(playerId ?? "").trim();
    const normalizedSportEventIds = Array.from(
      new Set(
        sportEventIds
          .map((sportEventId) => String(sportEventId ?? "").trim())
          .filter(Boolean),
      ),
    );

    if (!normalizedVillaNumber || !normalizedPlayerId) {
      throw new Error("Choose a villa number and player.");
    }

    if (normalizedSportEventIds.length === 0) {
      throw new Error("Choose at least one sports event.");
    }

    const selectedPlayer = database.players.find((player) => player.id === normalizedPlayerId);
    if (!selectedPlayer) {
      throw new Error("Choose a valid player.");
    }

    const conflictingSubmission = database.publicInterestSubmissions.find(
      (submission) =>
        submission.playerId === normalizedPlayerId && submission.id !== existingSubmission.id,
    );
    if (conflictingSubmission) {
      throw new Error("This player already has a submitted entry. Edit that entry instead.");
    }

    if (selectedPlayer.villaNumber !== normalizedVillaNumber) {
      throw new Error("Villa number must match the selected player.");
    }

    const invalidSportEventId = normalizedSportEventIds.find(
      (sportEventId) =>
        !database.sportsEvents.some((sportEvent) => sportEvent.id === sportEventId),
    );
    if (invalidSportEventId) {
      throw new Error("Choose valid sports events.");
    }

    const duplicateSubmissionIds = (existingSubmission.mergedSubmissionIds ?? []).filter(
      (submissionId) => submissionId !== existingSubmission.id,
    );

    if (duplicateSubmissionIds.length > 0) {
      const { error: deleteDuplicateSubmissionsError } = await supabase
        .from("public_event_interest_submissions")
        .delete()
        .in("id", duplicateSubmissionIds);

      if (deleteDuplicateSubmissionsError) {
        throw deleteDuplicateSubmissionsError;
      }
    }

    const { error: updateSubmissionError } = await supabase
      .from("public_event_interest_submissions")
      .update({
        villa_number: normalizedVillaNumber,
        player_id: selectedPlayer.id,
        player_name: selectedPlayer.name,
        player_category: selectedPlayer.category,
      })
      .eq("id", existingSubmission.id);

    if (updateSubmissionError) {
      throw updateSubmissionError;
    }

    const { error: deleteEventLinksError } = await supabase
      .from("public_event_interest_submission_events")
      .delete()
      .eq("submission_id", existingSubmission.id);

    if (deleteEventLinksError) {
      throw deleteEventLinksError;
    }

    const { error: insertEventLinksError } = await supabase
      .from("public_event_interest_submission_events")
      .insert(
        normalizedSportEventIds.map((sportEventId) => ({
          submission_id: existingSubmission.id,
          sport_event_id: sportEventId,
        })),
      );

    if (insertEventLinksError) {
      throw insertEventLinksError;
    }

    await refresh();
  };

  const deletePublicInterestSubmission = async (submissionId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const existingSubmission = database.publicInterestSubmissions.find(
      (submission) => submission.id === submissionId,
    );
    if (!existingSubmission) {
      throw new Error("The selected submission was not found.");
    }

    const submissionIdsToDelete = existingSubmission.mergedSubmissionIds ?? [existingSubmission.id];
    const { error: deleteSubmissionError } = await supabase
      .from("public_event_interest_submissions")
      .delete()
      .in("id", submissionIdsToDelete);

    if (deleteSubmissionError) {
      throw deleteSubmissionError;
    }

    await refresh();
  };

  const updateAppSettings = async (nextAppSettings) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { publicRegistrationLocked, forceReauthAfter } = nextAppSettings;
    const nextSettings = {
      public_registration_locked: Boolean(publicRegistrationLocked),
    };

    if (Object.prototype.hasOwnProperty.call(nextAppSettings ?? {}, "forceReauthAfter")) {
      nextSettings.force_reauth_after =
        typeof forceReauthAfter === "string" && forceReauthAfter.trim().length > 0
          ? forceReauthAfter
          : null;
    }

    const { error: updateSettingsError } = await supabase
      .from("app_settings")
      .update(nextSettings)
      .eq("id", "global");

    if (updateSettingsError) {
      throw updateSettingsError;
    }

    await refresh();
  };

  const generateFixturesFromAi = async ({ sportEventId }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const sportEvent = database.sportsEvents.find((event) => event.id === sportEventId);
    if (!sportEvent) {
      throw new Error("Choose a valid sport event first.");
    }

    const existingFixtures = database.eventFixtures.filter(
      (fixture) => fixture.sportEventId === sportEventId,
    );
    if (existingFixtures.length > 0) {
      throw new Error("Fixtures are already generated for this event. Delete all saved entries to reset and generate again.");
    }

    const entries = database.sportEventEntries
      .filter((entry) => entry.sportEventId === sportEventId)
      .map((entry) => ({
        ...entry,
        createdAtValue: new Date(entry.createdAt).getTime(),
      }))
      .sort((left, right) => left.createdAtValue - right.createdAtValue);

    if (entries.length < 2) {
      throw new Error("Add at least two saved entries before generating fixtures.");
    }

    const selectInitialPairs = (allEntries) => {
      const availableEntries = [...allEntries];
      const pairings = [];

      while (availableEntries.length >= 2) {
        const remainingByTeam = new Map();
        availableEntries.forEach((entry) => {
          remainingByTeam.set(entry.teamId, (remainingByTeam.get(entry.teamId) ?? 0) + 1);
        });

        availableEntries.sort((left, right) => {
          const leftCount = remainingByTeam.get(left.teamId) ?? 0;
          const rightCount = remainingByTeam.get(right.teamId) ?? 0;
          if (leftCount !== rightCount) {
            return rightCount - leftCount;
          }
          return left.createdAtValue - right.createdAtValue;
        });

        const leftEntry = availableEntries.shift();
        if (!leftEntry) {
          break;
        }

        const rightIndex = availableEntries.findIndex((entry) => entry.teamId !== leftEntry.teamId);
        if (rightIndex < 0) {
          availableEntries.push(leftEntry);
          break;
        }

        const [rightEntry] = availableEntries.splice(rightIndex, 1);
        if (!rightEntry) {
          availableEntries.push(leftEntry);
          break;
        }

        pairings.push({
          leftEntry,
          rightEntry,
        });
      }

      return {
        pairings,
        unmatchedEntries: availableEntries,
      };
    };

    const { pairings, unmatchedEntries } = selectInitialPairs(entries);

    if (pairings.length === 0) {
      throw new Error("No cross-team fixtures could be generated from the saved entries. Create the remaining fixtures manually.");
    }

    const createFixtureRecord = async ({ fixtureNumber, label, sideAEntry, sideBEntry, notes }) => {
      const { data: createdFixture, error: createFixtureError } = await supabase
        .from("fixtures")
        .insert({
          sport_event_id: sportEventId,
          fixture_number: fixtureNumber,
          label,
          venue: sportEvent.venue?.trim() || "TBD",
          status: "draft",
          side_a_team_id: sideAEntry.teamId,
          side_b_team_id: sideBEntry.teamId,
          side_a_source_fixture_id: null,
          side_b_source_fixture_id: null,
          notes,
        })
        .select("id")
        .single();

      if (createFixtureError || !createdFixture) {
        throw createFixtureError ?? new Error("A generated fixture could not be saved.");
      }

      const fixturePlayers = [
        ...sideAEntry.playerIds.map((playerId) => ({
          fixture_id: createdFixture.id,
          team_id: sideAEntry.teamId,
          player_id: playerId,
          side: "A",
        })),
        ...sideBEntry.playerIds.map((playerId) => ({
          fixture_id: createdFixture.id,
          team_id: sideBEntry.teamId,
          player_id: playerId,
          side: "B",
        })),
      ];

      const { error: createFixturePlayersError } = await supabase
        .from("fixture_players")
        .insert(fixturePlayers);

      if (createFixturePlayersError) {
        throw createFixturePlayersError;
      }

      return createdFixture.id;
    };

    let fixtureNumber = 1;

    for (const [index, pairing] of pairings.entries()) {
      await createFixtureRecord({
        fixtureNumber,
        label: `Fixture ${index + 1}`,
        sideAEntry: pairing.leftEntry,
        sideBEntry: pairing.rightEntry,
        notes: "Generated from saved team entries. Remaining fixtures can be created manually.",
      });
      fixtureNumber += 1;
    }

    await refresh();

    return {
      createdCount: pairings.length,
      remainingEntryCount: unmatchedEntries.length,
      provider: "entries",
    };
  };

  const updateGame = async (game) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: gameError } = await supabase
      .from("games")
      .update({
        title: game.title,
        fixture_label: game.fixtureLabel || "",
        venue: game.venue,
        game_date: game.date || null,
        scheduled_start_at: game.scheduledStartAt || null,
        scheduled_end_at: game.scheduledEndAt || null,
        status: game.status || "scheduled",
        result_summary: game.resultSummary || "",
        winner_team_id: game.winnerTeamId || null,
        team_a_id: game.teamAId,
        team_b_id: game.teamBId,
        notes: game.notes,
      })
      .eq("id", game.id);

    if (gameError) {
      throw gameError;
    }

    await refresh();
  };

  const deleteGame = async (gameId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error: gameError } = await supabase.from("games").delete().eq("id", gameId);

    if (gameError) {
      throw gameError;
    }

    await refresh();
  };

  const toggleAssignment = async (gameId, teamId, playerId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const existingAssignment = await supabase
      .from("game_assignments")
      .select("id")
      .eq("game_id", gameId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (existingAssignment.error) {
      throw existingAssignment.error;
    }

    if (existingAssignment.data) {
      const { error: deleteError } = await supabase
        .from("game_assignments")
        .delete()
        .eq("id", existingAssignment.data.id);

      if (deleteError) {
        throw deleteError;
      }
    } else {
      const { error: insertError } = await supabase.from("game_assignments").insert({
        game_id: gameId,
        team_id: teamId,
        player_id: playerId,
      });

      if (insertError) {
        throw insertError;
      }
    }

    await refresh();
  };

  return {
    database,
    viewerProfile,
    loading,
    error,
    createUser,
    createTeam,
    updateTeam,
    deleteTeam,
    addPlayer,
    updatePlayer,
    deletePlayer,
    createGame,
    createSportEvent,
    updateSportEvent,
    deleteSportEvent,
    createEventFixture,
    updateEventFixture,
    deleteEventFixture,
    createSportEventEntry,
    deleteSportEventEntry,
    updatePublicInterestSubmission,
    deletePublicInterestSubmission,
    updateAppSettings,
    syncSportEventTeams,
    toggleSportEventPlayer,
    generateFixturesFromAi,
    updateGame,
    deleteGame,
    toggleAssignment,
  };
}
