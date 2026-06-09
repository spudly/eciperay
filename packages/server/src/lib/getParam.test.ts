import type {Request} from 'express';

import {getParam} from './getParam.js';

describe('getParam', () => {
  test('returns the string value when param is a plain string', () => {
    const req = {params: {id: 'recipe-123'}} as unknown as Request;
    expect(getParam(req, 'id')).toBe('recipe-123');
  });

  test('returns the first element when param is an array', () => {
    const req = {params: {id: ['first', 'second']}} as unknown as Request;
    expect(getParam(req, 'id')).toBe('first');
  });

  test('returns empty string when param is undefined', () => {
    const req = {params: {}} as unknown as Request;
    expect(getParam(req, 'id')).toBe('');
  });

  test('returns empty string when array param is empty', () => {
    const req = {params: {id: []}} as unknown as Request;
    expect(getParam(req, 'id')).toBe('');
  });
});
