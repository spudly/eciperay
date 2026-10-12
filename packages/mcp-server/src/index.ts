/**
 * Eciperay MCP server (stdio) for local clients.
 *
 * Exposes recipe search, recipe details, recipe creation, meal plans, and
 * shopping lists to MCP clients such as Claude Desktop, Cursor, and Muse.
 * For remote access, the same tools are served over HTTP by the web server
 * at POST /api/mcp (see http.ts).
 */

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';

import {loadConfig} from './eciperayClient.js';
import {createEciperayMcpServer} from './mcpServer.js';

const main = async (): Promise<void> => {
  const server = createEciperayMcpServer(loadConfig());
  await server.connect(new StdioServerTransport());
};

main().catch((error: unknown) => {
  console.error('Eciperay MCP server failed to start:', error);
  process.exit(1);
});
