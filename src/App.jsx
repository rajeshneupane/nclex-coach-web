import StatsView from "./StatsView";
import { useEffect, useState } from "react";
import { loadState, saveState } from "./storage";
import ImportView from "./ImportView";
import PracticeView from "./PracticeView";

export default function App() {
  const [tab, setTab] = useState("home");
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once
  useEffect(() => {
    const s = loadState();
    setQuestions(s.questions);
    setAttempts(s.attempts);
    setHydrated(true);
  }, []);

  // Save only AFTER hydration
  useEffect(() => {
    if (!hydrated) return;
    saveState({ questions, attempts });
  }, [hydrated, questions, attempts]);

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui",
        color: "#111",
        background: "#fff",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginTop: 0 }}>NCLEX Coach (Web)</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
	<button onClick={() => setTab("home")}>Home</button>
        <button onClick={() => setTab("practice")}>Practice</button>
        <button onClick={() => setTab("import")}>Import</button>
        <button onClick={() => setTab("stats")}>Stats</button>
      </div>

	{tab === "home" && (
  <div style={{ display: "grid", gap: 12 }}>
    <h2 style={{ margin: 0 }}>Home</h2>

    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
      <div><b>Question bank:</b> {questions.length}</div>
      <div><b>Total attempts:</b> {attempts.length}</div>
    </div>

    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button onClick={() => setTab("import")}>Import Questions</button>
      <button onClick={() => setTab("practice")}>Start Practice</button>
      <button onClick={() => setTab("stats")}>View Stats</button>
    </div>

    <div style={{ color: "#666" }}>
      Tip: Import a CSV first, then practice. Data is saved in this browser.
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
            setQuestions([]);
            setAttempts([]);
          }}
        />
      )}

      {tab === "stats" && <StatsView questions={questions} attempts={attempts} />}

      <div style={{ marginTop: 30, color: "#666", fontSize: 12 }}>
        Local data: {questions.length} questions • {attempts.length} attempts
      </div>
    </div>
  );
}
