import type {ReactNode} from 'react';

export type CheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: ReactNode;
  children?: ReactNode;
};

export type SectionCardProps = {
  title: string;
  description?: ReactNode;
  variant?: 'elevated' | 'bordered' | 'muted';
  children: ReactNode;
};

export type SelectFieldOption = {value: string; label: string};

export type SelectFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  disabled?: boolean;
  id?: string;
};

export type NumberStepperProps = {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export type StatusBadgeProps = {label: string; variant: string};

export type TagPillProps = {name: string; color: string};

export type StatBadgeProps = {label: string; value: string};

export type StatBadgeRowProps = {children: ReactNode};

export type StarRatingInputProps = {
  value: number | null;
  onChange?: (value: number | null) => void;
  max?: number;
  readOnly?: boolean;
  disabled?: boolean;
  /** Visual theme for star colors */
  tone?: 'default' | 'dark' | 'light';
};

export type RadioOption = {
  value: string;
  title: string;
  description?: ReactNode;
};

export type RadioOptionGroupProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
};

export type ProgressDotsProps = {
  total: number;
  current: number;
  variant?: 'dark' | 'light';
};

export type PrevNextNavProps = {
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  disableBack?: boolean;
  disableNext?: boolean;
};

export type ColorPickerFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
};

export type FixedActionBannerAction = {label: string; onPress: () => void};

export type FixedActionBannerProps = {
  message: ReactNode;
  primaryAction?: FixedActionBannerAction;
  secondaryAction?: FixedActionBannerAction;
  onDismiss?: () => void;
  dismissAriaLabel?: string;
  position?: 'top' | 'bottom';
  /** Web: aria label for the dialog/region */
  ariaLabel?: string;
  /** Web: role for the banner container */
  role?: 'dialog' | 'region';
};
