import type {OptionCardProps} from '@eciperay/client';
import {Text, TouchableOpacity} from 'react-native';

export const OptionCard = ({title, description, onPress}: OptionCardProps) => {
  if (!onPress) {
    return null;
  }

  return (
    <TouchableOpacity
      className="ui-option-card"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      <Text className="text-muted mt-1 text-sm">{description}</Text>
    </TouchableOpacity>
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
