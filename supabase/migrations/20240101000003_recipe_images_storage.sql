-- Public bucket for recipe cover images (URLs stored in recipes.image_url)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Recipe images are publicly readable"
on storage.objects for select
using (bucket_id = 'recipe-images');

create policy "Users can upload recipe images to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their recipe images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their recipe images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
