import type {TagPillProps} from '@eciperay/client';
import {Badge as DSBadge} from '@spudly/ui';

export const TagPill = ({name, color}: TagPillProps) => (
  <DSBadge style={{backgroundColor: `${color}22`, color}}>{name}</DSBadge>
);

if (import.meta.env.DEV) {
  TagPill.demo = function TagPillDemo() {
    return (
      <TagPill
        name="Weeknight"
        color="#6366f1"
      />
    );
  };
}
