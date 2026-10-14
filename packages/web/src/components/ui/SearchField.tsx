import type {SearchFieldProps} from '@eciperay/client';
import {SearchField as DSSearchField} from '@spudly/ui';
import {useState} from 'react';

export const SearchField = ({
  value,
  onChange,
  placeholder = 'Search recipes…',
}: SearchFieldProps) => (
  <DSSearchField
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
  />
);

if (import.meta.env.DEV) {
  SearchField.demo = function SearchFieldDemo() {
    const [value, setValue] = useState('');

    return (
      <SearchField
        value={value}
        onChange={setValue}
      />
    );
  };
}
