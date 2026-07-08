import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import AppCopyright from "../../components/AppCopyright";
import SectionTitle from "../../components/SectionTitle";
import { isPlayerEligibleForEvent } from "../../data/seed";
import { usePublicInterestRegistration } from "../../lib/database";

function PublicRegistrationIntro() {
  return (
    <section className="panel public-registration-hero">
      <span className="eyebrow public-registration-kicker">Sports Event Registration</span>
      <h1>Aqualina Onam 2026</h1>
      <p className="public-registration-quote">
        "Onam brings us together, and sport turns that togetherness into celebration."
      </p>
    </section>
  );
}

export default function PublicRegistrationView() {
  const {
    configured,
    loading,
    error,
    teams,
    players,
    sportsEvents,
    appSettings,
    submitInterest,
    getPlayerInterestSubmissions,
  } = usePublicInterestRegistration();
  const [teamId, setTeamId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [selectedSportEventIds, setSelectedSportEventIds] = useState([]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [previousSelectionsLoading, setPreviousSelectionsLoading] = useState(false);
  const [previousSelectionsError, setPreviousSelectionsError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const successReloadTimeoutRef = useRef(null);
  const deferredEventSearch = useDeferredValue(eventSearch);
  const selectedTeam = teams.find((team) => team.id === teamId) ?? null;

  useEffect(() => {
    return () => {
      if (successReloadTimeoutRef.current) {
        window.clearTimeout(successReloadTimeoutRef.current);
      }
    };
  }, []);

  const teamOptions = useMemo(() => {
    const activeTeamIds = new Set(players.map((player) => player.teamId).filter(Boolean));

    if (activeTeamIds.size === 0) {
      return teams;
    }

    return teams.filter((team) => activeTeamIds.has(team.id));
  }, [players, teams]);

  const teamPlayers = useMemo(
    () => players.filter((player) => player.teamId === teamId).sort((left, right) => left.name.localeCompare(right.name)),
    [players, teamId],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(teamPlayers.map((player) => player.category)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [teamPlayers],
  );

  const filteredPlayers = useMemo(
    () =>
      teamPlayers.filter((player) => player.category === selectedCategory).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [selectedCategory, teamPlayers],
  );

  const selectedPlayer = filteredPlayers.find((player) => player.id === playerId) ?? null;

  const eligibleSportsEvents = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    return sportsEvents
      .filter((sportEvent) => sportEvent.isActive !== false)
      .filter((sportEvent) => sportEvent.status === "registration_open")
      .filter((sportEvent) =>
        isPlayerEligibleForEvent(selectedPlayer.category, sportEvent.eventCategory),
      );
  }, [selectedPlayer, sportsEvents]);

  const visibleSportsEvents = useMemo(() => {
    const normalizedSearch = deferredEventSearch.trim().toLowerCase();

    return eligibleSportsEvents.filter((sportEvent) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack =
        `${sportEvent.name} ${sportEvent.sportType} ${sportEvent.eventCategory}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [deferredEventSearch, eligibleSportsEvents]);

  const eligibleSportEventIds = useMemo(
    () => new Set(eligibleSportsEvents.map((sportEvent) => sportEvent.id)),
    [eligibleSportsEvents],
  );
  const publicRegistrationLocked = appSettings.publicRegistrationLocked;

  const loadPreviousSelections = async (nextPlayer) => {
    if (!nextPlayer?.id) {
      setSelectedSportEventIds([]);
      setPreviousSelectionsError("");
      return;
    }

    setPreviousSelectionsLoading(true);
    setPreviousSelectionsError("");

    try {
      const submissions = await getPlayerInterestSubmissions({
        playerId: nextPlayer.id,
        playerName: nextPlayer.name,
        villaNumber: nextPlayer.villaNumber,
        playerCategory: nextPlayer.category,
      });
      setSelectedSportEventIds(
        Array.from(
          new Set(
            submissions.flatMap((submission) =>
              submission.sportEvents.map((sportEvent) => sportEvent.id),
            ),
          ),
        ),
      );
    } catch (submissionLoadError) {
      setSelectedSportEventIds([]);
      setPreviousSelectionsError(
        submissionLoadError.message ?? "Previous selections could not be loaded.",
      );
    } finally {
      setPreviousSelectionsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadPreviousSubmissions() {
      if (!selectedPlayer?.id) {
        setSelectedSportEventIds([]);
        setPreviousSelectionsError("");
        return;
      }

      setPreviousSelectionsLoading(true);
      setPreviousSelectionsError("");

      try {
        const submissions = await getPlayerInterestSubmissions({
          playerId: selectedPlayer.id,
          playerName: selectedPlayer.name,
          villaNumber: selectedPlayer.villaNumber,
          playerCategory: selectedPlayer.category,
        });
        if (active) {
          setSelectedSportEventIds(
            Array.from(
              new Set(
                submissions.flatMap((submission) =>
                  submission.sportEvents.map((sportEvent) => sportEvent.id),
                ),
              ),
            ),
          );
        }
      } catch (submissionLoadError) {
        if (active) {
          setSelectedSportEventIds([]);
          setPreviousSelectionsError(
            submissionLoadError.message ?? "Previous selections could not be loaded.",
          );
        }
      } finally {
        if (active) {
          setPreviousSelectionsLoading(false);
        }
      }
    }

    loadPreviousSubmissions();

    return () => {
      active = false;
    };
  }, [selectedPlayer]);

  useEffect(() => {
    setSelectedSportEventIds((current) => {
      const nextSelection = current.filter((sportEventId) =>
        eligibleSportEventIds.has(sportEventId),
      );

      return nextSelection.length === current.length ? current : nextSelection;
    });
  }, [eligibleSportEventIds]);

  const handleTeamChange = (nextTeamId) => {
    setTeamId(nextTeamId);
    setSelectedCategory("");
    setPlayerId("");
    setSelectedSportEventIds([]);
    setPreviousSelectionsError("");
    setStatus("");
  };

  const handleCategoryChange = (nextCategory) => {
    setSelectedCategory(nextCategory);
    setPlayerId("");
    setSelectedSportEventIds([]);
    setPreviousSelectionsError("");
    setStatus("");
  };

  const handlePlayerChange = (nextPlayerId) => {
    setPlayerId(nextPlayerId);
    setSelectedSportEventIds([]);
    setStatus("");
  };

  const handleToggleSportEvent = (sportEventId) => {
    setSelectedSportEventIds((current) =>
      current.includes(sportEventId)
        ? current.filter((id) => id !== sportEventId)
        : [...current, sportEventId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!teamId || !selectedCategory || !playerId || !selectedPlayer?.villaNumber) {
      setStatus("Choose a team, category, and player first.");
      return;
    }

    if (selectedSportEventIds.length === 0) {
      setStatus("Choose at least one sports event.");
      return;
    }

    const validSportEventIds = selectedSportEventIds.filter((sportEventId) =>
      eligibleSportEventIds.has(sportEventId),
    );

    if (validSportEventIds.length === 0) {
      setSelectedSportEventIds([]);
      setStatus("Choose at least one eligible sports event.");
      return;
    }

    if (publicRegistrationLocked) {
      setStatus("Sports event registration is currently locked.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("");
      const response = await submitInterest({
        villaNumber: selectedPlayer.villaNumber,
        playerId,
        sportEventIds: validSportEventIds,
      });
      await loadPreviousSelections(selectedPlayer);
      const nextSuccessMessage =
        `Interest ${response.action === "updated" ? "updated" : "saved"} for ${response.playerName}. ` +
        `${response.selectedEventCount} event${response.selectedEventCount === 1 ? "" : "s"} submitted successfully.`;
      setSuccessMessage(nextSuccessMessage);
      if (successReloadTimeoutRef.current) {
        window.clearTimeout(successReloadTimeoutRef.current);
      }
      successReloadTimeoutRef.current = window.setTimeout(() => {
        window.location.reload();
      }, 1800);
    } catch (submissionError) {
      setStatus(submissionError.message ?? "Interest submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <div className="auth-shell auth-shell-centered">
        <div className="public-registration-stack">
          <PublicRegistrationIntro />
          <section className="panel auth-panel">
            <h2>Sports Event Registration</h2>
            <p>Supabase environment variables are missing, so the registration page is not available yet.</p>
          </section>
          <AppCopyright />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell public-registration-shell">
      <div className="public-registration-stack">
        <PublicRegistrationIntro />

        <section className="panel public-registration-panel">
          <SectionTitle
            title="Sports Event Registration"
            description="Choose your team, category, player, and submit interest for the events you are eligible to join."
          />

          <form className="form-panel public-registration-form" onSubmit={handleSubmit}>
            <div className="dashboard-grid public-registration-grid">
              <label>
                <span>Team</span>
                <select
                  value={teamId}
                  onChange={(event) => handleTeamChange(event.target.value)}
                  disabled={loading || submitting}
                >
                  <option value="">Select team</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  disabled={loading || submitting || !teamId}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Player</span>
                <select
                  value={playerId}
                  onChange={(event) => handlePlayerChange(event.target.value)}
                  disabled={loading || submitting || !teamId || !selectedCategory}
                >
                  <option value="">Select player</option>
                  {filteredPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Villa number</span>
                <input
                  value={selectedPlayer?.villaNumber ?? ""}
                  placeholder="Villa number will appear here"
                  readOnly
                />
              </label>
            </div>


            <label>
              <span>Search eligible events</span>
              <input
                value={eventSearch}
                onChange={(event) => setEventSearch(event.target.value)}
                placeholder="Search by event, sport type, or category"
                disabled={!selectedPlayer || submitting}
              />
            </label>

            <section className="panel public-interest-events-panel">
              <SectionTitle
                title="Eligible Sports Events"
                description={
                  selectedPlayer
                    ? `Select one or more events for ${selectedPlayer.name}.`
                    : "Choose a team, category, and player first to see eligible events."
                }
              />

              {selectedPlayer ? (
                <div className="assignment-listassignment-list public-interest-event-list">
                  {previousSelectionsLoading ? (
                    <p className="field-hint">Loading previous selections...</p>
                  ) : null}
                  {previousSelectionsError ? (
                    <p className="error-note">{previousSelectionsError}</p>
                  ) : null}
                  {visibleSportsEvents.map((sportEvent) => {
                    const selected = selectedSportEventIds.includes(sportEvent.id);

                    return (
                      <label
                        key={sportEvent.id}
                        className={selected ? "assignment-row selected" : "assignment-row"}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleSportEvent(sportEvent.id)}
                          disabled={submitting || publicRegistrationLocked}
                        />
                        <span>{sportEvent.name}</span>
                      </label>
                    );
                  })}
                  {visibleSportsEvents.length === 0 ? (
                    <p className="empty-note">
                      {eligibleSportsEvents.length === 0
                        ? "No eligible sports events are available for this player right now."
                        : sportsEvents.length === 0
                        ? "No public sports events are available right now."
                        : "No eligible sports events match your search."}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="empty-note">Select a team, category, and player to continue.</p>
              )}
            </section>

            {publicRegistrationLocked ? (
              <p className="status-note">
                Sports event registration is currently locked. You can view previous submissions,
                but new interests cannot be submitted right now.
              </p>
            ) : null}

            {error ? <p className="error-note">{error}</p> : null}
            {status ? <p className="status-note">{status}</p> : null}

            <div className="form-actions public-registration-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={loading || submitting || !selectedPlayer || publicRegistrationLocked}
              >
                {publicRegistrationLocked
                  ? "Registration locked"
                  : submitting
                    ? "Saving interest..."
                    : "Submit interest"}
              </button>
            </div>
          </form>
        </section>
        <AppCopyright />
      </div>
      {successMessage ? (
        <div className="modal-backdrop" aria-live="polite">
          <section className="panel success-popup-modal">
            <span className="eyebrow">Submission successful</span>
            <h3>Thank you</h3>
            <p>{successMessage}</p>
            <p className="success-popup-hint">Reloading page...</p>
            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => window.location.reload()}
              >
                Reload now
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
