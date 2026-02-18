import { useMemo } from "react";

export default function StatsView({ questions, attempts }) {
  const totalAttempts = attempts.length;

  // Latest attempt per question (attempts should be newest-first, but we handle any order safely)
  const latestByQuestion = useMemo(() => {
    const map = new Map(); // questionId -> attempt
    // sort newest first to be safe
    const sorted = [...attempts].sort((a, b) => (b.attemptedAt || 0) - (a.attemptedAt || 0));
    for (const a of sorted) {
      if (!map.has(a.questionId)) map.set(a.questionId, a);
    }
    return map;
  }, [attempts]);

  const uniqueAttempted = latestByQuestion.size;
  const uniqueMastered = [...latestByQuestion.values()].filter((a) => a.isCorrect).length;

  const masteryPct = uniqueAttempted === 0 ? 0 : Math.round((uniqueMastered / uniqueAttempted) * 100);

  const overallAccuracy = useMemo(() => {
    if (totalAttempts === 0) return 0;
    const correct = attempts.filter((a) => a.isCorrect).length;
    return Math.round((correct / totalAttempts) * 100);
  }, [attempts, totalAttempts]);

  // Weak areas (all attempts) by category
  const weakAreas = useMemo(() => {
    const map = new Map(); // category -> { total, correct }
    for (const a of attempts) {
      const cat = a.category || "Uncategorized";
      const cur = map.get(cat) || { total: 0, correct: 0 };
      cur.total += 1;
      if (a.isCorrect) cur.correct += 1;
      map.set(cat, cur);
    }

    const rows = [...map.entries()].map(([category, v]) => ({
      category,
      total: v.total,
      correct: v.correct,
      accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }));

    // weakest first
    rows.sort((a, b) => a.accuracy - b.accuracy);
    return rows;
  }, [attempts]);

  // Question bank counts by category
  const bankCounts = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      const cat = q.category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Overview</h2>

        <Row label="Total Questions Attempted" value={totalAttempts} />
        <Row label="Unique Questions Attempted" value={uniqueAttempted} />
        <Row label="Overall Accuracy (all attempts)" value={`${overallAccuracy}%`} />
        <Row label="Mastery % (latest per question)" value={`${masteryPct}%`} />
        <Row label="Unique Questions Mastered" value={`${uniqueMastered} / ${uniqueAttempted}`} />
      </div>

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Weak Areas (all attempts)</h2>

        {weakAreas.length === 0 ? (
          <div style={{ color: "#666" }}>No attempts yet. Do a few practice questions first.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {weakAreas.map((r) => (
              <div key={r.category} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{r.category}</span>
                <span style={{ color: "#666" }}>
                  {r.correct}/{r.total} • {r.accuracy}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Question Bank</h2>

        <Row label="Total Questions" value={questions.length} />

        <div style={{ marginTop: 8, fontWeight: 700 }}>Counts by Category</div>

        {bankCounts.length === 0 ? (
          <div style={{ color: "#666" }}>No questions loaded yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {bankCounts.map(([cat, n]) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{cat}</span>
                <span style={{ color: "#666" }}>{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0" }}>
      <span>{label}</span>
      <span style={{ color: "#666" }}>{value}</span>
    </div>
  );
}
