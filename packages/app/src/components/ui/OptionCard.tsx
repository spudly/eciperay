import type {OptionCardProps} from '@eciperay/client';
import {OptionCard as DSOptionCard} from '@spudly/ui';

/**
 * Thin adapter over the DS OptionCard.
 * The `to` prop is web-only (react-router); native ignores it, as before.
 */
export const OptionCard = ({title, description, onPress}: OptionCardProps) => {
  if (!onPress) {
    return null;
  }

  return (
    <DSOptionCard
      title={title}
      description={description}
      onPress={onPress}
    />
  );
};

if (__DEV__) {
  OptionCard.demo = () => (
    <OptionCard
      title="Option card"
      description="Example description"
      onPress={() => {
        void 0;
      }}
    />
  );
}
