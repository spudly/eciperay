/**
 * Eciperay MCP server (stdio).
 *
 * Exposes recipe search, recipe details, recipe creation, meal plans, and
 * shopping lists to MCP clients such as Claude Desktop, Cursor, and Muse.
 */

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';

import {createClient, loadConfig} from './eciperayClient.js';
import {registerTools} from './tools.js';

const main = async (): Promise<void> => {
  const server = new McpServer({name: 'eciperay', version: '1.8.3'});
  registerTools(server, createClient(loadConfig()));
  await server.connect(new StdioServerTransport());
};

main().catch((error: unknown) => {
  console.error('Eciperay MCP server failed to start:', error);
  process.exit(1);
});
