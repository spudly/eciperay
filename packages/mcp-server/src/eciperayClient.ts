/**
 * Thin HTTP client for the Eciperay REST API.
 *
 * Authentication uses the same Supabase bearer token as the web and mobile
 * clients. Configure with ECIPERAY_API_URL (defaults to http://localhost:8080)
 * and ECIPERAY_API_TOKEN.
 */

export type EciperayClientConfig = {apiUrl: string; apiToken: string};

export const loadConfig = (): EciperayClientConfig => {
  const apiToken = process.env['ECIPERAY_API_TOKEN'];
  if (!apiToken) {
    throw new Error(
      'ECIPERAY_API_TOKEN is required. Provide a Supabase access token for your Eciperay account.',
    );
  }
  const apiUrl = process.env['ECIPERAY_API_URL'] ?? 'http://localhost:8080';
  return {apiUrl: apiUrl.replace(/\/$/, ''), apiToken};
};

export class EciperayApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EciperayApiError';
    this.status = status;
  }
}

export const createClient = (config: EciperayClientConfig) => {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer ${config.apiToken}`);
    const res = await fetch(`${config.apiUrl}/api${path}`, {...init, headers});
    if (!res.ok) {
      const body = await res.text();
      throw new EciperayApiError(
        res.status,
        `Eciperay API ${res.status}: ${body.slice(0, 500)}`,
      );
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  };

  return {
    listRecipes: (params: {
      search?: string;
      limit?: number;
      offset?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.search) {
        qs.set('search', params.search);
      }
      if (params.limit !== undefined) {
        qs.set('limit', String(params.limit));
      }
      if (params.offset !== undefined) {
        qs.set('offset', String(params.offset));
      }
      const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
      return request<unknown[]>(`/recipes${suffix}`);
    },
    getRecipe: (id: string) => request<unknown>(`/recipes/${id}`),
    createRecipe: (input: unknown) =>
      request<unknown>('/recipes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listMealPlans: () => request<unknown[]>('/meal-plans'),
    getMealPlan: (id: string) => request<unknown>(`/meal-plans/${id}`),
    getShoppingList: (mealPlanId: string) =>
      request<unknown[]>(`/meal-plans/${mealPlanId}/shopping-list`),
  };
};

export type EciperayClient = ReturnType<typeof createClient>;
