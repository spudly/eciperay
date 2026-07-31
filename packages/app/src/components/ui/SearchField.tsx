import type {SearchFieldProps} from '@eciperay/client';
import {TextInput} from 'react-native';
import {useState} from 'react';

export const SearchField = ({
  value,
  onChange,
  placeholder = 'Search recipes…',
}: SearchFieldProps) => (
  <TextInput
    className="ui-search-field"
    onChangeText={onChange}
    placeholder={placeholder}
    value={value}
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
