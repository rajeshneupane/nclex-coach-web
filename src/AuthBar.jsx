import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthBar({ onUser }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user ?? null;
      setUser(u);
      onUser?.(u);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      onUser?.(u);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, [onUser]);

  if (!supabase) return <span className="pill">Sync disabled</span>;

  if (user) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="pill">{user.email}</span>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input className="input" placeholder="email for login link" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 220 }} />
      <button
        className="btn primary"
        onClick={async () => {
          const e = email.trim();
          if (!e) return;
          const { error } = await supabase.auth.signInWithOtp({
            email: e,
            options: { emailRedirectTo: window.location.origin },
          });
          alert(error ? error.message : "Check your email for the login link.");
        }}
      >
        Send link
      </button>
    </div>
  );
}