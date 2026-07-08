export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "teams", label: "Teams" },
  { id: "players", label: "Players" },
  { id: "games", label: "Games" },
  { id: "fixtures", label: "Fixtures" },
  { id: "interests", label: "Interests" },
  { id: "settings", label: "Settings" },
];

function getRoleLabel(role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "captain") {
    return "Team Captain";
  }

  if (role === "moderator") {
    return "Moderator";
  }

  return "Player";
}

export default function Sidebar({
  items,
  currentView,
  onChangeView,
  viewerProfile,
  onSignOut,
}) {
  const roleLabel = getRoleLabel(viewerProfile.role);

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <h1>Aqualina Onam 2026</h1>
        <p className="brand-copy">
          Plan teams, players, fixtures, and festival events together in one
          simple place.
        </p>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === currentView ? "nav-item active" : "nav-item"}
            onClick={() => onChangeView(item.id)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="account-card compact-account-card sidebar-account-card">
          <span className="eyebrow">{roleLabel}</span>
          <small>{viewerProfile.email}</small>
        </div>
        <button
          type="button"
          className="ghost-button compact-logout-button sidebar-logout-button"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
