import { useState, type FormEvent } from "react";

import { useAuth } from "../lib/auth";

export default function AuthPage() {
  const { signIn, signUp, authDisabled } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const action = mode === "signin" ? signIn : signUp;
    const message = await action(email, password);

    setLoading(false);
    if (message) {
      setError(message);
    }
  };

  if (authDisabled) {
    return (
      <div className="page auth-page">
        <div className="auth-card">
          <h1 className="page-title">Auth disabled</h1>
          <p className="page-subtitle">
            You're running in local dev mode. No sign-in is required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1 className="page-title">{mode === "signin" ? "Welcome back" : "Join the vibe"}</h1>
        <p className="page-subtitle">
          {mode === "signin"
            ? "Sign in to RSVP, host events, and check in."
            : "Create an account to host events and connect with other builders."}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          className="ghost-button"
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
