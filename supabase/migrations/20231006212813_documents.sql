create extension if not exists pg_net with schema extensions;
create extension if not exists vector with schema extensions;

create table documents (
  id bigint primary key generated always as identity,
  name text not null,
  context_buckets text[] not null default '{}',
  markdown_file_id uuid references storage.objects (id),
  markdown_file_hash text,
  original_file_id uuid not null references storage.objects (id) on delete cascade,
  original_file_hash text,
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create view documents_with_storage_path
with (security_invoker=true)
as
  select documents.*, storage.objects.name as storage_object_path
  from documents
  join storage.objects
    on storage.objects.id = documents.markdown_file_id;

create view documents_with_original_storage_path
with (security_invoker=true)
as
  select documents.*, storage.objects.name as storage_object_path
  from documents
  join storage.objects
    on storage.objects.id = documents.original_file_id;

create table document_sections (
  id bigint primary key generated always as identity,
  document_id bigint not null references documents (id),
  content text not null,
  embedding vector (384)
);

create index on document_sections using hnsw (embedding vector_ip_ops);

alter table documents enable row level security;
alter table document_sections enable row level security;

create policy "Users can insert documents"
on documents for insert to authenticated with check (
  auth.uid() = created_by
);

create policy "Users can query their own documents"
on documents for select to authenticated using (
  auth.uid() = created_by
);

create policy "Users can update their own documents"
on documents for update to authenticated using (
  auth.uid() = created_by
);

create policy "Users can insert document sections"
on document_sections for insert to authenticated with check (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);

create policy "Users can update their own document sections"
on document_sections for update to authenticated using (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
) with check (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);

create policy "Users can query their own document sections"
on document_sections for select to authenticated using (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);


create function supabase_url()
returns text
language plpgsql
security definer
as $$
declare
  secret_value text;
begin
  select decrypted_secret into secret_value from vault.decrypted_secrets where name = 'supabase_url';
  return secret_value;
end;
$$;

create function private.handle_storage_update() 
returns trigger 
language plpgsql
as $$
declare
  document_id bigint;
  result int;
begin
  IF new.bucket_id = 'markdown_files' THEN
    insert into documents (name, markdown_file_id, created_by) -- Change to an update, because the docuement should exist from when the original file was uploaded
      values (new.path_tokens[2], new.id, new.owner)
      returning id into document_id;

    select
      net.http_post(
        url := supabase_url() || '/functions/v1/process',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'document_id', document_id
        )
      )
    into result;
  ELSEIF new.bucket_id = 'original_files' THEN
    insert into documents (name, original_file_id, created_by)
      values (new.path_tokens[2], new.id, new.owner)
      returning id into document_id;
  END IF;
  return null;
end;
$$;

create trigger on_file_upload
  after insert on storage.objects
  for each row
  execute procedure private.handle_storage_update();

  -- Create another trigger for updating markddown docuemts
