import {tokens} from '@spudly/ui';
import {useId} from 'react';
import type {ReactNode} from 'react';
import {Button, Input, Label, Text, YStack} from 'tamagui';

/**
 * Host-side section chrome for the profile sections the design system covers
 * only as internal views in @spudly/ui 6.x (no widget/view exports remain).
 * These primitives mirror the design-system SectionCard / Button / Alert /
 * TextField styling with Tamagui primitives and the exported DS tokens, pending
 * page coverage for the sections composed from them.
 */

type SectionCardProps = {
  title: string;
  variant?: 'default' | 'elevated';
  children?: ReactNode;
};

export const SectionCard = ({
  title,
  variant = 'default',
  children,
}: SectionCardProps) => (
  <YStack
    backgroundColor="$surface"
    borderRadius={tokens.radii.lg}
    padding={tokens.spacing[4]}
    {...(variant === 'elevated'
      ? {
          borderWidth: 0,
          shadowColor: tokens.shadows.md.shadowColor,
          shadowOffset: tokens.shadows.md.shadowOffset,
          shadowOpacity: tokens.shadows.md.shadowOpacity,
          shadowRadius: tokens.shadows.md.shadowRadius,
        }
      : {borderWidth: 1, borderColor: '$borderColor'})}
  >
    <YStack paddingBottom={tokens.spacing[3]}>
      <Text
        fontSize={tokens.typography.fontSize.xl}
        fontWeight={tokens.typography.fontWeight.semibold}
      >
        {title}
      </Text>
    </YStack>
    <YStack gap={tokens.spacing[3]}>{children}</YStack>
  </YStack>
);

type SectionButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
};

const sectionButtonColors = {
  primary: {
    backgroundColor: '$primary',
    borderColor: 'transparent',
    color: '$onPrimary',
  },
  secondary: {
    backgroundColor: tokens.colors.gray.gray3,
    borderColor: tokens.colors.gray.gray10,
    color: tokens.colors.gray.gray10,
  },
  danger: {
    backgroundColor: tokens.colors.danger.danger7,
    borderColor: 'transparent',
    color: '#ffffff',
  },
} as const;

export const SectionButton = ({
  variant = 'primary',
  disabled = false,
  onPress,
  children,
}: SectionButtonProps) => {
  const colors = sectionButtonColors[variant];
  return (
    <Button
      disabled={disabled}
      onPress={onPress}
      backgroundColor={colors.backgroundColor}
      borderWidth={1}
      borderColor={colors.borderColor}
      color={colors.color}
      opacity={disabled ? 0.5 : 1}
    >
      {children}
    </Button>
  );
};

type SectionAlertProps = {
  severity: 'info' | 'error';
  message?: string;
  children?: ReactNode;
};

const sectionAlertStyles = {
  info: {
    backgroundColor: '$primarySubtle',
    borderColor: '$primary',
    color: '$primaryEmphasis',
  },
  error: {
    backgroundColor: tokens.colors.danger.danger1,
    borderColor: tokens.colors.danger.danger4,
    color: tokens.colors.danger.danger8,
  },
} as const;

export const SectionAlert = ({
  severity,
  message,
  children,
}: SectionAlertProps) => {
  const styles = sectionAlertStyles[severity];
  const content = children ?? message;
  return (
    <YStack
      borderWidth={1}
      borderRadius={tokens.radii.md}
      padding={tokens.spacing[3]}
      backgroundColor={styles.backgroundColor}
      borderColor={styles.borderColor}
      {...(severity === 'error' ? {accessibilityRole: 'alert' as const} : {})}
    >
      {typeof content === 'string' ? (
        <Text color={styles.color}>{content}</Text>
      ) : (
        content
      )}
    </YStack>
  );
};

type LabeledTextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export const LabeledTextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
}: LabeledTextInputProps) => {
  const id = useId();
  return (
    <YStack gap={tokens.spacing[1]}>
      <Label
        htmlFor={id}
        fontSize={tokens.typography.fontSize.sm}
      >
        {label}
      </Label>
      <Input
        id={id}
        aria-label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="$textMuted"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$textMuted"
        borderRadius={tokens.radii.md}
        paddingHorizontal={tokens.spacing[3]}
        minHeight={44}
        fontSize={tokens.typography.fontSize.md}
        color="$color"
      />
    </YStack>
  );
};
