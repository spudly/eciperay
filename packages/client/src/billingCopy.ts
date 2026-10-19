import type {PlanName} from '@eciperay/types';

export const PLAN_LABELS: Record<PlanName, string> = {
  free: 'Free',
  plus: 'Plus',
  power: 'Power',
};

/**
 * Explainer shown in place of the API-token create form when the user's plan is
 * below Power (token creation would 403 with plan_required). Shared by the web
 * and app profile sections so the copy stays identical.
 */
export const apiTokensPowerNotice = (plan: PlanName): string =>
  `API access tokens are a Power feature ($8.99/mo). You're on the ${PLAN_LABELS[plan]} plan — upgrade to create tokens.`;
