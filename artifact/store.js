// claude.ai artifact history store: each viewer's history lives in their own private
// subtree of the artifact's database (data/users/<id>), so it follows them between iPhone
// and Mac. Falls back to this browser's storage when the database is unavailable.
const KEY = "mieru.history.v1";
const MAX_ITEMS = 30;

let cache = localLoad();
let col = null;
let listener = () => {};
const priceTimers = new Map();

export function onHistoryChange(fn) {
  listener = fn;
}

function localLoad() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function localSave() {
  for (let n = cache.length; n > 0; n--) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cache.slice(0, n)));
      return;
    } catch {}
  }
}
function changed() {
  if (!col) localSave();
  listener();
}

(async () => {
  const [db, user] = await Promise.all([
    window.claude?.use ? window.claude.use("db") : null,
    window.claude?.use ? window.claude.use("user") : null,
  ]);
  const id = db && user ? await user.id() : null;
  if (!id) return; // stay on browser storage
  col = db.collection("data/users/" + id);
  col.orderBy("date", "desc").limit(100).onSnapshot(
    (snap) => {
      cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      listener();
    },
    () => {
      col = null; // database gone for this visit: keep working locally
      changed();
    }
  );
})();

export function loadHistory() {
  return cache;
}

export function addHistory(result, thumb) {
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString(), thumb, result, price: "" };
  const dropped = cache.slice(MAX_ITEMS - 1);
  cache = [entry, ...cache].slice(0, MAX_ITEMS);
  changed();
  if (col) {
    const { id, ...body } = entry;
    col.doc(id).set(body).catch(() => {});
    for (const old of dropped) col.doc(old.id).delete().catch(() => {});
  }
  return entry;
}

export function updateHistory(id, patch) {
  cache = cache.map((e) => (e.id === id ? { ...e, ...patch } : e));
  changed();
  if (!col) return;
  // Coalesce typing into one write per pause.
  clearTimeout(priceTimers.get(id));
  priceTimers.set(id, setTimeout(() => col?.doc(id).update(patch).catch(() => {}), 700));
}

export function removeHistory(id) {
  cache = cache.filter((e) => e.id !== id);
  changed();
  col?.doc(id).delete().catch(() => {});
}
