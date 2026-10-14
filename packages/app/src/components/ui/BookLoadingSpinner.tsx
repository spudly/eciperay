import type {BookLoadingSpinnerProps} from '@eciperay/client';
import clsx from 'clsx';
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

const renderPageLines = (lines: LineLayout[], scale: number) =>
  lines.map((line, index) => (
    <View
      key={index}
      className="absolute rounded-sm bg-gray-200"
      style={[
        bookLoadingSpinnerStyles.line,
        {left: line.left, top: line.top, width: 60 * scale, height: 10 * scale},
      ]}
    />
  ));

export const BookLoadingSpinner = ({
  size = 'md',
  className,
  accessibilityLabel = 'Loading',
}: BookLoadingSpinnerProps) => {
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
      className={clsx('bg-gray-500', className)}
      style={coverStyle}
    >
      <View
        className="relative flex-1 overflow-hidden bg-white shadow-sm"
        style={innerPageStyle}
      >
        {renderPageLines(leftPageLines(scale), scale)}
        <View
          className="absolute inset-e-0 inset-bs-0"
          style={flipContainerStyle}
        >
          <Animated.View
            className="absolute inset-e-0 inset-bs-0 bg-white"
            style={[
              flipPageStyle,
              bookLoadingSpinnerStyles.flipPage,
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
    <View className="gap-6">
      <BookLoadingSpinner size="sm" />
      <BookLoadingSpinner size="md" />
      <BookLoadingSpinner size="lg" />
    </View>
  );

  BookLoadingSpinner.demo = () => <BookLoadingSpinnerDemo />;
}
