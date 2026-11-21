import { I18N } from "./i18n.js";
import { loadHistory, addHistory, updateHistory, removeHistory } from "./store.js";
import { esc, renderCompareTable, renderAiCompare, pricePerDay } from "./compare.js";
import { computeScore } from "./score.js";

const MAX_SIDE = 1568; // longest edge sent to the server; keeps uploads small but text legible
const photos = [null, null, null, null];
let lang = loadLang();
let lastResult = null;

const $ = (sel, root = document) => root.querySelector(sel);
const t = () => I18N[lang];

function loadLang() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && I18N[saved]) return saved;
  } catch {}
  const nav = (navigator.language || "ja").slice(0, 2);
  return I18N[nav] ? nav : "ja";
}

function applyLang() {
  document.documentElement.lang = lang;
  $("#lang").value = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t()[el.dataset.i18n]));
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t()[el.dataset.i18nAria]));
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => el.setAttribute("placeholder", t()[el.dataset.i18nPlaceholder]));
  if (lastResult && !$("#result").hidden) renderResult(lastResult);
  renderHistory();
  if (!$("#compare").hidden) renderCompare();
}

$("#lang").addEventListener("change", (e) => {
  lang = e.target.value;
  try { localStorage.setItem("lang", lang); } catch {}
  applyLang();
});

// ---------- photo slots ----------
document.querySelectorAll(".slot").forEach((slot) => {
  const idx = Number(slot.dataset.slot);
  const input = $("input", slot);
  const img = $("img", slot);
  const removeBtn = $(".remove", slot);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      photos[idx] = await resize(file);
      img.src = `data:${photos[idx].media_type};base64,${photos[idx].data}`;
      img.hidden = false;
      removeBtn.hidden = false;
      slot.classList.add("filled");
      hideError();
    } catch {
      showError(t().errors.bad_images);
    }
    input.value = "";
  });

  removeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    photos[idx] = null;
    img.hidden = true;
    img.removeAttribute("src");
    removeBtn.hidden = true;
    slot.classList.remove("filled");
  });
});

async function resize(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { media_type: "image/jpeg", data: dataUrl.split(",")[1] };
}

// ---------- analyse ----------
$("#analyze").addEventListener("click", async () => {
  const images = photos.filter(Boolean);
  if (images.length === 0) return showError(t().needPhoto);
  hideError();
  $("#capture").hidden = true;
  $("#loading").hidden = false;
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, lang }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "default");
    lastResult = body;
    addHistory(body, await thumbnail(images[0]).catch(() => ""));
    renderResult(body, { saved: true });
    renderHistory();
  } catch (err) {
    $("#capture").hidden = false;
    showError(t().errors[err.message] || t().errors.default);
  } finally {
    $("#loading").hidden = true;
  }
});

function showError(msg) { const el = $("#error"); el.textContent = msg; el.hidden = false; }
function hideError() { $("#error").hidden = true; }

// ---------- render ----------
const badge = (level) => `<span class="badge lv-${esc(level)}">${esc(t().levels[level] ?? level)}</span>`;

function renderResult(r, { saved = false } = {}) {
  const L = t();
  const p = r.product;
  const section = (title, inner) => (inner ? `<section class="card"><h2>${esc(title)}</h2>${inner}</section>` : "");

  const ruleHits = r.rule_hits?.length
    ? `<ul class="flags">${r.rule_hits.map((h) => `<li>${badge(h.level)} <strong>${esc(h.matched)}</strong><p>${esc(h.message)}</p></li>`).join("")}</ul>`
    : "";
  const japan = r.japan_notes?.length
    ? `<ul class="flags">${r.japan_notes.map((n) => `<li>${badge(n.level)} <strong>${esc(n.title)}</strong><p>${esc(n.detail)}</p></li>`).join("")}</ul>`
    : "";
  const cautions = r.cautions?.length
    ? `<ul class="flags">${r.cautions.map((c) => `<li><strong>${esc(c.title)}</strong>${c.who ? ` <span class="who">${esc(c.who)}</span>` : ""}<p>${esc(c.detail)}</p></li>`).join("")}</ul>`
    : "";
  const ingredients = r.ingredients?.length
    ? `<ol class="ingredients">${r.ingredients
        .map(
          (i) => `<li class="ing lv-border-${esc(i.level)}">
            <div class="ing-head"><span class="dot lv-${esc(i.level)}" title="${esc(L.levels[i.level])}"></span>
              <span class="ing-name">${esc(i.name)}</span>${badge(i.level)}</div>
            <div class="ing-sub">${esc(i.original)}${i.english && i.english !== i.original ? ` · ${esc(i.english)}` : ""}</div>
            ${i.purpose ? `<div class="ing-purpose">${esc(i.purpose)}</div>` : ""}
            ${i.note ? `<div class="ing-note${["caution","warning","danger"].includes(i.level) ? " strong" : ""}">${esc(i.note)}</div>` : ""}
          </li>`
        )
        .join("")}</ol>`
    : "";

  const fl = r.food_label;
  const labelType =
    fl && fl.type !== "not_food"
      ? `<p><span class="pill">${esc(L.labelTypes[fl.type] ?? fl.type)}</span></p>
         ${fl.notification_number ? `<p class="small"><strong>${esc(L.notifNo)}:</strong> ${esc(fl.notification_number)}</p>` : ""}
         ${fl.explanation ? `<p>${esc(fl.explanation)}</p>` : ""}
         ${fl.type === "kinousei" ? `<p class="small muted">${esc(L.verifyHint)}</p>` : ""}`
      : "";
  const allergenList = r.allergens?.length
    ? `<ul class="chips">${r.allergens
        .map((a) => `<li class="chip ${a.kind === "mandatory" ? "chip-strong" : ""}" title="${esc(a.source)}">${esc(a.name)}<small>${esc(L.allergenKinds[a.kind] ?? "")}</small></li>`)
        .join("")}</ul>`
    : "";
  const intake = r.intake?.length
    ? `<ul class="flags">${r.intake.map((n) => `<li>${badge(n.level)} <strong>${esc(n.nutrient)}</strong> <span class="who">${esc(n.amount)}</span><p>${esc(n.detail)}</p></li>`).join("")}</ul>`
    : "";
  const interactions = r.interactions?.length
    ? `<ul class="flags">${r.interactions.map((n) => `<li>${badge(n.level)} <strong>${esc(n.substance)}</strong> × ${esc(n.with_what)}<p>${esc(n.detail)}</p></li>`).join("")}</ul>`
    : "";

  $("#result").innerHTML = `
    ${scoreCard(r, L)}
    <section class="card overall lv-bg-${esc(r.overall.level)}">
      <div class="overall-head"><span>${esc(L.overall)}</span>${badge(r.overall.level)}</div>
      <h2 class="product-name">${esc(p.name)}</h2>
      <p>${esc(r.overall.summary)}</p>
      <dl class="meta">
        <dt>${esc(L.brand)}</dt><dd>${esc(p.brand) || "—"}</dd>
        <dt>${esc(L.category)}</dt><dd>${esc(L.categories[p.category] ?? p.category)}</dd>
        <dt>${esc(L.origin)}</dt><dd>${esc(p.origin_country) || "—"}</dd>
        <dt>${esc(L.labelLang)}</dt><dd>${esc((p.label_languages || []).join(", ")) || "—"}</dd>
        <dt>${esc(L.confidence)}</dt><dd>${esc(L.conf[r.confidence] ?? r.confidence)}</dd>
      </dl>
    </section>
    ${section(L.ruleHits, ruleHits)}
    ${section(L.labelType, labelType)}
    ${section(L.allergens, allergenList)}
    ${section(L.interactions, interactions)}
    ${section(L.intake, intake)}
    ${section(L.japanNotes, japan)}
    ${section(L.cautions, cautions)}
    ${section(L.ingredients, ingredients)}
    ${section(L.claims, r.claims_check ? `<p>${esc(r.claims_check)}</p>` : "")}
    ${section(L.missing, r.missing ? `<p>${esc(r.missing)}</p>` : "")}
    ${saved ? `<p class="saved-note">${esc(L.savedNote)} <button type="button" class="link-btn" id="to-history">${esc(L.toHistory)}</button></p>` : ""}
    <p class="disclaimer">${esc(L.disclaimer)}</p>
    <button type="button" class="cta" id="again">${esc(L.again)}</button>
  `;
  $("#result").hidden = false;
  $("#again").addEventListener("click", reset);
  $("#to-history")?.addEventListener("click", () => showTab("history"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reset() {
  lastResult = null;
  $("#result").hidden = true;
  $("#capture").hidden = false;
  document.querySelectorAll(".slot .remove").forEach((b) => b.hidden || b.click());
}

// ---------- score ----------
export function scoreRing(sc, size = 88) {
  const r = 40, c = 2 * Math.PI * r;
  const val = sc.score ?? 0;
  return `<svg class="ring grade-${sc.grade ?? "none"}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="${r}" class="ring-bg"/>
    <circle cx="50" cy="50" r="${r}" class="ring-fg" stroke-dasharray="${(c * val) / 100} ${c}" transform="rotate(-90 50 50)"/>
    <text x="50" y="50" class="ring-num">${sc.score ?? "—"}</text>
    <text x="50" y="70" class="ring-grade">${sc.grade ?? ""}</text></svg>`;
}

function scoreCard(r, L) {
  const sc = computeScore(r);
  const reasons = sc.deductions
    .slice(0, 6)
    .map((d) => `<li>${badge(d.level)} ${esc(d.label === "claims" ? L.claims : d.label)} <span class="minus">−${d.points}</span></li>`)
    .join("");
  return `<section class="card score-card">
    ${scoreRing(sc)}
    <div class="score-text">
      <div class="score-title">${esc(L.scoreTitle)}</div>
      <div class="score-desc">${esc(sc.score === null ? L.scoreNone : L.gradeDesc[sc.grade])}</div>
      ${reasons ? `<ul class="deductions">${reasons}</ul>` : sc.score === 100 ? `<p class="small muted">${esc(L.noDeductions)}</p>` : ""}
      <details class="small muted"><summary>${esc(L.scoreHow)}</summary><p>${esc(L.scoreHowText)}</p></details>
    </div>
  </section>`;
}

// ---------- thumbnails ----------
function thumbnail(img, side = 240) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      const scale = Math.min(1, side / Math.max(el.width, el.height));
      const c = document.createElement("canvas");
      c.width = Math.round(el.width * scale);
      c.height = Math.round(el.height * scale);
      c.getContext("2d").drawImage(el, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    el.onerror = reject;
    el.src = `data:${img.media_type};base64,${img.data}`;
  });
}

// ---------- tabs ----------
function showTab(tab) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  const scanning = tab === "scan";
  $("#history").hidden = tab !== "history";
  $("#compare").hidden = tab !== "compare";
  if (scanning) {
    const hasResult = lastResult && $("#result").innerHTML;
    $("#result").hidden = !hasResult;
    $("#capture").hidden = Boolean(hasResult);
  } else {
    $("#capture").hidden = true;
    $("#result").hidden = true;
    $("#loading").hidden = true;
  }
  document.querySelector(".tab[data-tab='history']").classList.toggle("active", tab === "history" || tab === "compare");
  window.scrollTo({ top: 0 });
}
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

// ---------- history ----------
const selected = new Set();

function renderHistory() {
  const L = t();
  const list = loadHistory();
  for (const id of [...selected]) if (!list.some((e) => e.id === id)) selected.delete(id);
  $("#history-count").textContent = list.length ? String(list.length) : "";
  $("#history-empty").hidden = list.length > 0;
  $("#history-list").innerHTML = list
    .map((e) => {
      const r = e.result;
      const date = new Date(e.date).toLocaleDateString(lang, { month: "short", day: "numeric" });
      const ppd = pricePerDay(e);
      return `<li class="h-item ${selected.has(e.id) ? "selected" : ""}">
        <label class="h-check"><input type="checkbox" data-id="${esc(e.id)}" ${selected.has(e.id) ? "checked" : ""} aria-label="${esc(r.product?.name)}"></label>
        <button type="button" class="h-open" data-open="${esc(e.id)}">
          ${e.thumb ? `<img src="${e.thumb}" alt="">` : `<span class="h-noimg"></span>`}
          <span class="h-text"><span class="h-name">${esc(r.product?.name)}</span>
          <span class="h-meta">${(() => { const sc = computeScore(r); return sc.score === null ? "" : `<span class="h-score grade-${sc.grade}">${sc.score}<small>${sc.grade}</small></span>`; })()} ${badge(r.overall?.level)} ${esc(L.categories[r.product?.category] ?? "")} · ${esc(date)}${ppd ? ` · ¥${ppd}/${esc(L.perDay)}` : ""}</span></span>
        </button>
        <button type="button" class="h-del" data-del="${esc(e.id)}" aria-label="${esc(L.remove)}">×</button>
      </li>`;
    })
    .join("");
  const n = selected.size;
  const btn = $("#compare-btn");
  btn.textContent = L.compareN.replace("{n}", n);
  btn.disabled = n < 2 || n > 4;
}

$("#history-list").addEventListener("change", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.checked) {
    if (selected.size >= 4) { e.target.checked = false; return; }
    selected.add(id);
  } else selected.delete(id);
  renderHistory();
});

$("#history-list").addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]")?.dataset.open;
  const del = e.target.closest("[data-del]")?.dataset.del;
  if (del) {
    removeHistory(del);
    selected.delete(del);
    renderHistory();
  } else if (open) {
    const entry = loadHistory().find((x) => x.id === open);
    if (!entry) return;
    lastResult = entry.result;
    renderResult(entry.result);
    showTab("scan");
  }
});

// ---------- compare ----------
let compareIds = [];

$("#compare-btn").addEventListener("click", () => {
  compareIds = [...selected];
  $("#ai-result").innerHTML = "";
  $("#compare-error").hidden = true;
  renderCompare();
  showTab("compare");
});
$("#back-history").addEventListener("click", () => showTab("history"));

function compareEntries() {
  const list = loadHistory();
  return compareIds.map((id) => list.find((e) => e.id === id)).filter(Boolean);
}

function renderCompare() {
  $("#compare-table").innerHTML = renderCompareTable(compareEntries(), t());
}

$("#compare-table").addEventListener("input", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  updateHistory(id, { price: e.target.value });
  const entry = loadHistory().find((x) => x.id === id);
  const ppd = entry && pricePerDay(entry);
  document.querySelector(`[data-ppd="${CSS.escape(id)}"]`).textContent = ppd ? `${t().perDay} ¥${ppd.toLocaleString()}` : "";
  renderHistory();
});

$("#ai-compare-btn").addEventListener("click", async () => {
  const entries = compareEntries();
  $("#compare-error").hidden = true;
  $("#ai-result").innerHTML = "";
  $("#ai-loading").hidden = false;
  $("#ai-compare-btn").disabled = true;
  try {
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: entries.map((e) => ({ result: e.result, price: Number(e.price) || 0 })), goal: $("#goal").value, lang }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "default");
    $("#ai-result").innerHTML = renderAiCompare(body, t());
  } catch (err) {
    const el = $("#compare-error");
    el.textContent = t().errors[err.message] || t().errors.default;
    el.hidden = false;
  } finally {
    $("#ai-loading").hidden = true;
    $("#ai-compare-btn").disabled = false;
  }
});

// ---------- init ----------
applyLang();
fetch("/api/status")
  .then((r) => r.json())
  .then((s) => ($("#demo-banner").hidden = !s.demo))
  .catch(() => {});
