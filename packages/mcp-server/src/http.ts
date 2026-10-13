import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {Router} from 'express';

import {createEciperayMcpServer} from './mcpServer.js';

export type McpHttpOptions = {
  /** Base URL of the Eciperay API the tools call, e.g. http://localhost:8080 */
  apiUrl: string;
};

/**
 * Express router exposing the Eciperay MCP server over Streamable HTTP.
 *
 * Mount it behind authentication (e.g. requireAuth): the caller's bearer token
 * is forwarded to the Eciperay API so tools run with the caller's identity and
 * permissions. The transport is stateless, so the route is safe behind load
 * balancers with no session affinity.
 */
export const createMcpRouter = ({apiUrl}: McpHttpOptions) => {
  const router = Router();
  router.post('/', async (req, res) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      res.status(401).json({error: 'Missing authorization token'});
      return;
    }
    const server = createEciperayMcpServer({
      apiUrl,
      apiToken: authorization.replace(/^Bearer\s+/i, ''),
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    // The transport is stateless: tear down the per-request server and
    // transport when the response closes so nothing accumulates.
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res
          .status(500)
          .json({
            jsonrpc: '2.0',
            id: null,
            error: {code: -32_603, message: 'Internal error'},
          });
      }
    }
  });
  return router;
};
