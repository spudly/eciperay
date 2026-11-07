import {tokens} from '@spudly/ui';
import {useState} from 'react';
import {
  TextArea as TamaguiTextArea,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui';

import {StarRatingInput} from './StarRatingInput';

const NotesArea = styled(TamaguiTextArea, {
  name: 'CookLogFormNotesArea',

  borderRadius: tokens.radii.xl,
  paddingHorizontal: tokens.spacing[4],
  paddingVertical: tokens.spacing[3],
  fontSize: tokens.typography.fontSize.md,
});

type CookLogFormValues = {
  rating: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
};

export type CookLogFormProps = {
  onSubmit: (values: CookLogFormValues) => void;
  onSkip: () => void;
  isPending: boolean;
  variant?: 'dark' | 'light';
  secondaryLabel?: string;
  title?: string;
  notesPlaceholder?: string;
};

/**
 * The host cook-log form: @spudly/ui 6.x exports pages only, so the DS
 * RatingForm this form used (the generalized cook-log form, design-system#176)
 * no longer crosses the package boundary and the form lives host-side,
 * mirroring the web host's CookLogForm. The contract is the DS form's,
 * unchanged: the rating and notes are internal state (uncontrolled); only the
 * submit view-model crosses — `onSubmit({rating, notes})` with the notes
 * trimmed and empty notes crossing as null. The rating is optional: submitting
 * with no stars sends `rating: null`; pressing the current star clears it (the
 * toggle-off lives in StarRatingInput). `isPending` disables Save (at half
 * opacity); the secondary action stays live — hosts guard it themselves while a
 * save is in flight.
 *
 * Variants mirror the DS form's: `light` (default chrome on light surfaces,
 * from the gray ramp) and `dark` (on a dark overlay surface, theme $surface at
 * 10% layered opacity).
 */
export const CookLogForm = ({
  onSubmit,
  onSkip,
  isPending,
  variant = 'dark',
  secondaryLabel = 'Skip',
  title = 'How did it go?',
  notesPlaceholder = 'Notes (optional)',
}: CookLogFormProps) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');
  const isLight = variant === 'light';

  const handleSubmit = () => {
    onSubmit({rating, notes: notes.trim() || null});
  };

  return (
    <YStack
      borderRadius={tokens.radii.xl}
      width="100%"
      backgroundColor={isLight ? tokens.colors.gray.gray1 : undefined}
      borderWidth={isLight ? 1 : undefined}
      borderColor={isLight ? tokens.colors.gray.gray3 : undefined}
    >
      {isLight ? null : (
        <YStack
          position="absolute"
          pointerEvents="none"
          top={0}
          left={0}
          right={0}
          bottom={0}
          borderRadius={tokens.radii.xl}
          backgroundColor="$surface"
          opacity={0.1}
        />
      )}
      <YStack
        padding="$6"
        gap="$4"
      >
        <Text
          fontSize={tokens.typography.fontSize.xl}
          fontWeight={tokens.typography.fontWeight.semibold}
          color={isLight ? tokens.colors.gray.gray10 : '$surface'}
        >
          {title}
        </Text>
        <YStack alignItems="center">
          <StarRatingInput
            value={rating}
            tone={isLight ? 'default' : 'dark'}
            onChange={value => {
              setRating(value as 1 | 2 | 3 | 4 | 5 | null);
            }}
          />
        </YStack>
        <YStack>
          {isLight ? null : (
            <YStack
              position="absolute"
              pointerEvents="none"
              top={0}
              left={0}
              right={0}
              bottom={0}
              borderRadius={tokens.radii.xl}
              backgroundColor="$surface"
              opacity={0.1}
            />
          )}
          <NotesArea
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder={notesPlaceholder}
            placeholderTextColor={tokens.colors.gray.gray5}
            backgroundColor={isLight ? '$surface' : 'transparent'}
            borderWidth={isLight ? 1 : 0}
            borderColor={isLight ? tokens.colors.gray.gray4 : undefined}
            color={isLight ? tokens.colors.gray.gray10 : '$surface'}
          />
        </YStack>
        <XStack gap="$3">
          <YStack
            flex={1}
            alignItems="center"
            borderRadius={tokens.radii.xl}
            paddingVertical={tokens.spacing[3]}
            backgroundColor={isLight ? '$surface' : undefined}
            borderWidth={isLight ? 1 : undefined}
            borderColor={isLight ? tokens.colors.gray.gray3 : undefined}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onSkip}
            cursor="pointer"
          >
            {isLight ? null : (
              <YStack
                position="absolute"
                pointerEvents="none"
                top={0}
                left={0}
                right={0}
                bottom={0}
                borderRadius={tokens.radii.xl}
                backgroundColor="$surface"
                opacity={0.1}
              />
            )}
            <Text
              fontSize={tokens.typography.fontSize.md}
              color={isLight ? tokens.colors.gray.gray8 : '$surface'}
            >
              {secondaryLabel}
            </Text>
          </YStack>
          <YStack
            flex={1}
            alignItems="center"
            borderRadius={tokens.radii.xl}
            paddingVertical={tokens.spacing[3]}
            backgroundColor="$primary"
            opacity={isPending ? 0.5 : 1}
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityState={{disabled: isPending}}
            onPress={isPending ? undefined : handleSubmit}
            cursor="pointer"
          >
            <Text
              fontSize={tokens.typography.fontSize.md}
              fontWeight={tokens.typography.fontWeight.semibold}
              color="$onPrimary"
            >
              Save
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
};
