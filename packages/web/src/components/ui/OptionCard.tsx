import type {OptionCardProps} from '@eciperay/client';
import {OptionCard as DSOptionCard} from '@spudly/ui';
import {useNavigate} from 'react-router-dom';

/**
 * Adapter over the design-system OptionCard. The DS card is itself the
 * pressable (role="button"); for router destinations we navigate via the
 * card's onPress instead of wrapping in a <Link>, avoiding nested
 * interactive elements.
 */
export const OptionCard = ({
  title,
  description,
  onPress,
  to,
}: OptionCardProps) => {
  const navigate = useNavigate();

  const handlePress = () => {
    if (to) {
      void navigate(to);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <DSOptionCard
      title={title}
      description={description}
      onPress={handlePress}
    />
  );
};

if (import.meta.env.DEV) {
  OptionCard.demo = function OptionCardDemo() {
    return (
      <OptionCard
        title="Option card"
        description="Example description"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}
