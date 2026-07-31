import {LEGAL_CONTACT_EMAIL} from '@eciperay/client';

export const LegalInlineLink = () => (
  <a
    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
    className="ui-link"
  >
    {LEGAL_CONTACT_EMAIL}
  </a>
);
