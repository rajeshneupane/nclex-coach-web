import { useEffect, useRef, useState } from "react";
import PracticeView from "./PracticeView";
import ImportView from "./ImportView";
import StatsView from "./StatsView";
import AuthBar from "./AuthBar";
import { loadState, saveState } from "./storage";
import { pullCloudState, pushCloudState } from "./sync";

export default function App() {
  const [tab, setTab] = useState("home");

  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState(null);

  const pushTimer = useRef(null);
  const pulledOnceRef = useRef(false);

  // ---- Local load once ----
  useEffect(() => {
    const s = loadState();
    setQuestions(s.questions);
    setAttempts(s.attempts);
    setHydrated(true);
  }, []);

  // ---- Local save after hydration ----
  useEffect(() => {
    if (!hydrated) return;
    saveState({ questions, attempts });
  }, [hydrated, questions, attempts]);

  // ---- Pull cloud state on login (cloud wins). If no cloud state, push local up once. ----
  useEffect(() => {
    (async () => {
      if (!user) {
        pulledOnceRef.current = false;
        return;
      }
      if (pulledOnceRef.current) return;

      try {
        const cloud = await pullCloudState(user.id);

        if (cloud && Array.isArray(cloud.questions) && Array.isArray(cloud.attempts)) {
          setQuestions(cloud.questions);
          setAttempts(cloud.attempts);
        } else {
          // First time in cloud: push current local state
          await pushCloudState(user.id, { questions, attempts });
        }

        pulledOnceRef.current = true;
      } catch (e) {
        console.warn("Cloud pull failed:", e);
      }
    })();
    // We intentionally don't include questions/attempts as deps here,
    // so logging in doesn't re-trigger pull mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---- Push to cloud (debounced) when logged in ----
  useEffect(() => {
    if (!user) return;
    if (!hydrated) return;
    if (!pulledOnceRef.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);

    pushTimer.current = setTimeout(async () => {
      try {
        await pushCloudState(user.id, { questions, attempts });
      } catch (e) {
        console.warn("Cloud push failed:", e);
      }
    }, 800);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [user, hydrated, questions, attempts]);

  const TabBtn = ({ id, label }) => (
    <button className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
      {label}
    </button>
  );

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <h1>NCLEX Coach</h1>
          <div className="sub">
            {questions.length} questions • {attempts.length} attempts
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div className="tabs">
            <TabBtn id="home" label="Home" />
            <TabBtn id="practice" label="Practice" />
            <TabBtn id="import" label="Import" />
            <TabBtn id="stats" label="Stats" />
          </div>

          <AuthBar onUser={setUser} />
        </div>
      </div>

      <div style={{ height: 12 }} />

      {tab === "home" && (
        <div className="grid">
          <div className="card">
            <h2>Home</h2>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span className="muted">Question bank</span>
                <span><b>{questions.length}</b></span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span className="muted">Total attempts</span>
                <span><b>{attempts.length}</b></span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button className="btn primary" onClick={() => setTab("practice")}>Start Practice</button>
              <button className="btn" onClick={() => setTab("import")}>Import Questions</button>
              <button className="btn" onClick={() => setTab("stats")}>View Stats</button>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Optional sync: sign in with email to keep progress across devices.
            </div>
          </div>
        </div>
      )}

      {tab === "practice" && (
        <PracticeView
          questions={questions}
          attempts={attempts}
          onAddAttempt={(a) => setAttempts((prev) => [a, ...prev])}
        />
      )}

      {tab === "import" && (
        <ImportView
          questions={questions}
          onImport={(qs) => setQuestions(qs)}
          onResetAll={() => {
            if (confirm("Reset all questions and attempts?")) {
              setQuestions([]);
              setAttempts([]);
            }
          }}
        />
      )}

      {tab === "stats" && <StatsView questions={questions} attempts={attempts} />}
    </div>
  );
}