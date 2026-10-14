import type {PageTitleProps} from '@eciperay/client';
import {Text as DSText} from '@spudly/ui';

/**
 * Adapter preserving semantic heading levels (h1/h2) over the design-system
 * Text primitive, so the heading role expected by consumers and tests is kept.
 */
export const PageTitle = ({
  children,
  size = 'page',
  spacing = 'default',
}: PageTitleProps) => {
  const Tag = size === 'section' ? 'h2' : 'h1';

  return (
    <Tag style={{margin: 0}}>
      <DSText
        variant={size === 'section' ? 'subheading' : 'heading'}
        marginBottom={
          spacing === 'auth' ? '$8' : spacing === 'section' ? '$4' : '$6'
        }
      >
        {children}
      </DSText>
    </Tag>
  );
};

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
