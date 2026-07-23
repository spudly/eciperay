const SENSITIVE_KEY_PATTERN =
  /password|token|secret|authorization|api[_-]?key|credential/i;

const MAX_STRING_LENGTH = 500;

export const isSensitiveAnalyticsPropertyKey = (key: string): boolean => {
  // PostHog SDK attaches the project key as properties.token in before_send payloads.
  if (key === 'token') {
    return false;
  }
  return SENSITIVE_KEY_PATTERN.test(key);
};

export const sanitizePostHogEventProperties = (
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!properties) {
    return undefined;
  }

  const systemProperties: Record<string, unknown> = {};
  const customProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith('$') || key === 'distinct_id') {
      systemProperties[key] = value;
      continue;
    }
    customProperties[key] = value;
  }

  return {
    ...systemProperties,
    ...sanitizeAnalyticsProperties(customProperties),
  };
};

export const sanitizeAnalyticsProperties = (
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!properties) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (isSensitiveAnalyticsPropertyKey(key)) {
      sanitized[key] = '[redacted]';
      continue;
    }
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      sanitized[key] = `${value.slice(0, MAX_STRING_LENGTH)}…`;
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
};
