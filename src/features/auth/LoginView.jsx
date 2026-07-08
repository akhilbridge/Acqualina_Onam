import { useState } from "react";
import AppCopyright from "../../components/AppCopyright";

export default function LoginView({ onSignIn, error, configured }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  const activeError = localError || error;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError("");

    const nextError = await onSignIn(form);
    if (nextError) {
      setLocalError(nextError);
    }

    setSubmitting(false);
  };

  return (
    <div className="auth-shell auth-shell-centered">
      <div className="auth-footer-stack">
        <section className="panel auth-panel">
          <h2>Login</h2>

          <form className="form-panel" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="Enter email"
                disabled={!configured || submitting}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Enter password"
                disabled={!configured || submitting}
              />
            </label>
            {activeError ? <p className="error-note">{activeError}</p> : null}
            <button
              type="submit"
              className="primary-button"
              disabled={!configured || submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
            {configured ? (
              <a className="ghost-button public-login-link" href="/register">
                Sports event registration
              </a>
            ) : null}
          </form>
        </section>
        <AppCopyright />
      </div>
    </div>
  );
}
