import type {OptionCardProps} from '@eciperay/client';
import {Link} from 'react-router-dom';

export const OptionCard = ({
  title,
  description,
  onPress,
  to,
}: OptionCardProps) => {
  const content = (
    <>
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-muted text-sm">{description}</p>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="
          ui-option-card block shadow-sm
          hover:bg-gray-50
        "
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="ui-option-card inline-full text-start"
      onClick={onPress}
    >
      {content}
    </button>
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
