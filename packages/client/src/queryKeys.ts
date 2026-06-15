export const queryKeys = {
  recipes: (search = '') => ['recipes', {search}] as const,
  recipe: (id: string) => ['recipe', id] as const,
  notes: (id: string) => ['notes', id] as const,
  conversation: (id: string) => ['conversation', id] as const,
  nutrition: (id: string) => ['nutrition', id] as const,
  drafts: (id: string) => ['drafts', id] as const,
  tags: () => ['tags'] as const,
};
