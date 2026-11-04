import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Linking} from 'react-native';
import {
  CONSENT_PREFERENCES_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '@eciperay/client';

import {LegalLinks} from './LegalLinks';

describe('LegalLinks', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('opens stacked legal document URLs', async () => {
    const {getByText} = await render(<LegalLinks />);
    await fireEvent.press(getByText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    await fireEvent.press(getByText('Terms of Service'));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
    await fireEvent.press(
      getByText('Do Not Sell or Share My Personal Information'),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(CONSENT_PREFERENCES_URL);
  });

  test('opens inline legal document URLs', async () => {
    const {getByText} = await render(<LegalLinks variant="inline" />);
    await fireEvent.press(getByText('Terms of Service'));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
    await fireEvent.press(getByText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });
});
