type Props = {servings: number; onChange: (n: number) => void};

export const ServingsStepper = ({servings, onChange}: Props) => (
  <div className="mb-3 flex items-center gap-3">
    <span className="text-sm font-medium text-gray-700">Servings:</span>
    <button
      type="button"
      className="
        flex size-8 items-center justify-center rounded-full bg-gray-100 text-lg
        font-medium
      "
      onClick={() => {
        onChange(Math.max(1, servings - 1));
      }}
    >
      −
    </button>
    <span className="w-6 text-center text-base font-semibold">{servings}</span>
    <button
      type="button"
      className="
        flex size-8 items-center justify-center rounded-full bg-gray-100 text-lg
        font-medium
      "
      onClick={() => {
        onChange(servings + 1);
      }}
    >
      +
    </button>
  </div>
);
