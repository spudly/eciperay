import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from './recipeImageInput.js';

describe('getImageFileFromDataTransfer', () => {
  test('returns the first file from a drop', () => {
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    const dataTransfer = {files: [file], items: []} as unknown as DataTransfer;
    expect(getImageFileFromDataTransfer(dataTransfer)).toBe(file);
  });

  test('returns an image item from the clipboard', () => {
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    const dataTransfer = {
      files: [],
      items: [{kind: 'file', type: 'image/png', getAsFile: () => file}],
    } as unknown as DataTransfer;
    expect(getImageFileFromDataTransfer(dataTransfer)).toBe(file);
  });

  test('returns null when no image is present', () => {
    const dataTransfer = {
      files: [],
      items: [{kind: 'string', type: 'text/plain', getAsFile: () => null}],
    } as unknown as DataTransfer;
    expect(getImageFileFromDataTransfer(dataTransfer)).toBeNull();
  });
});

describe('shouldIgnoreImagePaste', () => {
  test('ignores paste targets inside text inputs', () => {
    const input = document.createElement('input');
    expect(shouldIgnoreImagePaste(input)).toBe(true);
  });

  test('allows paste on non-input elements', () => {
    const div = document.createElement('div');
    expect(shouldIgnoreImagePaste(div)).toBe(false);
  });
});
