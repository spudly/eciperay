import {downloadAccountExportBundle} from './downloadAccountExport.js';

describe('downloadAccountExportBundle', () => {
  test('downloads a JSON file for the account export bundle', () => {
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

    downloadAccountExportBundle({
      formatVersion: 1,
      exportedAt: '2024-06-08T12:00:00.000Z',
      profile: {
        email: 'test@example.com',
        displayName: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      recipes: [],
      shareGrants: [],
      communityRatings: [],
      comments: [],
      nutritionGoals: {
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        satietyScore: null,
      },
    });

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe('eciperay-account-2024-06-08.json');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
    createElement.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
