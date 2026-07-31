import type {PrimaryButtonProps} from '@eciperay/client';

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
  type = 'button',
}: PrimaryButtonProps) => (
  <button
    type={type}
    className="
      ui-primary-button inline-full py-4
      disabled:opacity-50
    "
    disabled={disabled || loading}
    onClick={type === 'submit' ? undefined : onPress}
  >
    <span className="ui-primary-button-text">
      {loading ? (loadingLabel ?? label) : label}
    </span>
  </button>
);

if (import.meta.env.DEV) {
  PrimaryButton.demo = function PrimaryButtonDemo() {
    return (
      <PrimaryButton
        label="Primary"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}
