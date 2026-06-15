import {queryKeys} from './queryKeys.js';

describe('queryKeys', () => {
  test('returns stable key tuples', () => {
    expect(queryKeys.recipes()).toEqual(['recipes', {search: ''}]);
    expect(queryKeys.recipes('pasta')).toEqual(['recipes', {search: 'pasta'}]);
    expect(queryKeys.recipe('r1')).toEqual(['recipe', 'r1']);
    expect(queryKeys.notes('r1')).toEqual(['notes', 'r1']);
    expect(queryKeys.conversation('r1')).toEqual(['conversation', 'r1']);
    expect(queryKeys.nutrition('r1')).toEqual(['nutrition', 'r1']);
    expect(queryKeys.drafts('r1')).toEqual(['drafts', 'r1']);
    expect(queryKeys.tags()).toEqual(['tags']);
  });
});
