ALTER TABLE public.posts ADD COLUMN collaborator_credits jsonb;
CREATE FUNCTION public.validate_collaborator_credits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; identity public.fellow_identities; name text; names text[]:=ARRAY[]::text[]; ids text[]:=ARRAY[]::text[]; plain_names text[]:=ARRAY[]::text[]; prior jsonb:='[]'::jsonb; historical boolean;
BEGIN
 IF TG_OP='UPDATE' THEN
  prior:=coalesce(OLD.collaborator_credits,'[]'::jsonb);
  -- An older client changing the legacy array intentionally creates plain credits.
  IF NEW.collaborator_credits IS NOT DISTINCT FROM OLD.collaborator_credits AND NEW.collaborators IS DISTINCT FROM OLD.collaborators THEN
   SELECT coalesce(jsonb_agg(jsonb_build_object('kind','text','name',entry)),'[]'::jsonb) INTO NEW.collaborator_credits FROM unnest(NEW.collaborators) entry;
  END IF;
 END IF;
 IF NEW.collaborator_credits IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.collaborator_credits)<>'array' OR octet_length(NEW.collaborator_credits::text)>8192 THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
 IF jsonb_array_length(NEW.collaborator_credits)>20 THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.collaborator_credits) LOOP
  IF jsonb_typeof(item)<>'object' THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
  IF item->>'kind'='fellow' THEN
   IF (SELECT count(*) FROM jsonb_object_keys(item))<>3 OR jsonb_typeof(item->'name_snapshot')<>'string' OR jsonb_typeof(item->'fellow_id')<>'string' OR item->>'fellow_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
   SELECT * INTO identity FROM public.fellow_identities WHERE id=(item->>'fellow_id')::uuid;
   historical:=EXISTS(SELECT 1 FROM jsonb_array_elements(prior) old_item WHERE old_item->>'kind'='fellow' AND old_item->>'fellow_id'=item->>'fellow_id' AND old_item->>'name_snapshot'=item->>'name_snapshot');
   IF identity.id IS NULL OR (NOT historical AND (NOT identity.active OR identity.display_name<>item->>'name_snapshot')) OR lower(item->>'fellow_id')=ANY(ids) THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
   ids:=array_append(ids,lower(item->>'fellow_id'));name:=item->>'name_snapshot';
  ELSIF item->>'kind'='text' THEN
   IF (SELECT count(*) FROM jsonb_object_keys(item))<>2 OR jsonb_typeof(item->'name')<>'string' THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
   name:=item->>'name';IF lower(name)=ANY(plain_names) THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;plain_names:=array_append(plain_names,lower(name));
  ELSE RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
  IF name IS NULL OR length(btrim(name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid collaborator credits'; END IF;
  names:=array_append(names,name);
 END LOOP;
 NEW.collaborators:=names;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_collaborator_credits() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_collaborator_credits BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_collaborator_credits();
CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier=true) AS
 SELECT p.id,p.type,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key,p.collaborator_credits
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier=true) AS
 SELECT p.id,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key,p.collaborator_credits
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id WHERE p.type='project';

