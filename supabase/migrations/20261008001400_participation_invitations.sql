ALTER TABLE public.posts ADD COLUMN participation jsonb, ADD COLUMN sharing jsonb,
 ADD COLUMN participation_published_at timestamptz, ADD COLUMN sharing_published_at timestamptz,
 ADD COLUMN confirmed_at timestamptz;
CREATE FUNCTION public.valid_post_invitation(value jsonb, sharing boolean) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE key text; max_length integer;
BEGIN
 IF value IS NULL THEN RETURN true; END IF;
 IF jsonb_typeof(value) IS DISTINCT FROM 'object' OR octet_length(value::text)>3000
   OR jsonb_typeof(value->'text') IS DISTINCT FROM 'string' OR char_length(btrim(value->>'text')) NOT BETWEEN 1 AND 160 THEN RETURN false; END IF;
 IF NOT sharing AND (jsonb_typeof(value->'kind') IS DISTINCT FROM 'string' OR (value->>'kind') NOT IN ('feedback','introduction','testing','mentoring','collaboration','offer','other')) THEN RETURN false; END IF;
 FOREACH key IN ARRAY CASE WHEN sharing THEN ARRAY['audience','message'] ELSE ARRAY['commitment','deadline'] END LOOP
   max_length := CASE WHEN key='message' THEN 500 WHEN key='audience' THEN 160 WHEN key='commitment' THEN 80 ELSE 10 END;
   IF value ? key AND value->key <> 'null'::jsonb AND (jsonb_typeof(value->key) IS DISTINCT FROM 'string' OR char_length(value->>key)>max_length) THEN RETURN false; END IF;
 END LOOP;
 IF NOT sharing AND value->>'deadline' IS NOT NULL THEN
   IF (value->>'deadline') !~ '^\d{4}-\d{2}-\d{2}$' OR to_char((value->>'deadline')::date,'YYYY-MM-DD') <> value->>'deadline' THEN RETURN false; END IF;
 END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;
ALTER TABLE public.posts ADD CONSTRAINT valid_participation CHECK(public.valid_post_invitation(participation,false)),
 ADD CONSTRAINT valid_sharing CHECK(public.valid_post_invitation(sharing,true));
CREATE FUNCTION public.stamp_invitations() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   NEW.participation_published_at := CASE WHEN NEW.participation IS NOT NULL THEN now() ELSE NULL END;
   NEW.sharing_published_at := CASE WHEN NEW.sharing IS NOT NULL THEN now() ELSE NULL END;
   NEW.confirmed_at := NULL;
 ELSE
   NEW.participation_published_at := COALESCE(OLD.participation_published_at,CASE WHEN NEW.participation IS NOT NULL THEN now() ELSE NULL END);
   NEW.sharing_published_at := COALESCE(OLD.sharing_published_at,CASE WHEN NEW.sharing IS NOT NULL THEN now() ELSE NULL END);
   IF NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at THEN NEW.confirmed_at := now(); END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER stamp_invitations BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.stamp_invitations();
CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier=true) AS
 SELECT p.id,p.type,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier=true) AS
 SELECT p.id,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id WHERE p.type='project';

-- Public opportunity rows are derived from safe post projections, not private notes.
CREATE VIEW public.invitation_rows WITH (security_barrier=true) AS
 SELECT p.*, invitation.kind AS invitation_kind, invitation.published_at AS invitation_published_at,
 CASE WHEN p.topic IN ('planet','enterprise','learning','care','technology','open') THEN p.topic ELSE CASE
   WHEN ARRAY(SELECT lower(tag) FROM unnest(p.tags) tag) && ARRAY['climate','ecology','restoration','regeneration','food','planet'] THEN 'planet'
   WHEN ARRAY(SELECT lower(tag) FROM unnest(p.tags) tag) && ARRAY['enterprise','funding','founders','investment','mentorship'] THEN 'enterprise'
   WHEN ARRAY(SELECT lower(tag) FROM unnest(p.tags) tag) && ARRAY['learning','education','community','introductions','connection'] THEN 'learning'
   WHEN ARRAY(SELECT lower(tag) FROM unnest(p.tags) tag) && ARRAY['health','care','wellbeing','design','inclusion'] THEN 'care'
   WHEN ARRAY(SELECT lower(tag) FROM unnest(p.tags) tag) && ARRAY['technology','software','ai','hardware','data'] THEN 'technology' ELSE 'open' END END AS resolved_topic
 FROM public.public_posts p CROSS JOIN LATERAL (
   SELECT 'participation'::text AS kind, COALESCE(p.participation_published_at,p.created_at) AS published_at
   WHERE p.status='open' AND p.participation IS NOT NULL
     AND (p.participation->>'deadline' IS NULL OR (p.participation->>'deadline')::date >= (now() AT TIME ZONE 'UTC')::date)
   UNION ALL SELECT 'legacy',p.created_at WHERE p.status='open' AND p.participation IS NULL AND p.type IN ('ask','offer')
   UNION ALL SELECT 'sharing',COALESCE(p.sharing_published_at,p.created_at) WHERE p.sharing IS NOT NULL
 ) invitation;
CREATE VIEW public.invitation_candidates WITH (security_barrier=true) AS
 SELECT i.*,row_number() OVER (PARTITION BY author_key ORDER BY invitation_published_at DESC,id,invitation_kind) AS author_rank FROM public.invitation_rows i;
REVOKE ALL ON public.invitation_rows,public.invitation_candidates FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.invitation_rows,public.invitation_candidates TO anon,authenticated,service_role;
