import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Linking} from 'react-native';
import {PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL} from '@eciperay/client';

import {LegalLinks} from './LegalLinks';

describe('LegalLinks', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('opens stacked legal document URLs', () => {
    const {getByText} = render(<LegalLinks />);
    fireEvent.press(getByText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    fireEvent.press(getByText('Terms of Service'));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
  });

  test('opens inline legal document URLs', () => {
    const {getByText} = render(<LegalLinks variant="inline" />);
    fireEvent.press(getByText('Terms of Service'));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
    fireEvent.press(getByText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });
});
