import type {ListLoadingFooterProps} from '@eciperay/client';
import {Spinner as DSSpinner} from '@spudly/ui';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {PrimaryButton} from './PrimaryButton.js';

export const ListLoadingFooter = ({loading}: ListLoadingFooterProps) => {
  if (!loading) {
    return null;
  }

  return (
    <YStack
      alignItems="center"
      paddingVertical="$4"
    >
      <DSSpinner size="small" label="Loading more" />
    </YStack>
  );
};

if (import.meta.env.DEV) {
  ListLoadingFooter.demo = function ListLoadingFooterDemo() {
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
}
