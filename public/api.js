// Local-server backend: the page calls this app's own server, which runs `claude -p`
// (or the API). The claude.ai artifact build swaps this file for artifact/api.js.
async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "default");
  return data;
}

export const api = {
  /** @param images {media_type, data(base64)}[] */
  analyze: (images, lang) => post("/api/analyze", { images, lang }),
  compare: (items, goal, lang) => post("/api/compare", { items, goal, lang }),
  async isDemo() {
    try {
      return (await (await fetch("/api/status")).json()).demo === true;
    } catch {
      return false;
    }
  },
};
