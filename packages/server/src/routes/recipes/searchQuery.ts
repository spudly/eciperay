/**
 * GitHub-style recipe search syntax (#611).
 *
 * The raw `search` string is parsed once, here, into a typed AST that the
 * shared SQL builder below compiles into parameterized conditions. The same
 * parser feeds all three list endpoints (mine, shared-with-me, public) — and,
 * through the shared list params, the meal-plan picker — so the syntax behaves
 * identically everywhere.
 *
 * Supported terms (all ANDed together, GitHub's model):
 *
 * - Free words: each word may match the title, the description, or an ingredient
 *   name (word-by-word AND, broadening the #385 title-only rule)
 * - `"chicken soup"`: quoted phrase, exact contiguous match in any of the
 *   free-text fields
 * - `title:`, `desc:` / `description:`, `ingredient:`, `tag:`: field-scoped
 *   substring matches; comma-separated values are ORed within the qualifier
 *   (`tag:dinner,quick`)
 * - `-term`, `-ingredient:peanuts`, `-tag:spicy`: negation of any term
 * - `is:public` / `is:shared` / `is:mine`: scope qualifiers
 * - `rating:>=4`, `calories:<600`, `protein:>30`, `satiety:>=7`: numeric
 *   comparisons against the same columns the range filters use
 *
 * Unknown qualifiers degrade to free text (GitHub is lenient the same way). A
 * known qualifier with an invalid value is dropped and recorded in `hints`, so
 * the UI can surface a hint instead of a dead end.
 */

export type SearchScope = 'mine' | 'shared' | 'public';

export type SearchTextField = 'title' | 'description' | 'ingredient' | 'tag';

export type SearchNumericField = 'rating' | 'calories' | 'protein' | 'satiety';

export type SearchComparison = '>=' | '<=' | '>' | '<' | '=';

export type ParsedSearchQuery = {
  freeText: {value: string; phrase: boolean; negated: boolean}[];
  fieldFilters: {field: SearchTextField; values: string[]; negated: boolean}[];
  scopes: {values: SearchScope[]; negated: boolean}[];
  numeric: {
    field: SearchNumericField;
    comparison: SearchComparison;
    value: number;
    negated: boolean;
  }[];
  hints: string[];
};

export const EMPTY_SEARCH_QUERY: ParsedSearchQuery = {
  freeText: [],
  fieldFilters: [],
  scopes: [],
  numeric: [],
  hints: [],
};

const SCOPE_VALUES: readonly SearchScope[] = ['mine', 'shared', 'public'];

const TEXT_FIELD_QUALIFIERS: Record<string, SearchTextField> = {
  title: 'title',
  desc: 'description',
  description: 'description',
  ingredient: 'ingredient',
  tag: 'tag',
};

const NUMERIC_QUALIFIERS: readonly SearchNumericField[] = [
  'rating',
  'calories',
  'protein',
  'satiety',
];

type RawToken = {text: string; phrase: boolean; negated: boolean};

/** Split on whitespace, keeping quoted sections (and a leading `-`) intact. */
const tokenize = (raw: string): RawToken[] => {
  const tokens: RawToken[] = [];
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i] ?? '')) {
      i += 1;
    }
    if (i >= raw.length) {
      break;
    }
    let negated = false;
    if (raw[i] === '-' && i + 1 < raw.length && !/\s/.test(raw[i + 1] ?? '')) {
      negated = true;
      i += 1;
    }
    let text = '';
    let phrase = false;
    while (i < raw.length && !/\s/.test(raw[i] ?? '')) {
      if (raw[i] === '"') {
        phrase = true;
        i += 1;
        while (i < raw.length && raw[i] !== '"') {
          text += raw[i];
          i += 1;
        }
        i += 1; // closing quote (or end of string)
      } else {
        text += raw[i];
        i += 1;
      }
    }
    if (text.length > 0) {
      tokens.push({text, phrase, negated});
    }
  }
  return tokens;
};

const splitValues = (value: string): string[] =>
  value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);

const parseNumericTerm = (
  rawValue: string,
): {comparison: SearchComparison; value: number} | null => {
  const match = /^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/.exec(rawValue.trim());
  if (!match) {
    return null;
  }
  return {
    comparison: (match[1] as SearchComparison | undefined) ?? '=',
    value: Number(match[2]),
  };
};

export const parseSearchSyntax = (
  raw: string | null | undefined,
): ParsedSearchQuery => {
  const parsed: ParsedSearchQuery = {
    freeText: [],
    fieldFilters: [],
    scopes: [],
    numeric: [],
    hints: [],
  };
  if (!raw) {
    return parsed;
  }
  for (const token of tokenize(raw)) {
    const qualifierMatch = /^([A-Za-z]+):(.*)$/.exec(token.text);
    if (!qualifierMatch) {
      parsed.freeText.push({
        value: token.text,
        phrase: token.phrase,
        negated: token.negated,
      });
      continue;
    }
    const qualifier = (qualifierMatch[1] ?? '').toLowerCase();
    const rawValue = qualifierMatch[2] ?? '';
    const isKnownQualifier =
      Object.hasOwn(TEXT_FIELD_QUALIFIERS, qualifier) ||
      qualifier === 'is' ||
      (NUMERIC_QUALIFIERS as readonly string[]).includes(qualifier);
    if (!isKnownQualifier) {
      // Unknown qualifier: GitHub-lenient fallback to a free-text term,
      // colon included, so nothing the user typed is silently dropped.
      // This also preserves a quoted phrase with no known qualifier.
      parsed.freeText.push({
        value: token.text,
        phrase: token.phrase,
        negated: token.negated,
      });
      continue;
    }

    const textField = Object.hasOwn(TEXT_FIELD_QUALIFIERS, qualifier)
      ? TEXT_FIELD_QUALIFIERS[qualifier]
      : undefined;
    if (textField) {
      const values = splitValues(rawValue);
      if (values.length === 0) {
        parsed.hints.push(`Search qualifier "${qualifier}:" needs a value.`);
        continue;
      }
      parsed.fieldFilters.push({
        field: textField,
        values,
        negated: token.negated,
      });
      continue;
    }

    if (qualifier === 'is') {
      const values = splitValues(rawValue.toLowerCase());
      if (values.length === 0) {
        parsed.hints.push(`Search qualifier "${qualifier}:" needs a value.`);
        continue;
      }
      const scopeValues = values.filter((value): value is SearchScope =>
        (SCOPE_VALUES as readonly string[]).includes(value),
      );
      const invalidValues = values.filter(
        value => !(SCOPE_VALUES as readonly string[]).includes(value),
      );
      for (const invalid of invalidValues) {
        parsed.hints.push(
          `Unknown is: value "${invalid}" — try is:public.`,
        );
      }
      if (scopeValues.length === 0) {
        continue;
      }
      parsed.scopes.push({values: scopeValues, negated: token.negated});
      continue;
    }

    if ((NUMERIC_QUALIFIERS as readonly string[]).includes(qualifier)) {
      const numeric = parseNumericTerm(rawValue);
      if (!numeric) {
        parsed.hints.push(
          `Invalid number in "${qualifier}:${rawValue}" — try ${qualifier}:>=1.`,
        );
        continue;
      }
      parsed.numeric.push({
        field: qualifier as SearchNumericField,
        ...numeric,
        negated: token.negated,
      });
      continue;
    }

    // Unknown qualifier: GitHub-lenient fallback to a free-text word,
    // colon included, so nothing the user typed is silently dropped.
    parsed.freeText.push({
      value: token.text,
      phrase: false,
      negated: token.negated,
    });
  }
  return parsed;
};

/**
 * Escape ILIKE pattern metacharacters so a search value matches literally:
 * searching "50%" must not also match "50g", and "a_b" must not match "axb".
 * Pairs with the `escape '\'` clause in the compiled SQL.
 */
export const escapeLikePattern = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

const NUMERIC_COLUMNS: Record<SearchNumericField, string> = {
  rating: 'r.star_rating',
  calories: 'rv.calories',
  protein: 'rv.protein_g',
  satiety: 'rv.satiety_score',
};

/**
 * Compile a parsed query into parameterized SQL conditions.
 *
 * `startIndex` is the first free `$n` placeholder; bind values are returned in
 * placeholder order. Every user value travels as a bind parameter with its `%`
 * / `_` / `\` characters escaped, never interpolated into the SQL.
 */
export const buildSearchQuerySql = (
  parsed: ParsedSearchQuery,
  startIndex: number,
  scope: SearchScope,
): {sql: string; values: (string | number)[]} => {
  const values: (string | number)[] = [];
  const conditions: string[] = [];
  const patternParam = (value: string): string => {
    values.push(`%${escapeLikePattern(value)}%`);
    return `$${startIndex + values.length - 1}`;
  };
  const like = (column: string, param: string): string =>
    `${column} ilike ${param} escape '\\'`;
  const ingredientExists = (param: string): string =>
    `exists (select 1 from ingredients i where i.recipe_version_id = rv.id and ${like('i.name', param)})`;
  const tagExists = (param: string): string =>
    `exists (select 1 from recipe_tags srt join tags st on st.id = srt.tag_id where srt.recipe_version_id = rv.id and ${like('st.name', param)})`;
  const fieldCondition = (field: SearchTextField, param: string): string => {
    switch (field) {
      case 'title': {
        return like('rv.title', param);
      }
      case 'description': {
        return like(`coalesce(rv.description, '')`, param);
      }
      case 'ingredient': {
        return ingredientExists(param);
      }
      case 'tag': {
        return tagExists(param);
      }
    }
  };
  const maybeNegate = (condition: string, negated: boolean): string =>
    negated ? `not (${condition})` : condition;

  for (const term of parsed.freeText) {
    const param = patternParam(term.value);
    const condition = `(${like('rv.title', param)} or ${like(`coalesce(rv.description, '')`, param)} or ${ingredientExists(param)})`;
    conditions.push(maybeNegate(condition, term.negated));
  }

  for (const filter of parsed.fieldFilters) {
    const condition = `(${filter.values
      .map(value => fieldCondition(filter.field, patternParam(value)))
      .join(' or ')})`;
    conditions.push(maybeNegate(condition, filter.negated));
  }

  // Positive condition for one scope alternative, relative to this
  // endpoint: `null` means it matches every row on the endpoint (TRUE),
  // 'false' means it matches none, otherwise a visibility condition.
  const scopeCondition = (value: SearchScope): string | null => {
    if (value === 'public') {
      return `r.visibility = 'public'`;
    }
    return value === scope ? null : 'false';
  };
  // OR a token's alternatives into one condition: `null` = no constraint.
  // A 'false' alternative is dropped when others remain (false OR x = x);
  // it survives only when every alternative is false.
  const orGroup = (parts: (string | null)[]): string | null => {
    if (parts.some(part => part === null)) {
      return null;
    }
    const concrete = parts as string[];
    const nonFalse = concrete.filter(part => part !== 'false');
    const effective = nonFalse.length > 0 ? nonFalse : concrete;
    return effective.length === 1
      ? (effective[0] as string)
      : `(${effective.join(' or ')})`;
  };

  for (const scopeTerm of parsed.scopes) {
    const group = orGroup(scopeTerm.values.map(scopeCondition));
    if (group === null) {
      if (scopeTerm.negated) {
        conditions.push('false');
      }
      continue;
    }
    if (group === 'false' && scopeTerm.negated) {
      continue;
    }
    conditions.push(maybeNegate(group, scopeTerm.negated));
  }

  for (const term of parsed.numeric) {
    values.push(term.value);
    const param = `$${startIndex + values.length - 1}`;
    const condition = `${NUMERIC_COLUMNS[term.field]} ${term.comparison} ${param}`;
    conditions.push(maybeNegate(condition, term.negated));
  }

  return {
    sql: conditions.map(condition => `\n    and (${condition})`).join(''),
    values,
  };
};
