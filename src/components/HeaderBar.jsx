export default function HeaderBar({
  viewerProfile,
  totals,
  currentViewLabel,
  onSignOut,
}) {
  const roleLabel =
    viewerProfile.role === "admin"
      ? "Admin"
      : viewerProfile.role === "captain"
        ? "Team Captain"
        : viewerProfile.role === "moderator"
          ? "Moderator"
          : "Player";

  return (
    <header className="topbar-shell">
      <div className="topbar">
        <div className="topbar-copy">
          <p className="eyebrow">Current view</p>
          <h2 className="topbar-title">{currentViewLabel}</h2>
        </div>
      </div>

      <div className="mobile-context-card">
        <div>
          <span className="eyebrow">Current section</span>
          <strong>{currentViewLabel}</strong>
        </div>
        <div className="mobile-context-stats">
          <span>{roleLabel}</span>
          <span>{viewerProfile.email}</span>
          <span>{totals.teams} teams</span>
        </div>
        <button
          type="button"
          className="ghost-button compact-logout-button mobile-logout-button"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
