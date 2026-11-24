// Builds the claude.ai artifact version of Mieru as one self-contained HTML page:
//   node artifact/build.mjs  ->  artifact/mieru.html
// The screens, rules and scoring are shared with the local version (public/); only the
// backend (artifact/api.js: Claude via the page's `sample` capability) and the history store
// (artifact/store.js: the artifact's private per-viewer database) differ.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AnalysisSchema, CompareSchema } from "../lib/schema.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const jsonSchema = (schema) => {
  const { $schema, ...body } = z.toJSONSchema(schema);
  return JSON.stringify(body);
};

// Order matters: each module may only use what came before it.
const modules = [
  "public/i18n.js",
  "public/rules.js",
  "public/score.js",
  "public/prompts.js",
  "public/finalize.js",
  "public/compare-data.js",
  "public/compare.js",
  "artifact/store.js",
  "artifact/api.js",
  "public/app.js",
];

const stripModule = (src, file) => {
  const out = src
    .replace(/^import .* from ["'].*["'];\n/gm, "")
    .replace(/^export (?=(const|let|function|async function|class) )/gm, "")
    .replace(/^export \* from .*\n/gm, "");
  if (/^\s*(import|export)\b/m.test(out)) throw new Error(`unhandled import/export left in ${file}`);
  return `// ---- ${file} ----\n${out}`;
};

const script = [
  `const PROMPTS = ${JSON.stringify({ analysisSchema: jsonSchema(AnalysisSchema), compareSchema: jsonSchema(CompareSchema) })};`,
  ...modules.map((f) => stripModule(read(f), f)),
].join("\n");

// Body markup from the local page, with the icon inlined and local-only bits removed.
const html = read("public/index.html");
const iconUri = "data:image/svg+xml;base64," + Buffer.from(read("public/icon.svg")).toString("base64");
let body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
body = body
  .replace(/\s*<script type="module" src="app.js"><\/script>/, "")
  .replace(/src="icon.svg"/g, `src="${iconUri}"`);

const page = `<title>ミエール Mieru</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${read("public/style.css")}
</style>
${body.trim()}
<script type="module">
${script}
</script>
`;

fs.writeFileSync(path.join(root, "artifact/mieru.html"), page);
console.log(`artifact/mieru.html: ${(page.length / 1024).toFixed(0)} KB`);
