import { I18N } from "./i18n.js";

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
  if (lastResult) renderResult(lastResult);
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
    renderResult(body);
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
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const badge = (level) => `<span class="badge lv-${esc(level)}">${esc(t().levels[level] ?? level)}</span>`;

function renderResult(r) {
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

  $("#result").innerHTML = `
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
    ${section(L.japanNotes, japan)}
    ${section(L.cautions, cautions)}
    ${section(L.ingredients, ingredients)}
    ${section(L.claims, r.claims_check ? `<p>${esc(r.claims_check)}</p>` : "")}
    ${section(L.missing, r.missing ? `<p>${esc(r.missing)}</p>` : "")}
    <p class="disclaimer">${esc(L.disclaimer)}</p>
    <button type="button" class="cta" id="again">${esc(L.again)}</button>
  `;
  $("#result").hidden = false;
  $("#again").addEventListener("click", reset);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reset() {
  lastResult = null;
  $("#result").hidden = true;
  $("#capture").hidden = false;
  document.querySelectorAll(".slot .remove").forEach((b) => b.hidden || b.click());
}

// ---------- init ----------
applyLang();
fetch("/api/status")
  .then((r) => r.json())
  .then((s) => ($("#demo-banner").hidden = !s.demo))
  .catch(() => {});
