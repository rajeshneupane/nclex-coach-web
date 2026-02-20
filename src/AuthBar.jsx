import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthBar({ onUser }) {
  const [user, setUser] = useState(null);

  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user ?? null;
      setUser(u);
      onUser?.(u);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      onUser?.(u);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, [onUser]);

  if (!supabase) {
    return <span className="pill">Sync disabled</span>;
  }

  const cleanEmail = email.trim();

  async function doSignIn() {
    setMsg("");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      if (!data?.session) setMsg("Signed in, but no session returned.");
    } catch (e) {
      setMsg(e.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function doSignUp() {
    setMsg("");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        // If you later enable email confirmations, Supabase may require confirmation.
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      // If confirmations are OFF, you may be signed in immediately.
      // If confirmations are ON, user must confirm email before session.
      if (data?.session) {
        setMsg("Account created and signed in.");
      } else {
        setMsg("Account created. If email confirmation is enabled, check your inbox.");
      }
    } catch (e) {
      setMsg(e.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function doResetPassword() {
    setMsg("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMsg("Password reset email sent (check inbox/spam).");
    } catch (e) {
      setMsg(e.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="pill">{user.email}</span>
        <button
          className="btn"
          onClick={async () => {
            setMsg("");
            await supabase.auth.signOut();
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ minWidth: 180 }}
          autoComplete="email"
        />
        <input
          className="input"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ minWidth: 140 }}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {mode === "signin" ? (
          <>
            <button
              className="btn primary"
              disabled={busy || !cleanEmail || !password}
              onClick={doSignIn}
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setMsg("");
                setMode("signup");
              }}
            >
              Create account
            </button>
          </>
        ) : (
          <>
            <button
              className="btn primary"
              disabled={busy || !cleanEmail || password.length < 6}
              onClick={doSignUp}
            >
              {busy ? "Creating..." : "Sign up"}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setMsg("");
                setMode("signin");
              }}
            >
              Have an account?
            </button>
          </>
        )}
      </div>

      <button
        className="btn"
        disabled={busy || !cleanEmail}
        onClick={doResetPassword}
        title="Sends a password reset email"
      >
        Forgot?
      </button>

      {msg ? <span className="pill">{msg}</span> : null}
    </div>
  );
}