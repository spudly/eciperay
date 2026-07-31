import {
  groupShowcaseEntriesByCategory,
  type ComponentShowcaseEntry,
} from '@eciperay/client';

import {SelectField} from '../ui/SelectField.js';

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
  const options = Object.entries(grouped).flatMap(([, items]) =>
    items.map(item => ({value: item.id, label: item.label})),
  );

  return (
    <SelectField
      label="Component"
      value={value}
      options={options}
      onChange={onChange}
    />
  );
};
