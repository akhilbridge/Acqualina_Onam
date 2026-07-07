import { useState } from "react";
import SectionTitle from "../../components/SectionTitle";

const TEAM_PLAYER_OPTION_PREFIX = "player:";

const EMPTY_USER_FORM = {
  fullName: "",
  email: "",
  password: "",
  role: "captain",
  teamId: "",
};

const EMPTY_TEAM_FORM = {
  name: "",
  captainUserId: "",
};

function getUserRoleLabel(role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "captain") {
    return "Captain";
  }

  if (role === "moderator") {
    return "Moderator";
  }

  return "Player";
}

export default function TeamsView({
  database,
  teams,
  captainUsers,
  role,
  activeCaptain,
  onCreateUser,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
}) {
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM);
  const [editingTeamId, setEditingTeamId] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [teamStatus, setTeamStatus] = useState("");
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  const visibleTeams = activeCaptain
    ? teams.filter((team) => team.id === activeCaptain.teamId)
    : teams;
  const staffUsers = database.users.filter((user) => user.role !== "admin");
  const isEditingTeam = editingTeamId.length > 0;
  const selectedTeamPlayers = editingTeamId
    ? database.players.filter((player) => player.teamId === editingTeamId)
    : [];
  const selectedTeamCaptainLogins = editingTeamId
    ? captainUsers.filter((user) => user.teamId === editingTeamId)
    : [];

  const resetTeamForm = () => {
    setTeamForm(EMPTY_TEAM_FORM);
    setEditingTeamId("");
  };

  const usePlayerForCaptainLogin = (player) => {
    setUserStatus("");
    setUserForm((current) => ({
      ...current,
      fullName: player.name,
      role: "captain",
      teamId: player.teamId ?? current.teamId,
    }));
  };

  const handleCaptainLoginChange = (value) => {
    setTeamForm((current) => ({
      ...current,
      captainUserId: value,
    }));

    if (!value.startsWith(TEAM_PLAYER_OPTION_PREFIX)) {
      return;
    }

    const selectedPlayerId = value.slice(TEAM_PLAYER_OPTION_PREFIX.length);
    const selectedPlayer = selectedTeamPlayers.find((player) => player.id === selectedPlayerId);

    if (!selectedPlayer) {
      return;
    }

    usePlayerForCaptainLogin(selectedPlayer);
    setTeamStatus(
      `${selectedPlayer.name} is a roster player. Create a captain login for this player in the left form, then select that login here.`,
    );
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (
      !userForm.fullName.trim() ||
      !userForm.email.trim() ||
      userForm.password.trim().length < 8
    ) {
      setUserStatus("Name, email, and a password with at least 8 characters are required.");
      return;
    }

    try {
      setUserSubmitting(true);
      setUserStatus("");
      await onCreateUser({
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        teamId: userForm.teamId || null,
      });
      setUserForm(EMPTY_USER_FORM);
      setUserStatus(`${getUserRoleLabel(userForm.role)} account created successfully.`);
    } catch (createError) {
      setUserStatus(createError.message ?? "User creation failed.");
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleTeamSubmit = async (event) => {
    event.preventDefault();
    if (!teamForm.name.trim()) {
      setTeamStatus("Team name is required.");
      return;
    }

    if (teamForm.captainUserId.startsWith(TEAM_PLAYER_OPTION_PREFIX)) {
      setTeamStatus("Create a captain login for the selected team player first, then assign that login here.");
      return;
    }

    try {
      setTeamSubmitting(true);
      setTeamStatus("");

      if (isEditingTeam) {
        await onUpdateTeam({
          id: editingTeamId,
          name: teamForm.name.trim(),
          captainUserId: teamForm.captainUserId || null,
        });
        resetTeamForm();
        setTeamStatus("Team updated successfully.");
      } else {
        await onCreateTeam(teamForm.name.trim(), teamForm.captainUserId || null);
        resetTeamForm();
        setTeamStatus("Team created successfully.");
      }
    } catch (createError) {
      setTeamStatus(createError.message ?? "Team save failed.");
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleEditTeam = (team) => {
    setTeamStatus("");
    setEditingTeamId(team.id);
    setTeamForm({
      name: team.name,
      captainUserId: team.captainUserId ?? "",
    });
  };

  const handleDeleteTeam = async (team) => {
    const confirmed = window.confirm(
      `Delete ${team.name}? This will also remove players, games, and assignments connected to this team.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setTeamSubmitting(true);
      setTeamStatus("");
      await onDeleteTeam(team.id);
      if (editingTeamId === team.id) {
        resetTeamForm();
      }
      setTeamStatus("Team deleted successfully.");
    } catch (deleteError) {
      setTeamStatus(deleteError.message ?? "Team delete failed.");
    } finally {
      setTeamSubmitting(false);
    }
  };

  return (
    <section className="view-stack">
      <SectionTitle
        title="Teams and user logins"
        description="Admins can create captain, moderator, and player logins, then connect captain logins to teams."
      />

      {role === "admin" ? (
        <div className="dashboard-grid">
          <form className="panel form-panel" onSubmit={handleCreateUser}>
            <SectionTitle
              title="Create user login"
              description="This creates a real Supabase Auth account for captains, moderators, or normal players."
            />
            <label>
              <span>Full name</span>
              <input
                value={userForm.fullName}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Enter full name"
                disabled={userSubmitting}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="user@team.com"
                disabled={userSubmitting}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Set login password"
                disabled={userSubmitting}
              />
            </label>
            <label>
              <span>User type</span>
              <select
                value={userForm.role}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                disabled={userSubmitting}
              >
                <option value="captain">Captain</option>
                <option value="moderator">Moderator</option>
                <option value="player">Normal Player</option>
              </select>
            </label>
            <label>
              <span>Assign team</span>
              <select
                value={userForm.teamId}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    teamId: event.target.value,
                  }))
                }
                disabled={userSubmitting}
              >
                <option value="">Assign later</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint">
              Only users created here can sign in. To assign a team captain, create a login with
              User type = Captain.
            </p>
            {isEditingTeam && selectedTeamPlayers.length > 0 ? (
              <div className="field-inline">
                <span>Use an existing team player for captain login</span>
                <p className="field-hint">
                  These are roster players from {teamForm.name}. Pick one to prefill the captain
                  login form.
                </p>
                <div className="table-actions">
                  {selectedTeamPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className="ghost-button inline-button"
                      onClick={() => usePlayerForCaptainLogin(player)}
                      disabled={userSubmitting}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {userStatus ? <p className="status-note">{userStatus}</p> : null}
            <button type="submit" className="primary-button" disabled={userSubmitting}>
              {userSubmitting ? "Creating..." : "Add user"}
            </button>
          </form>

          <form className="panel form-panel" onSubmit={handleTeamSubmit}>
            <SectionTitle
              title={isEditingTeam ? "Edit team and captain" : "Create team"}
              description="Create a team, assign a captain login, or reassign the captain later."
            />
            <label>
              <span>Team name</span>
              <input
                value={teamForm.name}
                onChange={(event) =>
                  setTeamForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Team name"
                disabled={teamSubmitting}
              />
            </label>
            <label>
              <span>Assign captain login</span>
              <select
                value={teamForm.captainUserId}
                onChange={(event) => handleCaptainLoginChange(event.target.value)}
                disabled={teamSubmitting}
              >
                <option value="">No captain login yet</option>
                {isEditingTeam && selectedTeamPlayers.length > 0 ? (
                  <optgroup label={`Team players in ${teamForm.name}`}>
                    {selectedTeamPlayers.map((player) => (
                      <option
                        key={player.id}
                        value={`${TEAM_PLAYER_OPTION_PREFIX}${player.id}`}
                      >
                        {player.name} (player roster)
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="Captain logins">
                  {captainUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {user.teamId
                        ? ` (${teams.find((team) => team.id === user.teamId)?.name ?? "assigned"})`
                        : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <p className="field-hint">
              Team players are listed here for quick captain selection. If you choose a roster
              player, the captain-login form is prefilled so you can create that login first.
            </p>
            {isEditingTeam && selectedTeamPlayers.length > 0 ? (
              <p className="field-hint">
                {selectedTeamPlayers.length} team player
                {selectedTeamPlayers.length === 1 ? "" : "s"} found in {teamForm.name}:{" "}
                {selectedTeamPlayers.map((player) => player.name).join(", ")}.
                {selectedTeamCaptainLogins.length === 0
                  ? " Pick a player above to prefill captain login creation, then assign that login here."
                  : " Captain logins already linked to this team also appear in the dropdown."}
              </p>
            ) : null}
            {teamStatus ? <p className="status-note">{teamStatus}</p> : null}
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={teamSubmitting}>
                {teamSubmitting
                  ? "Saving..."
                  : isEditingTeam
                    ? "Update team"
                    : "Create team"}
              </button>
              {isEditingTeam ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={resetTeamForm}
                  disabled={teamSubmitting}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      <section className="team-grid">
        {visibleTeams.map((team) => {
          const captain = database.users.find((user) => user.id === team.captainUserId);
          const players = database.players.filter((player) => player.teamId === team.id);
          const teamUsers = staffUsers.filter((user) => user.teamId === team.id);

          return (
            <article key={team.id} className="panel team-card">
              <div className="team-card-header">
                <div>
                  <span className="eyebrow">Team</span>
                  <h4>{team.name}</h4>
                </div>
                <div className="table-actions">
                  <span className="stat-badge">{players.length} players</span>
                  {role === "admin" ? (
                    <>
                      <button
                        type="button"
                        className="ghost-button inline-button"
                        onClick={() => handleEditTeam(team)}
                        disabled={teamSubmitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button inline-button"
                        onClick={() => handleDeleteTeam(team)}
                        disabled={teamSubmitting}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <p>
                Captain: <strong>{captain?.name ?? "Not assigned yet"}</strong>
              </p>
              {captain?.email ? <p>Login: {captain.email}</p> : null}
              <div className="roster-preview">
                {teamUsers.slice(0, 4).map((user) => (
                  <span key={user.id} className="roster-token">
                    {user.name} ({getUserRoleLabel(user.role)})
                  </span>
                ))}
                {teamUsers.length === 0 ? <span className="muted">No logins assigned yet.</span> : null}
              </div>
              {players.length > 0 ? (
                <p className="field-hint">
                  Team players: {players.map((player) => player.name).join(", ")}
                </p>
              ) : null}
            </article>
          );
        })}
      </section>
    </section>
  );
}
