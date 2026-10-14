import type {SearchFieldProps} from '@eciperay/client';
import {SearchField as DsSearchField} from '@spudly/ui';
import {useState} from 'react';

export const SearchField = ({
  value,
  onChange,
  placeholder = 'Search recipes…',
}: SearchFieldProps) => (
  <DsSearchField
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
  />
);

if (__DEV__) {
  const SearchFieldDemo = () => {
    const [value, setValue] = useState('');

    return (
      <SearchField
        value={value}
        onChange={setValue}
      />
    );
  };

  SearchField.demo = () => <SearchFieldDemo />;
}
