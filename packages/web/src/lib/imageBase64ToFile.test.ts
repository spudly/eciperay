import {imageBase64ToFile} from './imageBase64ToFile.js';

describe('imageBase64ToFile', () => {
  test('converts base64 image data into a File', () => {
    const file = imageBase64ToFile('aGVsbG8=', 'image/png', 'recipe.png');
    expect(file.name).toBe('recipe.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(5);
  });
});
