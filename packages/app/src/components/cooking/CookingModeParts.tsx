/* eslint-disable max-lines -- cooking-mode overlay family with scaled ingredients list and step display */
import {
  formatScaledIngredientLine,
  sortIngredientsByOrder,
} from '@eciperay/client';
import {eciperayTheme, Text as DsText, tokens} from '@spudly/ui';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {
  GestureResponderEvent,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {YStack} from 'tamagui';
import type {RecipeDetail} from '@eciperay/types';

import {PrevNextNav} from '../ui/PrevNextNav';
import {ProgressDots} from '../ui/ProgressDots';

/**
 * G9: the cooking-mode overlay family is an app-domain composite — a dark,
 * immersive full-screen shell composed here from @spudly/ui tokens rather than
 * a DS component. The shells keep RN Views (the swipe shell needs responder
 * props) with token-valued styles: the old ui-cooking-mode-overlay was flex-1,
 * justify-center, bg-gray-900 (gray ramp step 10), px-6. The overlay's "white"
 * is the DS semantic surface; Tailwind's white-alpha steps are composed as hex
 * alpha suffixes the way TagPill composes data colors (white/5 '0d', /10 '1a',
 * /60 '99', /70 'b3', /80 'cc'). tracking-widest (0.1em) at text-sm is 1.4px of
 * letterSpacing geometry; the ingredients card's max-block-40 (160px) is layout
 * geometry with no DS spacing step.
 */
const WHITE = eciperayTheme.semantic.surface;

const overlayStyle = {
  flex: 1,
  justifyContent: 'center',
  backgroundColor: tokens.colors.gray.gray10,
  paddingHorizontal: tokens.spacing[6],
} as const;

const cookLogShellStyle = {...overlayStyle, alignItems: 'center'} as const;

/* The old ui-cooking-mode-done-button: absolute right-6 top-12, full radius,
   white/10 fill, px-4 py-2. */
const doneButtonStyle = {
  position: 'absolute',
  right: tokens.spacing[6],
  top: tokens.spacing[12],
  borderRadius: tokens.radii.full,
  backgroundColor: `${WHITE}1a`,
  paddingHorizontal: tokens.spacing[4],
  paddingVertical: tokens.spacing[2],
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
    style={overlayStyle}
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

export const CookingModeDoneButton = ({onPress}: {onPress: () => void}) => (
  <TouchableOpacity
    style={doneButtonStyle}
    onPress={onPress}
  >
    <DsText
      fontSize={tokens.typography.fontSize.sm}
      color={WHITE}
    >
      Done
    </DsText>
  </TouchableOpacity>
);

type Step = RecipeDetail['instructions'][number];

const ScaledIngredientsList = ({
  recipe,
  scaleFactor,
  servings,
}: {
  recipe: RecipeDetail;
  scaleFactor: number;
  servings: number;
}) => (
  <YStack
    marginBlockEnd="$6"
    borderRadius={tokens.radii.xl}
    backgroundColor={`${WHITE}0d`}
    padding="$4"
    maxHeight={160}
  >
    <DsText
      marginBlockEnd="$2"
      fontSize={tokens.typography.fontSize.sm}
      fontWeight={tokens.typography.fontWeight.medium}
      color={`${WHITE}cc`}
    >
      Ingredients
      {scaleFactor === 1
        ? ` (${servings} servings)`
        : ` (scaled to ${servings} servings)`}
    </DsText>
    <ScrollView>
      {sortIngredientsByOrder(recipe.ingredients).map(ingredient => (
        <DsText
          key={ingredient.id}
          paddingVertical="$1"
          fontSize={tokens.typography.fontSize.sm}
          color={`${WHITE}b3`}
        >
          {formatScaledIngredientLine(ingredient, scaleFactor)}
        </DsText>
      ))}
    </ScrollView>
  </YStack>
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

type StepDisplayProps = {
  step: number;
  steps: Step[];
  current: Step | undefined;
  recipe: RecipeDetail | undefined;
  scaleFactor: number;
  servings: number;
};

export const StepDisplay = ({
  step,
  steps,
  current,
  recipe,
  scaleFactor,
  servings,
}: StepDisplayProps) => (
  <>
    <DsText
      marginBlockEnd="$4"
      fontSize={tokens.typography.fontSize.sm}
      letterSpacing={1.4}
      color={`${WHITE}99`}
      textTransform="uppercase"
    >
      Step {current ? current.stepNumber : 1} of {steps.length}
    </DsText>
    {recipe ? (
      <ScaledIngredientsList
        recipe={recipe}
        scaleFactor={scaleFactor}
        servings={servings}
      />
    ) : null}
    <DsText
      marginBlockEnd="$8"
      fontSize={tokens.typography.fontSize['2xl']}
      lineHeight={
        tokens.typography.fontSize['2xl'] * tokens.typography.lineHeight.relaxed
      }
      color={WHITE}
    >
      {current ? current.body : ''}
    </DsText>
    <ProgressDots
      total={steps.length}
      current={step}
    />
  </>
);

type NavButtonsProps = {
  step: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
};

export const NavButtons = ({step, total, onNext, onPrev}: NavButtonsProps) => (
  <PrevNextNav
    onBack={onPrev}
    onNext={onNext}
    disableBack={step === 0}
    disableNext={step === total - 1}
  />
);
