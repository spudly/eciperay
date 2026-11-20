-- Remove the recipe status entirely (#610 tranche 2): the simplified
-- transparent-versioning model replaces the idea/evolving/perfected/
-- abandoned lifecycle. The column and its check constraint go away;
-- no data migration is needed because nothing reads the values anymore.
alter table recipes drop column if exists status;
