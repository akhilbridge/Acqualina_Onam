import { startTransition, useEffect, useState } from "react";
import Sidebar, { NAV_ITEMS } from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import AppCopyright from "./components/AppCopyright";
import DashboardView from "./features/dashboard/DashboardView";
import TeamsView from "./features/teams/TeamsView";
import PlayersView from "./features/players/PlayersView";
import GamesView from "./features/games/GamesView";
import FixturesView from "./features/fixtures/FixturesView";
import InterestsView from "./features/interests/InterestsView";
import SettingsView from "./features/settings/SettingsView";
import LoginView from "./features/auth/LoginView";
import PublicFestivalView from "./features/public/PublicFestivalView";
import PublicRegistrationView from "./features/public/PublicRegistrationView";
import { useAppDatabase, useAuthSession } from "./lib/database";

function LoadingPanel({ title, copy }) {
  return (
    <div className="auth-shell">
      <div className="auth-footer-stack">
        <section className="panel auth-panel">
          <span className="eyebrow">Aqualina Onam 2026</span>
          <h2>{title}</h2>
          <p>{copy}</p>
        </section>
        <AppCopyright />
      </div>
    </div>
  );
}

function getSessionIssuedAt(session) {
  const token = session?.access_token;
  if (!token) {
    return null;
  }

  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const decodedPayload =
      typeof window !== "undefined" ? window.atob(paddedPayload) : atob(paddedPayload);
    const parsedPayload = JSON.parse(decodedPayload);
    return typeof parsedPayload.iat === "number" ? parsedPayload.iat * 1000 : null;
  } catch {
    return null;
  }
}

export default function App() {
  const pathname =
    typeof window !== "undefined"
      ? window.location.pathname.replace(/\/+$/, "") || "/"
      : "/";
  const isPublicRegistrationRoute = pathname === "/register";
  const isPublicFestivalRoute = pathname === "/public" || pathname === "/festival";
  const [currentView, setCurrentView] = useState("dashboard");
  const [forcedLogoutNotice, setForcedLogoutNotice] = useState("");
  const [reauthenticating, setReauthenticating] = useState(false);
  const {
    configured,
    session,
    loading: authLoading,
    error: authError,
    signIn,
    signOut,
  } = useAuthSession();
  const {
    database,
    viewerProfile,
    loading,
    error,
    createUser,
    createTeam,
    updateTeam,
    deleteTeam,
    addPlayer,
    updatePlayer,
    deletePlayer,
    createSportEvent,
    updateSportEvent,
    deleteSportEvent,
    createEventFixture,
    updateEventFixture,
    deleteEventFixture,
    createSportEventEntry,
    deleteSportEventEntry,
    updatePublicInterestSubmission,
    deletePublicInterestSubmission,
    updateAppSettings,
    syncSportEventTeams,
    toggleSportEventPlayer,
    generateFixturesFromAi,
    createGame,
    updateGame,
    deleteGame,
    toggleAssignment,
  } = useAppDatabase(session?.user?.id ?? null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextNotice = window.sessionStorage.getItem("forcedLogoutNotice");
    if (!nextNotice) {
      return;
    }

    setForcedLogoutNotice(nextNotice);
    window.sessionStorage.removeItem("forcedLogoutNotice");
  }, []);

  useEffect(() => {
    const forceReauthAfter = database.appSettings.forceReauthAfter;
    if (!session || !forceReauthAfter) {
      return;
    }

    const sessionIssuedAt = getSessionIssuedAt(session);
    const forceReauthAt = Date.parse(forceReauthAfter);

    if (!Number.isFinite(forceReauthAt) || !sessionIssuedAt || sessionIssuedAt >= forceReauthAt) {
      return;
    }

    let active = true;
    setReauthenticating(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "forcedLogoutNotice",
        "Your session expired because an administrator required everyone to log in again.",
      );
    }

    signOut()
      .catch((signOutError) => {
        console.error("Forced sign-out failed", signOutError);
      })
      .finally(() => {
        if (active) {
          setReauthenticating(false);
        }
      });

    return () => {
      active = false;
    };
  }, [database.appSettings.forceReauthAfter, session, signOut]);

  if (isPublicRegistrationRoute) {
    return <PublicRegistrationView />;
  }

  if (isPublicFestivalRoute) {
    return <PublicFestivalView />;
  }

  if (!configured) {
    return <LoginView onSignIn={signIn} error="" configured={false} />;
  }

  if (authLoading) {
    return (
      <LoadingPanel
        title="Checking login"
        copy="Connecting to Supabase Auth and restoring your saved session."
      />
    );
  }

  if (!session) {
    return (
      <LoginView
        onSignIn={signIn}
        error={forcedLogoutNotice || authError}
        configured
      />
    );
  }

  if (reauthenticating) {
    return (
      <LoadingPanel
        title="Refreshing sign-in"
        copy="An administrator required a fresh login, so your current session is being closed."
      />
    );
  }

  if (loading) {
    return (
      <LoadingPanel
        title="Loading festival data"
        copy="Fetching teams, players, fixtures, and your role permissions."
      />
    );
  }

  if (!viewerProfile) {
    return (
      <div className="auth-shell">
        <div className="auth-footer-stack">
          <section className="panel auth-panel">
            <span className="eyebrow">Profile setup issue</span>
            <h2>Profile row not found</h2>
            <p>{error || "Run the SQL file in the supabase folder and then sign in again."}</p>
            <button type="button" className="ghost-button" onClick={signOut}>
              Sign out
            </button>
          </section>
          <AppCopyright />
        </div>
      </div>
    );
  }

  const role = viewerProfile.role;
  const activeCaptain = role === "captain" ? viewerProfile : null;
  const captainUsers = database.users.filter((user) => user.role === "captain");
  const navItems =
    role === "admin"
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) =>
          role === "captain"
            ? item.id !== "settings"
            : !["interests", "settings"].includes(item.id),
        );

  const handleCreateUser = (user) => createUser(user);
  const handleCreateTeam = (name, captainUserId) => createTeam(name, captainUserId);
  const handleUpdateTeam = (team) => updateTeam(team);
  const handleDeleteTeam = (teamId) => deleteTeam(teamId);
  const handleAddPlayer = (player) => addPlayer(player);
  const handleUpdatePlayer = (player) => updatePlayer(player);
  const handleDeletePlayer = (playerId) => deletePlayer(playerId);
  const handleCreateSportEvent = (sportEvent) => createSportEvent(sportEvent);
  const handleUpdateSportEvent = (sportEvent) => updateSportEvent(sportEvent);
  const handleDeleteSportEvent = (sportEvent) => deleteSportEvent(sportEvent);
  const handleCreateEventFixture = (request) => createEventFixture(request);
  const handleUpdateEventFixture = (request) => updateEventFixture(request);
  const handleDeleteEventFixture = (fixtureId) => deleteEventFixture(fixtureId);
  const handleCreateSportEventEntry = (request) => createSportEventEntry(request);
  const handleDeleteSportEventEntry = (entryId) => deleteSportEventEntry(entryId);
  const handleUpdatePublicInterestSubmission = (request) => updatePublicInterestSubmission(request);
  const handleDeletePublicInterestSubmission = (submissionId) =>
    deletePublicInterestSubmission(submissionId);
  const handleUpdateAppSettings = (request) => updateAppSettings(request);
  const handleSyncSportEventTeams = (request) => syncSportEventTeams(request);
  const handleToggleSportEventPlayer = (request) => toggleSportEventPlayer(request);
  const handleGenerateFixturesFromAi = (request) => generateFixturesFromAi(request);
  const handleCreateGame = (game) => createGame(game);
  const handleUpdateGame = (game) => updateGame(game);
  const handleDeleteGame = (gameId) => deleteGame(gameId);

  const handleUpdateAssignments = (gameId, teamId, playerId) => {
    if (role !== "captain" || activeCaptain?.teamId !== teamId) {
      return;
    }

    toggleAssignment(gameId, teamId, playerId).catch((updateError) => {
      console.error("Assignment update failed", updateError);
    });
  };

  const sharedProps = {
    database,
    teams: database.teams,
    role,
    activeCaptain,
  };

  let content = (
    <DashboardView
      database={database}
      teams={database.teams}
      activeCaptain={activeCaptain}
    />
  );

  if (error) {
    content = (
      <section className="view-stack">
        <section className="panel">
          <h3>Supabase data issue</h3>
          <p>{error}</p>
        </section>
        {content}
      </section>
    );
  }

  if (currentView === "teams") {
    content = (
      <TeamsView
        {...sharedProps}
        captainUsers={captainUsers}
        onCreateUser={handleCreateUser}
        onCreateTeam={handleCreateTeam}
        onUpdateTeam={handleUpdateTeam}
        onDeleteTeam={handleDeleteTeam}
      />
    );
  }

  if (currentView === "players") {
    content = (
      <PlayersView
        teams={database.teams}
        players={database.players}
        role={role}
        activeCaptain={activeCaptain}
        onAddPlayer={handleAddPlayer}
        onUpdatePlayer={handleUpdatePlayer}
        onDeletePlayer={handleDeletePlayer}
      />
    );
  }

  if (currentView === "games") {
    content = (
      <GamesView
        database={database}
        teams={database.teams}
        sportsEvents={database.sportsEvents}
        role={role}
        activeCaptain={activeCaptain}
        onCreateSportEvent={handleCreateSportEvent}
        onUpdateSportEvent={handleUpdateSportEvent}
        onDeleteSportEvent={handleDeleteSportEvent}
        onCreateSportEventEntry={handleCreateSportEventEntry}
        onDeleteSportEventEntry={handleDeleteSportEventEntry}
        onSyncSportEventTeams={handleSyncSportEventTeams}
        onToggleSportEventPlayer={handleToggleSportEventPlayer}
        onGenerateFixturesFromAi={handleGenerateFixturesFromAi}
        onCreateGame={handleCreateGame}
        onUpdateGame={handleUpdateGame}
        onDeleteGame={handleDeleteGame}
        onUpdateAssignments={handleUpdateAssignments}
      />
    );
  }

  if (currentView === "event-registrations" && ["admin", "captain"].includes(role)) {
    content = (
      <FixturesView
        database={database}
        teams={database.teams}
        sportsEvents={database.sportsEvents}
        role={role}
        activeCaptain={activeCaptain}
        onCreateSportEventEntry={handleCreateSportEventEntry}
        onDeleteSportEventEntry={handleDeleteSportEventEntry}
        onGenerateFixturesFromAi={handleGenerateFixturesFromAi}
        onCreateEventFixture={handleCreateEventFixture}
        onUpdateEventFixture={handleUpdateEventFixture}
        onDeleteEventFixture={handleDeleteEventFixture}
        viewMode="registrations"
        onBackToFixtures={() => startTransition(() => setCurrentView("fixtures"))}
      />
    );
  }

  if (currentView === "fixtures") {
    content = (
      <FixturesView
        database={database}
        teams={database.teams}
        sportsEvents={database.sportsEvents}
        role={role}
        activeCaptain={activeCaptain}
        onCreateSportEventEntry={handleCreateSportEventEntry}
        onDeleteSportEventEntry={handleDeleteSportEventEntry}
        onGenerateFixturesFromAi={handleGenerateFixturesFromAi}
        onCreateEventFixture={handleCreateEventFixture}
        onUpdateEventFixture={handleUpdateEventFixture}
        onDeleteEventFixture={handleDeleteEventFixture}
        viewMode="fixtures"
        onOpenRegistrations={() => startTransition(() => setCurrentView("event-registrations"))}
      />
    );
  }

  if (currentView === "interests" && ["admin", "captain"].includes(role)) {
    content = (
      <InterestsView
        submissions={database.publicInterestSubmissions}
        sportsEvents={database.sportsEvents}
        players={database.players}
        role={role}
        onUpdateSubmission={handleUpdatePublicInterestSubmission}
        onDeleteSubmission={handleDeletePublicInterestSubmission}
      />
    );
  }

  if (currentView === "settings" && role === "admin") {
    content = (
      <SettingsView
        appSettings={database.appSettings}
        onUpdateAppSettings={handleUpdateAppSettings}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        currentView={currentView}
        onChangeView={(view) => startTransition(() => setCurrentView(view))}
        viewerProfile={viewerProfile}
        onSignOut={signOut}
      />

      <main className="main-panel">
        {content}
        <AppCopyright className="app-main-copyright" />
      </main>

      <MobileNav
        items={navItems}
        currentView={currentView}
        onChangeView={(view) => startTransition(() => setCurrentView(view))}
      />
    </div>
  );
}
