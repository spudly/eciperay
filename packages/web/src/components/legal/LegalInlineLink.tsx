import {LEGAL_CONTACT_EMAIL} from '@eciperay/client';

const linkClasses = 'text-primary font-medium hover:underline';

export const LegalInlineLink = () => (
  <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className={linkClasses}>
    {LEGAL_CONTACT_EMAIL}
  </a>
);
