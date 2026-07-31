import type {ReactNode} from 'react';

export type ScreenScrollProps = {children: ReactNode};

export type ScreenContainerProps = {
  children: ReactNode;
  variant?: 'default' | 'list' | 'padded' | 'white';
};

export type PageTitleProps = {
  children: ReactNode;
  size?: 'page' | 'auth' | 'section';
  spacing?: 'default' | 'auth' | 'section';
};

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  /** Web: button element type inside forms */
  type?: 'button' | 'submit';
};

export type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export type DestructiveButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export type TextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  disabled?: boolean;
};

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export type MultilineFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export type ErrorTextProps = {children: ReactNode};

export type EmptyMessageProps = {
  children: ReactNode;
  spacing?: 'default' | 'list';
};

export type ListLoadingFooterProps = {loading: boolean; label?: string};

export type AuthScreenLayoutProps = {children: ReactNode};

export type OptionCardProps = {
  title: string;
  description: string;
  onPress?: () => void;
  /** Web: react-router destination */
  to?: string;
};

export type InfoBannerProps = {children: ReactNode};

export type FormScreenLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export type TextLinkButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'muted';
  /** Web: react-router destination */
  to?: string;
};
