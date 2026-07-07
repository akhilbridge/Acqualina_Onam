import { CATEGORY_OPTIONS } from "../../data/seed";
import SectionTitle from "../../components/SectionTitle";

function getFixtureHeading(game) {
  return game.fixtureLabel ? `${game.title} · ${game.fixtureLabel}` : game.title;
}

function getCategoryCounts(players, teamId) {
  return CATEGORY_OPTIONS.map((category) => ({
    category,
    count: players.filter(
      (player) => player.teamId === teamId && player.category === category,
    ).length,
  }));
}

export default function DashboardView({ database, teams, activeCaptain }) {
  const totalAssignments = database.games.reduce(
    (count, game) =>
      count +
      Object.values(game.assignments).reduce(
        (assignmentCount, roster) => assignmentCount + roster.length,
        0,
      ),
    0,
  );

  const visibleTeams = activeCaptain
    ? teams.filter((team) => team.id === activeCaptain.teamId)
    : teams;

  return (
    <section className="view-stack">
      <SectionTitle
        title="Festival overview"
        description="A quick look at teams, category balance, and how many players are already slotted into fixtures."
      />

      <div className="hero-grid">
        <article className="hero-card card-accent">
          <span className="eyebrow">Roster health</span>
          <strong>{database.players.length}</strong>
          <p>Players registered with villa numbers and category tags.</p>
        </article>
        <article className="hero-card">
          <span className="eyebrow">Lineups ready</span>
          <strong>{totalAssignments}</strong>
          <p>Total participant assignments across all created fixtures.</p>
        </article>
        <article className="hero-card">
          <span className="eyebrow">User accounts</span>
          <strong>{database.users.length}</strong>
          <p>Supports admin, captain, moderator, and normal player logins.</p>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <SectionTitle
            title="Team category mix"
            description="Admin can check how each team is balanced across the configured player categories."
          />
          <div className="team-grid">
            {visibleTeams.map((team) => (
              <article key={team.id} className="team-summary">
                <div className="team-summary-header">
                  <h4>{team.name}</h4>
                </div>
                <div className="category-pills">
                  {getCategoryCounts(database.players, team.id).map((item) => (
                    <span key={item.category} className="category-pill">
                      {item.category}: {item.count}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionTitle
            title="Upcoming fixtures"
            description="Every fixture shows the two teams and the current number of selected participants."
          />
          <div className="schedule-list">
            {database.games.map((game) => {
              const teamA = teams.find((team) => team.id === game.teamAId);
              const teamB = teams.find((team) => team.id === game.teamBId);
              const assignedCount =
                (game.assignments[game.teamAId] || []).length +
                (game.assignments[game.teamBId] || []).length;

              return (
                <article key={game.id} className="schedule-item">
                  <div>
                    <h4>{getFixtureHeading(game)}</h4>
                    <p>
                      {teamA?.name} vs {teamB?.name}
                    </p>
                  </div>
                  <div className="schedule-meta">
                    <span>{game.date}</span>
                    <span>{assignedCount} assigned</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
