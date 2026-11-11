import {Linking} from 'react-native';

import {safeOpenUrl} from './safeOpenUrl';

describe('safeOpenUrl', () => {
  test('opens the URL through Linking', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await safeOpenUrl('com.eciperay://recipes');

    expect(openURL).toHaveBeenCalledWith('com.eciperay://recipes');
  });

  test('a failed open resolves instead of leaking an unhandled rejection', async () => {
    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(
        new Error(
          'No Activity found to handle Intent { act=android.intent.action.VIEW }',
        ),
      );

    await expect(
      safeOpenUrl('com.eciperay://unmapped-route'),
    ).resolves.toBeUndefined();
  });
});
