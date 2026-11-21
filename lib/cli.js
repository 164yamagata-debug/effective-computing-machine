// Runs the analysis through the Claude Code CLI in headless mode (`claude -p`), so it uses
// the subscription you are logged into with `claude` instead of a paid API key.
// For personal use on your own computer only (see README).
import { spawn } from "node:child_process";
import { z } from "zod";
import { AnalysisSchema } from "./schema.js";

// The CLI's validator rejects the draft-2020-12 "$schema" header, so drop it.
const schemaCache = new Map();
function jsonSchemaFor(schema) {
  if (!schemaCache.has(schema)) {
    const { $schema, ...body } = z.toJSONSchema(schema);
    schemaCache.set(schema, JSON.stringify(body));
  }
  return schemaCache.get(schema);
}
const TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS) || 240_000;

export function runClaudeCli({ system, content, schema = AnalysisSchema }) {
  const args = [
    "-p",
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--verbose",
    "--json-schema", jsonSchemaFor(schema),
    "--system-prompt", system,
    "--tools", "",              // no tools: the model only reads what we send
    "--safe-mode",              // ignore CLAUDE.md, plugins, hooks, MCP servers
    "--no-session-persistence",
  ];
  if (process.env.CLAUDE_MODEL) args.push("--model", process.env.CLAUDE_MODEL);

  // Never let an API key in the environment silently switch billing to the API.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  return new Promise((resolve, reject) => {
    const child = spawn(process.env.CLAUDE_BIN || "claude", args, { env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(Object.assign(new Error("timeout"), { code: "timeout" }));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(Object.assign(new Error(`could not start claude: ${err.message}`), { code: "cli_missing" }));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const result = stdout
        .split("\n")
        .map((line) => { try { return JSON.parse(line); } catch { return null; } })
        .find((ev) => ev?.type === "result");
      if (!result || result.is_error || !result.structured_output) {
        console.error(`claude exited ${code}`, result?.subtype ?? "", result?.result ?? "", stderr.slice(-500));
        return reject(Object.assign(new Error("cli_failed"), { code: "cli_failed" }));
      }
      const parsed = schema.safeParse(result.structured_output);
      if (!parsed.success) {
        console.error("claude output did not match schema", parsed.error.issues.slice(0, 3));
        return reject(Object.assign(new Error("incomplete"), { code: "incomplete" }));
      }
      // Log what this call would have cost on the pay-as-you-go API. On a subscription it is
      // not billed, but it shows how much of the usage allowance a scan takes.
      const u = result.usage ?? {};
      console.log(
        `claude -p: ${(result.duration_ms / 1000).toFixed(0)}s, API-equivalent $${(result.total_cost_usd ?? 0).toFixed(4)}` +
          ` (in ${u.input_tokens ?? 0} + cache ${(u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)}, out ${u.output_tokens ?? 0} tokens)`
      );
      resolve(parsed.data);
    });

    child.stdin.end(JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n");
  });
}
