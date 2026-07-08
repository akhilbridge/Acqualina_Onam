import { useDeferredValue, useEffect, useState } from "react";
import SectionTitle from "../../components/SectionTitle";
import { CATEGORY_OPTIONS } from "../../data/seed";

const EMPTY_FORM = {
  name: "",
  villaNumber: "",
  category: CATEGORY_OPTIONS[0],
  teamId: "",
};

function createEmptyForm(teamId) {
  return {
    ...EMPTY_FORM,
    teamId,
  };
}

function createFormFromPlayer(player) {
  return {
    name: player.name,
    villaNumber: player.villaNumber,
    category: player.category,
    teamId: player.teamId,
  };
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 20h4l10-10-4-4L4 16v4zm13.7-11.3 1.6-1.6a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0L15 6l2.7 2.7z"
        fill="currentColor"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PlayersView({
  teams,
  players,
  role,
  activeCaptain,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}) {
  const canManagePlayers = role === "admin";
  const defaultTeamId = activeCaptain?.teamId ?? teams[0]?.id ?? "";
  const [form, setForm] = useState(() => createEmptyForm(defaultTeamId));
  const [editingPlayerId, setEditingPlayerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState(activeCaptain?.teamId ?? "all");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    if (!form.teamId && defaultTeamId) {
      setForm((current) => ({ ...current, teamId: defaultTeamId }));
    }
  }, [defaultTeamId, form.teamId]);

  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
  const visiblePlayers = players.filter((player) => {
    const matchesRole =
      role === "admin" || player.teamId === activeCaptain?.teamId;
    const matchesTeamFilter =
      role === "captain" || teamFilter === "all" || player.teamId === teamFilter;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      player.name.toLowerCase().includes(normalizedSearch) ||
      player.villaNumber.toLowerCase().includes(normalizedSearch);
    return matchesRole && matchesTeamFilter && matchesSearch;
  });

  const isEditing = editingPlayerId.length > 0;

  const resetForm = (teamId) => {
    setForm(createEmptyForm(teamId));
    setEditingPlayerId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canManagePlayers) {
      return;
    }

    const targetTeamId = form.teamId;

    if (!form.name.trim() || !form.villaNumber.trim() || !targetTeamId) {
      setStatus("Name, villa number, category, and team are required.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      if (isEditing) {
        await onUpdatePlayer({
          id: editingPlayerId,
          name: form.name.trim(),
          villaNumber: form.villaNumber.trim(),
          category: form.category,
          teamId: targetTeamId,
        });
        resetForm(targetTeamId);
        setStatus("Player updated successfully.");
      } else {
        await onAddPlayer({
          name: form.name.trim(),
          villaNumber: form.villaNumber.trim(),
          category: form.category,
          teamId: targetTeamId,
        });
        resetForm(targetTeamId);
        setStatus("Player added successfully.");
      }
    } catch (playerError) {
      setStatus(playerError.message ?? "Player save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (player) => {
    if (!canManagePlayers) {
      return;
    }

    setStatus("");
    setEditingPlayerId(player.id);
    setForm(createFormFromPlayer(player));
  };

  const handleCancelEdit = () => {
    setStatus("");
    resetForm(defaultTeamId);
  };

  const handleDelete = async (player) => {
    if (!canManagePlayers) {
      return;
    }

    const confirmed = window.confirm(`Delete ${player.name} from the roster?`);
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      await onDeletePlayer(player.id);
      if (editingPlayerId === player.id) {
        resetForm(defaultTeamId);
      }
      setStatus("Player deleted successfully.");
    } catch (playerError) {
      setStatus(playerError.message ?? "Player delete failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view-stack">
      <SectionTitle
        title="Players"
        description="Store each player with name, villa number, category, and team."
        action={
          <div className="players-toolbar">
            {role === "admin" ? (
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
            ) : null}
            <label className="field-inline search-field">
              <span>Search</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or villa"
              />
            </label>
          </div>
        }
      />

      <div className="dashboard-grid players-layout">
        {canManagePlayers ? (
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <SectionTitle
              title={isEditing ? "Edit player details" : "Add player to any team"}
              description="Only admins can add, edit, and delete player records."
            />
            <label>
              <span>Player name</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Player name"
                disabled={submitting}
              />
            </label>
            <label>
              <span>Villa number</span>
              <input
                value={form.villaNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    villaNumber: event.target.value,
                  }))
                }
                placeholder="Villa no"
                disabled={submitting}
              />
            </label>
            <label>
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                disabled={submitting}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Team</span>
              <select
                value={form.teamId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, teamId: event.target.value }))
                }
                disabled={submitting}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            {status ? <p className="status-note">{status}</p> : null}
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Saving..." : isEditing ? "Update player" : "Save player"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <section className="panel">
            <SectionTitle
              title="Player roster"
              description="Only admins can add, edit, and delete roster entries."
            />
            <p className="muted">
              Your current role can view roster information but cannot change player
              records.
            </p>
          </section>
        )}

        <section className="panel player-roster-panel">
          <SectionTitle
            title="Team roster"
            description="Admin sees everyone. Captains see only their team."
          />
          {!canManagePlayers && status ? <p className="status-note">{status}</p> : null}
          <div className="mobile-player-list">
            {visiblePlayers.map((player) => {
              const team = teams.find((item) => item.id === player.teamId);
              return (
                <article key={player.id} className="mobile-player-card">
                  <div className="mobile-player-card-header">
                    <h4>{player.name}</h4>
                    <span className="category-pill">{player.category}</span>
                  </div>
                  <p>Villa No: {player.villaNumber}</p>
                  <p>Team: {team?.name ?? "Unknown team"}</p>
                  {canManagePlayers ? (
                    <div className="table-actions">
                      <button
                        type="button"
                        className="ghost-button inline-button icon-button"
                        onClick={() => handleEdit(player)}
                        disabled={submitting}
                        aria-label={`Edit ${player.name}`}
                        title={`Edit ${player.name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="danger-button inline-button icon-button"
                        onClick={() => handleDelete(player)}
                        disabled={submitting}
                        aria-label={`Delete ${player.name}`}
                        title={`Delete ${player.name}`}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="table-shell player-roster-table-shell">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Villa No</th>
                  <th>Category</th>
                  <th>Team</th>
                  {canManagePlayers ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map((player) => {
                  const team = teams.find((item) => item.id === player.teamId);
                  return (
                    <tr key={player.id}>
                      <td>{player.name}</td>
                      <td>{player.villaNumber}</td>
                      <td>{player.category}</td>
                      <td>{team?.name ?? "Unknown team"}</td>
                      {canManagePlayers ? (
                        <td className="actions-cell">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="ghost-button inline-button icon-button"
                              onClick={() => handleEdit(player)}
                              disabled={submitting}
                              aria-label={`Edit ${player.name}`}
                              title={`Edit ${player.name}`}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="danger-button inline-button icon-button"
                              onClick={() => handleDelete(player)}
                              disabled={submitting}
                              aria-label={`Delete ${player.name}`}
                              title={`Delete ${player.name}`}
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visiblePlayers.length === 0 ? (
              <p className="empty-note">No players match the current filters.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
