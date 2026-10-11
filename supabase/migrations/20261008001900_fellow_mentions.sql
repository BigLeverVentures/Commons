ALTER TABLE public.posts ADD COLUMN description_mentions jsonb NOT NULL DEFAULT '[]',ADD COLUMN outcome_mentions jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.responses ADD COLUMN note_mentions jsonb NOT NULL DEFAULT '[]';
CREATE FUNCTION public.valid_fellow_mentions(body text,refs jsonb,prior jsonb,max_count int) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; identity public.fellow_identities; last_end int:=0; first_pos int; end_pos int; historical boolean;
BEGIN
 IF refs IS NULL OR jsonb_typeof(refs)<>'array' OR octet_length(refs::text)>8192 THEN RETURN false; END IF;
 IF jsonb_array_length(refs)>max_count THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(refs) LOOP
  IF jsonb_typeof(item)<>'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(item))<>4 OR NOT item ?& ARRAY['fellow_id','start','end','label_snapshot'] OR jsonb_typeof(item->'fellow_id')<>'string' OR jsonb_typeof(item->'label_snapshot')<>'string' OR jsonb_typeof(item->'start')<>'number' OR jsonb_typeof(item->'end')<>'number' THEN RETURN false; END IF;
  IF item->>'fellow_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR item->>'start' !~ '^[0-9]+$' OR item->>'end' !~ '^[0-9]+$' THEN RETURN false; END IF;
  first_pos:=(item->>'start')::int;end_pos:=(item->>'end')::int;
  IF first_pos<last_end OR end_pos<=first_pos OR end_pos>length(coalesce(body,'')) OR length(item->>'label_snapshot')>101 OR substring(coalesce(body,'') FROM first_pos+1 FOR end_pos-first_pos)<>item->>'label_snapshot' THEN RETURN false; END IF;
  SELECT * INTO identity FROM public.fellow_identities WHERE id=(item->>'fellow_id')::uuid;
  historical:=EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(prior,'[]')) old_item WHERE old_item->>'fellow_id'=item->>'fellow_id' AND old_item->>'label_snapshot'=item->>'label_snapshot');
  IF identity.id IS NULL OR (NOT historical AND (NOT identity.active OR item->>'label_snapshot'<>'@'||identity.display_name)) THEN RETURN false; END IF;
  last_end:=end_pos;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION public.retained_fellow_mentions(body text,refs jsonb) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(item ORDER BY position),'[]'::jsonb) FROM jsonb_array_elements(refs) WITH ORDINALITY entries(item,position)
 WHERE substring(coalesce(body,'') FROM (item->>'start')::int+1 FOR (item->>'end')::int-(item->>'start')::int)=item->>'label_snapshot';
$$;
CREATE FUNCTION public.validate_post_mentions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior_description jsonb:='[]';prior_outcome jsonb:='[]';
BEGIN
 NEW.description:=replace(replace(NEW.description,E'\r\n',E'\n'),E'\r',E'\n');
 NEW.outcome_summary:=replace(replace(NEW.outcome_summary,E'\r\n',E'\n'),E'\r',E'\n');
 IF TG_OP='UPDATE' THEN
  prior_description:=OLD.description_mentions;prior_outcome:=OLD.outcome_mentions;
  IF NEW.description IS DISTINCT FROM OLD.description AND NEW.description_mentions=OLD.description_mentions THEN NEW.description_mentions:=public.retained_fellow_mentions(NEW.description,OLD.description_mentions); END IF;
  IF NEW.outcome_summary IS DISTINCT FROM OLD.outcome_summary AND NEW.outcome_mentions=OLD.outcome_mentions THEN NEW.outcome_mentions:=public.retained_fellow_mentions(NEW.outcome_summary,OLD.outcome_mentions); END IF;
 END IF;
 IF NOT public.valid_fellow_mentions(NEW.description,NEW.description_mentions,prior_description,25) OR NOT public.valid_fellow_mentions(NEW.outcome_summary,NEW.outcome_mentions,prior_outcome,25) THEN RAISE EXCEPTION 'Invalid fellow mentions'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.validate_response_mentions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior jsonb:='[]';
BEGIN
 NEW.note:=replace(replace(NEW.note,E'\r\n',E'\n'),E'\r',E'\n');
 IF TG_OP='UPDATE' THEN
  prior:=OLD.note_mentions;
  IF NEW.note IS DISTINCT FROM OLD.note AND NEW.note_mentions=OLD.note_mentions THEN NEW.note_mentions:=public.retained_fellow_mentions(NEW.note,OLD.note_mentions); END IF;
 END IF;
 IF NOT public.valid_fellow_mentions(NEW.note,NEW.note_mentions,prior,10) THEN RAISE EXCEPTION 'Invalid fellow mentions'; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.valid_fellow_mentions(text,jsonb,jsonb,int),public.retained_fellow_mentions(text,jsonb),public.validate_post_mentions(),public.validate_response_mentions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_post_mentions BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_post_mentions();
CREATE TRIGGER validate_response_mentions BEFORE INSERT OR UPDATE ON public.responses FOR EACH ROW EXECUTE FUNCTION public.validate_response_mentions();
CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier=true) AS
 SELECT p.id,p.type,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key,p.collaborator_credits,p.description_mentions,p.outcome_mentions
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier=true) AS
 SELECT p.id,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key,p.collaborator_credits,p.description_mentions,p.outcome_mentions
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id WHERE p.type='project';

