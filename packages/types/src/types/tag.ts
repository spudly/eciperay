export type Tag = {
  id: string;
  userId: string | null;
  name: string;
  color: string;
  isPreset: boolean;
};

export type TagInput = {name: string; color: string};
