import type {BookLoadingSpinnerProps} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useEffect, useRef} from 'react';
import {Animated, Easing, View} from 'react-native';

import {
  BASE_HEIGHT,
  BASE_WIDTH,
  BOOK_LOADER_SCALE,
  type DimensionStyle,
  type LineLayout,
  flippingPageLines,
  leftPageLines,
  bookLoadingSpinnerStyles,
} from './bookLoadingSpinnerLayout';

/**
 * G10: the branded book-flip loader stays an app adapter (the DS Spinner covers
 * generic loading). It is built on plain RN primitives because it must render
 * without a TamaguiProvider (its unit test does), so every visual value is a
 * @spudly/ui token value rather than a $ token prop: cover = gray ramp step 6
 * (the old bg-gray-500), page lines = gray step 3 (old bg-gray-200), page
 * surface = the theme's semantic surface (old bg-white), radius = the sm radius
 * token, shadow = the sm shadow token. All dimensions are geometry computed
 * from the size scale.
 */
const renderPageLines = (lines: LineLayout[], scale: number) =>
  lines.map((line, index) => (
    <View
      key={index}
      style={[
        bookLoadingSpinnerStyles.line,
        {
          left: line.left,
          top: line.top,
          width: 60 * scale,
          height: 10 * scale,
          backgroundColor: tokens.colors.gray.gray3,
          borderRadius: tokens.radii.sm,
        },
      ]}
    />
  ));

export const BookLoadingSpinner = ({
  size = 'md',
  accessibilityLabel = 'Loading',
}: BookLoadingSpinnerProps) => {
  // Note: the legacy `className` prop remains in the prop type for API
  // compatibility but is no longer applied — no caller passes it, and
  // styling now comes from the design system. See BookLoadingSpinnerProps
  // in @eciperay/client.
  const scale = BOOK_LOADER_SCALE[size];
  const width = BASE_WIDTH * scale;
  const height = BASE_HEIGHT * scale;
  const padding = 10 * scale;
  const borderRadius = 8 * scale;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const flipPageWidth = innerWidth / 2;
  const pageRadius = borderRadius - padding / 2;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [progress]);

  const rotateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-180deg'],
  });

  const coverStyle: DimensionStyle = {width, height, borderRadius, padding};
  const innerPageStyle: DimensionStyle = {
    width: innerWidth,
    height: innerHeight,
    borderRadius: pageRadius,
  };
  const flipContainerStyle: DimensionStyle = {
    width: flipPageWidth,
    height: innerHeight,
  };
  const flipPageStyle: DimensionStyle = {
    width: flipPageWidth,
    height: innerHeight,
    borderRadius: pageRadius,
  };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[coverStyle, {backgroundColor: tokens.colors.gray.gray6}]}
    >
      <View
        style={[
          innerPageStyle,
          bookLoadingSpinnerStyles.innerPage,
          tokens.shadows.sm,
        ]}
      >
        {renderPageLines(leftPageLines(scale), scale)}
        <View style={[flipContainerStyle, bookLoadingSpinnerStyles.flipAnchor]}>
          <Animated.View
            style={[
              flipPageStyle,
              bookLoadingSpinnerStyles.flipPage,
              bookLoadingSpinnerStyles.flipAnchor,
              bookLoadingSpinnerStyles.pageSurface,
              {
                transform: [
                  {perspective: 1000 * scale},
                  {translateX: -flipPageWidth / 2},
                  {rotateY},
                  {translateX: flipPageWidth / 2},
                ],
              },
            ]}
          >
            {renderPageLines(flippingPageLines(flipPageWidth, scale), scale)}
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

if (__DEV__) {
  const BookLoadingSpinnerDemo = () => (
    <View style={{gap: tokens.spacing[6]}}>
      <BookLoadingSpinner size="sm" />
      <BookLoadingSpinner size="md" />
      <BookLoadingSpinner size="lg" />
    </View>
  );

  BookLoadingSpinner.demo = () => <BookLoadingSpinnerDemo />;
}
