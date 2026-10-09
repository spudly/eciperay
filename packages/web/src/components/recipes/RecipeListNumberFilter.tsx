export const RecipeListNumberFilter = ({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) => (
  <label className="block min-w-0 flex-1">
    <span className="mb-1 block text-sm font-medium text-gray-700">
      {label}
    </span>
    <input
      id={id}
      type="number"
      inputMode="numeric"
      className="ui-select-field w-full"
      value={value}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  </label>
);
