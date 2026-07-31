import type {ListLoadingFooterProps} from '@eciperay/client';
import {useState} from 'react';

import {BookLoadingSpinner} from './BookLoadingSpinner.js';
import {PrimaryButton} from './PrimaryButton.js';

export const ListLoadingFooter = ({loading}: ListLoadingFooterProps) => {
  if (!loading) {
    return null;
  }

  return (
    <div className="ui-loading-center py-4">
      <BookLoadingSpinner size="sm" />
    </div>
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
