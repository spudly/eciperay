import {StageTimeoutError, withTimeout, withTimeoutOrNull} from './withTimeout.js';

describe('withTimeout', () => {
  test('resolves with the operation result when it settles within the bound', async () => {
    await expect(
      withTimeout(Promise.resolve('done'), 1_000, 'stage'),
    ).resolves.toBe('done');
  });

  test('rejects with StageTimeoutError when the operation never settles', async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 20, 'stuck stage')).rejects.toThrow(
      StageTimeoutError,
    );
    await expect(withTimeout(never, 20, 'stuck stage')).rejects.toThrow(
      'stuck stage timed out after 20ms',
    );
  });

  test('propagates a rejection that lands before the bound', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 1_000, 'stage'),
    ).rejects.toThrow('boom');
  });
});

describe('withTimeoutOrNull', () => {
  test('resolves null when the operation never settles', async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeoutOrNull(never, 20, 'optional stage')).resolves.toBeNull();
  });

  test('still rejects on a non-timeout error', async () => {
    await expect(
      withTimeoutOrNull(Promise.reject(new Error('boom')), 1_000, 'stage'),
    ).rejects.toThrow('boom');
  });
});
