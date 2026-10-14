import type {ListLoadingFooterProps} from '@eciperay/client';
import {Spinner} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';

import {PrimaryButton} from './PrimaryButton';

export const ListLoadingFooter = ({loading}: ListLoadingFooterProps) => {
  if (!loading) {
    return null;
  }

  return (
    <View className="ui-loading-center py-4">
      <Spinner label="Loading" />
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
