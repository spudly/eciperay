import {jest} from '@jest/globals';

import {anthropic} from '../lib/anthropic.js';

// jest.spyOn is used instead of nock HTTP interception because nock's
// ClientRequestInterceptor (via @mswjs/interceptors) does not reliably
// intercept node-fetch requests on Linux runners (Node 22 / Ubuntu).
// Mocking at the module level is environment-agnostic.
//
// The spy is created once per module instantiation (once per test file).
// resetMocks:true in jest.config.cjs calls .mockReset() between tests,
// clearing the implementation so each test must call nockAnthropicMessage()
// to re-arm it with mockResolvedValueOnce.
const createSpy = jest.spyOn(anthropic.messages, 'create');

/**
 * Arms `anthropic.messages.create` to resolve once with a text message whose
 * `.content[0].text` equals `responseText`. Call once per test before the
 * action under test.
 */
export const nockAnthropicMessage = (responseText: string): void => {
  createSpy.mockResolvedValueOnce({
    id: 'msg-test',
    type: 'message',
    role: 'assistant',
    content: [{type: 'text', text: responseText}],
    model: 'claude-haiku-4-5',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {input_tokens: 10, output_tokens: 10},
  } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);
};
