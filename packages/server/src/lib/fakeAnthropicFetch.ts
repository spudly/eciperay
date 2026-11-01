/**
 * Deterministic fake Anthropic transport for QA environments (issue #336).
 *
 * When ECIPERAY_AI_FAKE=1, the Anthropic client in anthropic.ts is built with
 * this fetch implementation instead of the real one, so no request ever reaches
 * api.anthropic.com and no API credits are consumed. The live Playwright suite
 * (packages/web/e2e-live) runs this way in CI: its imports spec needs a working
 * text-import parse, and until now that required a real ANTHROPIC_API_KEY
 * secret with a funded balance.
 *
 * The fake answers POST /v1/messages with canned responses matched on the
 * caller's prompt (every server AI call is a non-streaming
 * client.messages.create whose response is validated against a zod schema, so a
 * fixed schema-valid payload per feature is sufficient):
 *
 * - Recipe parse (parseWithClaude) and AI recipe generation
 *   (generateRecipeWithClaude): a fixed "Imported Soup" recipe. The live
 *   imports spec asserts the parsed ingredient text "2 cups water" and the
 *   "Imported Soup" heading, so the canned payload produces exactly those.
 * - Tag selection (selectTagsForRecipe): an empty selection.
 * - Nutrition estimate (refreshRecipeNutrition): fixed plausible values.
 * - Description fallback (parseWithClaude's generateDescription): one plain
 *   sentence.
 * - Substitutions (getSubstitutions): one generic entry.
 * - Step timing (refreshRecipeStepTiming): an empty array, which the caller
 *   treats as "no estimates" and defaults every step to 5 minutes.
 *
 * Any other /v1/messages request gets a short plain-text placeholder: AI
 * features without a canned response above do not behave meaningfully under
 * fake mode. Requests to any other URL pass through to the real fetch
 * untouched. Fake mode is opt-in via the environment and off by default;
 * production never sets ECIPERAY_AI_FAKE.
 */

const FAKE_MODEL = 'claude-haiku-4-5';
const FAKE_API_KEY = 'fake-ai';

const RECIPE_IMPORT_TEXT = JSON.stringify({
  title: 'Imported Soup',
  description: 'A simple, savory soup of salted water, ready in minutes.',
  servings: 2,
  prepTimeMin: 5,
  cookTimeMin: 10,
  ingredients: [
    {
      sortOrder: 0,
      name: 'water',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
    {
      sortOrder: 1,
      name: 'salt',
      quantity: 1,
      unit: 'tsp',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [
    {stepNumber: 1, body: 'Boil the water, add the salt, and serve.'},
  ],
});

const NUTRITION_TEXT = JSON.stringify({
  calories: 120,
  proteinG: 2,
  carbsG: 8,
  fatG: 9,
  fiberG: 1,
  sugarG: 1,
  sodiumMg: 480,
  preparedWeightG: 500,
  disclaimer:
    'Fake estimate from the canned AI transport (ECIPERAY_AI_FAKE=1); ' +
    'not a real nutrition analysis.',
});

const SUBSTITUTIONS_TEXT = JSON.stringify([
  {
    ingredient: 'the missing ingredient',
    suggestions: ['Use a similar pantry staple in the same quantity'],
  },
]);

const DESCRIPTION_TEXT =
  'A simple, savory soup that comes together in minutes.';

const PLACEHOLDER_TEXT =
  'Fake AI is enabled (ECIPERAY_AI_FAKE=1): this AI feature has no ' +
  'canned response, so this placeholder text was returned instead of ' +
  'calling Anthropic.';

export const isFakeAiEnabled = (): boolean =>
  process.env['ECIPERAY_AI_FAKE'] === '1';

/**
 * The API key for the Anthropic client. Unchanged when fake mode is off. When
 * fake mode is on and no key is configured, a placeholder key lets the client
 * construct and "call" normally — the fake fetch intercepts every request, so
 * the key is never presented to a real service.
 */
export const resolveAnthropicApiKey = (): string | undefined => {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (isFakeAiEnabled() && !apiKey) {
    return FAKE_API_KEY;
  }
  return apiKey;
};

export const resolveAnthropicFetch = (): typeof fetch =>
  isFakeAiEnabled() ? fakeAnthropicFetch : globalThis.fetch;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Flattens a string-or-content-blocks value (system prompt, message content) to
 * plain text.
 */
const flattenText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (!Array.isArray(value)) {
    return '';
  }
  const parts: string[] = [];
  for (const part of value) {
    if (typeof part === 'string') {
      parts.push(part);
    } else if (isRecord(part) && typeof part['text'] === 'string') {
      parts.push(part['text']);
    }
  }
  return parts.join('\n');
};

const flattenMessageText = (messages: unknown): string => {
  if (!Array.isArray(messages)) {
    return '';
  }
  const parts: string[] = [];
  for (const message of messages) {
    if (isRecord(message)) {
      parts.push(flattenText(message['content']));
    }
  }
  return parts.join('\n');
};

const urlPathname = (urlString: string): string => {
  try {
    return new URL(urlString).pathname;
  } catch {
    return urlString;
  }
};

const readBodyText = async (
  input: string | URL | Request,
  init: RequestInit | undefined,
): Promise<string | null> => {
  if (typeof init?.body === 'string') {
    return init.body;
  }
  if (input instanceof Request) {
    return input.clone().text();
  }
  return null;
};

type CannedRequest = {model: string; systemText: string; userText: string};

const parseCannedRequest = (bodyText: string | null): CannedRequest => {
  let body: Record<string, unknown> = {};
  if (bodyText !== null) {
    try {
      const parsed: unknown = JSON.parse(bodyText);
      if (isRecord(parsed)) {
        body = parsed;
      }
    } catch {
      // Malformed body: fall through with an empty request, which the
      // caller answers with the placeholder response.
    }
  }
  const model = body['model'];
  return {
    model: typeof model === 'string' && model !== '' ? model : FAKE_MODEL,
    systemText: flattenText(body['system']),
    userText: flattenMessageText(body['messages']),
  };
};

const cannedTextFor = ({systemText, userText}: CannedRequest): string => {
  if (
    systemText.includes('You are a recipe parser') ||
    systemText.includes('invent a complete, coherent, cookable recipe')
  ) {
    return RECIPE_IMPORT_TEXT;
  }
  if (systemText.includes('Select tags that apply')) {
    return '[]';
  }
  if (systemText.includes('Write one appetizing sentence')) {
    return DESCRIPTION_TEXT;
  }
  if (userText.includes('Estimate nutrition per serving')) {
    return NUTRITION_TEXT;
  }
  if (userText.trimStart().startsWith('Suggest practical substitutions')) {
    return SUBSTITUTIONS_TEXT;
  }
  if (userText.includes('Estimate how many minutes each cooking instruction')) {
    return '[]';
  }
  return PLACEHOLDER_TEXT;
};

const fakeMessageResponse = (request: CannedRequest): Response =>
  new Response(
    JSON.stringify({
      id: 'msg_fake_ai',
      type: 'message',
      role: 'assistant',
      model: request.model,
      content: [{type: 'text', text: cannedTextFor(request)}],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {input_tokens: 1, output_tokens: 1},
    }),
    {status: 200, headers: {'content-type': 'application/json'}},
  );

export const fakeAnthropicFetch = async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const urlString = input instanceof Request ? input.url : String(input);
  if (!urlPathname(urlString).endsWith('/v1/messages')) {
    return globalThis.fetch(input, init);
  }
  const bodyText = await readBodyText(input, init);
  return fakeMessageResponse(parseCannedRequest(bodyText));
};
