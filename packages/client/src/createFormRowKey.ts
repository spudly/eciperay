let nextKey = 0;

export const createFormRowKey = (existingId?: string): string => {
  if (existingId) {
    return existingId;
  }
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  nextKey += 1;
  return `form-row-${nextKey}`;
};
