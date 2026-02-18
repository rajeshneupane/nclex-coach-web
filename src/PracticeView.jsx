import { useMemo, useState } from "react";

function parseIndexSet(correctIndices) {
  return new Set(
    String(correctIndices || "")
      .split(",")
      .map((x) => parseInt(String(x).trim(), 10))
      .filter((n) => Number.isFinite(n))
  );
}

export default function PracticeView({ questions, attempts, onAddAttempt }) {
  // --- Setup state (pre-start) ---
  const [started, setStarted] = useState(false);
  const [setupMode, setSetupMode] = useState("all"); // all | missed
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [questionCount, setQuestionCount] = useState(10);

  // --- Session state ---
  const [session, setSession] = useState([]); // array of question objects
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Session scoring
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionMissedIds, setSessionMissedIds] = useState(new Set());

  // Latest attempt per question (attempts stored newest-first)
  const latestByQuestion = useMemo(() => {
    const map = new Map();
    for (const a of attempts) {
      if (!map.has(a.questionId)) map.set(a.questionId, a);
    }
    return map;
  }, [attempts]);

  // Category list derived from question bank
  const categories = useMemo(() => {
    const set = new Set(questions.map((q) => q.category).filter(Boolean));
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [questions]);

  const clearSelection = () => {
    setSelected(new Set());
    setSubmitted(false);
    setWasCorrect(false);
  };

  const resetRunState = () => {
    setIdx(0);
    setCompleted(false);
    clearSelection();
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

  const buildSession = (mode, category, count) => {
    let pool = questions;

    // Filter category
    if (category && category !== "ALL") {
      pool = pool.filter((q) => q.category === category);
    }

    // Missed mode pool: latest attempt is incorrect
    if (mode === "missed") {
      const missedIds = new Set(
        [...latestByQuestion.entries()]
          .filter(([, a]) => !a.isCorrect)
          .map(([qid]) => qid)
      );
      pool = pool.filter((q) => missedIds.has(q.id));
    }

    // Shuffle
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    // Take count (but never exceed pool length)
    const take = Math.max(1, Math.min(count, shuffled.length));
    return shuffled.slice(0, take);
  };

  const startSession = () => {
    if (questions.length === 0) return;

    const s = buildSession(setupMode, selectedCategory, questionCount);

    if (s.length === 0) {
      // nothing to practice (e.g., missed mode has no missed)
      setSession([]);
      setStarted(true);
      setSessionTotal(0);
      setSessionCorrect(0);
      setSessionMissedIds(new Set());
      setCompleted(true);
      return;
    }

    setSession(s);
    setStarted(true);

    setSessionTotal(s.length);
    setSessionCorrect(0);
    setSessionMissedIds(new Set());

    resetRunState();
  };

  const restartSameSession = () => {
    // keeps same session question list
    setSessionCorrect(0);
    setSessionMissedIds(new Set());
    resetRunState();
  };

  const retryMissedThisSession = () => {
    const missedSet = sessionMissedIds;
    const missedQs = session.filter((q) => missedSet.has(q.id));
    if (missedQs.length === 0) return;

    setSession(missedQs);
    setSessionTotal(missedQs.length);
    setSessionCorrect(0);
    setSessionMissedIds(new Set());
    resetRunState();
  };

  const toggle = (i) => {
    if (!started || submitted) return;
    const q = session[idx];
    if (!q) return;

    const kind = String(q.kind || "single").toLowerCase();
    if (kind === "single") {
      setSelected(new Set([i]));
    } else {
      const next = new Set(selected);
      next.has(i) ? next.delete(i) : next.add(i);
      setSelected(next);
    }
  };

  const submit = () => {
    const q = session[idx];
    if (!q || selected.size === 0) return;

    const correct = parseIndexSet(q.correctIndices);
    const isCorrect =
      selected.size === correct.size && [...selected].every((x) => correct.has(x));

    setSubmitted(true);
    setWasCorrect(isCorrect);

    // session score
    if (isCorrect) {
      setSessionCorrect((c) => c + 1);
    } else {
      setSessionMissedIds((prev) => {
        const next = new Set(prev);
        next.add(q.id);
        return next;
      });
    }

    // global attempts history for stats
    onAddAttempt({
      id: crypto.randomUUID(),
      questionId: q.id,
      category: q.category,
      selected: [...selected].sort((a, b) => a - b),
      isCorrect,
      attemptedAt: Date.now(),
    });
  };

  const next = () => {
    if (session.length === 0) return;

    const nextIdx = idx + 1;
    if (nextIdx >= session.length) {
      setCompleted(true);
      return;
    }

    setIdx(nextIdx);
    clearSelection();
  };

  // ---------------- UI ----------------

  if (questions.length === 0) {
    return <div style={{ color: "#666" }}>No questions yet. Import a CSV first.</div>;
  }

  // Setup screen (before start)
  if (!started) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Practice Setup</h2>

        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Mode</div>
            <label style={{ marginRight: 14 }}>
              <input
                type="radio"
                name="mode"
                checked={setupMode === "all"}
                onChange={() => setSetupMode("all")}
              />{" "}
              All questions
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                checked={setupMode === "missed"}
                onChange={() => setSetupMode("missed")}
              />{" "}
              Missed only (based on latest attempt)
            </label>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Category</div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: 8, borderRadius: 10, border: "1px solid #ddd", width: "min(420px, 100%)" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Number of Questions</div>
            <input
              type="number"
              min={1}
              max={200}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value || "10", 10))}
              style={{ padding: 8, borderRadius: 10, border: "1px solid #ddd", width: 140 }}
            />
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              Tip: If the pool is smaller than this number, it will use the available count.
            </div>
          </div>

          <button
            onClick={startSession}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", width: 180 }}
          >
            Start
          </button>
        </div>

        <div style={{ color: "#666" }}>
          Bank: <b>{questions.length}</b> questions • Attempts: <b>{attempts.length}</b>
        </div>
      </div>
    );
  }

  // Session Complete screen
  if (completed) {
    const missedCount = sessionMissedIds.size;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Session Complete</h2>

        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
          <div>
            Score: <b>{sessionCorrect}</b> / <b>{sessionTotal}</b>
          </div>
          <div style={{ color: "#666", marginTop: 6 }}>
            Missed this session: <b>{missedCount}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={restartSameSession}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            Restart Same Session
          </button>

          <button
            onClick={newSetup}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            New Setup
          </button>

          <button
            disabled={missedCount === 0}
            onClick={retryMissedThisSession}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            Retry Missed (This Session)
          </button>
        </div>

        <div style={{ color: "#666" }}>Tip: Check Stats for mastery and weak areas.</div>
      </div>
    );
  }

  // Question view
  const q = session[idx];
  if (!q) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ color: "#666" }}>No questions available for this setup.</div>
        <button onClick={newSetup} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", width: 140 }}>
          New Setup
        </button>
      </div>
    );
  }

  const correctSet = parseIndexSet(q.correctIndices);
  const kind = String(q.kind || "single").toLowerCase();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "#666" }}>
          {idx + 1}/{session.length}
        </span>

        <span style={{ color: "#666" }}>
          Session Score: <b>{sessionCorrect}</b> / <b>{sessionTotal}</b>
        </span>

        <span style={{ marginLeft: "auto", color: "#666" }}>
          <button onClick={newSetup} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd" }}>
            Setup
          </button>
        </span>
      </div>

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #ddd" }}>
            {q.category}
          </span>

          {kind === "sata" && (
            <span style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #ddd" }}>
              SATA
            </span>
          )}
        </div>

        <h3 style={{ marginTop: 10 }}>{q.stem}</h3>

        <div style={{ display: "grid", gap: 8 }}>
          {q.options.map((opt, i) => {
            const isSelected = selected.has(i);
            const isCorrect = correctSet.has(i);

            let bg = "#fff";
            if (!submitted) {
              bg = isSelected ? "#eef" : "#fff";
            } else {
              if (isCorrect) bg = "#eaffea";
              else if (isSelected && !isCorrect) bg = "#ffecec";
              else bg = "#fff";
            }

            const icon =
              kind === "sata"
                ? isSelected
                  ? "☑"
                  : "☐"
                : isSelected
                ? "◉"
                : "○";

            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                style={{
                  textAlign: "left",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: bg,
                  color: "#111",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ width: 22 }}>{icon}</span>
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {submitted && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: "#f7f7f7",
              color: "#111",
            }}
          >
            <b>{wasCorrect ? "Correct" : "Incorrect"}</b>
            {q.rationale ? <div style={{ marginTop: 6, color: "#555" }}>{q.rationale}</div> : null}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!submitted ? (
          <button
            onClick={submit}
            disabled={selected.size === 0}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            Submit
          </button>
        ) : (
          <button
            onClick={next}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            Next
          </button>
        )}

        {!submitted && selected.size > 0 && (
          <button
            onClick={clearSelection}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
