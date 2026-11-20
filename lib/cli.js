// Runs the analysis through the Claude Code CLI in headless mode (`claude -p`), so it uses
// the subscription you are logged into with `claude` instead of a paid API key.
// For personal use on your own computer only (see README).
import { spawn } from "node:child_process";
import { z } from "zod";
import { AnalysisSchema } from "./schema.js";

// The CLI's validator rejects the draft-2020-12 "$schema" header, so drop it.
const { $schema, ...schemaBody } = z.toJSONSchema(AnalysisSchema);
const JSON_SCHEMA = JSON.stringify(schemaBody);
const TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS) || 240_000;

export function runClaudeCli({ system, content }) {
  const args = [
    "-p",
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--verbose",
    "--json-schema", JSON_SCHEMA,
    "--system-prompt", system,
    "--tools", "",              // no tools: the model only reads the photos we send
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
      const parsed = AnalysisSchema.safeParse(result.structured_output);
      if (!parsed.success) {
        console.error("claude output did not match schema", parsed.error.issues.slice(0, 3));
        return reject(Object.assign(new Error("incomplete"), { code: "incomplete" }));
      }
      resolve(parsed.data);
    });

    child.stdin.end(JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n");
  });
}
