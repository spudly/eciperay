import {
  clampCropRect,
  cropImageFile,
  defaultCropRect,
  moveCropRect,
  RECIPE_CROP_ASPECT,
  resizeCropRect,
} from './recipeImageCrop.js';

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

  test('honours an explicit aspect ratio', () => {
    const rect = defaultCropRect(1000, 1000, 1);
    expect(rect.width / rect.height).toBeCloseTo(1);
    expect(RECIPE_CROP_ASPECT).toBeCloseTo(4 / 3);
  });
});

describe('clampCropRect', () => {
  test('keeps an in-bounds rect unchanged', () => {
    expect(
      clampCropRect({x: 10, y: 20, width: 300, height: 200}, 800, 600),
    ).toEqual({x: 10, y: 20, width: 300, height: 200});
  });

  test('pulls an out-of-bounds rect back inside the image', () => {
    expect(
      clampCropRect({x: 700, y: 550, width: 300, height: 200}, 800, 600),
    ).toEqual({x: 500, y: 400, width: 300, height: 200});
  });

  test('enforces the minimum size and the image bounds', () => {
    const rect = clampCropRect(
      {x: -5, y: -5, width: 4, height: 9000},
      800,
      600,
    );
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBe(600);
  });
});

describe('moveCropRect / resizeCropRect', () => {
  const rect = {x: 100, y: 100, width: 400, height: 300};

  test('moves within bounds and stops at the edges', () => {
    expect(moveCropRect(rect, 50, -20, 800, 600)).toEqual({
      x: 150,
      y: 80,
      width: 400,
      height: 300,
    });
    expect(moveCropRect(rect, 10_000, 10_000, 800, 600)).toEqual({
      x: 400,
      y: 300,
      width: 400,
      height: 300,
    });
  });

  test('resizes from the bottom-right and clamps to the image', () => {
    expect(resizeCropRect(rect, 100, 50, 800, 600)).toEqual({
      x: 100,
      y: 100,
      width: 500,
      height: 350,
    });
    // A maximal resize fills the whole image (the box shifts to stay inside).
    expect(resizeCropRect(rect, 10_000, 10_000, 800, 600)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });
});

describe('cropImageFile', () => {
  const originalImage = globalThis.Image;

  afterEach(() => {
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  test('draws the crop region to a canvas and returns a File', async () => {
    class FakeImage {
      onload: (() => void) | null = null;
      private listeners = new Map<string, () => void>();
      addEventListener(event: string, handler: () => void) {
        this.listeners.set(event, handler);
      }
      set src(_value: string) {
        queueMicrotask(() => {
          this.listeners.get('load')?.();
        });
      }
    }
    globalThis.Image = FakeImage as unknown as typeof Image;

    const drawImage = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({drawImage}),
      toBlob: (callback: (blob: Blob | null) => void, type?: string) => {
        callback(new Blob(['cropped'], {type: type ?? 'image/png'}));
      },
    };
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'canvas'
        ? fakeCanvas
        : realCreateElement(tag)) as typeof document.createElement);

    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    const cropped = await cropImageFile(file, {
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    expect(cropped).toBeInstanceOf(File);
    expect(cropped.name).toBe('recipe.png');
    expect(cropped.type).toBe('image/png');
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      10,
      20,
      300,
      200,
      0,
      0,
      300,
      200,
    );
  });

  test('rejects when the image cannot be loaded', async () => {
    class FakeImage {
      private listeners = new Map<string, () => void>();
      addEventListener(event: string, handler: () => void) {
        this.listeners.set(event, handler);
      }
      set src(_value: string) {
        queueMicrotask(() => {
          this.listeners.get('error')?.();
        });
      }
    }
    globalThis.Image = FakeImage as unknown as typeof Image;
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await expect(
      cropImageFile(file, {x: 0, y: 0, width: 100, height: 100}),
    ).rejects.toThrow('Failed to load image for cropping');
  });
});
