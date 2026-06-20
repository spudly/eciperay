import {
  isVersionContentLocked,
  isVersionEditable,
} from './isVersionEditable.js';

const draftVersion = {
  derivedRole: 'draft' as const,
  childVersionCount: 0,
  cookLogCount: 0,
};

describe('isVersionEditable', () => {
  test('allows editable drafts on evolving recipes', () => {
    expect(isVersionEditable(draftVersion, 'evolving')).toBe(true);
  });

  test('blocks non-draft versions', () => {
    expect(
      isVersionEditable({...draftVersion, derivedRole: 'active'}, 'evolving'),
    ).toBe(false);
  });

  test('marks non-draft versions as content locked', () => {
    expect(
      isVersionContentLocked(
        {...draftVersion, derivedRole: 'active'},
        'evolving',
      ),
    ).toBe(true);
    expect(isVersionContentLocked(draftVersion, 'evolving')).toBe(false);
  });

  test('blocks versions with cook logs or children', () => {
    expect(
      isVersionEditable({...draftVersion, cookLogCount: 1}, 'evolving'),
    ).toBe(false);
    expect(
      isVersionEditable({...draftVersion, childVersionCount: 1}, 'evolving'),
    ).toBe(false);
  });

  test('blocks perfected and abandoned recipes', () => {
    expect(isVersionEditable(draftVersion, 'perfected')).toBe(false);
    expect(isVersionEditable(draftVersion, 'abandoned')).toBe(false);
  });
});
