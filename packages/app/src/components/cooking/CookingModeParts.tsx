import {tokens} from '@spudly/ui';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {GestureResponderEvent, View} from 'react-native';

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
 * - The cook-log shell: the cook log is not part of CookingModePage, so its dark
 *   shell stays host-side here, while the form itself is the shared host
 *   CookLogForm (components/CookLogForm).
 */

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
