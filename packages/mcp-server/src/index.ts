/**
 * Eciperay MCP server (stdio) for local clients.
 *
 * Exposes recipe search, recipe details, recipe creation, meal plans, and
 * shopping lists to MCP clients such as Claude Desktop, Cursor, and Muse. For
 * remote access, the same tools are served over HTTP by the web server at POST
 * /api/mcp (see http.ts).
 */

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {config as loadEnv} from 'dotenv';

import {loadConfig} from './eciperayClient.js';
import {createEciperayMcpServer} from './mcpServer.js';

// Load the package .env (see .env.example) so `npm run start` works without
// manually exporting ECIPERAY_API_TOKEN. Explicit environment variables still
// win over .env values.
loadEnv();

const main = async (): Promise<void> => {
  const server = createEciperayMcpServer(loadConfig());
  await server.connect(new StdioServerTransport());
};

main().catch((error: unknown) => {
  console.error('Eciperay MCP server failed to start:', error);
  process.exitCode = 1;
});
