import type {SearchFieldProps} from '@eciperay/client';
import {SearchField as DSSearchField, tokens} from '@spudly/ui';
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
    // The DS search input is borderless and transparent — its rounded
    // container owns the radius — so pin the input's own radius to the
    // numeric zero token. This is load-bearing, not cosmetic: the DS
    // component wraps Tamagui v3's umbrella Input, whose default size
    // variant sets borderRadius to the bare token name "md". The DS
    // Tamagui config has no radius token by that name, so on Android
    // the unresolved string is expanded into the four corner-radius
    // props (borderBottomRightRadius: "md") and the new-architecture
    // view manager throws ClassCastException (String -> Double) when
    // the input mounts — the Browse Recipes crash (issue #150).
    // Sibling DS inputs (TextField, MultilineField) already pin a
    // numeric radius; SearchField's input does not, so the wrapper
    // pins it here until the DS does. (Mirrored in the app wrapper.)
    borderRadius={tokens.radii.zero}
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
