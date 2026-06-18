import {LEGAL_CONTACT_EMAIL} from '@eciperay/client';

export const legalContactLink = (
  <a
    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
    className="
      text-primary font-medium
      hover:underline
    "
  >
    {LEGAL_CONTACT_EMAIL}
  </a>
);
