import { useDeferredValue, useMemo, useState } from "react";
import SectionTitle from "../../components/SectionTitle";

const EMPTY_EDIT_FORM = {
  villaNumber: "",
  playerId: "",
  sportEventIds: [],
};

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString();
}

function sortVillaNumbers(values) {
  return [...values].sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function createEditForm(submission) {
  return {
    villaNumber: submission.villaNumber,
    playerId: submission.playerId,
    sportEventIds: [...submission.sportEventIds],
  };
}

export default function InterestsView({
  submissions,
  sportsEvents,
  players,
  role,
  onUpdateSubmission,
  onDeleteSubmission,
}) {
  const canManageSubmissions = role === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [editingSubmissionId, setEditingSubmissionId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const eventOptions = useMemo(
    () => sportsEvents.map((sportEvent) => ({ id: sportEvent.id, name: sportEvent.name })),
    [sportsEvents],
  );
  const villaOptions = useMemo(
    () => sortVillaNumbers(new Set(players.map((player) => player.villaNumber))),
    [players],
  );
  const editablePlayers = useMemo(() => {
    const visiblePlayers =
      editForm.villaNumber.length > 0
        ? players.filter((player) => player.villaNumber === editForm.villaNumber)
        : players;

    return [...visiblePlayers].sort((left, right) => left.name.localeCompare(right.name));
  }, [editForm.villaNumber, players]);
  const editingSubmission =
    submissions.find((submission) => submission.id === editingSubmissionId) ?? null;
  const selectedEditPlayer =
    players.find((player) => player.id === editForm.playerId) ?? editingSubmission?.player ?? null;

  const visibleSubmissions = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesEvent =
        eventFilter === "all" || submission.sportEventIds.includes(eventFilter);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        submission.playerName.toLowerCase().includes(normalizedSearch) ||
        submission.villaNumber.toLowerCase().includes(normalizedSearch) ||
        submission.playerCategory.toLowerCase().includes(normalizedSearch) ||
        submission.ipAddress.toLowerCase().includes(normalizedSearch) ||
        submission.sportEvents.some((sportEvent) =>
          sportEvent.name.toLowerCase().includes(normalizedSearch),
        );

      return matchesEvent && matchesSearch;
    });
  }, [deferredSearchTerm, eventFilter, submissions]);

  const resetEditor = () => {
    setEditingSubmissionId("");
    setEditForm(EMPTY_EDIT_FORM);
  };

  const handleEditStart = (submission) => {
    setEditingSubmissionId(submission.id);
    setEditForm(createEditForm(submission));
    setStatus("");
  };

  const handleVillaChange = (villaNumber) => {
    setEditForm((current) => {
      const matchingPlayer = players.find(
        (player) =>
          player.id === current.playerId && player.villaNumber === villaNumber,
      );

      return {
        ...current,
        villaNumber,
        playerId: matchingPlayer?.id ?? "",
      };
    });
    setStatus("");
  };

  const handlePlayerChange = (playerId) => {
    const nextPlayer = players.find((player) => player.id === playerId) ?? null;

    setEditForm((current) => ({
      ...current,
      playerId,
      villaNumber: nextPlayer?.villaNumber ?? current.villaNumber,
    }));
    setStatus("");
  };

  const handleToggleEvent = (sportEventId) => {
    setEditForm((current) => ({
      ...current,
      sportEventIds: current.sportEventIds.includes(sportEventId)
        ? current.sportEventIds.filter((id) => id !== sportEventId)
        : [...current.sportEventIds, sportEventId],
    }));
    setStatus("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!editingSubmissionId) {
      return;
    }

    if (!editForm.villaNumber || !editForm.playerId) {
      setStatus("Choose a villa number and player.");
      return;
    }

    if (editForm.sportEventIds.length === 0) {
      setStatus("Choose at least one sports event.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      await onUpdateSubmission({
        id: editingSubmissionId,
        villaNumber: editForm.villaNumber,
        playerId: editForm.playerId,
        sportEventIds: editForm.sportEventIds,
      });
      setStatus("Submission updated successfully.");
      resetEditor();
    } catch (updateError) {
      setStatus(updateError.message ?? "Submission update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (submission) => {
    const confirmed = window.confirm(`Delete the submission for ${submission.playerName}?`);
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      await onDeleteSubmission(submission.id);
      if (editingSubmissionId === submission.id) {
        resetEditor();
      }
      setStatus("Submission deleted successfully.");
    } catch (deleteError) {
      setStatus(deleteError.message ?? "Submission delete failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view-stack">
      <SectionTitle
        title="Public Interest Submissions"
        description={
          canManageSubmissions
            ? "Admin can review anonymous public event-interest submissions, including selected player, events, time, and captured IP address."
            : "Captains can review public event-interest submissions from players in their assigned team."
        }
        action={
          <div className="players-toolbar">
            <label className="field-inline players-filter-field">
              <span>Event</span>
              <select
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
              >
                <option value="all">All events</option>
                {eventOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-inline search-field">
              <span>Search</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Player, villa or category"
              />
            </label>
          </div>
        }
      />

      {canManageSubmissions && editingSubmission ? (
        <section className="panel">
          <form className="form-panel" onSubmit={handleSubmit}>
            <SectionTitle
              title="Edit submission"
              description={`Update the selected player, villa, or event list for ${editingSubmission.playerName}.`}
            />

            <div className="dashboard-grid public-registration-grid">
              <label>
                <span>Villa number</span>
                <select
                  value={editForm.villaNumber}
                  onChange={(event) => handleVillaChange(event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select villa number</option>
                  {villaOptions.map((option) => (
                    <option key={option} value={option}>
                      Villa {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Player</span>
                <select
                  value={editForm.playerId}
                  onChange={(event) => handlePlayerChange(event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select player</option>
                  {editablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Category</span>
                <input
                  value={selectedEditPlayer?.category ?? editingSubmission.playerCategory}
                  readOnly
                />
              </label>
            </div>

            <section className="panel public-interest-events-panel">
              <SectionTitle
                title="Selected events"
                description="Choose the sports events that should remain on this submission."
              />
              <div className="assignment-list public-interest-event-list">
                {sportsEvents.map((sportEvent) => {
                  const selected = editForm.sportEventIds.includes(sportEvent.id);

                  return (
                    <label
                      key={sportEvent.id}
                      className={selected ? "assignment-row selected" : "assignment-row"}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggleEvent(sportEvent.id)}
                        disabled={submitting}
                      />
                      <span>{sportEvent.name}</span>
                      <small>
                        {sportEvent.sportType} | {sportEvent.eventCategory} | {sportEvent.playersPerSide} per side
                      </small>
                    </label>
                  );
                })}
              </div>
            </section>

            {status ? <p className="status-note">{status}</p> : null}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Saving..." : "Update submission"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={resetEditor}
                disabled={submitting}
              >
                Cancel edit
              </button>
            </div>
          </form>
        </section>
      ) : status ? (
        <section className="panel">
          <p className="status-note">{status}</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="overview-list compact-overview-list">
          {visibleSubmissions.map((submission) => (
            <article key={submission.id} className="overview-item">
              <div>
                <h4>{submission.playerName}</h4>
                <p>
                  Villa {submission.villaNumber} | {submission.playerCategory}
                </p>
                <p>
                  Submitted: {formatDateTime(submission.createdAt)}
                </p>
                {canManageSubmissions ? (
                  <p>
                    IP: {submission.ipAddress || "Not captured"}
                  </p>
                ) : null}
                <div className="roster-preview">
                  {submission.sportEvents.map((sportEvent) => (
                    <span key={sportEvent.id} className="roster-token">
                      {sportEvent.name}
                    </span>
                  ))}
                </div>
                {canManageSubmissions ? (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="ghost-button inline-button"
                      onClick={() => handleEditStart(submission)}
                      disabled={submitting}
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      className="danger-button inline-button"
                      onClick={() => handleDelete(submission)}
                      disabled={submitting}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {visibleSubmissions.length === 0 ? (
            <p className="empty-note">No public interest submissions found for this filter yet.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
