import type {ThumbnailListCardProps} from '@eciperay/client';
import {Link} from 'react-router-dom';

const Thumbnail = ({
  imageUrl,
  title,
}: {
  imageUrl?: string | null;
  title: string;
}) =>
  imageUrl ? (
    <img
      src={imageUrl}
      alt={title}
      className="size-16 shrink-0 rounded-lg bg-gray-50 object-cover"
    />
  ) : (
    <div
      aria-hidden
      className="size-16 shrink-0 rounded-lg bg-gray-100"
    />
  );

const CardBody = ({title, subtitle}: {title: string; subtitle?: string}) => (
  <div className="min-w-0 flex-1">
    <p className="text-base font-semibold text-gray-900">{title}</p>
    {subtitle ? <p className="text-muted mt-1 text-sm">{subtitle}</p> : null}
  </div>
);

export const ThumbnailListCard = ({
  imageUrl,
  title,
  subtitle,
  onPress,
  trailing,
  linkTo,
}: ThumbnailListCardProps) => {
  const className = 'ui-thumbnail-list-card flex';

  if (linkTo && !onPress) {
    return (
      <Link
        to={linkTo}
        className={className}
      >
        <Thumbnail
          imageUrl={imageUrl}
          title={title}
        />
        <CardBody
          title={title}
          subtitle={subtitle}
        />
        {trailing}
      </Link>
    );
  }

  if (onPress) {
    return (
      <div className={className}>
        <button
          type="button"
          className="shrink-0 border-0 bg-transparent p-0"
          onClick={onPress}
        >
          <Thumbnail
            imageUrl={imageUrl}
            title={title}
          />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-start"
          onClick={onPress}
        >
          <CardBody
            title={title}
            subtitle={subtitle}
          />
        </button>
        {trailing}
      </div>
    );
  }

  return (
    <div className={className}>
      <Thumbnail
        imageUrl={imageUrl}
        title={title}
      />
      <CardBody
        title={title}
        subtitle={subtitle}
      />
      {trailing}
    </div>
  );
};

if (import.meta.env.DEV) {
  ThumbnailListCard.demo = function ThumbnailListCardDemo() {
    return (
      <ThumbnailListCard
        title="Test Recipe"
        subtitle="4 servings"
        linkTo="/recipes/1"
      />
    );
  };
}
