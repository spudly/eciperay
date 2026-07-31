import type {ComponentType, ReactNode} from 'react';

export type ShowcaseFrameProps = {children: ReactNode};

export type ShowcaseDemoRenderer = (props: {
  Frame: ComponentType<ShowcaseFrameProps>;
}) => ReactNode;

export type WithShowcaseDemo<T> = T & {demo?: ShowcaseDemoRenderer};

export const exportNameFromShowcaseId = (id: string): string => {
  const segment = id.split('/').pop() ?? id;
  return segment;
};
