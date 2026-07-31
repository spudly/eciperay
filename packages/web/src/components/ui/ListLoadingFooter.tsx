import type {ListLoadingFooterProps} from '@eciperay/client';
import {useState} from 'react';

import {PrimaryButton} from './PrimaryButton.js';

export const ListLoadingFooter = ({
  loading,
  label = 'Loading more…',
}: ListLoadingFooterProps) => {
  if (!loading) {
    return null;
  }

  return (
    <div className="py-4 text-center">
      <p className="text-muted text-sm">{label}</p>
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
