import {tokens} from '@spudly/ui';

import {Icon} from '../Icon.js';

type Props = {
  heading: string;
  lines: string[];
};

/**
 * Owner-only recipe warnings (#643 warnings tranche): shown above the
 * recipe detail page whenever the displayed version has warnings —
 * ingredients no step mentions, and ingredients steps mention that
 * are not on the list. The host computes the warnings and formats the
 * lines; this component only renders them.
 */
export const RecipeWarningsBanner = ({heading, lines}: Props) => (
  <section
    role="alert"
    aria-label={heading}
    style={{
      border: `1px solid ${tokens.colors.warning.warning6}`,
      background: tokens.colors.warning.warning3,
      color: tokens.colors.warning.warning11,
      borderRadius: tokens.radii.md,
      padding: tokens.spacing[3],
      marginBottom: tokens.spacing[4],
      fontFamily: tokens.typography.fontFamily.sans,
    }}
  >
    <p
      style={{
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing[2],
        fontWeight: tokens.typography.fontWeight.semibold,
      }}
    >
      <Icon name="alert-triangle" size={16} />
      {heading}
    </p>
    <ul style={{margin: 0, paddingInlineStart: tokens.spacing[5]}}>
      {lines.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </section>
);
