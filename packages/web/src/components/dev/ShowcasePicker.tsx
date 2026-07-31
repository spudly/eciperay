import {
  groupShowcaseEntriesByCategory,
  type ComponentShowcaseEntry,
} from '@eciperay/client';

export type ShowcasePickerProps = {
  value: string;
  onChange: (id: string) => void;
  entries: ComponentShowcaseEntry[];
};

export const ShowcasePicker = ({
  value,
  onChange,
  entries,
}: ShowcasePickerProps) => {
  const grouped = groupShowcaseEntriesByCategory(entries);

  return (
    <label className="ui-showcase-picker-label">
      Component
      <select
        className="ui-showcase-picker"
        value={value}
        onChange={event => {
          onChange(event.target.value);
        }}
      >
        {Object.entries(grouped).map(([category, items]) => (
          <optgroup
            key={category}
            label={category}
          >
            {items.map(item => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
};
