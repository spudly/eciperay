import {
  PostHog,
  setupExpressErrorHandler,
  setupExpressRequestContext,
} from 'posthog-node';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

let client: PostHog | null = null;

export const getPostHogClient = (): PostHog | null => {
  if (client) {
    return client;
  }

  const apiKey = process.env['POSTHOG_KEY'] ?? '';
  if (apiKey.length === 0) {
    return null;
  }

  const host = process.env['POSTHOG_HOST'] ?? DEFAULT_POSTHOG_HOST;
  client = new PostHog(apiKey, {host, enableExceptionAutocapture: true});
  return client;
};

export const captureServerException = (
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>,
) => {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }
  posthog.captureException(error, distinctId, properties);
};

export const attachPostHogExpress = (app: {
  use: (middleware: unknown) => unknown;
}) => {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }
  setupExpressRequestContext(posthog, app);
  setupExpressErrorHandler(posthog, app);
};

export const shutdownPostHog = async () => {
  if (!client) {
    return;
  }
  /* c8 ignore next 3 -- PostHog shutdown flushes over the network */
  await client.shutdown();
  client = null;
};
