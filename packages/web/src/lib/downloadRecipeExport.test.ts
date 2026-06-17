import {downloadRecipeExportBundle} from './downloadRecipeExport.js';

describe('downloadRecipeExportBundle', () => {
  test('downloads a JSON file for the export bundle', () => {
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:export');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    downloadRecipeExportBundle({
      formatVersion: 1,
      exportedAt: '2024-06-08T12:00:00.000Z',
      recipes: [],
    });

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe('eciperay-recipes-2024-06-08.json');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
    createElement.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
