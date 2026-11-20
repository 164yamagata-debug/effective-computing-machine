// Side-by-side comparison table for 2-4 saved results.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const badgeHtml = (L, level) => `<span class="badge lv-${esc(level)}">${esc(L.levels[level] ?? level)}</span>`;

const SERIOUS = new Set(["caution", "warning", "danger"]);
const key = (i) => (i.english || i.original || "").toLowerCase().replace(/\s+extract$/, "").trim();

export function pricePerDay(entry) {
  const price = Number(entry.price);
  const days = entry.result?.supply?.days;
  return price > 0 && days > 0 ? Math.round(price / days) : null;
}

export function renderCompareTable(entries, L) {
  // Ingredients that appear in two or more products are highlighted.
  const counts = new Map();
  for (const e of entries) {
    for (const k of new Set((e.result.ingredients ?? []).map(key))) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const list = (items) => (items.length ? `<ul class="cell-list">${items.join("")}</ul>` : `<span class="muted">${esc(L.none)}</span>`);

  const rows = [
    [L.photo, (e) => (e.thumb ? `<img class="cmp-thumb" src="${e.thumb}" alt="">` : "")],
    [L.product, (e) => `<strong>${esc(e.result.product?.name)}</strong><div class="muted small">${esc(e.result.product?.brand)}</div>`],
    [L.overall, (e) => badgeHtml(L, e.result.overall?.level)],
    [L.labelType, (e) => esc(L.labelTypes[e.result.food_label?.type] ?? L.categories[e.result.product?.category] ?? "—")],
    [L.supply, (e) => {
      const s = e.result.supply;
      if (!s) return "—";
      return `${esc(s.per_day) || "—"}${s.days > 0 ? `<div class="muted small">${esc(L.daysUnit.replace("{n}", s.days))}</div>` : ""}`;
    }],
    [L.price, (e) => {
      const ppd = pricePerDay(e);
      return `<input class="price" type="number" inputmode="numeric" min="0" placeholder="¥" value="${esc(e.price)}" data-id="${esc(e.id)}" aria-label="${esc(L.price)}">
        <div class="ppd small" data-ppd="${esc(e.id)}">${ppd ? `${esc(L.perDay)} ¥${ppd.toLocaleString()}` : ""}</div>`;
    }],
    [L.cautionIngredients, (e) => list((e.result.ingredients ?? []).filter((i) => SERIOUS.has(i.level)).map((i) => `<li>${badgeHtml(L, i.level)} ${esc(i.name)}</li>`))],
    [L.ruleHits, (e) => list((e.result.rule_hits ?? []).map((h) => `<li>${badgeHtml(L, h.level)} ${esc(h.matched)}</li>`))],
    [L.allergens, (e) => list((e.result.allergens ?? []).map((a) => `<li class="${a.kind === "mandatory" ? "strong-text" : ""}">${esc(a.name)}</li>`))],
    [L.interactions, (e) => list((e.result.interactions ?? []).map((i) => `<li>${badgeHtml(L, i.level)} ${esc(i.substance)} × ${esc(i.with_what)}</li>`))],
    [L.intake, (e) => list((e.result.intake ?? []).map((n) => `<li>${badgeHtml(L, n.level)} ${esc(n.nutrient)} <span class="muted">${esc(n.amount)}</span></li>`))],
    [L.commonIngredients, (e) => list((e.result.ingredients ?? []).map((i) => `<li class="${(counts.get(key(i)) ?? 0) > 1 ? "shared" : ""}">${esc(i.name)}</li>`))],
  ];

  return `<div class="cmp-scroll"><table class="cmp">
    <tbody>${rows
      .map(([label, cell]) => `<tr><th scope="row">${esc(label)}</th>${entries.map((e) => `<td>${cell(e)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>`;
}

export function renderAiCompare(r, L) {
  const block = (title, inner) => (inner ? `<section class="card"><h2>${esc(title)}</h2>${inner}</section>` : "");
  return `
    ${block(L.aiResult, `<p>${esc(r.summary)}</p>`)}
    ${block(L.bestFor, r.best_for?.length ? `<ul class="flags">${r.best_for.map((b) => `<li><span class="who">${esc(b.situation)}</span><br><strong>${esc(b.choice)}</strong><p>${esc(b.reason)}</p></li>`).join("")}</ul>` : "")}
    ${block(L.differences, r.differences?.length ? `<ul class="flags">${r.differences.map((d) => `<li><strong>${esc(d.aspect)}</strong><p>${esc(d.detail)}</p></li>`).join("")}</ul>` : "")}
    ${block(L.overlap, r.overlap ? `<p>${esc(r.overlap)}</p>` : "")}
    ${block(L.cautions, r.cautions?.length ? `<ul class="flags">${r.cautions.map((c) => `<li><p>${esc(c)}</p></li>`).join("")}</ul>` : "")}`;
}
