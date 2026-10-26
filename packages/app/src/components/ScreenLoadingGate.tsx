import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type ScreenLoadingGateProps,
} from '@eciperay/client';
import {Button as DsButton, eciperayTheme} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';

import {BookLoadingSpinner} from './ui/BookLoadingSpinner';
import {InfoBanner} from './ui/InfoBanner';

/**
 * Full-screen loading gate (the old ui-loading-center + flex-1 over a white
 * shell). It renders without a TamaguiProvider (its unit test uses a plain
 * render), so it stays on RN primitives — the BookLoadingSpinner pattern: the
 * shell background is the theme's semantic surface (the old bg-white, per the
 * Stage 2 ScreenContainer white precedent). The legacy `backgroundClassName`
 * prop remains in the prop type (from @eciperay/client) for API compatibility
 * but is no longer applied — no caller passes a non-default value.
 */
const shellStyle = {
  flex: 1,
  backgroundColor: eciperayTheme.semantic.surface,
} as const;

const loadingStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: eciperayTheme.semantic.surface,
} as const;

export const ScreenLoadingGate = ({
  pending,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  children,
}: ScreenLoadingGateProps) => {
  const showLoading = useDelayedTrue(pending, delayMs);

  if (!pending) {
    return children;
  }

  if (!showLoading) {
    return <View style={shellStyle} />;
  }

  return (
    <View style={loadingStyle}>
      <BookLoadingSpinner size="lg" />
    </View>
  );
};

if (__DEV__) {
  const ScreenLoadingGateDemo = () => {
    const [pending, setPending] = useState(true);

    return (
      <>
        <DsButton
          variant="primary"
          accessibilityLabel={pending ? 'Mark ready' : 'Mark pending'}
          onPress={() => {
            setPending(current => !current);
          }}
        >
          {pending ? 'Mark ready' : 'Mark pending'}
        </DsButton>
        <ScreenLoadingGate pending={pending}>
          <InfoBanner>Loaded content behind the gate.</InfoBanner>
        </ScreenLoadingGate>
      </>
    );
  };

  ScreenLoadingGate.demo = () => <ScreenLoadingGateDemo />;
}
