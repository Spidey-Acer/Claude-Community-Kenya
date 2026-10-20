# cck-admin-mcp

MCP server (stdio) for administering claudekenya.org: events, blog, images, event galleries. Every request sends `Authorization: Bearer $CCK_SERVICE_TOKEN`; with that header the site skips its CSRF header check, so no CSRF token is sent (except `resource_submit`, which hits a public route).

## Setup

Requires Node 20+.

```bash
cd mcp
npm install
npm run build
npm run smoke   # lists tools, calls whoami; a dummy token should report a clean 401
```

| Env var | Required | Default |
| --- | --- | --- |
| `CCK_SERVICE_TOKEN` | yes, the server refuses to start without it | none |
| `CCK_BASE_URL` | no | `https://www.claudekenya.org` |

Keep the `www.` host. The apex domain redirects (307) to www, and a redirected POST can lose its body or auth header.

## Claude Code config

Add to `~/.claude.json` (use the absolute path to your checkout):

```json
{
  "mcpServers": {
    "cck": {
      "command": "node",
      "args": ["C:/Projects/code/Claude-Community-Kenya/mcp/build/index.js"],
      "env": {
        "CCK_SERVICE_TOKEN": "<service token>",
        "CCK_BASE_URL": "https://www.claudekenya.org"
      }
    }
  }
}
```

## Tools

- `whoami` - report the base URL and whether the token is accepted (200) or rejected (401/403).
- `events_list` - paginated compact event rows; status/city filters apply to the fetched page only (the route has no filters).
- `events_get` - one event with all fields.
- `events_create` - create an event (slug is generated from the title).
- `events_update` - partial update by id (slug is not editable; `fullDescription` cannot be cleared; `photosUrl` is not in the update route).
- `events_delete` - delete by id; refuses unless `confirm: true`.
- `blog_list` - paginated compact post rows (no body), optional status filter on the page.
- `blog_get` - one post with full content.
- `blog_create` - create a post, defaults to DRAFT.
- `blog_update` - partial update by id.
- `blog_publish` - set status PUBLISHED (the server stamps `publishedAt`). There is no blog delete tool.
- `upload_image` - upload a local jpg/png/webp/gif (max 5 MB) to folder events|blog|team|community, returns the URL.
- `event_set_poster` - upload an image to `events` and set it as the event's `posterUrl` in one call.
- `gallery_upload` - upload every image in a directory to an event gallery via signed URLs (max 25 MB per file, batches of 200, not recursive); reports counts and failed files by name.
- `resource_submit` - submit a community resource; dry run by default, 3 live submissions per day per IP.

Every tool returns a one-line summary followed by the JSON as text. Failures return `isError` with the HTTP status and the server's `error`/`details`. The token is never printed.
