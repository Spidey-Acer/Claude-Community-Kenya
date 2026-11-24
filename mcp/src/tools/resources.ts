/**
 * resource_submit: submit a community resource, ported from the demo server.
 *
 * /api/community/submit is public and CSRF-protected (it does not run the admin
 * permission check), so this keeps the demo's flow exactly: GET /api/csrf-token,
 * then POST with x-csrf-token. The bearer header rides along harmlessly.
 * The endpoint is rate-limited to 3 submissions per day per IP, hence dryRun
 * defaults to true.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, failFromApi, getConfig, guard, ok } from "../client.js";

const RESOURCE_TYPES = ["MCP", "PROMPT", "WORKFLOW", "TOOL", "SHOWCASE"] as const;

/** Register the resource tool on the server. */
export function registerResourceTools(server: McpServer): void {
  server.registerTool(
    "resource_submit",
    {
      title: "Submit community resource",
      description:
        "Submit a community resource (MCP server, prompt, workflow, tool or showcase) to Claude Community Kenya. Defaults to a dry run that fetches a CSRF token and shows the exact payload without sending it. The live endpoint is rate-limited to 3 submissions per day per IP.",
      inputSchema: {
        type: z.enum(RESOURCE_TYPES).describe("Category of the resource"),
        title: z.string().min(5).max(150).describe("Resource title (5-150 chars)"),
        shortDescription: z.string().min(20).max(300).describe("Short description (20-300 chars)"),
        fullDescription: z.string().min(50).max(5000).describe("Full description (50-5000 chars)"),
        url: z.string().url().optional().describe("Optional link to the resource (demo, docs, site)"),
        repoUrl: z.string().url().optional().describe("Optional link to the resource's repo"),
        installInstructions: z.string().max(3000).optional().describe("Optional install steps (max 3000 chars)"),
        tags: z.array(z.string().max(30)).max(10).default([]).describe("Up to 10 tags, each max 30 chars"),
        submitterName: z.string().max(100).optional().describe("Optional name to credit"),
        submitterContact: z.string().max(200).optional().describe("Optional contact (email or handle)"),
        dryRun: z.boolean().default(true).describe("When true (default), do NOT submit; show the payload only"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guard("resource_submit", async ({ dryRun, ...fields }) => {
      const payload = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
      );

      const csrf = await apiRequest("GET", "/api/csrf-token");
      const csrfToken = (csrf.data as { csrfToken?: string } | null)?.csrfToken;
      if (!csrf.ok || !csrfToken) return failFromApi("Fetching CSRF token", csrf);

      if (dryRun) {
        return ok("DRY RUN: nothing was submitted. This is the request that would be sent.", {
          request: `POST ${getConfig().baseUrl}/api/community/submit`,
          payload,
        });
      }

      const res = await apiRequest("POST", "/api/community/submit", {
        json: payload,
        headers: { "x-csrf-token": csrfToken },
      });
      if (!res.ok) return failFromApi("Submitting resource", res);
      return ok(`Submitted "${fields.title}" for review.`, res.data);
    }),
  );
}
