import {
  fetchPaddleCustomerEmail,
  findPaddleCustomerIdByEmail,
  listPaddleSubscriptions,
  paddleApiGet,
} from './paddleApi.js';

const realFetch = global.fetch;
let fetchCalls: {url: string; init?: RequestInit}[];
let fetchImpl: (url: string) => Promise<unknown>;

const okJson = (body: unknown): Promise<unknown> =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

beforeEach(() => {
  process.env['PADDLE_API_KEY'] = 'test-paddle-key';
  delete process.env['PADDLE_API_BASE'];
  fetchCalls = [];
  fetchImpl = () => Promise.reject(new Error('fetch not configured'));
  global.fetch = (async (url: unknown, init?: RequestInit) => {
    const urlStr = String(url);
    fetchCalls.push({url: urlStr, init});
    return fetchImpl(urlStr);
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env['PADDLE_API_KEY'];
});

test('paddleApiGet returns null without an API key and never calls fetch', async () => {
  delete process.env['PADDLE_API_KEY'];
  await expect(paddleApiGet('/customers/ctm_1')).resolves.toBeNull();
  expect(fetchCalls).toEqual([]);
});

test('paddleApiGet sends the bearer key to the sandbox base by default', async () => {
  fetchImpl = () => okJson({data: {id: 'ctm_1'}});
  await expect(paddleApiGet('/customers/ctm_1')).resolves.toEqual({
    data: {id: 'ctm_1'},
  });
  expect(fetchCalls).toEqual([
    {
      url: 'https://sandbox-api.paddle.com/customers/ctm_1',
      init: {headers: {Authorization: 'Bearer test-paddle-key'}},
    },
  ]);
});

test('paddleApiGet honours PADDLE_API_BASE and returns null on rejection', async () => {
  process.env['PADDLE_API_BASE'] = 'https://api.paddle.com';
  fetchImpl = () =>
    Promise.resolve({ok: false, status: 404, text: async () => 'nope'});
  await expect(paddleApiGet('/customers/ctm_x')).resolves.toBeNull();
  expect(fetchCalls[0]?.url).toBe('https://api.paddle.com/customers/ctm_x');
  delete process.env['PADDLE_API_BASE'];
});

test('paddleApiGet returns null when fetch throws', async () => {
  fetchImpl = () => Promise.reject(new Error('network down'));
  await expect(paddleApiGet('/customers/ctm_1')).resolves.toBeNull();
  fetchImpl = () => Promise.reject('plain string failure');
  await expect(paddleApiGet('/customers/ctm_1')).resolves.toBeNull();
});

test('fetchPaddleCustomerEmail extracts data.email', async () => {
  fetchImpl = () => okJson({data: {email: 'buyer@example.com'}});
  await expect(fetchPaddleCustomerEmail('ctm_1')).resolves.toBe(
    'buyer@example.com',
  );
});

test('fetchPaddleCustomerEmail returns null without a usable email', async () => {
  fetchImpl = () => okJson({data: {}});
  await expect(fetchPaddleCustomerEmail('ctm_1')).resolves.toBeNull();
  fetchImpl = () => okJson({data: {email: ''}});
  await expect(fetchPaddleCustomerEmail('ctm_1')).resolves.toBeNull();
  fetchImpl = () => okJson({data: null});
  await expect(fetchPaddleCustomerEmail('ctm_1')).resolves.toBeNull();
});

test('findPaddleCustomerIdByEmail returns the first customer id', async () => {
  fetchImpl = url => {
    expect(url).toContain('/customers?email=buyer%40example.com');
    return okJson({data: [{id: 'ctm_9'}, {id: 'ctm_10'}]});
  };
  await expect(findPaddleCustomerIdByEmail('buyer@example.com')).resolves.toBe(
    'ctm_9',
  );
});

test('findPaddleCustomerIdByEmail returns null for empty or malformed lists', async () => {
  fetchImpl = () => okJson({data: []});
  await expect(
    findPaddleCustomerIdByEmail('buyer@example.com'),
  ).resolves.toBeNull();
  fetchImpl = () => okJson({data: 'nope'});
  await expect(
    findPaddleCustomerIdByEmail('buyer@example.com'),
  ).resolves.toBeNull();
  fetchImpl = () => okJson({data: [{}]});
  await expect(
    findPaddleCustomerIdByEmail('buyer@example.com'),
  ).resolves.toBeNull();
});

test('listPaddleSubscriptions returns subscriptions and null on failure', async () => {
  fetchImpl = url => {
    expect(url).toContain('/subscriptions?customer_id=ctm_9');
    return okJson({data: [{id: 'sub_1', status: 'active'}]});
  };
  await expect(listPaddleSubscriptions('ctm_9')).resolves.toEqual([
    {id: 'sub_1', status: 'active'},
  ]);
  fetchImpl = () =>
    Promise.resolve({ok: false, status: 500, text: async () => 'err'});
  await expect(listPaddleSubscriptions('ctm_9')).resolves.toBeNull();
  fetchImpl = () => okJson({data: {}});
  await expect(listPaddleSubscriptions('ctm_9')).resolves.toBeNull();
});

test('listPaddleSubscriptions passes objects through, dropping non-objects', async () => {
  const raw = {id: 'sub_1', status: 'active', customer_id: 'ctm_9'};
  const noId = {status: 'active'};
  fetchImpl = () => okJson({data: [raw, noId, 'junk', null]});
  await expect(listPaddleSubscriptions('ctm_9')).resolves.toEqual([raw, noId]);
});
