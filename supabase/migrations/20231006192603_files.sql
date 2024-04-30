create schema private;

insert into storage.buckets (id, name)
values ('markdown_files', 'markdown_files')
on conflict do nothing;

insert into storage.buckets (id, name)
values ('original_files', 'original_files')
on conflict do nothing;

create or replace function private.uuid_or_null(str text)
returns uuid
language plpgsql
as $$
begin
  return str::uuid;
  exception when invalid_text_representation then
    return null;
  end;
$$;

create policy "Authenticated users can upload markdown files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'markdown_files' and
    owner = auth.uid() and
    private.uuid_or_null(path_tokens[1]) is not null
);

create policy "Users can view their own markdown files"
on storage.objects for select to authenticated using (
  bucket_id = 'markdown_files' and owner = auth.uid()
);

create policy "Users can update their own markdown files"
on storage.objects for update to authenticated with check (
  bucket_id = 'markdown_files' and owner = auth.uid()
);

create policy "Users can delete their own markdown files"
on storage.objects for delete to authenticated using (
  bucket_id = 'markdown_files' and owner = auth.uid()
);


create policy "Authenticated users can upload files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'original_files' and
    owner = auth.uid() and
    private.uuid_or_null(path_tokens[1]) is not null
);

create policy "Users can view their own files"
on storage.objects for select to authenticated using (
  bucket_id = 'original_files' and owner = auth.uid()
);

create policy "Users can update their own files"
on storage.objects for update to authenticated with check (
  bucket_id = 'original_files' and owner = auth.uid()
);

create policy "Users can delete their own files"
on storage.objects for delete to authenticated using (
  bucket_id = 'original_files' and owner = auth.uid()
);