/* eslint-disable max-lines -- cooking mode shell aggregates native layout fragments */
import {
  formatScaledIngredientLine,
  sortIngredientsByOrder,
} from '@eciperay/client';
import clsx from 'clsx';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {
  GestureResponderEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

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
    className="ui-cooking-mode-overlay"
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
  <View className="ui-cooking-mode-overlay ui-cooking-mode-overlay-centered">
    {children}
  </View>
);

export const CookingModeDoneButton = ({onPress}: {onPress: () => void}) => (
  <TouchableOpacity
    className="ui-cooking-mode-done-button"
    onPress={onPress}
  >
    <Text className="text-sm text-white">Done</Text>
  </TouchableOpacity>
);

type Step = RecipeDetail['instructions'][number];

const ProgressDots = ({total, current}: {total: number; current: number}) => (
  <View className="mb-6 flex-row justify-center gap-2">
    {Array.from({length: total}).map((_, i) => (
      <View
        key={i}
        className={clsx('size-2 rounded-full', {
          'bg-white': i === current,
          'bg-white/40': i !== current,
        })}
      />
    ))}
  </View>
);

const ScaledIngredientsList = ({
  recipe,
  scaleFactor,
  servings,
}: {
  recipe: RecipeDetail;
  scaleFactor: number;
  servings: number;
}) => (
  <View className="mb-6 max-h-40 rounded-xl bg-white/5 p-4">
    <Text className="mb-2 text-sm font-medium text-white/80">
      Ingredients
      {scaleFactor === 1
        ? ` (${servings} servings)`
        : ` (scaled to ${servings} servings)`}
    </Text>
    <ScrollView>
      {sortIngredientsByOrder(recipe.ingredients).map(ingredient => (
        <Text
          key={ingredient.id}
          className="py-1 text-sm text-white/70"
        >
          {formatScaledIngredientLine(ingredient, scaleFactor)}
        </Text>
      ))}
    </ScrollView>
  </View>
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
    <Text className="mb-4 text-sm uppercase tracking-widest text-white/60">
      Step {current ? current.stepNumber : 1} of {steps.length}
    </Text>
    {recipe ? (
      <ScaledIngredientsList
        recipe={recipe}
        scaleFactor={scaleFactor}
        servings={servings}
      />
    ) : null}
    <Text className="mb-8 text-2xl leading-relaxed text-white">
      {current ? current.body : ''}
    </Text>
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

export const NavButtons = ({step, total, onNext, onPrev}: NavButtonsProps) => {
  const renderBtn = (label: string, onPress: () => void, disabled: boolean) => (
    <TouchableOpacity
      className={clsx('rounded-xl bg-white/10 px-6 py-3', {
        'opacity-30': disabled,
      })}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-base text-white">{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View className="flex-row justify-between">
      {renderBtn('← Back', onPrev, step === 0)}
      {renderBtn('Next →', onNext, step === total - 1)}
    </View>
  );
};
