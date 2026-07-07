import { useDeferredValue, useEffect, useMemo, useState } from "react";
import SectionTitle from "../../components/SectionTitle";
import { usePublicInterestRegistration } from "../../lib/database";

function normalizeCategory(category) {
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

function isEligibleForEvent(playerCategory, eventCategory) {
  const normalizedPlayerCategory = normalizeCategory(playerCategory);
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

function sortVillaNumbers(values) {
  return [...values].sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString();
}

export default function PublicRegistrationView() {
  const {
    configured,
    loading,
    error,
    players,
    sportsEvents,
    appSettings,
    submitInterest,
    getPlayerInterestSubmissions,
  } = usePublicInterestRegistration();
  const [villaNumber, setVillaNumber] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [selectedSportEventIds, setSelectedSportEventIds] = useState([]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [previousSubmissions, setPreviousSubmissions] = useState([]);
  const [previousSubmissionsLoading, setPreviousSubmissionsLoading] = useState(false);
  const [previousSubmissionsError, setPreviousSubmissionsError] = useState("");
  const deferredEventSearch = useDeferredValue(eventSearch);

  const villaOptions = useMemo(
    () => sortVillaNumbers(new Set(players.map((player) => player.villaNumber))),
    [players],
  );

  const villaPlayers = useMemo(
    () =>
      players.filter((player) => player.villaNumber === villaNumber).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [players, villaNumber],
  );

  const selectedPlayer = villaPlayers.find((player) => player.id === playerId) ?? null;

  const matchingSportsEvents = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    const normalizedSearch = deferredEventSearch.trim().toLowerCase();

    return sportsEvents
      .filter((sportEvent) => isEligibleForEvent(selectedPlayer.category, sportEvent.eventCategory))
      .filter((sportEvent) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${sportEvent.name} ${sportEvent.sportType} ${sportEvent.eventCategory}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [deferredEventSearch, selectedPlayer, sportsEvents]);

  const filteredSportsEvents = useMemo(() => {
    const normalizedSearch = deferredEventSearch.trim().toLowerCase();

    return sportsEvents.filter((sportEvent) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${sportEvent.name} ${sportEvent.sportType} ${sportEvent.eventCategory}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [deferredEventSearch, sportsEvents]);

  const eligibleSportsEvents =
    selectedPlayer && matchingSportsEvents.length === 0
      ? filteredSportsEvents
      : matchingSportsEvents;

  const isFallbackEventList =
    Boolean(selectedPlayer) &&
    matchingSportsEvents.length === 0 &&
    filteredSportsEvents.length > 0;
  const publicRegistrationLocked = appSettings.publicRegistrationLocked;

  const refreshPreviousSubmissions = async (nextPlayerId) => {
    if (!nextPlayerId) {
      setPreviousSubmissions([]);
      setPreviousSubmissionsError("");
      return;
    }

    setPreviousSubmissionsLoading(true);
    setPreviousSubmissionsError("");

    try {
      const submissions = await getPlayerInterestSubmissions(nextPlayerId);
      setPreviousSubmissions(submissions);
    } catch (submissionLoadError) {
      setPreviousSubmissions([]);
      setPreviousSubmissionsError(
        submissionLoadError.message ?? "Previous submissions could not be loaded.",
      );
    } finally {
      setPreviousSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadPreviousSubmissions() {
      if (!playerId) {
        setPreviousSubmissions([]);
        setPreviousSubmissionsError("");
        return;
      }

      setPreviousSubmissionsLoading(true);
      setPreviousSubmissionsError("");

      try {
        const submissions = await getPlayerInterestSubmissions(playerId);
        if (active) {
          setPreviousSubmissions(submissions);
        }
      } catch (submissionLoadError) {
        if (active) {
          setPreviousSubmissions([]);
          setPreviousSubmissionsError(
            submissionLoadError.message ?? "Previous submissions could not be loaded.",
          );
        }
      } finally {
        if (active) {
          setPreviousSubmissionsLoading(false);
        }
      }
    }

    loadPreviousSubmissions();

    return () => {
      active = false;
    };
  }, [playerId]);

  const handleVillaChange = (nextVillaNumber) => {
    setVillaNumber(nextVillaNumber);
    setPlayerId("");
    setSelectedSportEventIds([]);
    setPreviousSubmissions([]);
    setPreviousSubmissionsError("");
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

    if (!villaNumber || !playerId) {
      setStatus("Choose a villa number and player first.");
      return;
    }

    if (selectedSportEventIds.length === 0) {
      setStatus("Choose at least one sports event.");
      return;
    }

    if (publicRegistrationLocked) {
      setStatus("Public sports registration is currently locked.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("");
      const response = await submitInterest({
        villaNumber,
        playerId,
        sportEventIds: selectedSportEventIds,
      });
      setSelectedSportEventIds([]);
      await refreshPreviousSubmissions(playerId);
      setStatus(
        `Interest saved for ${response.playerName}. ${response.selectedEventCount} event${response.selectedEventCount === 1 ? "" : "s"} submitted.`,
      );
    } catch (submissionError) {
      setStatus(submissionError.message ?? "Interest submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <div className="auth-shell auth-shell-centered">
        <section className="panel auth-panel">
          <h2>Public Sports Registration</h2>
          <p>Supabase environment variables are missing, so the public registration page is not available yet.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-shell public-registration-shell">
      <section className="panel public-registration-panel">
        <SectionTitle
          title="Public Sports Registration"
          description="Choose your villa number, player, and submit interest for the events you are eligible to join."
        />

        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="dashboard-grid public-registration-grid">
            <label>
              <span>Villa number</span>
              <select
                value={villaNumber}
                onChange={(event) => handleVillaChange(event.target.value)}
                disabled={loading || submitting}
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
                value={playerId}
                onChange={(event) => handlePlayerChange(event.target.value)}
                disabled={loading || submitting || !villaNumber}
              >
                <option value="">Select player</option>
                {villaPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Category</span>
              <input
                value={selectedPlayer?.category ?? ""}
                placeholder="Category will appear here"
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
                  : "Choose a player first to see eligible events."
              }
            />

            {selectedPlayer ? (
              <div className="assignment-list public-interest-event-list">
                {isFallbackEventList ? (
                  <p className="field-hint">
                    No exact category match was found, so all available sports events are shown.
                  </p>
                ) : null}
                {eligibleSportsEvents.map((sportEvent) => {
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
                      <small>
                        {sportEvent.sportType} | {sportEvent.eventCategory} | {sportEvent.playersPerSide} per side
                      </small>
                    </label>
                  );
                })}
                {eligibleSportsEvents.length === 0 ? (
                  <p className="empty-note">
                    {sportsEvents.length === 0
                      ? "No public sports events are available right now."
                      : "No eligible sports events found for this player."}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="empty-note">Select a villa number and player to continue.</p>
            )}
          </section>

          {publicRegistrationLocked ? (
            <p className="status-note">
              Public sports registration is currently locked. You can view previous submissions,
              but new interests cannot be submitted right now.
            </p>
          ) : null}

          {selectedPlayer ? (
            <section className="panel public-interest-events-panel">
              <SectionTitle
                title="Previous Submissions"
                description={`Last submitted interests for ${selectedPlayer.name}.`}
              />
              {previousSubmissionsLoading ? (
                <p className="empty-note">Loading previous submissions...</p>
              ) : previousSubmissionsError ? (
                <p className="error-note">{previousSubmissionsError}</p>
              ) : previousSubmissions.length > 0 ? (
                <div className="overview-list compact-overview-list">
                  {previousSubmissions.map((submission) => (
                    <article key={submission.id} className="overview-item">
                      <div>
                        <h4>{formatDateTime(submission.createdAt)}</h4>
                        <p>
                          Villa {submission.villaNumber} | {submission.playerCategory}
                        </p>
                        <div className="roster-preview">
                          {submission.sportEvents.map((sportEvent) => (
                            <span key={sportEvent.id} className="roster-token">
                              {sportEvent.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-note">No previous submissions found for this player.</p>
              )}
            </section>
          ) : null}

          {error ? <p className="error-note">{error}</p> : null}
          {status ? <p className="status-note">{status}</p> : null}

          <div className="form-actions">
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
            <a className="ghost-button public-login-link" href="/">
              Staff login
            </a>
          </div>
        </form>
      </section>
    </div>
  );
}
