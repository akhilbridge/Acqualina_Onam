import { useEffect, useMemo, useState } from "react";
import SectionTitle from "../../components/SectionTitle";
import { isPlayerEligibleForEvent } from "../../data/seed";

const EMPTY_FIXTURE_FORM = {
  sportEventId: "",
  label: "",
  fixtureDate: "",
  fixtureTime: "",
  venue: "TBD",
  status: "draft",
  winnerTeamId: "",
  notes: "",
  sideAEntryId: "",
  sideBEntryId: "",
};

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

function formatFixtureSchedule(fixture) {
  const parts = [];

  if (fixture.fixtureDate) {
    parts.push(new Date(`${fixture.fixtureDate}T00:00:00`).toLocaleDateString());
  }

  if (fixture.fixtureTime) {
    parts.push(
      new Date(`1970-01-01T${fixture.fixtureTime}`).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }

  return parts.join(" | ");
}

function GeneratedOpponentCard({
  fixture,
  sportEvent,
  leftTeam,
  leftPlayers,
  rightTeam,
  rightPlayers,
  winnerTeam,
  leftFallbackLabel,
  rightFallbackLabel,
  canManage,
  onEdit,
  onDelete,
}) {
  return (
    <article className="overview-item">
      <div>
        <h4>{fixture.label || `Fixture ${fixture.fixtureNumber}`}</h4>
        <p>{sportEvent?.name ?? "Sport event"}</p>
        <p>
          {leftTeam?.name ?? leftFallbackLabel ?? "Team A"}:{" "}
          {leftPlayers.length > 0 ? getPlayerSummary(leftPlayers) : leftFallbackLabel ?? "TBD"}
        </p>
        <p>
          {rightTeam?.name ?? rightFallbackLabel ?? "Team B"}:{" "}
          {rightPlayers.length > 0 ? getPlayerSummary(rightPlayers) : rightFallbackLabel ?? "TBD"}
        </p>
        {formatFixtureSchedule(fixture) ? <p>{formatFixtureSchedule(fixture)}</p> : null}
        <p>
          {fixture.venue || "TBD"} | {formatStatusLabel(fixture.status)}
        </p>
        {winnerTeam ? <p>Winner: {winnerTeam.name}</p> : null}
      </div>
      <div className="table-actions">
        <span>{leftTeam?.id === rightTeam?.id ? "Same team fallback" : "Cross team"}</span>
        {canManage ? (
          <>
            <button
              type="button"
              className="ghost-button inline-button"
              onClick={() => onEdit(fixture)}
            >
              Edit
            </button>
            <button
              type="button"
              className="danger-button inline-button"
              onClick={() => onDelete(fixture)}
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function sameMembers(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function EventRegistrationEntryList({
  entries,
  playersById,
  teamsById,
  onDeleteEntry,
  protectedEntryIds,
  role,
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
        const deleteBlocked = role === "captain" && protectedEntryIds.has(entry.id);

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
                disabled={deleteBlocked}
                title={
                  deleteBlocked
                    ? "Captains cannot delete entries that are already used in fixtures."
                    : "Delete this entry"
                }
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

function findEntryIdForFixtureSide(entries, teamId, playerIds) {
  const match = entries.find(
    (entry) => entry.teamId === teamId && sameMembers(entry.playerIds, playerIds),
  );

  return match?.id ?? "";
}

export default function FixturesView({
  database,
  teams,
  sportsEvents,
  role,
  activeCaptain,
  onCreateSportEventEntry,
  onDeleteSportEventEntry,
  onGenerateFixturesFromAi,
  onCreateEventFixture,
  onUpdateEventFixture,
  onDeleteEventFixture,
  viewMode = "fixtures",
  onOpenRegistrations,
  onBackToFixtures,
}) {
  const [teamFilter, setTeamFilter] = useState("all");
  const [sportEventFilter, setSportEventFilter] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRegistrationTeamId, setSelectedRegistrationTeamId] = useState("");
  const [registrationPlayerFilter, setRegistrationPlayerFilter] = useState("all");
  const [registrationDraftPlayerIds, setRegistrationDraftPlayerIds] = useState([]);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [generatorSubmitting, setGeneratorSubmitting] = useState(false);
  const [editingFixtureId, setEditingFixtureId] = useState("");
  const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
  const [fixtureForm, setFixtureForm] = useState(EMPTY_FIXTURE_FORM);
  const [pageStatus, setPageStatus] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showRegistrations = viewMode === "registrations";
  const showFixtures = viewMode === "fixtures";
  const isEditingFixture = editingFixtureId.length > 0;
  const canManageFixtures = role === "admin";
  const canAccessRegistrations = ["admin", "captain"].includes(role);
  const playersById = useMemo(
    () => new Map(database.players.map((player) => [player.id, player])),
    [database.players],
  );
  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const sportsEventsById = useMemo(
    () => new Map(sportsEvents.map((sportEvent) => [sportEvent.id, sportEvent])),
    [sportsEvents],
  );
  const activeSportEvents = useMemo(
    () => sportsEvents.filter((sportEvent) => sportEvent.isActive !== false),
    [sportsEvents],
  );
  const activeSportEventIds = useMemo(
    () => new Set(activeSportEvents.map((sportEvent) => sportEvent.id)),
    [activeSportEvents],
  );

  useEffect(() => {
    if (activeSportEvents.length === 0) {
      if (selectedEventId) {
        setSelectedEventId("");
      }
      return;
    }

    const selectedEventStillAvailable = activeSportEvents.some(
      (sportEvent) => sportEvent.id === selectedEventId,
    );

    if (!selectedEventStillAvailable) {
      setSelectedEventId(activeSportEvents[0].id);
    }
  }, [activeSportEvents, selectedEventId]);

  const selectedEvent =
    activeSportEvents.find((sportEvent) => sportEvent.id === selectedEventId) ?? null;

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

  useEffect(() => {
    if (!fixtureForm.sportEventId && activeSportEvents.length > 0 && !isEditingFixture) {
      setFixtureForm((current) => ({
        ...current,
        sportEventId: activeSportEvents[0].id,
        venue: activeSportEvents[0].venue || "TBD",
      }));
    }
  }, [activeSportEvents, fixtureForm.sportEventId, isEditingFixture]);

  const selectedSportEvent =
    activeSportEvents.find((sportEvent) => sportEvent.id === fixtureForm.sportEventId) ??
    sportsEvents.find((sportEvent) => sportEvent.id === fixtureForm.sportEventId) ??
    null;
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
        entry.sportEventId === selectedEventId && entry.teamId === registrationTeam?.id,
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
  const availableEntries = database.sportEventEntries
    .filter((entry) => entry.sportEventId === fixtureForm.sportEventId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const selectedSideAEntry =
    availableEntries.find((entry) => entry.id === fixtureForm.sideAEntryId) ?? null;
  const selectedSideBEntry =
    availableEntries.find((entry) => entry.id === fixtureForm.sideBEntryId) ?? null;
  const winnerOptions = [
    selectedSideAEntry
      ? {
          teamId: selectedSideAEntry.teamId,
          label: `Entry A - ${teamsById.get(selectedSideAEntry.teamId)?.name ?? "Unknown team"}`,
        }
      : null,
    selectedSideBEntry
      ? {
          teamId: selectedSideBEntry.teamId,
          label: `Entry B - ${teamsById.get(selectedSideBEntry.teamId)?.name ?? "Unknown team"}`,
        }
      : null,
  ].filter(Boolean);

  const visibleFixtures = database.eventFixtures
    .filter((fixture) => {
      if (!activeSportEventIds.has(fixture.sportEventId)) {
        return false;
      }

      if (sportEventFilter !== "all" && fixture.sportEventId !== sportEventFilter) {
        return false;
      }

      if (teamFilter === "all") {
        return true;
      }
      return fixture.sideATeamId === teamFilter || fixture.sideBTeamId === teamFilter;
    })
    .sort((left, right) => {
      if (left.sportEventId === right.sportEventId) {
        return left.fixtureNumber - right.fixtureNumber;
      }
      return left.sportEventId.localeCompare(right.sportEventId);
    });
  const visibleEventFixtures = database.eventFixtures
    .filter((fixture) => fixture.sportEventId === selectedEventId)
    .sort((left, right) => left.fixtureNumber - right.fixtureNumber);
  const protectedEntryIds = new Set(
    selectedEventEntries
      .filter((entry) =>
        visibleEventFixtures.some((fixture) => {
          const sideAPlayers = fixture.assignments?.A ?? [];
          const sideBPlayers = fixture.assignments?.B ?? [];

          return (
            (fixture.sideATeamId === entry.teamId && sameMembers(sideAPlayers, entry.playerIds)) ||
            (fixture.sideBTeamId === entry.teamId && sameMembers(sideBPlayers, entry.playerIds))
          );
        }),
      )
      .map((entry) => entry.id),
  );
  const eventHasGeneratedFixtures = visibleEventFixtures.length > 0;

  const resetFixtureForm = () => {
    setEditingFixtureId("");
    setFixtureForm({
      ...EMPTY_FIXTURE_FORM,
      sportEventId: activeSportEvents[0]?.id ?? "",
      venue: activeSportEvents[0]?.venue ?? "TBD",
    });
  };

  const handleOpenFixtureModal = () => {
    setPageStatus("");
    setStatus("");
    resetFixtureForm();
    setIsFixtureModalOpen(true);
  };

  const handleCloseFixtureModal = () => {
    setStatus("");
    resetFixtureForm();
    setIsFixtureModalOpen(false);
  };

  const getFixtureParticipantFallback = (fixture, side) => {
    const sourceFixtureId =
      side === "A" ? fixture.sideASourceFixtureId : fixture.sideBSourceFixtureId;

    if (!sourceFixtureId) {
      return side === "A" ? "Bye / TBD" : "Bye / TBD";
    }

    const sourceFixture = database.eventFixtures.find((item) => item.id === sourceFixtureId);
    return `Winner of ${sourceFixture?.label || `Fixture ${sourceFixture?.fixtureNumber ?? ""}`.trim()}`;
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

  const handleFixtureSubmit = async (event) => {
    event.preventDefault();

    if (!fixtureForm.sportEventId) {
      setStatus("Choose a sport event first.");
      return;
    }

    if (!fixtureForm.sideAEntryId || !fixtureForm.sideBEntryId) {
      setStatus("Choose saved entries for both sides.");
      return;
    }

    if (fixtureForm.sideAEntryId === fixtureForm.sideBEntryId) {
      setStatus("Choose two different saved entries.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const payload = {
        sportEventId: fixtureForm.sportEventId,
        label: fixtureForm.label.trim(),
        fixtureDate: fixtureForm.fixtureDate || null,
        fixtureTime: fixtureForm.fixtureTime || null,
        venue: fixtureForm.venue.trim(),
        status: fixtureForm.status,
        winnerTeamId: fixtureForm.winnerTeamId || null,
        notes: fixtureForm.notes.trim(),
        sideAEntryId: fixtureForm.sideAEntryId,
        sideBEntryId: fixtureForm.sideBEntryId,
      };

      if (isEditingFixture) {
        await onUpdateEventFixture({
          id: editingFixtureId,
          ...payload,
        });
        setStatus("Fixture updated successfully.");
        setPageStatus("Fixture updated successfully.");
      } else {
        await onCreateEventFixture(payload);
        setStatus("Fixture created successfully.");
        setPageStatus("Fixture created successfully.");
      }

      resetFixtureForm();
      setIsFixtureModalOpen(false);
    } catch (fixtureError) {
      setStatus(fixtureError.message ?? "Fixture save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFixture = (fixture) => {
    const sideAPlayerIds = fixture.assignments?.A ?? [];
    const sideBPlayerIds = fixture.assignments?.B ?? [];
    const matchingEntries = database.sportEventEntries.filter(
      (entry) => entry.sportEventId === fixture.sportEventId,
    );

    setEditingFixtureId(fixture.id);
    setFixtureForm({
      sportEventId: fixture.sportEventId,
      label: fixture.label ?? "",
      fixtureDate: fixture.fixtureDate ?? "",
      fixtureTime: fixture.fixtureTime ?? "",
      venue: fixture.venue ?? "TBD",
      status: fixture.status ?? "draft",
      winnerTeamId: fixture.winnerTeamId ?? "",
      notes: fixture.notes ?? "",
      sideAEntryId: findEntryIdForFixtureSide(
        matchingEntries,
        fixture.sideATeamId,
        sideAPlayerIds,
      ),
      sideBEntryId: findEntryIdForFixtureSide(
        matchingEntries,
        fixture.sideBTeamId,
        sideBPlayerIds,
      ),
    });
    setStatus("");
    setPageStatus("");
    setIsFixtureModalOpen(true);
  };

  const handleDeleteFixture = async (fixture) => {
    const confirmed = window.confirm(
      `Delete ${fixture.label || `Fixture ${fixture.fixtureNumber}`}?`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      await onDeleteEventFixture(fixture.id);
      if (editingFixtureId === fixture.id) {
        resetFixtureForm();
      }
      setStatus("Fixture deleted successfully.");
      setPageStatus("Fixture deleted successfully.");
    } catch (fixtureError) {
      setStatus(fixtureError.message ?? "Fixture delete failed.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isFixtureModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleCloseFixtureModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFixtureModalOpen]);

  return (
    <section className="view-stack">
      {showRegistrations ? (
      <section className="panel">
        <SectionTitle
          title="Event player registrations"
          description="Choose a sport event and one team, then keep adding entries using the exact player count set for that event."
          action={
            <button
              type="button"
              className="ghost-button"
              onClick={onBackToFixtures}
            >
              Back to fixtures
            </button>
          }
        />
        <div className="dashboard-grid fixtures-registration-grid">
          <div className="form-panel">
            <label>
              <span>Sport event</span>
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                <option value="">Select sport event</option>
                {activeSportEvents.map((sportEvent) => (
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
                disabled={!selectedEventId || !selectedRegistrationTeamId || eventHasGeneratedFixtures}
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
              protectedEntryIds={protectedEntryIds}
              role={role}
            />
            {role === "admin" ? (
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
            ) : null}
            {eventHasGeneratedFixtures ? (
              <p className="status-note">
                Fixtures are already created for this event. Delete all saved entries to reset and create again.
              </p>
            ) : null}
          </section>

          {visibleEventFixtures.length > 0 ? (
            <section className="panel">
              <p className="status-note">
                Fixtures are generated. Continue below to view the full list and manage scheduling.
              </p>
            </section>
          ) : null}
        </div>
      </section>
      ) : null}

      {showFixtures ? (
      <>
      <SectionTitle
        title="Fixtures"
        description="Create, edit, delete, and filter fixtures here. Fixture creation uses saved entries, not teams."
      />
      <div className="players-toolbar fixtures-management-toolbar">
        {canAccessRegistrations ? (
          <button
            type="button"
            className="ghost-button"
            onClick={onOpenRegistrations}
          >
            Event registrations
          </button>
        ) : null}
        <label className="field-inline players-filter-field">
          <span>Game</span>
          <select
            value={sportEventFilter}
            onChange={(event) => setSportEventFilter(event.target.value)}
          >
            <option value="all">All games</option>
            {activeSportEvents.map((sportEvent) => (
              <option key={sportEvent.id} value={sportEvent.id}>
                {sportEvent.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline players-filter-field">
          <span>Team</span>
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
          >
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        {canManageFixtures ? (
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenFixtureModal}
            disabled={submitting}
          >
            Create fixture
          </button>
        ) : null}
      </div>
      {pageStatus ? <p className="status-note">{pageStatus}</p> : null}

      {canManageFixtures && isFixtureModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseFixtureModal}>
          <form
            className="panel form-panel sport-event-editor-modal"
            onSubmit={handleFixtureSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fixture-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <SectionTitle
              title={isEditingFixture ? "Edit fixture" : "Create fixture"}
              description="Choose a sport event and two saved entries to create one fixture."
              action={
                <button
                  type="button"
                  className="ghost-button inline-button"
                  onClick={handleCloseFixtureModal}
                  disabled={submitting}
                >
                  Close
                </button>
              }
            />
            <label>
              <span>Sport event</span>
              <select
                id="fixture-editor-title"
                value={fixtureForm.sportEventId}
                onChange={(event) => {
                  const sportEventId = event.target.value;
                  const nextSportEvent =
                    sportsEvents.find((sportEvent) => sportEvent.id === sportEventId) ?? null;
                  setFixtureForm((current) => ({
                    ...current,
                    sportEventId,
                    venue: nextSportEvent?.venue || "TBD",
                    winnerTeamId: "",
                    sideAEntryId: "",
                    sideBEntryId: "",
                  }));
                }}
                disabled={submitting || isEditingFixture}
              >
                <option value="">Select sport event</option>
                {activeSportEvents.map((sportEvent) => (
                  <option key={sportEvent.id} value={sportEvent.id}>
                    {sportEvent.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="split-fields">
              <label>
                <span>Entry A</span>
                <select
                  value={fixtureForm.sideAEntryId}
                  onChange={(event) => {
                    const sideAEntryId = event.target.value;
                    const nextSideAEntry =
                      availableEntries.find((entry) => entry.id === sideAEntryId) ?? null;
                    setFixtureForm((current) => {
                      const validWinnerTeamIds = [
                        nextSideAEntry?.teamId ?? "",
                        selectedSideBEntry?.teamId ?? "",
                      ].filter(Boolean);

                      return {
                        ...current,
                        sideAEntryId,
                        winnerTeamId: validWinnerTeamIds.includes(current.winnerTeamId)
                          ? current.winnerTeamId
                          : "",
                      };
                    });
                  }}
                  disabled={submitting}
                >
                  <option value="">Select entry A</option>
                  {availableEntries
                    .filter((entry) => entry.id !== fixtureForm.sideBEntryId)
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {getEntryOptionLabel(entry, playersById, teamsById)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Entry B</span>
                <select
                  value={fixtureForm.sideBEntryId}
                  onChange={(event) => {
                    const sideBEntryId = event.target.value;
                    const nextSideBEntry =
                      availableEntries.find((entry) => entry.id === sideBEntryId) ?? null;
                    setFixtureForm((current) => {
                      const validWinnerTeamIds = [
                        selectedSideAEntry?.teamId ?? "",
                        nextSideBEntry?.teamId ?? "",
                      ].filter(Boolean);

                      return {
                        ...current,
                        sideBEntryId,
                        winnerTeamId: validWinnerTeamIds.includes(current.winnerTeamId)
                          ? current.winnerTeamId
                          : "",
                      };
                    });
                  }}
                  disabled={submitting}
                >
                  <option value="">Select entry B</option>
                  {availableEntries
                    .filter((entry) => entry.id !== fixtureForm.sideAEntryId)
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {getEntryOptionLabel(entry, playersById, teamsById)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label>
              <span>Fixture label</span>
              <input
                value={fixtureForm.label}
                onChange={(event) =>
                  setFixtureForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Fixture 1, Semi Final, Board 2"
                disabled={submitting}
              />
            </label>
            <div className="split-fields">
              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={fixtureForm.fixtureDate}
                  onChange={(event) =>
                    setFixtureForm((current) => ({
                      ...current,
                      fixtureDate: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </label>
              <label>
                <span>Time</span>
                <input
                  type="time"
                  value={fixtureForm.fixtureTime}
                  onChange={(event) =>
                    setFixtureForm((current) => ({
                      ...current,
                      fixtureTime: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>
            <div className="split-fields">
              <label>
                <span>Venue</span>
                <input
                  value={fixtureForm.venue}
                  onChange={(event) =>
                    setFixtureForm((current) => ({
                      ...current,
                      venue: event.target.value,
                    }))
                  }
                  placeholder="TBD"
                  disabled={submitting}
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={fixtureForm.status}
                  onChange={(event) =>
                    setFixtureForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  disabled={submitting}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
            <label>
              <span>Winner</span>
              <select
                value={fixtureForm.winnerTeamId}
                onChange={(event) =>
                  setFixtureForm((current) => ({
                    ...current,
                    winnerTeamId: event.target.value,
                  }))
                }
                disabled={submitting || winnerOptions.length === 0}
              >
                <option value="">Select winner later</option>
                {winnerOptions.map((option) => (
                  <option key={option.teamId} value={option.teamId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea
                value={fixtureForm.notes}
                onChange={(event) =>
                  setFixtureForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Fixture notes"
                disabled={submitting}
              />
            </label>
            {selectedSportEvent ? (
              <div className="registration-summary-card">
                <span className="eyebrow">Current sport event</span>
                <p>{selectedSportEvent.name}</p>
                <small>
                  This event uses {selectedSportEvent.playersPerSide} player
                  {selectedSportEvent.playersPerSide === 1 ? "" : "s"} in each saved entry.
                </small>
              </div>
            ) : null}
            {status ? <p className="status-note">{status}</p> : null}
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : isEditingFixture
                    ? "Update fixture"
                    : "Create fixture"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleCloseFixtureModal}
                disabled={submitting}
              >
                {isEditingFixture ? "Cancel edit" : "Cancel"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {canManageFixtures ? (
        <section className="panel">
          <SectionTitle
            title="Fixture list"
            description="The top game and team filters are applied to this list."
          />
          <div className="mobile-player-list">
            {visibleFixtures.map((fixture) => {
              const sideAAssignments = fixture.assignments?.A ?? [];
              const sideBAssignments = fixture.assignments?.B ?? [];
              const teamAPlayers = sideAAssignments
                .map((playerId) => playersById.get(playerId))
                .filter(Boolean);
              const teamBPlayers = sideBAssignments
                .map((playerId) => playersById.get(playerId))
                .filter(Boolean);

              return (
                <GeneratedOpponentCard
                  key={fixture.id}
                  fixture={fixture}
                  sportEvent={sportsEventsById.get(fixture.sportEventId)}
                  leftTeam={teamsById.get(fixture.sideATeamId)}
                  leftPlayers={teamAPlayers}
                  rightTeam={teamsById.get(fixture.sideBTeamId)}
                  rightPlayers={teamBPlayers}
                  winnerTeam={teamsById.get(fixture.winnerTeamId) ?? null}
                  leftFallbackLabel={getFixtureParticipantFallback(fixture, "A")}
                  rightFallbackLabel={getFixtureParticipantFallback(fixture, "B")}
                  canManage={canManageFixtures}
                  onEdit={handleEditFixture}
                  onDelete={handleDeleteFixture}
                />
              );
            })}
            {visibleFixtures.length === 0 ? (
              <p className="empty-note">No fixtures found for this filter yet.</p>
            ) : null}
          </div>
          <div className="table-shell player-roster-table-shell fixture-table-shell">
            <table>
              <thead>
                <tr>
                  <th>Fixture</th>
                  <th>Game</th>
                  <th>Entry A</th>
                  <th>Entry B</th>
                  <th>Schedule</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th>Winner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFixtures.map((fixture) => {
                  const sideAAssignments = fixture.assignments?.A ?? [];
                  const sideBAssignments = fixture.assignments?.B ?? [];
                  const teamAPlayers = sideAAssignments
                    .map((playerId) => playersById.get(playerId))
                    .filter(Boolean);
                  const teamBPlayers = sideBAssignments
                    .map((playerId) => playersById.get(playerId))
                    .filter(Boolean);
                  const teamA = teamsById.get(fixture.sideATeamId);
                  const teamB = teamsById.get(fixture.sideBTeamId);
                  const winnerTeam = teamsById.get(fixture.winnerTeamId) ?? null;

                  return (
                    <tr key={fixture.id}>
                      <td>{fixture.label || `Fixture ${fixture.fixtureNumber}`}</td>
                      <td>{sportsEventsById.get(fixture.sportEventId)?.name ?? "Sport event"}</td>
                      <td>
                        {teamA?.name ?? getFixtureParticipantFallback(fixture, "A")}
                        <br />
                        <small>
                          {teamAPlayers.length > 0
                            ? getPlayerSummary(teamAPlayers)
                            : getFixtureParticipantFallback(fixture, "A")}
                        </small>
                      </td>
                      <td>
                        {teamB?.name ?? getFixtureParticipantFallback(fixture, "B")}
                        <br />
                        <small>
                          {teamBPlayers.length > 0
                            ? getPlayerSummary(teamBPlayers)
                            : getFixtureParticipantFallback(fixture, "B")}
                        </small>
                      </td>
                      <td>{formatFixtureSchedule(fixture) || "TBD"}</td>
                      <td>{fixture.venue || "TBD"}</td>
                      <td>{formatStatusLabel(fixture.status)}</td>
                      <td>{winnerTeam?.name ?? "TBD"}</td>
                      <td className="actions-cell">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="ghost-button inline-button"
                            onClick={() => handleEditFixture(fixture)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-button inline-button"
                            onClick={() => handleDeleteFixture(fixture)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visibleFixtures.length === 0 ? (
              <p className="empty-note">No fixtures found for this filter yet.</p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="panel">
          <SectionTitle
            title="Fixture list"
            description="The top game and team filters are applied here."
          />
          <div className="overview-list compact-overview-list">
            {visibleFixtures.map((fixture) => {
              const sideAAssignments = fixture.assignments?.A ?? [];
              const sideBAssignments = fixture.assignments?.B ?? [];
              const teamAPlayers = sideAAssignments
                .map((playerId) => playersById.get(playerId))
                .filter(Boolean);
              const teamBPlayers = sideBAssignments
                .map((playerId) => playersById.get(playerId))
                .filter(Boolean);

              return (
                <GeneratedOpponentCard
                  key={fixture.id}
                  fixture={fixture}
                  sportEvent={sportsEventsById.get(fixture.sportEventId)}
                  leftTeam={teamsById.get(fixture.sideATeamId)}
                  leftPlayers={teamAPlayers}
                  rightTeam={teamsById.get(fixture.sideBTeamId)}
                  rightPlayers={teamBPlayers}
                  winnerTeam={teamsById.get(fixture.winnerTeamId) ?? null}
                  leftFallbackLabel={getFixtureParticipantFallback(fixture, "A")}
                  rightFallbackLabel={getFixtureParticipantFallback(fixture, "B")}
                  canManage={false}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              );
            })}
            {visibleFixtures.length === 0 ? (
              <p className="empty-note">No fixtures found for this filter yet.</p>
            ) : null}
          </div>
        </section>
      )}
      </>
      ) : null}
    </section>
  );
}
