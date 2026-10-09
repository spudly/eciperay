type OptionalSearchValue = string | number | undefined;

/** Sets defined string/number values on URLSearchParams. */
export const setOptionalSearchParams = (
  search: URLSearchParams,
  entries: Record<string, OptionalSearchValue>,
) => {
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
};
