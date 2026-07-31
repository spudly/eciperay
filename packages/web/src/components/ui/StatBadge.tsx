import type {StatBadgeProps, StatBadgeRowProps} from '@eciperay/client';

export const StatBadge = ({label, value}: StatBadgeProps) => (
  <div className="ui-stat-badge text-center">
    <p className="text-base font-semibold text-gray-900">{value}</p>
    <p className="text-muted text-xs">{label}</p>
  </div>
);

export const StatBadgeRow = ({children}: StatBadgeRowProps) => (
  <div className="ui-stat-badge-row mb-4 flex">{children}</div>
);

if (import.meta.env.DEV) {
  StatBadge.demo = function StatBadgeDemo() {
    return (
      <StatBadgeRow>
        <StatBadge
          label="Servings"
          value="4"
        />
        <StatBadge
          label="Cook"
          value="30m"
        />
      </StatBadgeRow>
    );
  };
}
