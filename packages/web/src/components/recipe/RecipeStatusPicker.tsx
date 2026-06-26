import {RECIPE_STATUS_LABELS, RECIPE_STATUS_OPTIONS} from '@eciperay/client';
import type {RecipeStatus} from '@eciperay/types';

type Props = {
  value: RecipeStatus;
  onChange: (status: RecipeStatus) => void;
  disabled?: boolean;
};

export const RecipeStatusPicker = ({
  value,
  onChange,
  disabled = false,
}: Props) => (
  <div>
    <label
      htmlFor="status"
      className="mb-1 block text-sm font-medium text-gray-700"
    >
      Status
    </label>
    <select
      id="status"
      className="
        w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base
        disabled:cursor-not-allowed disabled:bg-gray-50
      "
      value={value}
      disabled={disabled}
      onChange={event => {
        onChange(event.target.value as RecipeStatus);
      }}
    >
      {RECIPE_STATUS_OPTIONS.map(status => (
        <option
          key={status}
          value={status}
        >
          {RECIPE_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  </div>
);
