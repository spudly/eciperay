import {vi} from 'vitest';

type PaddleModule = typeof import('./paddle.js');

const SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

const makeFakePaddle = () => ({
  Environment: {set: vi.fn()},
  Initialize: vi.fn(),
});

type FakePaddle = ReturnType<typeof makeFakePaddle>;

const setWindowPaddle = (paddle?: FakePaddle) => {
  const w = window as Window & {Paddle?: FakePaddle};
  if (paddle) {
    w.Paddle = paddle;
  } else {
    delete w.Paddle;
  }
};

const appendedScripts = (): HTMLScriptElement[] => [
  ...document.head.querySelectorAll<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"]`,
  ),
];

const lastScript = (): HTMLScriptElement => {
  const script = appendedScripts().at(-1);
  if (!script) {
    throw new Error('Paddle.js script was not appended');
  }
  return script;
};

const importPaddle = async (env: {
  token: string;
  environment: string;
}): Promise<PaddleModule> => {
  vi.resetModules();
  vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', env.token);
  vi.stubEnv('VITE_PADDLE_ENVIRONMENT', env.environment);
  return import('./paddle.js');
};

describe('paddle lib', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    setWindowPaddle(undefined);
    for (const script of appendedScripts()) {
      script.remove();
    }
  });

  test('isPaddleConfigured reflects whether a token is set', async () => {
    const configured = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    expect(configured.isPaddleConfigured()).toBe(true);
    const unconfigured = await importPaddle({
      token: '',
      environment: 'sandbox',
    });
    expect(unconfigured.isPaddleConfigured()).toBe(false);
  });

  test('uses an already-loaded Paddle without injecting a script', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    const onEvent = vi.fn();
    await paddle.initializePaddle(onEvent);
    expect(appendedScripts()).toHaveLength(0);
    expect(fake.Environment.set).toHaveBeenCalledWith('sandbox');
    expect(fake.Initialize).toHaveBeenCalledWith({
      token: 'test_abc',
      eventCallback: onEvent,
    });
  });

  test('does not set the sandbox environment in production', async () => {
    const paddle = await importPaddle({
      token: 'live_abc',
      environment: 'production',
    });
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    const onEvent = vi.fn();
    await paddle.initializePaddle(onEvent);
    expect(fake.Environment.set).not.toHaveBeenCalled();
    expect(fake.Initialize).toHaveBeenCalledWith({
      token: 'live_abc',
      eventCallback: onEvent,
    });
  });

  test('injects the CDN script once for concurrent initializations', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const onEvent = vi.fn();
    const first = paddle.initializePaddle(onEvent);
    const second = paddle.initializePaddle(onEvent);
    expect(appendedScripts()).toHaveLength(1);
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    lastScript().onload?.(new Event('load'));
    await Promise.all([first, second]);
    expect(fake.Initialize).toHaveBeenCalledTimes(2);
  });

  test('rejects when the loaded script does not expose Paddle', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const pending = paddle.initializePaddle(vi.fn());
    lastScript().onload?.(new Event('load'));
    await expect(pending).rejects.toThrow('loaded without exposing');
  });

  test('rejects on script error and allows a retry', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const pending = paddle.initializePaddle(vi.fn());
    lastScript().onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow('Failed to load Paddle.js');
    const fake = makeFakePaddle();
    const retry = paddle.initializePaddle(vi.fn());
    expect(appendedScripts()).toHaveLength(2);
    setWindowPaddle(fake);
    lastScript().onload?.(new Event('load'));
    await retry;
    expect(fake.Initialize).toHaveBeenCalledTimes(1);
  });
});
