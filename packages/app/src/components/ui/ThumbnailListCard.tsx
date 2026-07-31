import type {ThumbnailListCardProps} from '@eciperay/client';
import {Image, Text, TouchableOpacity, View} from 'react-native';

const Thumbnail = ({imageUrl}: {imageUrl?: string | null}) =>
  imageUrl ? (
    <Image
      source={{uri: imageUrl}}
      className="size-16 rounded-lg bg-gray-50"
      resizeMode="cover"
    />
  ) : (
    <View className="size-16 rounded-lg bg-gray-100" />
  );

export const ThumbnailListCard = ({
  imageUrl,
  title,
  subtitle,
  onPress,
  trailing,
}: ThumbnailListCardProps) => (
  <View className="ui-thumbnail-list-card">
    <TouchableOpacity onPress={onPress}>
      <Thumbnail imageUrl={imageUrl} />
    </TouchableOpacity>
    <TouchableOpacity
      className="min-w-0 flex-1"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      {subtitle ? (
        <Text className="text-muted mt-1 text-sm">{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
    {trailing}
  </View>
);

if (__DEV__) {
  ThumbnailListCard.demo = () => (
    <ThumbnailListCard
      title="Test Recipe"
      subtitle="4 servings"
      onPress={() => {
        void 0;
      }}
    />
  );
}
