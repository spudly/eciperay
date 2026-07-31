import type {DestructiveButtonProps} from '@eciperay/client';

export const DestructiveButton = ({
  label,
  onPress,
  disabled = false,
}: DestructiveButtonProps) => (
  <button
    type="button"
    className="ui-destructive-button inline-full"
    disabled={disabled}
    onClick={onPress}
  >
    <span className="ui-primary-button-text">{label}</span>
  </button>
);

if (import.meta.env.DEV) {
  DestructiveButton.demo = function DestructiveButtonDemo() {
    return (
      <DestructiveButton
        label="Destructive"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}
