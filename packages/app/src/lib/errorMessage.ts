export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unexpected error occurred';
