import type {RadioOptionGroupProps} from '@eciperay/client';
import {useState} from 'react';

export const RadioOptionGroup = ({
  name,
  value,
  onChange,
  options,
  disabled = false,
}: RadioOptionGroupProps) => (
  <div className="ui-radio-option-group">
    {options.map(option => (
      <label
        key={option.value}
        className="ui-radio-option"
      >
        <input
          type="radio"
          name={name}
          checked={value === option.value}
          disabled={disabled}
          onChange={() => {
            onChange(option.value);
          }}
        />
        <span>
          <span className="font-medium">{option.title}</span>
          {option.description ? (
            <span className="mt-0.5 block text-xs text-gray-500">
              {option.description}
            </span>
          ) : null}
        </span>
      </label>
    ))}
  </div>
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
