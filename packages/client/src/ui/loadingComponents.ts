import type {ReactNode} from 'react';

export type ScreenLoadingGateProps = {
  pending: boolean;
  delayMs?: number;
  children: ReactNode;
  backgroundClassName?: string;
};

export type InlineLoadingIndicatorProps = {
  loading: boolean;
  delayMs?: number;
  className?: string;
};

export type BookLoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  accessibilityLabel?: string;
};
