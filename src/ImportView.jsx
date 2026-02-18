import Papa from "papaparse";
import { useMemo, useState } from "react";

function normalize(s) {
  return String(s ?? "")
    .trim()
    .replace(/^"|"$/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function fingerprint(q) {
  const cat = normalize(q.category);
  const stem = normalize(q.stem);
  const ops = (q.options || []).map(normalize).join("|");
  return `${cat}||${stem}||${ops}`;
}

export default function ImportView({ questions, onImport, onResetAll }) {
  const [status, setStatus] = useState("Import a CSV to add questions.");

  const counts = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      map.set(q.category, (map.get(q.category) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions]);

  const handleFile = (file) => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const existing = new Set(questions.map(fingerprint));
        const next = [...questions];

        let inserted = 0;
        let duplicates = 0;
        let skipped = 0;

        for (const row of res.data) {
          const category = row.category;
          const stem = row.stem;
          const options = [row.optionA, row.optionB, row.optionC, row.optionD];

          if (!category || !stem || options.some((o) => !o)) {
            skipped++;
            continue;
          }

          const kind = (row.kind || "single").trim().toLowerCase();
          const correctIndices = row.correctIndices || row.correctIndex;

          if (!correctIndices) {
            skipped++;
            continue;
          }

          const q = {
            id: crypto.randomUUID(),
            category,
            stem,
            options,
            kind,
            correctIndices: String(correctIndices),
            rationale: row.rationale || "",
          };

          const fp = fingerprint(q);

          if (existing.has(fp)) {
            duplicates++;
            continue;
          }

          existing.add(fp);
          next.push(q);
          inserted++;
        }

        onImport(next);
        setStatus(
          `Imported ${inserted}. Duplicates ${duplicates}. Skipped ${skipped}. Total ${next.length}.`
        );
      },
      error: () => setStatus("Import failed."),
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ color: "#555" }}>{status}</div>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        onClick={() => {
          if (confirm("Reset all questions and attempts?")) {
            onResetAll();
          }
        }}
      >
        Reset Questions & Attempts
      </button>

      <div>
        <h3>Question Bank</h3>
        <div>Total: {questions.length}</div>
        {counts.map(([cat, count]) => (
          <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{cat}</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
