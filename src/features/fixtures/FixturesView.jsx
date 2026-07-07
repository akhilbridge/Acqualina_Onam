import { useEffect, useMemo, useState } from "react";
import SectionTitle from "../../components/SectionTitle";

const EMPTY_FIXTURE_FORM = {
  sportEventId: "",
  label: "",
  venue: "TBD",
  status: "draft",
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

function getEntryOptionLabel(entry, playersById, teamsById) {
  const teamName = teamsById.get(entry.teamId)?.name ?? "Unknown team";
  const playerNames = entry.playerIds
    .map((playerId) => playersById.get(playerId)?.name)
    .filter(Boolean)
    .join(", ");

  return `${teamName}: ${playerNames || "Players not found"}`;
}

function GeneratedOpponentCard({
  fixture,
  sportEvent,
  leftTeam,
  leftPlayers,
  rightTeam,
  rightPlayers,
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
        <p>
          {fixture.venue || "TBD"} | {formatStatusLabel(fixture.status)}
        </p>
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
  onCreateEventFixture,
  onUpdateEventFixture,
  onDeleteEventFixture,
}) {
  const [teamFilter, setTeamFilter] = useState("all");
  const [sportEventFilter, setSportEventFilter] = useState("all");
  const [editingFixtureId, setEditingFixtureId] = useState("");
  const [fixtureForm, setFixtureForm] = useState(EMPTY_FIXTURE_FORM);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditingFixture = editingFixtureId.length > 0;
  const canManageFixtures = role === "admin";
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

  useEffect(() => {
    if (!fixtureForm.sportEventId && sportsEvents.length > 0 && !isEditingFixture) {
      setFixtureForm((current) => ({
        ...current,
        sportEventId: sportsEvents[0].id,
        venue: sportsEvents[0].venue || "TBD",
      }));
    }
  }, [fixtureForm.sportEventId, isEditingFixture, sportsEvents]);

  const selectedSportEvent =
    sportsEvents.find((sportEvent) => sportEvent.id === fixtureForm.sportEventId) ?? null;
  const availableEntries = database.sportEventEntries
    .filter((entry) => entry.sportEventId === fixtureForm.sportEventId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  const visibleFixtures = database.eventFixtures
    .filter((fixture) => {
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

  const resetFixtureForm = () => {
    setEditingFixtureId("");
    setFixtureForm({
      ...EMPTY_FIXTURE_FORM,
      sportEventId: sportsEvents[0]?.id ?? "",
      venue: sportsEvents[0]?.venue ?? "TBD",
    });
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
        venue: fixtureForm.venue.trim(),
        status: fixtureForm.status,
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
      } else {
        await onCreateEventFixture(payload);
        setStatus("Fixture created successfully.");
      }

      resetFixtureForm();
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
      venue: fixture.venue ?? "TBD",
      status: fixture.status ?? "draft",
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
    } catch (fixtureError) {
      setStatus(fixtureError.message ?? "Fixture delete failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view-stack">
      <SectionTitle
        title="Fixtures"
        description="Create, edit, delete, and filter fixtures here. Fixture creation uses saved entries, not teams."
        action={
          <div className="players-toolbar">
            <label className="field-inline players-filter-field">
              <span>Game</span>
              <select
                value={sportEventFilter}
                onChange={(event) => setSportEventFilter(event.target.value)}
              >
                <option value="all">All games</option>
                {sportsEvents.map((sportEvent) => (
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
          </div>
        }
      />

      {canManageFixtures ? (
        <section className="panel">
          <div className="dashboard-grid">
            <form className="form-panel" onSubmit={handleFixtureSubmit}>
              <SectionTitle
                title={isEditingFixture ? "Edit fixture" : "Create fixture"}
                description="Choose a sport event and two saved entries to create one fixture."
              />
              <label>
                <span>Sport event</span>
                <select
                  value={fixtureForm.sportEventId}
                  onChange={(event) => {
                    const sportEventId = event.target.value;
                    const nextSportEvent =
                      sportsEvents.find((sportEvent) => sportEvent.id === sportEventId) ?? null;
                    setFixtureForm((current) => ({
                      ...current,
                      sportEventId,
                      venue: nextSportEvent?.venue || "TBD",
                      sideAEntryId: "",
                      sideBEntryId: "",
                    }));
                  }}
                  disabled={submitting || isEditingFixture}
                >
                  <option value="">Select sport event</option>
                  {sportsEvents.map((sportEvent) => (
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
                    onChange={(event) =>
                      setFixtureForm((current) => ({
                        ...current,
                        sideAEntryId: event.target.value,
                      }))
                    }
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
                    onChange={(event) =>
                      setFixtureForm((current) => ({
                        ...current,
                        sideBEntryId: event.target.value,
                      }))
                    }
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
                {isEditingFixture ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={resetFixtureForm}
                    disabled={submitting}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <section className="panel">
              <SectionTitle
                title="Fixture filter"
                description="The top game and team filters are applied to this list."
              />
              <div className="overview-list">
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
            </section>
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
    </section>
  );
}
