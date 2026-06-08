import nock from 'nock';

const ANTHROPIC_URL = 'https://api.anthropic.com';

/**
 * Registers a nock intercept for `anthropic.messages.create()`. `responseText`
 * is the text the model should return. Call in `beforeEach`.
 */
export const nockAnthropicMessage = (responseText: string) =>
  nock(ANTHROPIC_URL)
    .post('/v1/messages')
    .reply(200, {
      id: 'msg-test',
      type: 'message',
      role: 'assistant',
      content: [{type: 'text', text: responseText}],
      model: 'claude-3-5-haiku-20241022',
      stop_reason: 'end_turn',
      usage: {input_tokens: 10, output_tokens: 10},
    });
