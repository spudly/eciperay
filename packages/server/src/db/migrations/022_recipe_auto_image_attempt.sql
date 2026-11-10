-- Auto image generation on save (#407): at most one automatic generation
-- attempt per recipe lineage. The timestamp doubles as the attempt marker:
-- null = never attempted, non-null = an auto-generation was already claimed
-- for this recipe (whether it succeeded, failed, or was quota-blocked), so
-- ordinary edit saves never re-trigger generation repeatedly. Users cannot
-- delete a recipe photo (only replace it), so a claimed attempt is never
-- re-armed by removing the image.
alter table recipes
  add column if not exists auto_image_attempted_at timestamptz;
