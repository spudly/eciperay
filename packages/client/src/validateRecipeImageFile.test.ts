import {
  validateRecipeImageContent,
  validateRecipeImageFile,
} from './validateRecipeImageFile.js';

describe('validateRecipeImageContent', () => {
  test('accepts valid image content', () => {
    expect(() => {
      validateRecipeImageContent('image/png', 1024);
    }).not.toThrow();
  });

  test('rejects unsupported content types', () => {
    expect(() => {
      validateRecipeImageContent('text/plain', 10);
    }).toThrow('Please choose a JPEG, PNG, GIF, or WebP image');
  });

  test('rejects content larger than 5 MB', () => {
    expect(() => {
      validateRecipeImageContent('image/jpeg', 5 * 1024 * 1024 + 1);
    }).toThrow('Image must be 5 MB or smaller');
  });
});

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
