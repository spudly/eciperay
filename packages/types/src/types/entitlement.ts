export type PlanName = 'free' | 'plus' | 'power';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

/**
 * The resolved billing entitlement for a user. `status` is null when the user
 * has no subscription row (Free plan). Served by GET /api/account/entitlement —
 * the single source of truth for all clients.
 */
export type Entitlement = {
  plan: PlanName;
  status: SubscriptionStatus | null;
  aiUsed: number;
  aiLimit: number;
  periodEndsAt: string | null;
  paddleCustomerId: string | null;
};

export type PlanLimits = {
  /** Max recipes. -1 = unlimited. */
  recipes: number;
  aiCallsPerMonth: number;
  mealPlans: boolean;
  apiAccess: boolean;
};
