const KEY = "nclex_coach_v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { questions: [], attempts: [] };
    const parsed = JSON.parse(raw);
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return { questions: [], attempts: [] };
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
