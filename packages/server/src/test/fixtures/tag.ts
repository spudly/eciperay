import type {Tag} from '@eciperay/types';

export const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 'tag-uuid-1',
  userId: 'user-uuid-1',
  name: 'Dinner',
  color: '#6366f1',
  isPreset: false,
  ...overrides,
});
