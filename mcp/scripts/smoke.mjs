// Smoke test: spawns the built server over stdio, lists tools, calls whoami,
// and checks the server refuses to start without CCK_SERVICE_TOKEN.
// With the default dummy token, whoami should report a clean 401/403 rejection.
// Set CCK_SERVICE_TOKEN (and optionally CCK_BASE_URL) to test a real token.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = fileURLToPath(new URL("../build/index.js", import.meta.url));
const token = process.env.CCK_SERVICE_TOKEN || "dummy-smoke-token";

async function checkRefusesWithoutToken() {
  const env = { ...process.env };
  delete env.CCK_SERVICE_TOKEN;
  const run = spawnSync(process.execPath, [serverPath], { env, encoding: "utf8", timeout: 10_000 });
  const refused = run.status === 1 && /CCK_SERVICE_TOKEN is required/.test(run.stderr);
  console.log(`[no-token] exit=${run.status} refused=${refused}`);
  if (!refused) throw new Error("Server did not refuse to start without CCK_SERVICE_TOKEN");
}

async function main() {
  await checkRefusesWithoutToken();

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, CCK_SERVICE_TOKEN: token },
  });
  const client = new Client({ name: "cck-admin-smoke", version: "1.0.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`[tools] ${tools.length}: ${tools.map((t) => t.name).join(", ")}`);

  const result = await client.callTool({ name: "whoami", arguments: {} });
  const text = result.content.map((c) => c.text ?? "").join("\n");
  console.log(`[whoami] isError=${result.isError === true}`);
  console.log(text);
  if (text.includes(token)) throw new Error("Token leaked into tool output");

  await client.close();
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
