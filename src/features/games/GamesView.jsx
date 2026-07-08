import { useEffect, useMemo, useState } from "react";
import SectionTitle from "../../components/SectionTitle";
import {
  EVENT_CATEGORY_OPTIONS,
  SPORTS_EVENT_OPTIONS,
  SPORT_EVENT_TEMPLATES,
  normalizePlayerCategory,
} from "../../data/seed";

const EMPTY_GAME_FORM = {
  title: "",
  fixtureLabel: "",
  venue: "",
  date: "",
  scheduledStartAt: "",
  scheduledEndAt: "",
  status: "scheduled",
  resultSummary: "",
  winnerTeamId: "",
  teamAId: "",
  teamBId: "",
  notes: "",
};

const EMPTY_SPORT_EVENT_FORM = {
  name: "",
  sportType: "",
  eventCategory: "Open",
  venue: "TBD",
  rules: "",
  playersPerSide: "1",
  status: "draft",
};

function normalizeEventEligibilityCategory(category) {
  const normalized = String(category ?? "").trim().toLowerCase();

  if (normalized === "mens" || normalized === "men" || normalized === "gents") {
    return "gents";
  }

  if (normalized === "ladies" || normalized === "women") {
    return "ladies";
  }

  if (normalized === "boys" || normalized === "jr boys" || normalized === "jr. boys") {
    return "boys";
  }

  if (normalized === "girls" || normalized === "jr girls" || normalized === "jr. girls") {
    return "girls";
  }

  return normalized;
}

function isPlayerEligibleForEvent(playerCategory, eventCategory) {
  const normalizedPlayerCategory = normalizeEventEligibilityCategory(
    normalizePlayerCategory(playerCategory),
  );
  const normalizedEventCategory = String(eventCategory ?? "").trim().toLowerCase();

  if (!normalizedEventCategory || normalizedEventCategory === "open") {
    return true;
  }

  if (normalizedEventCategory.includes("kids mixed")) {
    return normalizedPlayerCategory === "boys" || normalizedPlayerCategory === "girls";
  }

  if (normalizedEventCategory.includes("kids")) {
    return normalizedPlayerCategory === "boys" || normalizedPlayerCategory === "girls";
  }

  if (normalizedEventCategory.includes("adults")) {
    return normalizedPlayerCategory === "gents" || normalizedPlayerCategory === "ladies";
  }

  if (normalizedEventCategory.includes("gents")) {
    return normalizedPlayerCategory === "gents";
  }

  if (normalizedEventCategory.includes("ladies")) {
    return normalizedPlayerCategory === "ladies";
  }

  if (normalizedEventCategory.includes("boys")) {
    return normalizedPlayerCategory === "boys";
  }

  if (normalizedEventCategory.includes("girls")) {
    return normalizedPlayerCategory === "girls";
  }

  return true;
}

function createEmptyGameForm(teams) {
  return {
    ...EMPTY_GAME_FORM,
    teamAId: teams[0]?.id ?? "",
    teamBId: teams[1]?.id ?? teams[0]?.id ?? "",
  };
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function createGameFormFromGame(game) {
  return {
    title: game.title,
    fixtureLabel: game.fixtureLabel ?? "",
    venue: game.venue,
    date: game.date ?? "",
    scheduledStartAt: toDateTimeLocalValue(game.scheduledStartAt),
    scheduledEndAt: toDateTimeLocalValue(game.scheduledEndAt),
    status: game.status ?? "scheduled",
    resultSummary: game.resultSummary ?? "",
    winnerTeamId: game.winnerTeamId ?? "",
    teamAId: game.teamAId,
    teamBId: game.teamBId,
    notes: game.notes ?? "",
  };
}

function createSportEventFormFromEvent(sportEvent) {
  return {
    name: sportEvent.name,
    sportType: sportEvent.sportType,
    eventCategory: sportEvent.eventCategory ?? "Open",
    venue: sportEvent.venue,
    rules: sportEvent.rules ?? "",
    playersPerSide: String(sportEvent.playersPerSide),
    status: sportEvent.status,
  };
}

function RulesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 3h9l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm8 1.5V9h4.5L14 4.5zM8 12h8v1.8H8V12zm0 3.8h8v1.8H8v-1.8zm0-7.6h4.5V10H8V8.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function getFixtureHeading(game) {
  return game.fixtureLabel ? `${game.title} - ${game.fixtureLabel}` : game.title;
}

function formatStatusLabel(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getPlayerSummary(players) {
  if (players.length === 0) {
    return "No players selected";
  }

  return players.map((player) => player.name).join(", ");
}

function getEntryButtonLabel(playersPerSide) {
  if (playersPerSide === 1) {
    return "Add player";
  }

  if (playersPerSide === 2) {
    return "Add pair";
  }

  return "Add entry";
}

function getEntryOptionLabel(entry, playersById, teamsById) {
  const teamName = teamsById.get(entry.teamId)?.name ?? "Unknown team";
  const playerNames = entry.playerIds
    .map((playerId) => playersById.get(playerId)?.name)
    .filter(Boolean)
    .join(", ");

  return `${teamName}: ${playerNames || "Players not found"}`;
}

function EventRegistrationEntryList({
  entries,
  playersById,
  teamsById,
  onDeleteEntry,
}) {
  if (entries.length === 0) {
    return <p className="empty-note">No saved team entries for this sport event yet.</p>;
  }

  return (
    <div className="overview-list compact-overview-list">
      {entries.map((entry, index) => {
        const names = entry.playerIds
          .map((playerId) => playersById.get(playerId)?.name)
          .filter(Boolean)
          .join(", ");

        return (
          <article key={entry.id} className="overview-item">
            <div>
              <h4>Entry {index + 1}</h4>
              <p>{teamsById?.get(entry.teamId)?.name ?? "Unknown team"}</p>
              <p>{names || "Players not found"}</p>
            </div>
            <div className="table-actions">
              <button
                type="button"
                className="danger-button inline-button"
                onClick={() => onDeleteEntry(entry.id)}
              >
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AssignmentColumn({
  team,
  teamPlayers,
  selectedPlayers,
  editable,
  onTogglePlayer,
}) {
  const [managing, setManaging] = useState(false);
  const assignedPlayers = useMemo(
    () => teamPlayers.filter((player) => selectedPlayers.includes(player.id)),
    [selectedPlayers, teamPlayers],
  );

  return (
    <div className="assignment-column">
      <div className="assignment-header">
        <div>
          <h5>{team?.name ?? "Team not found"}</h5>
          <p className="assignment-subtitle">
            {selectedPlayers.length > 0
              ? `${selectedPlayers.length} participant${selectedPlayers.length === 1 ? "" : "s"} selected`
              : "No participants selected yet"}
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            className="ghost-button inline-button"
            onClick={() => setManaging((current) => !current)}
          >
            {managing ? "Hide roster" : "Manage lineup"}
          </button>
        ) : null}
      </div>
      {managing && editable ? (
        <div className="assignment-list">
          {teamPlayers.map((player) => {
            const selected = selectedPlayers.includes(player.id);

            return (
              <label
                key={player.id}
                className={selected ? "assignment-row selected" : "assignment-row"}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onTogglePlayer(player.id)}
                  disabled={!editable}
                />
                <span>{player.name}</span>
                <small>
                  {player.category} | Villa {player.villaNumber}
                </small>
              </label>
            );
          })}
          {teamPlayers.length === 0 ? (
            <p className="empty-note">No players added to this team yet.</p>
          ) : null}
        </div>
      ) : (
        <div className="assignment-list compact-list">
          {assignedPlayers.map((player) => (
            <article key={player.id} className="assigned-player-card">
              <strong>{player.name}</strong>
              <small>
                {player.category} | Villa {player.villaNumber}
              </small>
            </article>
          ))}
          {assignedPlayers.length === 0 ? (
            <p className="empty-note">No participants selected for this fixture yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TeamSideSelector({
  label,
  teams,
  selectedIds,
  disabled,
  onToggleTeam,
}) {
  return (
    <div className="team-side-selector">
      <div className="assignment-header">
        <div>
          <h5>{label}</h5>
          <p className="assignment-subtitle">
            {selectedIds.length} team{selectedIds.length === 1 ? "" : "s"} selected
          </p>
        </div>
      </div>
      <div className="team-side-list">
        {teams.map((team) => {
          const selected = selectedIds.includes(team.id);

          return (
            <label
              key={team.id}
              className={selected ? "team-side-row selected" : "team-side-row"}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleTeam(team.id)}
                disabled={disabled}
              />
              <span>{team.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function EventPlayerSelectionCard({
  team,
  side,
  teamPlayers,
  selectedPlayerIds,
  playersPerSide,
  editable,
  onTogglePlayer,
}) {
  const selectedCount = selectedPlayerIds.length;
  const isEnough = selectedCount >= playersPerSide;

  return (
    <div className="assignment-column">
      <div className="assignment-header">
        <div>
          <h5>
            {team?.name ?? "Team not found"} <span className="eyebrow">Side {side}</span>
          </h5>
          <p className="assignment-subtitle">
            {selectedCount} selected | minimum {playersPerSide} needed
          </p>
        </div>
        <span className={isEnough ? "event-count-pill success" : "event-count-pill warning"}>
          {isEnough ? "Ready" : "Need more players"}
        </span>
      </div>
      <div className="assignment-list">
        {teamPlayers.map((player) => {
          const selected = selectedPlayerIds.includes(player.id);

          return (
            <label
              key={player.id}
              className={selected ? "assignment-row selected" : "assignment-row"}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onTogglePlayer(player.id)}
                disabled={!editable}
              />
              <span>{player.name}</span>
              <small>
                {player.category} | Villa {player.villaNumber}
              </small>
            </label>
          );
        })}
        {teamPlayers.length === 0 ? (
          <p className="empty-note">No players added to this team yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function GeneratedFixtureCard({
  fixture,
  sportEvent,
  teamA,
  teamB,
  teamAPlayers,
  teamBPlayers,
}) {
  return (
    <article className="panel generated-fixture-card">
      <div className="game-card-header">
        <div>
          <span className="eyebrow">
            Fixture {fixture.fixtureNumber} | {formatStatusLabel(fixture.status)}
          </span>
          <h4>{sportEvent?.name ?? "Sport event"}</h4>
          {fixture.label ? <p>{fixture.label}</p> : null}
          <p>
            {teamA?.name ?? "Side A team"} vs {teamB?.name ?? "Side B team"}
          </p>
        </div>
        <div className="game-card-side">
          <p className="game-note">{fixture.notes || "No generator notes."}</p>
        </div>
      </div>
      <div className="fixture-summary-grid">
        <div className="fixture-summary-card">
          <span className="eyebrow">Side A</span>
          <strong>{teamA?.name ?? "Unknown team"}</strong>
          <p>{getPlayerSummary(teamAPlayers)}</p>
        </div>
        <div className="fixture-summary-card">
          <span className="eyebrow">Side B</span>
          <strong>{teamB?.name ?? "Unknown team"}</strong>
          <p>{getPlayerSummary(teamBPlayers)}</p>
        </div>
        <div className="fixture-summary-card">
          <span className="eyebrow">Venue</span>
          <strong>{fixture.venue || sportEvent?.venue || "TBD"}</strong>
          <p>{formatStatusLabel(fixture.status)}</p>
        </div>
      </div>
    </article>
  );
}

function GeneratedOpponentCard({
  fixture,
  leftTeam,
  leftPlayers,
  rightTeam,
  rightPlayers,
}) {
  return (
    <article className="overview-item">
      <div>
        <h4>{fixture.label || `Fixture ${fixture.fixtureNumber}`}</h4>
        <p>
          {leftTeam?.name ?? "Team"}: {getPlayerSummary(leftPlayers)}
        </p>
        <p>
          {rightTeam?.name ?? "Team"}: {getPlayerSummary(rightPlayers)}
        </p>
      </div>
      <div className="table-actions">
        <span>{leftTeam?.id === rightTeam?.id ? "Same team fallback" : "Cross team"}</span>
      </div>
    </article>
  );
}

export default function GamesView({
  database,
  teams,
  sportsEvents,
  role,
  activeCaptain,
  onCreateSportEvent,
  onUpdateSportEvent,
  onDeleteSportEvent,
  onCreateSportEventEntry,
  onDeleteSportEventEntry,
  onSyncSportEventTeams,
  onToggleSportEventPlayer,
  onGenerateFixturesFromAi,
  onCreateGame,
  onUpdateGame,
  onDeleteGame,
  onUpdateAssignments,
}) {
  const [teamFilter, setTeamFilter] = useState("all");
  const [editingGameId, setEditingGameId] = useState("");
  const [editingSportEventId, setEditingSportEventId] = useState("");
  const [gameForm, setGameForm] = useState(() => createEmptyGameForm(teams));
  const [sportEventForm, setSportEventForm] = useState(EMPTY_SPORT_EVENT_FORM);
  const [viewingRulesSportEventId, setViewingRulesSportEventId] = useState("");
  const [selectedSportEventTemplateName, setSelectedSportEventTemplateName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRegistrationTeamId, setSelectedRegistrationTeamId] = useState("");
  const [registrationPlayerFilter, setRegistrationPlayerFilter] = useState("all");
  const [registrationDraftPlayerIds, setRegistrationDraftPlayerIds] = useState([]);
  const [selectedGameEntryAId, setSelectedGameEntryAId] = useState("");
  const [selectedGameEntryBId, setSelectedGameEntryBId] = useState("");
  const [selectedSideATeamIds, setSelectedSideATeamIds] = useState([]);
  const [selectedSideBTeamIds, setSelectedSideBTeamIds] = useState([]);
  const [generatorVenue, setGeneratorVenue] = useState("TBD");
  const [status, setStatus] = useState("");
  const [sportEventStatus, setSportEventStatus] = useState("");
  const [eventTeamStatus, setEventTeamStatus] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sportEventSubmitting, setSportEventSubmitting] = useState(false);
  const [eventTeamSubmitting, setEventTeamSubmitting] = useState(false);
  const [generatorSubmitting, setGeneratorSubmitting] = useState(false);

  const gameTitleOptions = useMemo(() => {
    const titles = new Set(sportsEvents.map((sportEvent) => sportEvent.name));
    database.games.forEach((game) => titles.add(game.title));
    if (gameForm.title) {
      titles.add(gameForm.title);
    }
    return Array.from(titles);
  }, [database.games, gameForm.title, sportsEvents]);

  useEffect(() => {
    if (!gameForm.teamAId && !gameForm.teamBId && teams.length > 0) {
      setGameForm(createEmptyGameForm(teams));
    }
  }, [gameForm.teamAId, gameForm.teamBId, teams]);

  useEffect(() => {
    if (!selectedEventId && sportsEvents.length > 0) {
      setSelectedEventId(sportsEvents[0].id);
    }
  }, [selectedEventId, sportsEvents]);

  const selectedEvent =
    sportsEvents.find((sportEvent) => sportEvent.id === selectedEventId) ?? null;

  useEffect(() => {
    if (role === "captain" && activeCaptain?.teamId) {
      setSelectedRegistrationTeamId(activeCaptain.teamId);
      return;
    }

    if (!selectedRegistrationTeamId && teams.length > 0) {
      setSelectedRegistrationTeamId(teams[0].id);
    }
  }, [activeCaptain?.teamId, role, selectedRegistrationTeamId, teams]);

  useEffect(() => {
    setRegistrationDraftPlayerIds([]);
  }, [selectedEventId, selectedRegistrationTeamId]);

  const selectedEventAssignments = useMemo(
    () =>
      database.sportEventTeams.filter(
        (assignment) => assignment.sportEventId === selectedEventId,
      ),
    [database.sportEventTeams, selectedEventId],
  );

  useEffect(() => {
    const sideATeamIds = selectedEventAssignments
      .filter((assignment) => assignment.side === "A")
      .map((assignment) => assignment.teamId);
    const sideBTeamIds = selectedEventAssignments
      .filter((assignment) => assignment.side === "B")
      .map((assignment) => assignment.teamId);

    setSelectedSideATeamIds(sideATeamIds);
    setSelectedSideBTeamIds(sideBTeamIds);
    setGeneratorVenue(selectedEvent?.venue ?? "TBD");
  }, [selectedEvent?.venue, selectedEventAssignments]);

  const savedSideATeamIds = selectedEventAssignments
    .filter((assignment) => assignment.side === "A")
    .map((assignment) => assignment.teamId);
  const savedSideBTeamIds = selectedEventAssignments
    .filter((assignment) => assignment.side === "B")
    .map((assignment) => assignment.teamId);

  const sportEventPlayerSelections = database.sportEventPlayers.filter(
    (selection) => selection.sportEventId === selectedEventId,
  );
  const selectedPlayerIdsByTeam = new Map();
  sportEventPlayerSelections.forEach((selection) => {
    if (!selectedPlayerIdsByTeam.has(selection.teamId)) {
      selectedPlayerIdsByTeam.set(selection.teamId, []);
    }
    selectedPlayerIdsByTeam.get(selection.teamId).push(selection.playerId);
  });

  const playersById = new Map(database.players.map((player) => [player.id, player]));
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const availableRegistrationTeams =
    role === "captain"
      ? teams.filter((team) => team.id === activeCaptain?.teamId)
      : teams;
  const registrationTeam =
    availableRegistrationTeams.find((team) => team.id === selectedRegistrationTeamId) ?? null;
  const registrationTeamPlayers = database.players.filter(
    (player) => player.teamId === registrationTeam?.id,
  );
  const eligibleRegistrationTeamPlayers = registrationTeamPlayers.filter((player) =>
    isPlayerEligibleForEvent(player.category, selectedEvent?.eventCategory),
  );
  const interestedPlayerIdsForEvent = new Set(
    database.publicInterestSubmissions
      .filter((submission) => submission.sportEventIds.includes(selectedEventId))
      .map((submission) => submission.playerId)
      .filter(Boolean),
  );
  const visibleRegistrationTeamPlayers = eligibleRegistrationTeamPlayers.filter((player) =>
    registrationPlayerFilter === "interested"
      ? interestedPlayerIdsForEvent.has(player.id)
      : true,
  );
  const registrationEntries = database.sportEventEntries
    .filter(
      (entry) =>
        entry.sportEventId === selectedEventId &&
        entry.teamId === registrationTeam?.id,
    )
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const selectedEventEntries = database.sportEventEntries
    .filter((entry) => entry.sportEventId === selectedEventId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const registeredPlayerIdsForTeam = new Set(
    registrationEntries.flatMap((entry) => entry.playerIds),
  );
  const draftPlayers = registrationDraftPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean);

  const gamesForCaptain = activeCaptain
    ? database.games.filter(
        (game) =>
          game.teamAId === activeCaptain.teamId || game.teamBId === activeCaptain.teamId,
      )
    : [];

  const visibleGames =
    role === "captain"
      ? gamesForCaptain
      : database.games.filter((game) => {
          if (teamFilter === "all") {
            return true;
          }
          return game.teamAId === teamFilter || game.teamBId === teamFilter;
        });

  const visibleEventFixtures = database.eventFixtures
    .filter((fixture) => fixture.sportEventId === selectedEventId)
    .sort((left, right) => left.fixtureNumber - right.fixtureNumber);
  const eventHasGeneratedFixtures = visibleEventFixtures.length > 0;
  const isEditingGame = editingGameId.length > 0;
  const isEditingSportEvent = editingSportEventId.length > 0;
  const viewingRulesSportEvent =
    sportsEvents.find((sportEvent) => sportEvent.id === viewingRulesSportEventId) ?? null;
  const selectedGameSportEvent =
    sportsEvents.find((sportEvent) => sportEvent.name === gameForm.title) ?? null;
  const gameEventEntries = database.sportEventEntries
    .filter((entry) => entry.sportEventId === selectedGameSportEvent?.id)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const selectedGameEntryA =
    gameEventEntries.find((entry) => entry.id === selectedGameEntryAId) ?? null;
  const selectedGameEntryB =
    gameEventEntries.find((entry) => entry.id === selectedGameEntryBId) ?? null;
  const usesEntryBasedFixture = !isEditingGame && gameEventEntries.length > 0;

  const sideATeams = teams.filter((team) => savedSideATeamIds.includes(team.id));
  const sideBTeams = teams.filter((team) => savedSideBTeamIds.includes(team.id));
  const selectedEventTeams = [...sideATeams, ...sideBTeams];

  const visibleRegistrationTeams =
    role === "captain"
      ? selectedEventTeams.filter((team) => team.id === activeCaptain?.teamId)
      : selectedEventTeams;

  const winnerOptions = teams.filter(
    (team) => team.id === gameForm.teamAId || team.id === gameForm.teamBId,
  );

  const resetGameForm = () => {
    setGameForm(createEmptyGameForm(teams));
    setEditingGameId("");
    setSelectedGameEntryAId("");
    setSelectedGameEntryBId("");
  };

  const resetSportEventForm = () => {
    setSportEventForm(EMPTY_SPORT_EVENT_FORM);
    setEditingSportEventId("");
    setSelectedSportEventTemplateName("");
  };

  const handleSportEventTemplateChange = (templateName) => {
    setSelectedSportEventTemplateName(templateName);

    if (!templateName) {
      return;
    }

    const selectedTemplate = SPORT_EVENT_TEMPLATES.find(
      (template) => template.name === templateName,
    );

    if (!selectedTemplate) {
      return;
    }

    setSportEventForm((current) => ({
      ...current,
      name: selectedTemplate.name,
      sportType: selectedTemplate.sportType,
      eventCategory: selectedTemplate.eventCategory,
      playersPerSide:
        selectedTemplate.playersPerSide == null
          ? current.playersPerSide
          : String(selectedTemplate.playersPerSide),
    }));
  };

  const handleGameSubmit = async (event) => {
    event.preventDefault();

    if (usesEntryBasedFixture) {
      if (!gameForm.title.trim() || !gameForm.venue.trim()) {
        setStatus("Sport event and venue are required.");
        return;
      }

      if (!selectedGameEntryA || !selectedGameEntryB) {
        setStatus("Choose one saved entry for each side.");
        return;
      }

      if (selectedGameEntryA.id === selectedGameEntryB.id) {
        setStatus("Choose two different saved entries.");
        return;
      }

      if (selectedGameEntryA.teamId === selectedGameEntryB.teamId) {
        setStatus("Manual fixtures currently need entries from two different teams.");
        return;
      }
    }

    if (
      !gameForm.title.trim() ||
      !gameForm.venue.trim() ||
      !gameForm.teamAId ||
      !gameForm.teamBId ||
      (gameForm.teamAId === gameForm.teamBId && !usesEntryBasedFixture)
    ) {
      setStatus("Sport event, venue, and two different teams are required.");
      return;
    }

    if (
      gameForm.winnerTeamId &&
      gameForm.winnerTeamId !== gameForm.teamAId &&
      gameForm.winnerTeamId !== gameForm.teamBId
    ) {
      setStatus("Winner must be one of the two selected teams.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const payload = {
        title: gameForm.title.trim(),
        fixtureLabel: gameForm.fixtureLabel.trim(),
        venue: gameForm.venue.trim(),
        date: gameForm.date || null,
        scheduledStartAt: gameForm.scheduledStartAt
          ? new Date(gameForm.scheduledStartAt).toISOString()
          : null,
        scheduledEndAt: gameForm.scheduledEndAt
          ? new Date(gameForm.scheduledEndAt).toISOString()
          : null,
        status: gameForm.status,
        resultSummary: gameForm.resultSummary.trim(),
        winnerTeamId: gameForm.winnerTeamId || null,
        teamAId: usesEntryBasedFixture ? selectedGameEntryA.teamId : gameForm.teamAId,
        teamBId: usesEntryBasedFixture ? selectedGameEntryB.teamId : gameForm.teamBId,
        notes: gameForm.notes.trim(),
        sideAPlayerIds: usesEntryBasedFixture ? selectedGameEntryA.playerIds : [],
        sideBPlayerIds: usesEntryBasedFixture ? selectedGameEntryB.playerIds : [],
      };

      if (isEditingGame) {
        await onUpdateGame({
          id: editingGameId,
          ...payload,
        });
        resetGameForm();
        setStatus("Fixture updated successfully.");
      } else {
        await onCreateGame(payload);
        resetGameForm();
        setStatus("Fixture created successfully.");
      }
    } catch (gameError) {
      setStatus(gameError.message ?? "Fixture save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditGame = (game) => {
    setStatus("");
    setEditingGameId(game.id);
    setSelectedGameEntryAId("");
    setSelectedGameEntryBId("");
    setGameForm(createGameFormFromGame(game));
  };

  const handleDeleteGame = async (game) => {
    const confirmed = window.confirm(
      `Delete ${getFixtureHeading(game)}? This will remove all selected participants for that fixture.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      await onDeleteGame(game.id);
      if (editingGameId === game.id) {
        resetGameForm();
      }
      setStatus("Fixture deleted successfully.");
    } catch (gameError) {
      setStatus(gameError.message ?? "Fixture delete failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSportEventSubmit = async (event) => {
    event.preventDefault();

    if (!sportEventForm.name.trim()) {
      setSportEventStatus("Sport event name is required.");
      return;
    }

    if (!sportEventForm.sportType.trim()) {
      setSportEventStatus("Sport type is required.");
      return;
    }

    const playersPerSide = Number(sportEventForm.playersPerSide);
    if (!Number.isInteger(playersPerSide) || playersPerSide < 1) {
      setSportEventStatus("Players per side must be at least 1.");
      return;
    }

    const trimmedName = sportEventForm.name.trim();
    const existingMatch = sportsEvents.find(
      (sportEvent) =>
        sportEvent.name.toLowerCase() === trimmedName.toLowerCase() &&
        sportEvent.id !== editingSportEventId,
    );

    if (existingMatch) {
      setSportEventStatus("That sport event already exists.");
      return;
    }

    try {
      setSportEventSubmitting(true);
      setSportEventStatus("");

      const payload = {
        name: trimmedName,
        sportType: sportEventForm.sportType.trim(),
        eventCategory: sportEventForm.eventCategory.trim() || "Open",
        venue: sportEventForm.venue.trim() || "TBD",
        rules: sportEventForm.rules.trim(),
        playersPerSide,
        status: sportEventForm.status,
      };

      if (isEditingSportEvent) {
        const previousName =
          sportsEvents.find((sportEvent) => sportEvent.id === editingSportEventId)?.name ?? "";
        await onUpdateSportEvent({
          id: editingSportEventId,
          previousName,
          ...payload,
        });
        if (selectedEventId === editingSportEventId) {
          setGeneratorVenue(payload.venue);
        }
        resetSportEventForm();
        setSportEventStatus("Sport event updated successfully.");
      } else {
        await onCreateSportEvent(payload);
        resetSportEventForm();
        setSportEventStatus("Sport event created successfully.");
      }
    } catch (sportEventError) {
      setSportEventStatus(sportEventError.message ?? "Sport event save failed.");
    } finally {
      setSportEventSubmitting(false);
    }
  };

  const handleEditSportEvent = (sportEvent) => {
    setSportEventStatus("");
    setEditingSportEventId(sportEvent.id);
    setSelectedSportEventTemplateName("");
    setSportEventForm(createSportEventFormFromEvent(sportEvent));
  };

  const handleToggleSportEventRules = (sportEventId) => {
    setViewingRulesSportEventId((current) =>
      current === sportEventId ? "" : sportEventId,
    );
  };

  useEffect(() => {
    if (!viewingRulesSportEventId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setViewingRulesSportEventId("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewingRulesSportEventId]);

  const handleDeleteSportEvent = async (sportEvent) => {
    const confirmed = window.confirm(
      `Delete ${sportEvent.name}? This removes event teams, selected players, and generated fixtures for that event.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSportEventSubmitting(true);
      setSportEventStatus("");
      await onDeleteSportEvent(sportEvent);
      if (editingSportEventId === sportEvent.id) {
        resetSportEventForm();
      }
      setSportEventStatus("Sport event deleted successfully.");
    } catch (sportEventError) {
      setSportEventStatus(sportEventError.message ?? "Sport event delete failed.");
    } finally {
      setSportEventSubmitting(false);
    }
  };

  const handleToggleDraftPlayer = (playerId) => {
    if (!selectedEvent) {
      setRegistrationStatus("Choose a sport event first.");
      return;
    }

    if (registeredPlayerIdsForTeam.has(playerId)) {
      return;
    }

    setRegistrationStatus("");
    setRegistrationDraftPlayerIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      if (current.length >= selectedEvent.playersPerSide) {
        setRegistrationStatus(
          `This event needs ${selectedEvent.playersPerSide} player${selectedEvent.playersPerSide === 1 ? "" : "s"} in one entry.`,
        );
        return current;
      }

      return [...current, playerId];
    });
  };

  const handleAddRegistrationEntry = async () => {
    if (!selectedEvent) {
      setRegistrationStatus("Choose a sport event first.");
      return;
    }

    if (!registrationTeam?.id) {
      setRegistrationStatus("Choose a team first.");
      return;
    }

    if (registrationDraftPlayerIds.length !== selectedEvent.playersPerSide) {
      setRegistrationStatus(
        `Pick exactly ${selectedEvent.playersPerSide} player${selectedEvent.playersPerSide === 1 ? "" : "s"} before adding this entry.`,
      );
      return;
    }

    try {
      setRegistrationStatus("");
      await onCreateSportEventEntry({
        sportEventId: selectedEvent.id,
        teamId: registrationTeam.id,
        playerIds: registrationDraftPlayerIds,
      });
      setRegistrationDraftPlayerIds([]);
      setRegistrationStatus(
        `${getEntryButtonLabel(selectedEvent.playersPerSide)} saved successfully.`,
      );
    } catch (entryError) {
      setRegistrationStatus(entryError.message ?? "Could not save this entry.");
    }
  };

  const handleDeleteRegistrationEntry = async (entryId) => {
    const confirmed = window.confirm("Delete this team entry?");

    if (!confirmed) {
      return;
    }

    try {
      setRegistrationStatus("");
      await onDeleteSportEventEntry(entryId);
      setRegistrationStatus("Entry deleted successfully.");
    } catch (entryError) {
      setRegistrationStatus(entryError.message ?? "Could not delete this entry.");
    }
  };

  const handleToggleSideTeam = (side, teamId) => {
    if (side === "A") {
      setSelectedSideATeamIds((current) =>
        current.includes(teamId)
          ? current.filter((id) => id !== teamId)
          : [...current, teamId],
      );
      setSelectedSideBTeamIds((current) => current.filter((id) => id !== teamId));
      return;
    }

    setSelectedSideBTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
    );
    setSelectedSideATeamIds((current) => current.filter((id) => id !== teamId));
  };

  const handleSaveEventTeams = async () => {
    if (!selectedEventId) {
      setEventTeamStatus("Choose a sport event first.");
      return;
    }

    const assignments = [
      ...selectedSideATeamIds.map((teamId) => ({ teamId, side: "A" })),
      ...selectedSideBTeamIds.map((teamId) => ({ teamId, side: "B" })),
    ];

    try {
      setEventTeamSubmitting(true);
      setEventTeamStatus("");
      await onSyncSportEventTeams({
        sportEventId: selectedEventId,
        assignments,
      });
      setEventTeamStatus("Event teams updated successfully.");
    } catch (eventTeamError) {
      setEventTeamStatus(eventTeamError.message ?? "Event team update failed.");
    } finally {
      setEventTeamSubmitting(false);
    }
  };

  const handleToggleEventPlayer = async (teamId, playerId, side) => {
    if (!selectedEventId) {
      setRegistrationStatus("Choose a sport event first.");
      return;
    }

    try {
      setRegistrationStatus("");
      await onToggleSportEventPlayer({
        sportEventId: selectedEventId,
        teamId,
        playerId,
        side,
      });
    } catch (registrationError) {
      setRegistrationStatus(registrationError.message ?? "Player selection update failed.");
    }
  };

  const handleGenerateFixtures = async () => {
    if (!selectedEvent) {
      setRegistrationStatus("Choose a sport event first.");
      return;
    }

    if (eventHasGeneratedFixtures) {
      setRegistrationStatus(
        "Fixtures are already created for this event. Delete all saved entries to reset and create again.",
      );
      return;
    }

    if (selectedEventEntries.length < 2) {
      setRegistrationStatus("Add at least two saved entries before creating fixtures.");
      return;
    }

    try {
      setGeneratorSubmitting(true);
      setRegistrationStatus("");
      const response = await onGenerateFixturesFromAi({
        sportEventId: selectedEvent.id,
      });
      setRegistrationStatus(
        `Created ${response.createdCount ?? 0} initial fixture${response.createdCount === 1 ? "" : "s"}.${
          response.remainingEntryCount > 0
            ? ` ${response.remainingEntryCount} entr${response.remainingEntryCount === 1 ? "y is" : "ies are"} left for manual fixture creation.`
            : ""
        }`,
      );
    } catch (generationError) {
      setRegistrationStatus(generationError.message ?? "Fixture generation failed.");
    } finally {
      setGeneratorSubmitting(false);
    }
  };

  const getEventTeamSide = (teamId) => {
    const selectedRow = selectedEventAssignments.find((assignment) => assignment.teamId === teamId);
    return selectedRow?.side ?? "";
  };

  useEffect(() => {
    if (isEditingGame) {
      return;
    }

    setSelectedGameEntryAId("");
    setSelectedGameEntryBId("");
  }, [gameForm.title, isEditingGame]);

  return (
    <section className="view-stack">
      {role === "admin" ? (
        <section className="panel">
          <SectionTitle
            title="Sport event management"
            description="Create and manage sport events with sport type, event category, venue, players per side, and registration status."
          />
          <div className="dashboard-grid">
            <form className="form-panel" onSubmit={handleSportEventSubmit}>
              <label>
                <span>Master event template</span>
                <select
                  value={selectedSportEventTemplateName}
                  onChange={(event) => handleSportEventTemplateChange(event.target.value)}
                  disabled={sportEventSubmitting}
                >
                  <option value="">Choose a workbook event template</option>
                  {SPORT_EVENT_TEMPLATES.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sport event name</span>
                <input
                  value={sportEventForm.name}
                  onChange={(event) =>
                    setSportEventForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter sport event name"
                  disabled={sportEventSubmitting}
                />
              </label>
              <label>
                <span>Sport type</span>
                <input
                  list="sport-type-options"
                  value={sportEventForm.sportType}
                  onChange={(event) =>
                    setSportEventForm((current) => ({
                      ...current,
                      sportType: event.target.value,
                    }))
                  }
                  placeholder="Singles, doubles, football, team relay"
                  disabled={sportEventSubmitting}
                />
              </label>
              <datalist id="sport-type-options">
                {SPORTS_EVENT_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <label>
                <span>Event category</span>
                <input
                  list="event-category-options"
                  value={sportEventForm.eventCategory}
                  onChange={(event) =>
                    setSportEventForm((current) => ({
                      ...current,
                      eventCategory: event.target.value,
                    }))
                  }
                  placeholder="Girls, Gents, Kids Mixed, Open"
                  disabled={sportEventSubmitting}
                />
              </label>
              <datalist id="event-category-options">
                {EVENT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <div className="split-fields">
                <label>
                  <span>Venue</span>
                  <input
                    value={sportEventForm.venue}
                    onChange={(event) =>
                      setSportEventForm((current) => ({
                        ...current,
                        venue: event.target.value,
                      }))
                    }
                    placeholder="Ground, hall, court"
                    disabled={sportEventSubmitting}
                  />
                </label>
                <label>
                  <span>Players per side</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={sportEventForm.playersPerSide}
                    onChange={(event) =>
                      setSportEventForm((current) => ({
                        ...current,
                        playersPerSide: event.target.value,
                      }))
                    }
                    disabled={sportEventSubmitting}
                  />
                </label>
              </div>
              <label>
                <span>Game rules</span>
                <textarea
                  value={sportEventForm.rules}
                  onChange={(event) =>
                    setSportEventForm((current) => ({
                      ...current,
                      rules: event.target.value,
                    }))
                  }
                  placeholder="Add the rules, scoring notes, or instructions for this event"
                  rows="5"
                  disabled={sportEventSubmitting}
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={sportEventForm.status}
                  onChange={(event) =>
                    setSportEventForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  disabled={sportEventSubmitting}
                >
                  <option value="draft">Draft</option>
                  <option value="registration_open">Registration open</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              {sportEventStatus ? <p className="status-note">{sportEventStatus}</p> : null}
              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={sportEventSubmitting}
                >
                  {sportEventSubmitting
                    ? "Saving..."
                    : isEditingSportEvent
                      ? "Update sport event"
                      : "Add sport event"}
                </button>
                {isEditingSportEvent ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={resetSportEventForm}
                    disabled={sportEventSubmitting}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <div className="overview-list sport-event-management-list">
              {sportsEvents.map((sportEvent) => {
                const eventTeamCount = database.sportEventTeams.filter(
                  (assignment) => assignment.sportEventId === sportEvent.id,
                ).length;
                const fixtureCount = database.eventFixtures.filter(
                  (fixture) => fixture.sportEventId === sportEvent.id,
                ).length;

                return (
                  <article key={sportEvent.id} className="overview-item">
                    <div>
                      <h4>{sportEvent.name}</h4>
                      <p>
                        {sportEvent.sportType} | {sportEvent.eventCategory} | {sportEvent.playersPerSide} per side
                      </p>
                      <p>
                        {sportEvent.venue} | {formatStatusLabel(sportEvent.status)}
                      </p>
                      <p>
                        {eventTeamCount} event team{eventTeamCount === 1 ? "" : "s"} | {fixtureCount} fixture
                        {fixtureCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="ghost-button inline-button icon-button"
                        onClick={() => handleToggleSportEventRules(sportEvent.id)}
                        disabled={sportEventSubmitting}
                        aria-label={`View rules for ${sportEvent.name}`}
                        title={`View rules for ${sportEvent.name}`}
                      >
                        <RulesIcon />
                      </button>
                      <button
                        type="button"
                        className="ghost-button inline-button"
                        onClick={() => handleEditSportEvent(sportEvent)}
                        disabled={sportEventSubmitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button inline-button"
                        onClick={() => handleDeleteSportEvent(sportEvent)}
                        disabled={sportEventSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
              {sportsEvents.length === 0 ? (
                <p className="empty-note">No sport events created yet.</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {viewingRulesSportEvent ? (
        <div
          className="modal-backdrop sport-event-rules-modal-backdrop"
          onClick={() => setViewingRulesSportEventId("")}
        >
          <section
            className="panel sport-event-rules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sport-event-rules-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="assignment-header">
              <div>
                <span className="eyebrow">Game rules</span>
                <h5 id="sport-event-rules-title">{viewingRulesSportEvent.name}</h5>
                <p className="assignment-subtitle">
                  {viewingRulesSportEvent.sportType} | {viewingRulesSportEvent.eventCategory} |{" "}
                  {viewingRulesSportEvent.playersPerSide} per side
                </p>
              </div>
              <button
                type="button"
                className="ghost-button inline-button"
                onClick={() => setViewingRulesSportEventId("")}
              >
                Close
              </button>
            </div>
            <div className="sport-event-rules-modal-body">
              <p className="sport-event-rules-copy">
                {viewingRulesSportEvent.rules?.trim() || "No rules added for this event yet."}
              </p>
            </div>
          </section>
        </div>
      ) : null}

      <section className="panel">
        <SectionTitle
          title="Event player registrations"
          description="Choose a sport event and one team, then keep adding entries using the exact player count set for that event."
        />
        <div className="dashboard-grid">
          <div className="form-panel">
            <label>
              <span>Sport event</span>
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                <option value="">Select sport event</option>
                {sportsEvents.map((sportEvent) => (
                  <option key={sportEvent.id} value={sportEvent.id}>
                    {sportEvent.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedEvent ? (
              <div className="event-meta-strip">
                <span>{selectedEvent.sportType}</span>
                <span>{selectedEvent.eventCategory}</span>
                <span>{selectedEvent.playersPerSide} per side</span>
                <span>{selectedEvent.venue}</span>
                <span>{formatStatusLabel(selectedEvent.status)}</span>
              </div>
            ) : null}

            <label>
              <span>Team</span>
              <select
                value={selectedRegistrationTeamId}
                onChange={(event) => setSelectedRegistrationTeamId(event.target.value)}
              >
                <option value="">Select team</option>
                {availableRegistrationTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="registration-summary-card">
              <span className="eyebrow">Current entry</span>
              <p>
                {draftPlayers.length > 0
                  ? draftPlayers.map((player) => player.name).join(", ")
                  : "No players selected yet"}
              </p>
              {selectedEvent ? (
                <small>
                  Add exactly {selectedEvent.playersPerSide} player
                  {selectedEvent.playersPerSide === 1 ? "" : "s"} each time for this event.
                </small>
              ) : null}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleAddRegistrationEntry}
                disabled={
                  !selectedEventId ||
                  !selectedRegistrationTeamId ||
                  eventHasGeneratedFixtures
                }
              >
                {getEntryButtonLabel(selectedEvent?.playersPerSide ?? 1)}
              </button>
            </div>

            {registrationStatus ? <p className="status-note">{registrationStatus}</p> : null}
          </div>

          <div className="assignment-column">
            <div className="assignment-header">
              <div>
                <h5>{registrationTeam?.name ?? "Choose a team"}</h5>
                <p className="assignment-subtitle">
                  {selectedEvent
                    ? `${registrationEntries.length} saved entr${registrationEntries.length === 1 ? "y" : "ies"}`
                    : "Choose a sport event first"}
                </p>
              </div>
              <label className="players-filter-field registration-roster-filter">
                <span>Players</span>
                <select
                  value={registrationPlayerFilter}
                  onChange={(event) => setRegistrationPlayerFilter(event.target.value)}
                  disabled={!selectedEvent || !registrationTeam}
                >
                  <option value="all">Show all</option>
                  <option value="interested">Interested only</option>
                </select>
              </label>
            </div>
            <div className="assignment-list">
              {visibleRegistrationTeamPlayers.map((player) => {
                const selected = registrationDraftPlayerIds.includes(player.id);
                const alreadyUsed = registeredPlayerIdsForTeam.has(player.id);
                const disableUnchecked =
                  !selected &&
                  (alreadyUsed ||
                    eventHasGeneratedFixtures ||
                    (selectedEvent?.playersPerSide
                      ? registrationDraftPlayerIds.length >= selectedEvent.playersPerSide
                      : false));

                return (
                  <label
                    key={player.id}
                    className={selected ? "assignment-row selected" : "assignment-row"}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleToggleDraftPlayer(player.id)}
                      disabled={disableUnchecked}
                    />
                    <span>{player.name}</span>
                    <small>
                      {player.category} | Villa {player.villaNumber}
                      {alreadyUsed ? " | Already added" : ""}
                    </small>
                  </label>
                );
              })}
              {visibleRegistrationTeamPlayers.length === 0 ? (
                <p className="empty-note">
                  {registrationTeamPlayers.length === 0
                    ? "No players added to this team yet."
                    : eligibleRegistrationTeamPlayers.length === 0
                      ? "No players in this team match the selected event category."
                      : "No matching players from this category have submitted interest for this event."}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="game-stack">
          <section className="panel">
            <SectionTitle
              title="Saved team entries"
              description="Each saved row is one registration entry for this sport event. Names are shown comma-separated."
            />
            <EventRegistrationEntryList
              entries={selectedEventEntries}
              playersById={playersById}
              teamsById={teamsById}
              onDeleteEntry={handleDeleteRegistrationEntry}
            />
            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateFixtures}
                disabled={!selectedEvent || generatorSubmitting || selectedEventEntries.length < 2}
              >
                {generatorSubmitting ? "Creating fixtures..." : "Create fixtures"}
              </button>
            </div>
            {eventHasGeneratedFixtures ? (
              <p className="status-note">
                Fixtures are already created for this event. Delete all saved entries to reset and create again.
              </p>
            ) : null}
          </section>

          {visibleEventFixtures.length > 0 ? (
            <section className="panel">
              <p className="status-note">
                Fixtures are generated. Open the Fixtures menu to view the full list and manage scheduling.
              </p>
            </section>
          ) : null}
        </div>
      </section>
    </section>
  );
}
