import type {Request, Response} from 'express';
import {jest} from '@jest/globals';
import {z} from 'zod';

import {parseAiJson, validate} from './validate.js';

const TestSchema = z.object({name: z.string().min(1)});

const makeRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({json});
  return {status, json} as unknown as Response;
};

const makeReq = (body: unknown) => ({body}) as Request;

describe('validate', () => {
  test('returns {ok: true, data} when body matches schema', () => {
    const req = makeReq({name: 'Alice'});
    const res = makeRes();
    const result = validate(TestSchema, req, res);
    expect(result).toEqual({ok: true, data: {name: 'Alice'}});
    expect(res.status).not.toHaveBeenCalled();
  });

  test('calls res.status(400).json and returns {ok: false} when body is invalid', () => {
    const req = makeReq({name: ''});
    const res = makeRes();
    const result = validate(TestSchema, req, res);
    expect(result).toEqual({ok: false});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('400 response includes error and issues fields', () => {
    const req = makeReq({});
    const res = makeRes();
    validate(TestSchema, req, res);
    const jsonMock = (
      (res.status as jest.Mock).mock.results[0]?.value as {json: jest.Mock}
    ).json;
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.any(Array),
      }),
    );
  });
});

describe('parseAiJson', () => {
  test('returns parsed and validated data for valid input', () => {
    const data = parseAiJson(TestSchema, '{"name":"Bob"}');
    expect(data).toEqual({name: 'Bob'});
  });

  test('throws on invalid JSON', () => {
    expect(() => parseAiJson(TestSchema, 'not json')).toThrow();
  });

  test('throws when JSON does not match schema', () => {
    expect(() => parseAiJson(TestSchema, '{"name":""}')).toThrow();
  });
});
