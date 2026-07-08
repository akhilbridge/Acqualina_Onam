import { useDeferredValue, useMemo, useState } from "react";
import AppCopyright from "../../components/AppCopyright";
import SectionTitle from "../../components/SectionTitle";
import { usePublicFestivalDashboard } from "../../lib/database";

function formatStatusLabel(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getDateKeyFromDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateKeyFromValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return getDateKeyFromDate(date);
}

function formatDisplayDate(value) {
  if (!value) {
    return "Date TBD";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDisplayTime(value) {
  if (!value) {
    return "Time TBD";
  }

  const date = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatScheduleLabel({ date, time }) {
  if (!date && !time) {
    return "Schedule TBD";
  }

  if (date && time) {
    return `${formatDisplayDate(date)} | ${formatDisplayTime(time)}`;
  }

  return date ? formatDisplayDate(date) : formatDisplayTime(time);
}

function formatTimestampSchedule(value, fallbackDate = "") {
  if (!value) {
    return formatScheduleLabel({ date: fallbackDate, time: "" });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatScheduleLabel({ date: fallbackDate, time: "" });
  }

  return `${date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} | ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getFixturePlayerSummary(playerIds, playersById) {
  const names = playerIds
    .map((playerId) => playersById.get(playerId)?.name)
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "Players will be announced";
}

function PublicFestivalIntro({ todayCount }) {
  return (
    <section className="panel public-registration-hero public-festival-hero">
      <span className="eyebrow public-registration-kicker">Public festival board</span>
      <h1>Aqualina Onam 2026</h1>
      <p className="public-registration-quote">
        Track team form, today&apos;s matches, fixtures, and event rules in one
        live public page.
      </p>
      <div className="public-festival-hero-actions">
        <a className="primary-button" href="/register">
          Open registration
        </a>
        <span className="public-festival-hero-note">
          {todayCount} match{todayCount === 1 ? "" : "es"} on today&apos;s board
        </span>
      </div>
    </section>
  );
}

export default function PublicFestivalView() {
  const {
    configured,
    loading,
    error,
    teams,
    players,
    sportsEvents,
    games,
    eventFixtures,
  } = usePublicFestivalDashboard();
  const [teamFilter, setTeamFilter] = useState("all");
  const [matchSearch, setMatchSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [viewingRulesSportEventId, setViewingRulesSportEventId] = useState("");
  const deferredMatchSearch = useDeferredValue(matchSearch);
  const deferredEventSearch = useDeferredValue(eventSearch);

  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const sportsEventsById = useMemo(
    () => new Map(sportsEvents.map((sportEvent) => [sportEvent.id, sportEvent])),
    [sportsEvents],
  );

  const standings = useMemo(() => {
    return teams
      .map((team) => {
        const completedGames = games.filter(
          (game) =>
            (game.teamAId === team.id || game.teamBId === team.id) &&
            (game.status === "completed" || game.winnerTeamId),
        );
        const wins = completedGames.filter((game) => game.winnerTeamId === team.id).length;
        const played = completedGames.length;
        const losses = Math.max(played - wins, 0);
        const winPercentage = played > 0 ? Math.round((wins / played) * 100) : 0;

        return {
          team,
          wins,
          losses,
          played,
          winPercentage,
        };
      })
      .sort((left, right) => {
        if (left.winPercentage !== right.winPercentage) {
          return right.winPercentage - left.winPercentage;
        }

        if (left.wins !== right.wins) {
          return right.wins - left.wins;
        }

        return left.team.name.localeCompare(right.team.name);
      });
  }, [games, teams]);

  const todayKey = getDateKeyFromDate(new Date());
  const todayMatches = useMemo(() => {
    const gameItems = games
      .filter(
        (game) =>
          getDateKeyFromValue(game.scheduledStartAt) === todayKey ||
          game.date === todayKey,
      )
      .map((game) => ({
        id: `game-${game.id}`,
        label: game.fixtureLabel ? `${game.title} - ${game.fixtureLabel}` : game.title,
        teamAName: teamsById.get(game.teamAId)?.name ?? "Team A",
        teamBName: teamsById.get(game.teamBId)?.name ?? "Team B",
        schedule: formatScheduleLabel({
          date: game.date,
          time: game.scheduledStartAt ? new Date(game.scheduledStartAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }) : "",
        }),
        venue: game.venue || "TBD",
        status: formatStatusLabel(game.status),
        winnerName: teamsById.get(game.winnerTeamId)?.name ?? "",
      }));

    const fixtureItems = eventFixtures
      .filter((fixture) => fixture.fixtureDate === todayKey)
      .map((fixture) => ({
        id: `fixture-${fixture.id}`,
        label:
          fixture.label ||
          `${sportsEventsById.get(fixture.sportEventId)?.name ?? "Fixture"} ${fixture.fixtureNumber}`,
        teamAName: teamsById.get(fixture.sideATeamId)?.name ?? "Team A",
        teamBName: teamsById.get(fixture.sideBTeamId)?.name ?? "Team B",
        schedule: formatScheduleLabel({
          date: fixture.fixtureDate,
          time: fixture.fixtureTime,
        }),
        venue: fixture.venue || "TBD",
        status: formatStatusLabel(fixture.status),
        winnerName: teamsById.get(fixture.winnerTeamId)?.name ?? "",
      }));

    return [...gameItems, ...fixtureItems].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [eventFixtures, games, sportsEventsById, teamsById, todayKey]);

  const normalizedMatchSearch = deferredMatchSearch.trim().toLowerCase();
  const visibleGames = useMemo(() => {
    return games
      .filter((game) => {
        if (teamFilter !== "all" && game.teamAId !== teamFilter && game.teamBId !== teamFilter) {
          return false;
        }

        if (!normalizedMatchSearch) {
          return true;
        }

        const teamAName = teamsById.get(game.teamAId)?.name ?? "";
        const teamBName = teamsById.get(game.teamBId)?.name ?? "";
        const haystack = `${game.title} ${game.fixtureLabel} ${game.venue} ${teamAName} ${teamBName}`.toLowerCase();
        return haystack.includes(normalizedMatchSearch);
      })
      .sort((left, right) => {
        const leftKey = `${left.date || ""}-${left.scheduledStartAt || ""}`;
        const rightKey = `${right.date || ""}-${right.scheduledStartAt || ""}`;
        return rightKey.localeCompare(leftKey);
      });
  }, [games, normalizedMatchSearch, teamFilter, teamsById]);

  const normalizedEventSearch = deferredEventSearch.trim().toLowerCase();
  const visibleSportsEvents = useMemo(() => {
    return sportsEvents.filter((sportEvent) => {
      if (!normalizedEventSearch) {
        return true;
      }

      const haystack = `${sportEvent.name} ${sportEvent.sportType} ${sportEvent.eventCategory} ${sportEvent.venue}`.toLowerCase();
      return haystack.includes(normalizedEventSearch);
    });
  }, [normalizedEventSearch, sportsEvents]);

  const viewingRulesSportEvent =
    sportsEvents.find((sportEvent) => sportEvent.id === viewingRulesSportEventId) ?? null;

  if (!configured) {
    return (
      <div className="auth-shell auth-shell-centered">
        <div className="public-registration-stack">
          <PublicFestivalIntro todayCount={0} />
          <section className="panel auth-panel">
            <h2>Public festival board</h2>
            <p>Supabase environment variables are missing, so the public page is not available yet.</p>
          </section>
          <AppCopyright />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-shell auth-shell-centered">
        <div className="public-registration-stack">
          <PublicFestivalIntro todayCount={0} />
          <section className="panel auth-panel">
            <h2>Loading public board</h2>
            <p>Fetching team standings, today&apos;s matches, and published fixtures.</p>
          </section>
          <AppCopyright />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell public-registration-shell">
      <div className="public-registration-stack public-festival-stack">
        <PublicFestivalIntro todayCount={todayMatches.length} />

        {error ? (
          <section className="panel public-festival-panel">
            <p className="error-note">{error}</p>
          </section>
        ) : null}

        <section className="panel public-festival-panel">
          <SectionTitle
            title="Team form"
            description="Winning percentage is based on completed matches with a recorded winner."
          />
          <div className="public-standings-grid">
            {standings.map((row, index) => (
              <article key={row.team.id} className="public-standings-card">
                <div className="public-standings-card-header">
                  <div>
                    <h4>{row.team.name}</h4>
                    <p>
                      {row.wins}W - {row.losses}L - {row.played} played
                    </p>
                  </div>
                  <span className="public-standings-rank">#{index + 1}</span>
                </div>
                <div className="public-standings-meter" aria-hidden="true">
                  <span
                    className="public-standings-fill"
                    style={{ width: `${row.winPercentage}%` }}
                  />
                </div>
                <strong>{row.winPercentage}% win rate</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="panel public-festival-panel">
          <SectionTitle
            title="Today&apos;s matches"
            description="Quick access to everything scheduled for today."
          />
          <div className="schedule-list public-festival-schedule">
            {todayMatches.length > 0 ? (
              todayMatches.map((match) => (
                <article key={match.id} className="schedule-item">
                  <div>
                    <h4>{match.label}</h4>
                    <p>
                      {match.teamAName} vs {match.teamBName}
                    </p>
                    {match.winnerName ? <p>Winner: {match.winnerName}</p> : null}
                  </div>
                  <div className="schedule-meta">
                    <span>{match.schedule}</span>
                    <span>{match.venue}</span>
                    <span>{match.status}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-note">No matches are scheduled for today yet.</p>
            )}
          </div>
        </section>

        <section className="panel public-festival-panel">
          <SectionTitle
            title="All matches"
            description="Browse completed and upcoming matches by team or search."
            action={
              <div className="players-toolbar public-festival-toolbar">
                <label className="field-inline players-filter-field">
                  <span>Team</span>
                  <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                    <option value="all">All teams</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-inline search-field">
                  <span>Search</span>
                  <input
                    value={matchSearch}
                    onChange={(event) => setMatchSearch(event.target.value)}
                    placeholder="Search team, match, or venue"
                  />
                </label>
              </div>
            }
          />
          <div className="schedule-list public-festival-schedule">
            {visibleGames.length > 0 ? (
              visibleGames.map((game) => {
                const teamAName = teamsById.get(game.teamAId)?.name ?? "Team A";
                const teamBName = teamsById.get(game.teamBId)?.name ?? "Team B";
                const winnerName = teamsById.get(game.winnerTeamId)?.name ?? "";

                return (
                  <article key={game.id} className="schedule-item">
                    <div>
                      <h4>{game.fixtureLabel ? `${game.title} - ${game.fixtureLabel}` : game.title}</h4>
                      <p>
                        {teamAName} vs {teamBName}
                      </p>
                      {winnerName ? <p>Winner: {winnerName}</p> : null}
                    </div>
                    <div className="schedule-meta">
                      <span>
                        {game.scheduledStartAt
                          ? formatTimestampSchedule(game.scheduledStartAt, game.date)
                          : formatScheduleLabel({
                            date: game.date,
                            time: "",
                          })}
                      </span>
                      <span>{game.venue || "TBD"}</span>
                      <span>{formatStatusLabel(game.status)}</span>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="empty-note">No matches match the current filter.</p>
            )}
          </div>
        </section>

        <section className="panel public-festival-panel">
          <SectionTitle
            title="Games, fixtures, and rules"
            description="Open any event to see its fixtures and read the event rules."
            action={
              <label className="field-inline search-field public-festival-event-search">
                <span>Search</span>
                <input
                  value={eventSearch}
                  onChange={(event) => setEventSearch(event.target.value)}
                  placeholder="Search event, sport type, or venue"
                />
              </label>
            }
          />

          <div className="game-stack public-event-board">
            {visibleSportsEvents.map((sportEvent) => {
              const fixturesForEvent = eventFixtures
                .filter((fixture) => fixture.sportEventId === sportEvent.id)
                .sort((left, right) => {
                  const leftKey = `${left.fixtureDate || "9999-99-99"}-${left.fixtureTime || "99:99"}`;
                  const rightKey = `${right.fixtureDate || "9999-99-99"}-${right.fixtureTime || "99:99"}`;
                  return leftKey.localeCompare(rightKey) || left.fixtureNumber - right.fixtureNumber;
                });

              return (
                <article key={sportEvent.id} className="overview-item public-event-card">
                  <div className="public-event-card-copy">
                    <h4>{sportEvent.name}</h4>
                    <p>
                      {sportEvent.sportType} | {sportEvent.eventCategory} | {sportEvent.playersPerSide} per side
                    </p>
                    <p>
                      {sportEvent.venue} | {formatStatusLabel(sportEvent.status)}
                    </p>
                    <div className="event-meta-strip">
                      <span>{fixturesForEvent.length} fixture{fixturesForEvent.length === 1 ? "" : "s"}</span>
                      {sportEvent.rules ? <span>Rules available</span> : <span>Rules pending</span>}
                    </div>
                    {fixturesForEvent.length > 0 ? (
                      <div className="schedule-list public-event-fixtures">
                        {fixturesForEvent.map((fixture) => {
                          const sideAPlayerIds = fixture.assignments?.A ?? [];
                          const sideBPlayerIds = fixture.assignments?.B ?? [];
                          const teamAName = teamsById.get(fixture.sideATeamId)?.name ?? "Team A";
                          const teamBName = teamsById.get(fixture.sideBTeamId)?.name ?? "Team B";
                          const winnerName = teamsById.get(fixture.winnerTeamId)?.name ?? "";

                          return (
                            <article key={fixture.id} className="schedule-item public-event-fixture-item">
                              <div>
                                <h4>{fixture.label || `Fixture ${fixture.fixtureNumber}`}</h4>
                                <p>
                                  {teamAName}: {getFixturePlayerSummary(sideAPlayerIds, playersById)}
                                </p>
                                <p>
                                  {teamBName}: {getFixturePlayerSummary(sideBPlayerIds, playersById)}
                                </p>
                                {winnerName ? <p>Winner: {winnerName}</p> : null}
                              </div>
                              <div className="schedule-meta">
                                <span>
                                  {formatScheduleLabel({
                                    date: fixture.fixtureDate,
                                    time: fixture.fixtureTime,
                                  })}
                                </span>
                                <span>{fixture.venue || "TBD"}</span>
                                <span>{formatStatusLabel(fixture.status)}</span>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="empty-note">Fixtures will be published here once scheduled.</p>
                    )}
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="ghost-button inline-button"
                      onClick={() => setViewingRulesSportEventId(sportEvent.id)}
                    >
                      {sportEvent.rules ? "Read rules" : "View event"}
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleSportsEvents.length === 0 ? (
              <p className="empty-note">No sport events match your search yet.</p>
            ) : null}
          </div>
        </section>

        <AppCopyright />
      </div>

      {viewingRulesSportEvent ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setViewingRulesSportEventId("")}
        >
          <section
            className="panel sport-event-rules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-rules-title"
            onClick={(event) => event.stopPropagation()}
          >
            <SectionTitle
              title={viewingRulesSportEvent.name}
              description={`${viewingRulesSportEvent.sportType} | ${viewingRulesSportEvent.eventCategory}`}
              action={
                <button
                  type="button"
                  className="ghost-button inline-button"
                  onClick={() => setViewingRulesSportEventId("")}
                >
                  Close
                </button>
              }
            />
            <div className="sport-event-rules-modal-body">
              <p id="public-rules-title" className="sport-event-rules-copy">
                {viewingRulesSportEvent.rules || "Rules will be published here soon."}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
