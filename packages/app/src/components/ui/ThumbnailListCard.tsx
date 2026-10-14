import type {ThumbnailListCardProps} from '@eciperay/client';
import {Card} from '@spudly/ui';
import {Image, Text, TouchableOpacity, View} from 'react-native';

const Thumbnail = ({imageUrl}: {imageUrl?: string | null}) =>
  imageUrl ? (
    <Image
      source={{uri: imageUrl}}
      className="rounded-lg bg-gray-50 block-16 inline-16"
      resizeMode="cover"
    />
  ) : (
    <View className="rounded-lg bg-gray-100 block-16 inline-16" />
  );

export const ThumbnailListCard = ({
  imageUrl,
  title,
  subtitle,
  onPress,
  trailing,
}: ThumbnailListCardProps) => (
  <Card
    elevated
    flexDirection="row"
    alignItems="center"
    gap="$3"
    marginBottom="$3"
  >
    <TouchableOpacity onPress={onPress}>
      <Thumbnail imageUrl={imageUrl} />
    </TouchableOpacity>
    <TouchableOpacity
      className="flex-1 min-inline-0"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      {subtitle ? (
        <Text className="text-muted mbs-1 text-sm">{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
    {trailing}
  </Card>
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
