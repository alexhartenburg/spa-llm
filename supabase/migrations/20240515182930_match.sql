create or replace function match_document_sections(
  embedding vector(384),
  match_threshold float,
  selected_contexts text[]
)
returns setof document_sections
language plpgsql
as $$
#variable_conflict use_variable
begin
  return query
  select document_sections.*
  from document_sections
  join documents on document_sections.document_id = documents.id
  where documents.context_buckets && document and document_sections.embedding <#> embedding < -match_threshold
	order by document_sections.embedding <#> embedding;
end;
$$;