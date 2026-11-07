import {eciperayTheme, tokens} from '@spudly/ui';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {
  GestureResponderEvent,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {XStack, YStack} from 'tamagui';

/**
 * Host remnants for cooking mode after the @spudly/ui 6.x migration.
 *
 * The step presentation itself is now the DS CookingModePage: it composes the
 * step overlay, the scaled-ingredients panel, StepDots and PrevNextNav
 * internally, so the old StepDisplay / NavButtons / CookingModeDoneButton /
 * ScaledIngredientsList composition is deleted — the screen passes the page its
 * step state, pre-composed ingredients heading/lines, and callbacks.
 *
 * What stays here is only what the page contract cannot express:
 *
 * - The swipe shell (gestures are host behavior; the page deliberately has no
 *   swipe navigation — its docblock leaves the swipe shell app-side),
 * - The cook-log shell + form: the cook log is not part of CookingModePage, and
 *   its old DS component (RatingForm) is a DS _view_ in 6.x — internal and
 *   unexported — so the form is re-expressed host-side below with the same
 *   contract (title, star toggle-off, trimmed notes crossing as null, Save
 *   disabled while pending, Skip always live).
 */
const WHITE = eciperayTheme.semantic.surface;

const shellStyle = {flex: 1} as const;

/* The old ui-cooking-mode-overlay: flex-1, justify-center, bg-gray-900
   (gray ramp step 10), px-6 — kept for the cook-log state, whose dark
   shell the DS page does not provide. */
const cookLogShellStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: tokens.colors.gray.gray10,
  paddingHorizontal: tokens.spacing[6],
} as const;

export const CookingModeShell = ({
  children,
  onResponderGrant,
  onResponderRelease,
}: {
  children: ReactNode;
  onResponderGrant?: (e: GestureResponderEvent) => void;
  onResponderRelease?: (e: GestureResponderEvent) => void;
}) => (
  <View
    style={shellStyle}
    onStartShouldSetResponder={
      /* istanbul ignore next -- touch responder required for swipe gestures */
      () => true
    }
    onResponderGrant={onResponderGrant}
    onResponderRelease={onResponderRelease}
  >
    {children}
  </View>
);

export const CookingModeCookLogShell = ({children}: {children: ReactNode}) => (
  <View style={cookLogShellStyle}>{children}</View>
);

/* istanbul ignore next -- swipe gesture handlers; tested via button navigation; not simulatable in RNTL */
export const useSwipeNav = (onNext: () => void, onPrev: () => void) => {
  const [startX, setStartX] = useState(0);
  const onStart = (e: GestureResponderEvent) => {
    setStartX(e.nativeEvent.pageX);
  };
  const onEnd = (e: GestureResponderEvent) => {
    const delta = startX - e.nativeEvent.pageX;
    if (delta > 50) {
      onNext();
    }
    if (delta < -50) {
      onPrev();
    }
  };
  return {onStart, onEnd};
};

type CookLogFormValues = {
  rating: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
};

type CookLogFormProps = {
  onSubmit: (values: CookLogFormValues) => void;
  onSkip: () => void;
  isPending: boolean;
  notesPlaceholder?: string;
};

const formActionStyle = {
  flex: 1,
  alignItems: 'center',
  borderRadius: tokens.radii.xl,
  paddingVertical: tokens.spacing[3],
} as const;

/**
 * Host-side cook-log form (the DS RatingForm's dark variant, re-expressed with
 * Tamagui stacks + RN primitives and @spudly/ui tokens): a star rating plus
 * free-text notes. Rating and notes are internal state; only the submit
 * view-model crosses the boundary, with notes trimmed and empty notes crossing
 * as null. Pressing the current star clears the rating. `isPending` disables
 * Save (at half opacity); Skip stays live.
 */
export const CookLogForm = ({
  onSubmit,
  onSkip,
  isPending,
  notesPlaceholder = 'Notes (optional)',
}: CookLogFormProps) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');

  const handleRatingChange = (star: 1 | 2 | 3 | 4 | 5) => {
    setRating(current => (current === star ? null : star));
  };

  return (
    <YStack
      borderRadius={tokens.radii.xl}
      width="100%"
      backgroundColor={`${WHITE}1a`}
      padding="$6"
      gap="$4"
    >
      <Text
        style={{
          fontSize: tokens.typography.fontSize.xl,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: WHITE,
        }}
      >
        How did it go?
      </Text>
      <XStack
        justifyContent="center"
        accessibilityRole="radiogroup"
        accessibilityLabel="Your rating"
      >
        {([1, 2, 3, 4, 5] as const).map(star => {
          const selected = rating !== null && star <= rating;
          return (
            <TouchableOpacity
              key={star}
              accessibilityRole="radio"
              accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
              accessibilityState={{checked: rating === star}}
              onPress={() => {
                handleRatingChange(star);
              }}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: tokens.typography.fontSize['3xl'],
                  color: selected ? tokens.colors.warning.warning6 : WHITE,
                  opacity: selected ? 1 : 0.3,
                }}
              >
                ★
              </Text>
            </TouchableOpacity>
          );
        })}
      </XStack>
      <TextInput
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder={notesPlaceholder}
        placeholderTextColor={tokens.colors.gray.gray5}
        style={{
          borderRadius: tokens.radii.xl,
          paddingHorizontal: tokens.spacing[4],
          paddingVertical: tokens.spacing[3],
          fontSize: tokens.typography.fontSize.md,
          backgroundColor: `${WHITE}1a`,
          color: WHITE,
        }}
      />
      <XStack gap="$3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Skip"
          onPress={onSkip}
          style={[formActionStyle, {backgroundColor: `${WHITE}1a`}]}
        >
          <Text style={{fontSize: tokens.typography.fontSize.md, color: WHITE}}>
            Skip
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Save"
          accessibilityState={{disabled: isPending}}
          disabled={isPending}
          onPress={() => {
            onSubmit({rating, notes: notes.trim() || null});
          }}
          style={[
            formActionStyle,
            {
              backgroundColor: eciperayTheme.semantic.primary,
              opacity: isPending ? 0.5 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontSize: tokens.typography.fontSize.md,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: eciperayTheme.semantic.onPrimary,
            }}
          >
            Save
          </Text>
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
};
