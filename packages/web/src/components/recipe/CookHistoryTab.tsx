import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';

import {eciperay} from '../../lib/api.js';

type Props = {recipeId: string; versionId: string};

const StarDisplay = ({rating}: {rating: number}) => (
  <span aria-label={`${rating} stars`}>{'★'.repeat(rating)}</span>
);

export const CookHistoryTab = ({recipeId, versionId}: Props) => {
  const {data: cookLogs = [], isLoading} = useQuery({
    queryKey: queryKeys.cookLogs(recipeId, versionId),
    queryFn: () => eciperay.cookLogs.list(recipeId, versionId),
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-muted text-sm">Loading cook history…</p>
      </div>
    );
  }

  if (cookLogs.length === 0) {
    return (
      <div className="p-4">
        <p className="text-muted text-sm">
          No cooks logged yet. Finish a cooking session to record your first
          cook.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ol className="space-y-4">
        {cookLogs.map(log => (
          <li
            key={log.id}
            className="rounded-lg border border-gray-100 bg-gray-50 p-4"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <time
                dateTime={log.cookedAt}
                className="text-sm font-medium text-gray-900"
              >
                {new Date(log.cookedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
              {log.authorStarRating ? (
                <StarDisplay rating={log.authorStarRating} />
              ) : null}
            </div>
            {log.notes ? (
              <p className="text-sm text-gray-700">{log.notes}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
};
