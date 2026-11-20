// Scan history kept in this browser only (localStorage). Results are small JSON plus a
// thumbnail; the full photos are never stored.
const KEY = "mieru.history.v1";
const MAX_ITEMS = 30;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  // If storage is full, drop the oldest entries until it fits.
  for (let n = list.length; n > 0; n--) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, n)));
      return true;
    } catch {}
  }
  return false;
}

export function addHistory(result, thumb) {
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString(), thumb, result, price: "" };
  const list = [entry, ...loadHistory()].slice(0, MAX_ITEMS);
  save(list);
  return entry;
}

export function updateHistory(id, patch) {
  const list = loadHistory().map((e) => (e.id === id ? { ...e, ...patch } : e));
  save(list);
}

export function removeHistory(id) {
  save(loadHistory().filter((e) => e.id !== id));
}
