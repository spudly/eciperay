import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type InlineLoadingIndicatorProps,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';

import {BookLoadingSpinner} from './ui/BookLoadingSpinner';
import {PrimaryButton} from './ui/PrimaryButton';

/**
 * Centered inline loading composition (the old ui-loading-center: flex,
 * align/justify center). It renders without a TamaguiProvider (its unit test
 * uses a plain render), so it stays on RN primitives — the BookLoadingSpinner
 * pattern. The legacy `className` prop remains in the prop type (from
 * @eciperay/client) for API compatibility but is no longer applied; callers
 * that need offset wrap the indicator in a margin container instead.
 */
const centerStyle = {alignItems: 'center', justifyContent: 'center'} as const;

const demoOffsetStyle = {marginTop: tokens.spacing[2]} as const;

export const InlineLoadingIndicator = ({
  loading,
  delayMs = DEFAULT_LOADING_DELAY_MS,
}: InlineLoadingIndicatorProps) => {
  const showLoading = useDelayedTrue(loading, delayMs);

  if (!showLoading) {
    return null;
  }

  return (
    <View style={centerStyle}>
      <BookLoadingSpinner size="md" />
    </View>
  );
};

if (__DEV__) {
  const InlineLoadingIndicatorDemo = () => {
    const [loading, setLoading] = useState(true);

    return (
      <>
        <PrimaryButton
          label={loading ? 'Hide spinner' : 'Show spinner'}
          onPress={() => {
            setLoading(current => !current);
          }}
        />
        <View style={demoOffsetStyle}>
          <InlineLoadingIndicator loading={loading} />
        </View>
      </>
    );
  };

  InlineLoadingIndicator.demo = () => <InlineLoadingIndicatorDemo />;
}
