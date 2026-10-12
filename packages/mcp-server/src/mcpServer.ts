import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import {createClient, type EciperayClientConfig} from './eciperayClient.js';
import {registerTools} from './tools.js';

export const MCP_SERVER_NAME = 'eciperay';
export const MCP_SERVER_VERSION = '1.8.3';

/**
 * Build a transport-agnostic Eciperay MCP server. Callers choose how to
 * expose it: stdio for local clients (see index.ts) or Streamable HTTP
 * mounted in the web server (see http.ts).
 */
export const createEciperayMcpServer = (
  config: EciperayClientConfig,
): McpServer => {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });
  registerTools(server, createClient(config));
  return server;
};
