import {vi} from 'vitest';

type PaddleModule = typeof import('./paddle.js');
type PaddleEvent = import('./paddle.js').PaddleEvent;

const SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

const makeFakePaddle = () => ({
  Environment: {set: vi.fn()},
  Initialize: vi.fn(),
  Checkout: {open: vi.fn()},
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

const sdkDispatcher = (fake: FakePaddle): ((event: PaddleEvent) => void) => {
  const options = fake.Initialize.mock.calls[0]?.[0] as
    {eventCallback?: (event: PaddleEvent) => void} | undefined;
  if (!options?.eventCallback) {
    throw new Error('Initialize was not called with an eventCallback');
  }
  return options.eventCallback;
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
    await paddle.initializePaddle('txn_1', vi.fn());
    expect(appendedScripts()).toHaveLength(0);
    expect(fake.Environment.set).toHaveBeenCalledWith('sandbox');
    expect(fake.Initialize).toHaveBeenCalledWith({
      token: 'test_abc',
      eventCallback: expect.any(Function),
    });
    expect(fake.Checkout.open).not.toHaveBeenCalled();
  });

  test('does not set the sandbox environment in production', async () => {
    const paddle = await importPaddle({
      token: 'live_abc',
      environment: 'production',
    });
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    await paddle.initializePaddle('txn_1', vi.fn());
    expect(fake.Environment.set).not.toHaveBeenCalled();
    expect(fake.Initialize).toHaveBeenCalledTimes(1);
  });

  test('injects the CDN script once for concurrent initializations', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const first = paddle.initializePaddle('txn_1', vi.fn());
    const second = paddle.initializePaddle('txn_2', vi.fn());
    expect(appendedScripts()).toHaveLength(1);
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    lastScript().onload?.(new Event('load'));
    await Promise.all([first, second]);
    expect(fake.Initialize).toHaveBeenCalledTimes(1);
    expect(fake.Checkout.open).toHaveBeenCalledWith({transactionId: 'txn_2'});
  });

  test('rejects when the loaded script does not expose Paddle', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const pending = paddle.initializePaddle('txn_1', vi.fn());
    lastScript().onload?.(new Event('load'));
    await expect(pending).rejects.toThrow('loaded without exposing');
  });

  test('rejects on script error and allows a retry', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const pending = paddle.initializePaddle('txn_1', vi.fn());
    lastScript().onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow('Failed to load Paddle.js');
    const fake = makeFakePaddle();
    const retry = paddle.initializePaddle('txn_1', vi.fn());
    expect(appendedScripts()).toHaveLength(2);
    setWindowPaddle(fake);
    lastScript().onload?.(new Event('load'));
    await retry;
    expect(fake.Initialize).toHaveBeenCalledTimes(1);
  });

  test('a later initialization opens its transaction without re-initializing', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    await paddle.initializePaddle('txn_1', firstCallback);
    await paddle.initializePaddle('txn_2', secondCallback);
    expect(fake.Initialize).toHaveBeenCalledTimes(1);
    expect(fake.Checkout.open).toHaveBeenCalledWith({transactionId: 'txn_2'});
    sdkDispatcher(fake)({name: 'checkout.completed'});
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith({name: 'checkout.completed'});
  });

  test('released handlers stop receiving events; other releases do not detach', async () => {
    const paddle = await importPaddle({
      token: 'test_abc',
      environment: 'sandbox',
    });
    const fake = makeFakePaddle();
    setWindowPaddle(fake);
    const callback = vi.fn();
    await paddle.initializePaddle('txn_1', callback);
    paddle.releasePaddle(vi.fn());
    sdkDispatcher(fake)({name: 'checkout.loaded'});
    expect(callback).toHaveBeenCalledTimes(1);
    paddle.releasePaddle(callback);
    sdkDispatcher(fake)({name: 'checkout.loaded'});
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
