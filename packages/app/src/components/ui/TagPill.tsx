import type {TagPillProps} from '@eciperay/client';
import {Text, View} from 'react-native';

export const TagPill = ({name, color}: TagPillProps) => (
  <View
    className="ui-tag-pill"
    style={{backgroundColor: `${color}22`}}
  >
    <Text
      className="text-sm font-medium"
      style={{color}}
    >
      {name}
    </Text>
  </View>
);

if (__DEV__) {
  TagPill.demo = () => (
    <TagPill
      name="Weeknight"
      color="#6366f1"
    />
  );
}
