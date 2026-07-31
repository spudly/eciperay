import type {ListLoadingFooterProps} from '@eciperay/client';
import {Text, View} from 'react-native';
import {useState} from 'react';

import {PrimaryButton} from './PrimaryButton';

export const ListLoadingFooter = ({
  loading,
  label = 'Loading more…',
}: ListLoadingFooterProps) => {
  if (!loading) {
    return null;
  }

  return (
    <View className="py-4">
      <Text className="text-muted text-center text-sm">{label}</Text>
    </View>
  );
};

if (__DEV__) {
  const ListLoadingFooterDemo = () => {
    const [loading, setLoading] = useState(true);

    return (
      <>
        <PrimaryButton
          label={loading ? 'Hide footer' : 'Show footer'}
          onPress={() => {
            setLoading(value => !value);
          }}
        />
        <ListLoadingFooter loading={loading} />
      </>
    );
  };

  ListLoadingFooter.demo = () => <ListLoadingFooterDemo />;
}
