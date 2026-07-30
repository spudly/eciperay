-- Allow import_review as a recipe_versions.created_via value (used by startImportEdits).

alter table recipe_versions
  drop constraint if exists recipe_versions_created_via_check;

alter table recipe_versions
  add constraint recipe_versions_created_via_check
  check (created_via in (
    'ai', 'manual', 'import_url', 'import_image',
    'import_text', 'import_bulk', 'tweak_ai', 'tweak_manual',
    'import_review'
  ));
