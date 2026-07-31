import type {SearchFieldProps} from '@eciperay/client';
import {useState} from 'react';

export const SearchField = ({
  value,
  onChange,
  placeholder = 'Search recipes…',
}: SearchFieldProps) => (
  <input
    className="ui-search-field inline-full mb-4"
    onChange={e => {
      onChange(e.target.value);
    }}
    placeholder={placeholder}
    type="search"
    value={value}
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
