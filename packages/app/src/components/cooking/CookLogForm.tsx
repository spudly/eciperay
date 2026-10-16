import {eciperayTheme, Text as DsText, tokens} from '@spudly/ui';
import React, {useState} from 'react';
import {TextInput, TouchableOpacity} from 'react-native';
import {XStack, YStack} from 'tamagui';
import type {CookLogInput} from '@eciperay/types';

import {StarRatingInput} from '../ui/StarRatingInput';

type Props = {
  onSubmit: (input: CookLogInput) => void;
  onSkip: () => void;
  isPending: boolean;
  variant?: 'dark' | 'light';
  secondaryLabel?: string;
};

/**
 * The form's dark variant sits on the G9 cooking-mode overlay, so its surfaces
 * are the DS semantic surface at low alpha (white/10, composed with a hex alpha
 * suffix the way TagPill composes data colors) and its text is the surface
 * itself; the light variant uses the gray ramp positionally (gray-50 -> step 1,
 * gray-200 -> step 3, gray-300 -> step 4, gray-700 -> step 8, gray-900 -> step
 * 10). The note field keeps the RN TextInput (its chrome is variant-driven)
 * with token-valued styles, per the VersionPicker precedent. The action buttons
 * keep TouchableOpacity so the two halves of the row share identical chrome;
 * the save half is the semantic primary with its onPrimary label.
 */
const WHITE = eciperayTheme.semantic.surface;

export const CookLogForm = ({
  onSubmit,
  onSkip,
  isPending,
  variant = 'dark',
  secondaryLabel = 'Skip',
}: Props) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');
  const isLight = variant === 'light';

  const notesStyle = {
    marginBottom: tokens.spacing[4],
    borderRadius: tokens.radii.xl,
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    fontSize: tokens.typography.fontSize.md,
    ...(isLight
      ? {
          borderWidth: 1,
          borderColor: tokens.colors.gray.gray4,
          backgroundColor: WHITE,
          color: tokens.colors.gray.gray10,
        }
      : {backgroundColor: `${WHITE}1a`, color: WHITE}),
  } as const;

  const skipStyle = {
    flex: 1,
    alignItems: 'center',
    borderRadius: tokens.radii.xl,
    paddingVertical: tokens.spacing[3],
    ...(isLight
      ? {
          borderWidth: 1,
          borderColor: tokens.colors.gray.gray3,
          backgroundColor: WHITE,
        }
      : {backgroundColor: `${WHITE}1a`}),
  } as const;

  const saveStyle = {
    flex: 1,
    alignItems: 'center',
    borderRadius: tokens.radii.xl,
    paddingVertical: tokens.spacing[3],
    backgroundColor: eciperayTheme.semantic.primary,
    opacity: isPending ? 0.5 : 1,
  } as const;

  return (
    <YStack
      borderRadius={tokens.radii.xl}
      padding="$6"
      width="100%"
      backgroundColor={isLight ? tokens.colors.gray.gray1 : `${WHITE}1a`}
      borderWidth={isLight ? 1 : undefined}
      borderColor={isLight ? tokens.colors.gray.gray3 : undefined}
    >
      <DsText
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.xl}
        fontWeight={tokens.typography.fontWeight.semibold}
        color={isLight ? tokens.colors.gray.gray10 : WHITE}
      >
        How did it go?
      </DsText>
      <YStack
        marginBlockEnd="$4"
        alignItems="center"
      >
        <StarRatingInput
          value={rating}
          tone={isLight ? 'default' : 'dark'}
          onChange={star => {
            setRating(star as 1 | 2 | 3 | 4 | 5 | null);
          }}
        />
      </YStack>
      <TextInput
        style={notesStyle}
        placeholder="Notes from this cook (optional)"
        placeholderTextColor={isLight ? tokens.colors.gray.gray5 : `${WHITE}80`}
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      <XStack gap="$3">
        <TouchableOpacity
          style={skipStyle}
          onPress={onSkip}
        >
          <DsText
            fontSize={tokens.typography.fontSize.md}
            color={isLight ? tokens.colors.gray.gray8 : WHITE}
          >
            {secondaryLabel}
          </DsText>
        </TouchableOpacity>
        <TouchableOpacity
          style={saveStyle}
          disabled={isPending}
          onPress={() => {
            onSubmit({authorStarRating: rating, notes: notes.trim() || null});
          }}
        >
          <DsText
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            color={eciperayTheme.semantic.onPrimary}
          >
            Save
          </DsText>
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
};

if (__DEV__) {
  CookLogForm.demo = () => (
    <CookLogForm
      onSubmit={() => {
        void 0;
      }}
      onSkip={() => {
        void 0;
      }}
      isPending={false}
      variant="light"
    />
  );
}
