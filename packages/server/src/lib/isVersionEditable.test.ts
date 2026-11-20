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
  test('allows editable drafts', () => {
    expect(isVersionEditable(draftVersion)).toBe(true);
  });

  test('blocks non-draft versions', () => {
    expect(
      isVersionEditable({...draftVersion, derivedRole: 'active'}),
    ).toBe(false);
  });

  test('marks non-draft versions as content locked', () => {
    expect(
      isVersionContentLocked({...draftVersion, derivedRole: 'active'}),
    ).toBe(true);
    expect(isVersionContentLocked(draftVersion)).toBe(false);
  });

  test('blocks versions with cook logs or children', () => {
    expect(
      isVersionEditable({...draftVersion, cookLogCount: 1}),
    ).toBe(false);
    expect(
      isVersionEditable({...draftVersion, childVersionCount: 1}),
    ).toBe(false);
  });

});
