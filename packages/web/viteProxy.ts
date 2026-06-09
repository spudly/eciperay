type ProxyRequest = {method?: string; headers: {accept?: string}};

export const isBrowserDocumentRequest = (req: ProxyRequest) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  const accept = req.headers.accept ?? '';
  return accept.includes('text/html');
};

export const createApiProxy = (target: string) => ({
  target,
  bypass: (req: ProxyRequest): string | undefined => {
    if (isBrowserDocumentRequest(req)) {
      return '/index.html';
    }
    return undefined;
  },
});
