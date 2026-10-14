import type {RadioOptionGroupProps} from '@eciperay/client';
import {RadioOptionGroup as DSRadioOptionGroup} from '@spudly/ui';
import {useState} from 'react';

export const RadioOptionGroup = ({
  name,
  value,
  onChange,
  options,
  disabled = false,
}: RadioOptionGroupProps) => (
  <DSRadioOptionGroup
    id={name}
    value={value}
    onValueChange={onChange}
    options={options.map(option => ({
      value: option.value,
      label: option.title,
      description:
        typeof option.description === 'string'
          ? option.description
          : undefined,
    }))}
    disabled={disabled}
  />
);

if (import.meta.env.DEV) {
  RadioOptionGroup.demo = function RadioOptionGroupDemo() {
    const [value, setValue] = useState('private');

    return (
      <RadioOptionGroup
        name="visibility-demo"
        value={value}
        onChange={setValue}
        options={[
          {value: 'private', title: 'Private', description: 'Only you'},
          {value: 'public', title: 'Public', description: 'Anyone can browse'},
        ]}
      />
    );
  };
}
