import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR_NAME,
  MOBILE_APP_INSTALL_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  WEB_APP_BASE_URL,
} from './legalUrls.js';

describe('legalUrls', () => {
  test('exports production legal URLs and contact details', () => {
    expect(PRIVACY_POLICY_URL).toBe('https://www.eciperay.com/privacy');
    expect(WEB_APP_BASE_URL).toBe('https://www.eciperay.com');
    expect(MOBILE_APP_INSTALL_URL).toBe('https://www.eciperay.com');
    expect(TERMS_OF_SERVICE_URL).toBe('https://www.eciperay.com/terms');
    expect(LEGAL_OPERATOR_NAME).toBe('Stephen Sorensen');
    expect(LEGAL_CONTACT_EMAIL).toBe('shuoink+eciperaylegal@gmail.com');
  });
});
