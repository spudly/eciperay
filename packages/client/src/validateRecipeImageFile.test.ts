import {validateRecipeImageFile} from './validateRecipeImageFile.js';

describe('validateRecipeImageFile', () => {
  test('accepts a valid image file', () => {
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    expect(() => {
      validateRecipeImageFile(file);
    }).not.toThrow();
  });

  test('rejects non-image files', () => {
    const file = new File(['text'], 'notes.txt', {type: 'text/plain'});
    expect(() => {
      validateRecipeImageFile(file);
    }).toThrow('Please choose a JPEG, PNG, GIF, or WebP image');
  });

  test('rejects files larger than 5 MB', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    expect(() => {
      validateRecipeImageFile(file);
    }).toThrow('Image must be 5 MB or smaller');
  });
});
