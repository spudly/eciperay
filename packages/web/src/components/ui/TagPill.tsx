import type {TagPillProps} from '@eciperay/client';

export const TagPill = ({name, color}: TagPillProps) => (
  <span
    className="ui-tag-pill text-xs font-medium"
    style={{backgroundColor: `${color}22`, color}}
  >
    {name}
  </span>
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
