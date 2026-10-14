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
  <label className="block flex-1 min-inline-0">
    <span className="mbe-1 block text-sm font-medium text-gray-700">
      {label}
    </span>
    <input
      id={id}
      type="number"
      inputMode="numeric"
      className="
        rounded-xl border border-gray-200 bg-white px-4 py-3 text-base
        inline-full
      "
      value={value}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  </label>
);
