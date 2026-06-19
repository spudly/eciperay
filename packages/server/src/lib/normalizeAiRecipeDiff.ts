type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' ? (value as JsonRecord) : null;

export const normalizeAiIngredient = (item: unknown, index: number) => {
  const record = asRecord(item);
  if (!record) {
    return item;
  }
  return {
    sortOrder: record['sortOrder'] ?? record['sort_order'] ?? index,
    name: record['name'],
    quantity: record['quantity'],
    unit: record['unit'] ?? null,
    notes: record['notes'] ?? null,
    isOptional: record['isOptional'] ?? record['is_optional'] ?? false,
  };
};

export const normalizeAiInstruction = (item: unknown, index: number) => {
  const record = asRecord(item);
  if (!record) {
    return item;
  }
  return {
    stepNumber: record['stepNumber'] ?? record['step_number'] ?? index + 1,
    body: record['body'],
  };
};
