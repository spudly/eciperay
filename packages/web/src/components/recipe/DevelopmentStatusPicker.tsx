import {
  RECIPE_DEVELOPMENT_STATUS_LABELS,
  RECIPE_DEVELOPMENT_STATUS_OPTIONS,
} from '@eciperay/client';
import type {RecipeDevelopmentStatus} from '@eciperay/types';

type Props = {
  value: RecipeDevelopmentStatus;
  onChange: (status: RecipeDevelopmentStatus) => void;
  disabled?: boolean;
};

export const DevelopmentStatusPicker = ({
  value,
  onChange,
  disabled = false,
}: Props) => (
  <div>
    <label
      htmlFor="development-status"
      className="mb-1 block text-sm font-medium text-gray-700"
    >
      Development status
    </label>
    <select
      id="development-status"
      className="
        w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base
        disabled:cursor-not-allowed disabled:bg-gray-50
      "
      value={value}
      disabled={disabled}
      onChange={event => {
        onChange(event.target.value as RecipeDevelopmentStatus);
      }}
    >
      {RECIPE_DEVELOPMENT_STATUS_OPTIONS.map(status => (
        <option
          key={status}
          value={status}
        >
          {RECIPE_DEVELOPMENT_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  </div>
);
