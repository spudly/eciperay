/**
 * Bounds an awaited operation so a dependency that never settles cannot hang
 * its caller forever (issue #492: the text-import route awaited every stage
 * unboundedly, so one stuck stage held the 201 response past the live e2e
 * suite's 60s budget — and the Anthropic SDK's own default timeout is
 * 10 minutes per attempt, far beyond any request budget).
 *
 * The underlying operation is NOT cancelled (a promise cannot be); its
 * result is simply abandoned. A late rejection of the abandoned operation is
 * consumed by the race, so it never surfaces as an unhandled rejection.
 */
export class StageTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'StageTimeoutError';
  }
}

export const withTimeout = <T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  // The Promise executor runs synchronously, so `timer` is always assigned
  // before the race below is constructed.
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new StageTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([operation, timeout]).finally(() => {
    clearTimeout(timer);
  });
};

/**
 * Like {@link withTimeout}, but a timeout resolves to `null` instead of
 * rejecting — for stages whose absence is a normal outcome (the imported
 * image: an import without an image is a successful import). Non-timeout
 * errors still reject.
 */
export const withTimeoutOrNull = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T | null> => {
  try {
    return await withTimeout(operation, timeoutMs, label);
  } catch (error) {
    if (error instanceof StageTimeoutError) {
      return null;
    }
    throw error;
  }
};
