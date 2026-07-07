import { useEffect, useState } from "react";
import SectionTitle from "../../components/SectionTitle";

export default function SettingsView({ appSettings, onUpdateAppSettings }) {
  const [publicRegistrationLocked, setPublicRegistrationLocked] = useState(
    Boolean(appSettings.publicRegistrationLocked),
  );
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reauthSubmitting, setReauthSubmitting] = useState(false);

  useEffect(() => {
    setPublicRegistrationLocked(Boolean(appSettings.publicRegistrationLocked));
  }, [appSettings.publicRegistrationLocked]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      await onUpdateAppSettings({ publicRegistrationLocked });
      setStatus("Settings updated successfully.");
    } catch (settingsError) {
      setStatus(settingsError.message ?? "Settings update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges =
    publicRegistrationLocked !== Boolean(appSettings.publicRegistrationLocked);

  const handleForceReauth = async () => {
    setReauthSubmitting(true);
    setStatus("");

    try {
      await onUpdateAppSettings({
        publicRegistrationLocked,
        forceReauthAfter: new Date().toISOString(),
      });
      setStatus("All currently signed-in users will be asked to log in again.");
    } catch (settingsError) {
      setStatus(settingsError.message ?? "Force re-login update failed.");
    } finally {
      setReauthSubmitting(false);
    }
  };

  return (
    <section className="view-stack">
      <SectionTitle
        title="Settings"
        description="Control public registration access for sports event interest submissions."
      />

      <section className="panel">
        <form className="form-panel" onSubmit={handleSubmit}>
          <SectionTitle
            title="Public registration"
            description="When locked, residents can still open the public page and view previous submissions, but they cannot submit new interests."
          />

          <label className="assignment-row selected">
            <input
              type="checkbox"
              checked={publicRegistrationLocked}
              onChange={(event) => setPublicRegistrationLocked(event.target.checked)}
              disabled={submitting || reauthSubmitting}
            />
            <span>Lock public sports registration</span>
            <small>
              Current status: {appSettings.publicRegistrationLocked ? "Locked" : "Open"}
            </small>
          </label>

          <div className="assignment-row selected">
            <span>Force sign-in again</span>
            <small>
              {appSettings.forceReauthAfter
                ? `Current re-login cutoff: ${new Date(appSettings.forceReauthAfter).toLocaleString()}`
                : "No forced re-login is currently set."}
            </small>
          </div>

          {status ? <p className="status-note">{status}</p> : null}

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={submitting || reauthSubmitting || !hasChanges}
            >
              {submitting ? "Saving..." : "Save settings"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleForceReauth}
              disabled={submitting || reauthSubmitting}
            >
              {reauthSubmitting ? "Updating..." : "Require login again"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
