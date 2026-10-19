export type PlanName = 'free' | 'plus' | 'power';

export type SubscriptionStatus =
  'active' | 'past_due' | 'cancelled' | 'expired';

/**
 * The resolved billing entitlement for a user. `status` is null when the user
 * has no subscription row (Free plan). Served by GET /api/account/entitlement —
 * the single source of truth for all clients.
 */
export type Entitlement = {
  plan: PlanName;
  status: SubscriptionStatus | null;
  aiUsed: number;
  /** Monthly AI call limit. -1 when `unlimited` is true. */
  aiLimit: number;
  /**
   * True only for entitlement_overrides grants (see migration 018): the plan is
   * not backed by Paddle, never expires or downgrades, and AI metering never
   * blocks the user. Absent for Paddle-backed plans.
   */
  unlimited?: boolean;
  periodEndsAt: string | null;
  paddleCustomerId: string | null;
  /**
   * True when the subscription is still active but scheduled to cancel at the
   * end of the current period (Paddle `scheduled_change.action = 'cancel'`).
   * Paid access continues until `periodEndsAt`; the plan does NOT renew.
   * Distinct from `status: 'cancelled'`, which is already in its access-until
   * window (or past it).
   */
  cancelAtPeriodEnd: boolean;
};

export type PlanLimits = {
  /** Max recipes. -1 = unlimited. */
  recipes: number;
  aiCallsPerMonth: number;
  mealPlans: boolean;
  apiAccess: boolean;
};
