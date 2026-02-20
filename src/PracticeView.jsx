import { useMemo, useState } from "react";

function parseIndexSet(correctIndices) {
  return new Set(
    String(correctIndices || "")
      .split(",")
      .map((x) => parseInt(String(x).trim(), 10))
      .filter((n) => Number.isFinite(n))
  );
}
const norm = (s) => String(s ?? "").toLowerCase().trim();

export default function PracticeView({ questions, attempts, onAddAttempt }) {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState("all"); // all | missed
  const [category, setCategory] = useState("ALL");
  const [count, setCount] = useState(10);

  // NEW filters
  const [keyword, setKeyword] = useState("");
  const [sataOnly, setSataOnly] = useState(false);

  const [session, setSession] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionMissedIds, setSessionMissedIds] = useState(new Set());

  const latestByQuestion = useMemo(() => {
    const map = new Map();
    for (const a of attempts) if (!map.has(a.questionId)) map.set(a.questionId, a);
    return map;
  }, [attempts]);

  const categories = useMemo(() => {
    const set = new Set(questions.map((q) => q.category).filter(Boolean));
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [questions]);

  const clearSelection = () => {
    setSelected(new Set());
    setSubmitted(false);
    setWasCorrect(false);
  };

  const newSetup = () => {
    setStarted(false);
    setSession([]);
    setIdx(0);
    setSelected(new Set());
    setSubmitted(false);
    setWasCorrect(false);
    setCompleted(false);
    setSessionCorrect(0);
    setSessionTotal(0);
    setSessionMissedIds(new Set());
  };

  const buildPool = () => {
    let pool = questions;

    if (category !== "ALL") pool = pool.filter((q) => q.category === category);

    const k = norm(keyword);
    if (k) pool = pool.filter((q) => norm(q.stem).includes(k));

    if (sataOnly) pool = pool.filter((q) => norm(q.kind) === "sata");

    if (mode === "missed") {
      const missedIds = new Set(
        [...latestByQuestion.entries()].filter(([, a]) => !a.isCorrect).map(([qid]) => qid)
      );
      pool = pool.filter((q) => missedIds.has(q.id));
    }

    return pool;
  };

  const start = () => {
    const pool = buildPool();
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const take = Math.max(1, Math.min(count, shuffled.length));
    const s = shuffled.slice(0, take);

    setSession(s);
    setStarted(true);
    setIdx(0);
    setCompleted(s.length === 0);
    clearSelection();

    setSessionTotal(s.length);
    setSessionCorrect(0);
    setSessionMissedIds(new Set());
  };

  const toggle = (i) => {
    if (!started || submitted) return;
    const q = session[idx];
    if (!q) return;

    const kind = norm(q.kind || "single");
    if (kind === "single") setSelected(new Set([i]));
    else {
      const next = new Set(selected);
      next.has(i) ? next.delete(i) : next.add(i);
      setSelected(next);
    }
  };

  const submit = () => {
    const q = session[idx];
    if (!q || selected.size === 0) return;

    const correct = parseIndexSet(q.correctIndices);
    const ok = selected.size === correct.size && [...selected].every((x) => correct.has(x));

    setSubmitted(true);
    setWasCorrect(ok);

    if (ok) setSessionCorrect((c) => c + 1);
    else setSessionMissedIds((prev) => new Set(prev).add(q.id));

    onAddAttempt({
      id: crypto.randomUUID(),
      questionId: q.id,
      category: q.category,
      selected: [...selected].sort((a, b) => a - b),
      isCorrect: ok,
      attemptedAt: Date.now(),
    });
  };

  const next = () => {
    const nextIdx = idx + 1;
    if (nextIdx >= session.length) {
      setCompleted(true);
      return;
    }
    setIdx(nextIdx);
    clearSelection();
  };

  const poolCount = buildPool().length;

  if (questions.length === 0) {
    return <div className="card"><h2>Practice</h2><div className="muted">Import questions first.</div></div>;
  }

  if (!started) {
    return (
      <div className="grid">
        <div className="card">
          <h2>Practice Setup</h2>

          <div className="grid">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Mode</div>
              <label style={{ marginRight: 14 }}>
                <input type="radio" checked={mode === "all"} onChange={() => setMode("all")} /> All
              </label>
              <label>
                <input type="radio" checked={mode === "missed"} onChange={() => setMode("missed")} /> Missed only
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Category</div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%" }}>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: "1 1 260px" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Keyword</div>
                <input className="input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search in question text" style={{ width: "100%" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label className="pill" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={sataOnly} onChange={(e) => setSataOnly(e.target.checked)} style={{ marginRight: 8 }} />
                SATA only
              </label>

              <div style={{ flex: 1 }} />

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Questions</div>
                <input className="input" type="number" min={1} max={200} value={count} onChange={(e) => setCount(parseInt(e.target.value || "10", 10))} style={{ width: 120 }} />
              </div>
            </div>

            <div className="muted">Pool matched: <b>{poolCount}</b></div>

            <button className="btn primary" onClick={start} style={{ width: 180 }}>
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="grid">
        <div className="card">
          <h2>Session Complete</h2>
          <div className="muted">Score: <b>{sessionCorrect}</b> / <b>{sessionTotal}</b></div>
          <div style={{ height: 10 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => { setStarted(false); setCompleted(false); }}>Back to Setup</button>
            <button className="btn primary" onClick={newSetup}>New Setup</button>
          </div>
        </div>
      </div>
    );
  }

  const q = session[idx];
  if (!q) return <div className="card"><h2>Practice</h2><div className="muted">No questions for this setup.</div><button className="btn" onClick={newSetup}>Back</button></div>;

  const correctSet = parseIndexSet(q.correctIndices);
  const kind = norm(q.kind || "single");

  return (
    <div className="grid">
      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="pill">{q.category}</span>
          {kind === "sata" && <span className="pill">SATA</span>}
          <span className="pill">{idx + 1}/{session.length}</span>
          <span className="pill">Score {sessionCorrect}/{sessionTotal}</span>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={newSetup}>Setup</button>
        </div>

        <div style={{ height: 10 }} />
        <h3>{q.stem}</h3>

        <div className="grid">
          {q.options.map((opt, i) => {
            const isSelected = selected.has(i);
            const isCorrect = correctSet.has(i);

            let bg = "rgba(15,23,48,.85)";
            let border = "var(--border)";
            if (!submitted && isSelected) { bg = "rgba(106,166,255,.22)"; border = "rgba(106,166,255,.45)"; }
            if (submitted && isCorrect) { bg = "rgba(52,211,153,.18)"; border = "rgba(52,211,153,.35)"; }
            if (submitted && isSelected && !isCorrect) { bg = "rgba(251,113,133,.18)"; border = "rgba(251,113,133,.35)"; }

            const icon = kind === "sata" ? (isSelected ? "☑" : "☐") : (isSelected ? "◉" : "○");

            return (
              <button
                key={i}
                className="btn"
                onClick={() => toggle(i)}
                style={{ textAlign: "left", background: bg, borderColor: border, display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ width: 22 }}>{icon}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {submitted && (
          <div className="card" style={{ marginTop: 12, background: "rgba(18,28,57,.55)" }}>
            <b>{wasCorrect ? "Correct" : "Incorrect"}</b>
            {q.rationale ? <div className="muted" style={{ marginTop: 6 }}>{q.rationale}</div> : null}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          {!submitted ? (
            <button className="btn primary" onClick={submit} disabled={selected.size === 0}>Submit</button>
          ) : (
            <button className="btn primary" onClick={next}>Next</button>
          )}
          {!submitted && selected.size > 0 && <button className="btn" onClick={() => setSelected(new Set())}>Clear</button>}
        </div>
      </div>
    </div>
  );
}