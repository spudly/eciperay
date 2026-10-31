import type {PageTitleProps} from '@eciperay/client';
import {Text as DSText} from '@spudly/ui';

/**
 * Adapter over the design-system Text primitive. Since @spudly/ui 1.15
 * (design-system#256) the heading/subheading Text variants carry the heading
 * role and level themselves (role="heading", aria-level 1/2), so this adapter
 * no longer wraps them in a native h1/h2 — doing so produced two nested heading
 * roles for one title.
 */
// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const PageTitle = ({
  children,
  size = 'page',
  spacing = 'default',
}: PageTitleProps) => (
  <DSText
    variant={size === 'section' ? 'subheading' : 'heading'}
    marginBottom={
      spacing === 'auth' ? '$8' : spacing === 'section' ? '$4' : '$6'
    }
  >
    {children}
  </DSText>
);

if (import.meta.env.DEV) {
  PageTitle.demo = function PageTitleDemo() {
    return (
      <PageTitle
        size="auth"
        spacing="section"
      >
        Page title
      </PageTitle>
    );
  };
}
