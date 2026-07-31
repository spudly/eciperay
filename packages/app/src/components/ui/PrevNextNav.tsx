import type {PrevNextNavProps} from '@eciperay/client';
import clsx from 'clsx';
import {Text, TouchableOpacity, View} from 'react-native';

export const PrevNextNav = ({
  onBack,
  onNext,
  backLabel = '← Back',
  nextLabel = 'Next →',
  disableBack = false,
  disableNext = false,
}: PrevNextNavProps) => (
  <View className="ui-prev-next-nav flex-row justify-between">
    <TouchableOpacity
      className={clsx('ui-prev-next-nav-button', {'opacity-30': disableBack})}
      disabled={disableBack}
      onPress={onBack}
    >
      <Text className="text-base text-white">{backLabel}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      className={clsx('ui-prev-next-nav-button', {'opacity-30': disableNext})}
      disabled={disableNext}
      onPress={onNext}
    >
      <Text className="text-base text-white">{nextLabel}</Text>
    </TouchableOpacity>
  </View>
);

if (__DEV__) {
  PrevNextNav.demo = () => (
    <View className="bg-gray-900 p-4">
      <PrevNextNav
        onBack={() => {
          void 0;
        }}
        onNext={() => {
          void 0;
        }}
      />
    </View>
  );
}
