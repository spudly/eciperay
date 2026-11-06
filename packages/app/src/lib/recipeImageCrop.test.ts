import {manipulateAsync} from 'expo-image-manipulator';

import {
  clampCropRect,
  cropPickedImage,
  defaultCropRect,
  moveCropRect,
  resizeCropRect,
} from './recipeImageCrop';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {JPEG: 'jpeg', PNG: 'png'},
}));

const mockManipulate = manipulateAsync as jest.Mock;

describe('defaultCropRect', () => {
  test('centers a 4:3 box in a square image', () => {
    expect(defaultCropRect(1200, 1200)).toEqual({
      x: 0,
      y: 150,
      width: 1200,
      height: 900,
    });
  });

  test('centers a 4:3 box in a wide image', () => {
    expect(defaultCropRect(1600, 900)).toEqual({
      x: 200,
      y: 0,
      width: 1200,
      height: 900,
    });
  });
});

describe('clampCropRect / moveCropRect / resizeCropRect', () => {
  test('clamps out-of-bounds rects inside the image', () => {
    expect(
      clampCropRect({x: 700, y: 550, width: 300, height: 200}, 800, 600),
    ).toEqual({x: 500, y: 400, width: 300, height: 200});
  });

  test('moves and resizes with clamping', () => {
    const rect = {x: 100, y: 100, width: 400, height: 300};
    expect(moveCropRect(rect, 10_000, 10_000, 800, 600)).toEqual({
      x: 400,
      y: 300,
      width: 400,
      height: 300,
    });
    expect(resizeCropRect(rect, 100, 50, 800, 600)).toEqual({
      x: 100,
      y: 100,
      width: 500,
      height: 350,
    });
  });
});

describe('cropPickedImage', () => {
  beforeEach(() => {
    mockManipulate.mockReset();
  });

  test('crops a png asset and keeps the png format', async () => {
    mockManipulate.mockResolvedValue({
      uri: 'file:///cache/cropped.png',
      width: 300,
      height: 200,
      base64: btoa('cropped'),
    });
    await expect(
      cropPickedImage(
        'file://recipe.png',
        {x: 10, y: 20, width: 300, height: 200},
        'image/png',
      ),
    ).resolves.toEqual({
      base64: btoa('cropped'),
      contentType: 'image/png',
      uri: 'file:///cache/cropped.png',
    });
    expect(mockManipulate).toHaveBeenCalledWith(
      'file://recipe.png',
      [{crop: {originX: 10, originY: 20, width: 300, height: 200}}],
      {base64: true, compress: 1, format: 'png'},
    );
  });

  test('writes non-png sources as jpeg', async () => {
    mockManipulate.mockResolvedValue({
      uri: 'file:///cache/cropped.jpg',
      width: 300,
      height: 200,
      base64: btoa('cropped'),
    });
    const result = await cropPickedImage(
      'file://recipe.gif',
      {x: 0, y: 0, width: 300, height: 200},
      'image/gif',
    );
    expect(result.contentType).toBe('image/jpeg');
    expect(mockManipulate).toHaveBeenCalledWith(
      'file://recipe.gif',
      [{crop: {originX: 0, originY: 0, width: 300, height: 200}}],
      {base64: true, compress: 1, format: 'jpeg'},
    );
  });

  test('throws when the manipulator returns no base64 data', async () => {
    mockManipulate.mockResolvedValue({
      uri: 'file:///cache/cropped.jpg',
      width: 300,
      height: 200,
    });
    await expect(
      cropPickedImage(
        'file://recipe.jpg',
        {x: 0, y: 0, width: 300, height: 200},
        'image/jpeg',
      ),
    ).rejects.toThrow('Failed to crop image');
  });
});
