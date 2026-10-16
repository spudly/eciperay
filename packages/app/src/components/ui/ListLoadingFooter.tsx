import type {ListLoadingFooterProps} from '@eciperay/client';
import {Spinner} from '@spudly/ui';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {PrimaryButton} from './PrimaryButton';

export const ListLoadingFooter = ({loading}: ListLoadingFooterProps) => {
  if (!loading) {
    return null;
  }

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      paddingVertical="$4"
    >
      <Spinner label="Loading" />
    </YStack>
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
