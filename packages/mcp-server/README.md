# @eciperay/mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server for Eciperay.
It exposes your recipe collection, meal plans, and shopping lists as tools to
MCP clients such as Claude Desktop, Cursor, and Muse.

The server is a thin client over the Eciperay REST API, so it honors the same
authentication and permissions as the web and mobile apps.

## Tools

| Tool                | Description                                        |
| ------------------- | -------------------------------------------------- |
| `search_recipes`    | Search recipes by keyword                          |
| `get_recipe`        | Full recipe details: ingredients, steps, nutrition |
| `create_recipe`     | Save a new recipe                                  |
| `list_meal_plans`   | List saved meal plans                              |
| `get_meal_plan`     | Meal plan details with scheduled meals             |
| `get_shopping_list` | Aggregated shopping list for a meal plan           |

## Modes

**Local (stdio).** Run the server on your machine and point an MCP client at it.
No deployment needed:

```sh
ECIPERAY_API_URL=http://localhost:8080 ECIPERAY_API_TOKEN=... \
  npm run start --workspace=@eciperay/mcp-server
```

**Remote (HTTP).** The web server exposes the same tools at `POST /api/mcp` via
Streamable HTTP (see `src/http.ts`, mounted in `packages/server/src/server.ts`
behind the standard `requireAuth` middleware). Any MCP client that supports
remote servers can connect:

```json
{
  "mcpServers": {
    "eciperay": {
      "url": "https://your-server.fly.dev/api/mcp",
      "headers": {"Authorization": "Bearer <supabase-access-token>"}
    }
  }
}
```

The transport is stateless, so it works behind load balancers with no session
affinity. Your Supabase token is forwarded to the Eciperay API, so tools run
with your identity and permissions.

## Setup

```sh
npm install
```

Configure the environment (see `.env.example`):

```sh
ECIPERAY_API_URL=http://localhost:8080  # your Eciperay server
ECIPERAY_API_TOKEN=...                  # your Supabase access token
```

Run it:

```sh
npm run start --workspace=@eciperay/mcp-server
```

## Client configuration

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eciperay": {
      "command": "npx",
      "args": ["tsx", "/path/to/eciperay/packages/mcp-server/src/index.ts"],
      "env": {
        "ECIPERAY_API_URL": "http://localhost:8080",
        "ECIPERAY_API_TOKEN": "..."
      }
    }
  }
}
```

## Development

```sh
npm run dev --workspace=@eciperay/mcp-server   # watch mode
npm run typecheck --workspace=@eciperay/mcp-server
```
