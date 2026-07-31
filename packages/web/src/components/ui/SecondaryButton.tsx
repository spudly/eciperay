import type {SecondaryButtonProps} from '@eciperay/client';

export const SecondaryButton = ({
  label,
  onPress,
  disabled = false,
}: SecondaryButtonProps) => (
  <button
    type="button"
    className="ui-secondary-button inline-full"
    disabled={disabled}
    onClick={onPress}
  >
    <span className="ui-secondary-button-text">{label}</span>
  </button>
);

if (import.meta.env.DEV) {
  SecondaryButton.demo = function SecondaryButtonDemo() {
    return (
      <SecondaryButton
        label="Secondary"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}
