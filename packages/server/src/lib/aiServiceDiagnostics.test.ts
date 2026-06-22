import Anthropic from '@anthropic-ai/sdk';

import {serializeErrorForLog} from './aiServiceDiagnostics.js';

describe('serializeErrorForLog', () => {
  test('serializes Anthropic API errors', () => {
    const error = new Anthropic.APIError(429, undefined, 'Rate limited', {
      'request-id': 'req_123',
    });
    expect(serializeErrorForLog(error)).toEqual({
      errorType: 'Anthropic.APIError',
      status: 429,
      message: '429 Rate limited',
      requestId: 'req_123',
    });
  });

  test('serializes Anthropic API errors without request id', () => {
    const error = new Anthropic.APIError(
      503,
      undefined,
      'Service unavailable',
      undefined,
    );
    expect(serializeErrorForLog(error)).toEqual({
      errorType: 'Anthropic.APIError',
      status: 503,
      message: '503 Service unavailable',
    });
  });

  test('serializes Anthropic API errors with non-number status', () => {
    const error = new Anthropic.APIError(
      undefined,
      undefined,
      'failed',
      undefined,
    );
    expect(serializeErrorForLog(error)).toEqual({
      errorType: 'Anthropic.APIError',
      status: 0,
      message: 'failed',
    });
  });

  test('serializes connection errors with cause details', () => {
    const error = new Anthropic.APIConnectionError({
      message:
        'Invalid response body while trying to fetch https://api.anthropic.com/v1/messages: Premature close',
      cause: new Error('Premature close'),
    });
    expect(serializeErrorForLog(error)).toEqual({
      errorType: 'Anthropic.APIConnectionError',
      message:
        'Invalid response body while trying to fetch https://api.anthropic.com/v1/messages: Premature close',
      causeType: 'Error',
      causeMessage: 'Premature close',
    });
  });

  test('serializes connection errors without cause details', () => {
    const error = new Anthropic.APIConnectionError({
      message: 'Connection reset',
    });
    expect(serializeErrorForLog(error)).toEqual({
      errorType: 'Anthropic.APIConnectionError',
      message: 'Connection reset',
    });
  });

  test('serializes generic errors', () => {
    const error = new Error('boom');
    error.cause = new Error('root cause');
    expect(serializeErrorForLog(error)).toMatchObject({
      errorType: 'Error',
      message: 'boom',
      causeType: 'Error',
      causeMessage: 'root cause',
    });
  });

  test('falls back to Error when the error name is empty', () => {
    const error = new Error('boom');
    error.name = '';
    expect(serializeErrorForLog(error)).toMatchObject({
      errorType: 'Error',
      message: 'boom',
    });
  });

  test('serializes non-error values', () => {
    expect(serializeErrorForLog('broken')).toEqual({
      errorType: 'string',
      message: 'broken',
    });
  });
});
