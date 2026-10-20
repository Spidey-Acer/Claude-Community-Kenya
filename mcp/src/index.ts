#!/usr/bin/env node
/**
 * cck-admin-mcp: MCP server for administering claudekenya.org over stdio.
 *
 * Authenticates every request with a service token (CCK_SERVICE_TOKEN) sent as
 * a bearer header. Refuses to start without it. Tool groups live in ./tools.
 * Logs go to stderr only; stdout is the MCP protocol channel.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { apiRequest, fail, getConfig, guard, initConfig, ok } from "./client.js";
import { registerBlogTools } from "./tools/blog.js";
import { registerEventTools } from "./tools/events.js";
import { registerMediaTools } from "./tools/media.js";
import { registerResourceTools } from "./tools/resources.js";

/** Register whoami: a cheap authenticated read that reports whether the token works. */
function registerWhoami(server: McpServer): void {
  server.registerTool(
    "whoami",
    {
      title: "Check token and connection",
      description: "Report the base URL and whether the service token is accepted (200) or rejected (401/403) by the admin API.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard("whoami", async () => {
      const { baseUrl } = getConfig();
      const res = await apiRequest("GET", "/api/admin/events", { query: { limit: 1 } });
      const detail = { baseUrl, status: res.status, tokenAccepted: res.ok };
      if (res.ok) return ok(`Token accepted by ${baseUrl} (HTTP 200).`, detail);
      if (res.status === 401 || res.status === 403) {
        return fail(`Token rejected by ${baseUrl} (HTTP ${res.status}). ${res.errorText ?? ""}`);
      }
      return fail(`Could not verify the token against ${baseUrl}. ${res.errorText ?? `HTTP ${res.status}`}`);
    }),
  );
}

async function main(): Promise<void> {
  try {
    initConfig();
  } catch (err) {
    console.error(`cck-admin-mcp: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const server = new McpServer({ name: "cck-admin-mcp", version: "1.0.0" });
  registerWhoami(server);
  registerEventTools(server);
  registerBlogTools(server);
  registerMediaTools(server);
  registerResourceTools(server);

  await server.connect(new StdioServerTransport());
  console.error(`cck-admin-mcp running on stdio (base URL ${getConfig().baseUrl})`);
}

main().catch((err) => {
  console.error("Fatal error starting cck-admin-mcp:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
