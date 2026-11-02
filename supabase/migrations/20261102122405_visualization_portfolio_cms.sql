CREATE TABLE public.visualization_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
 location text NOT NULL DEFAULT '' CHECK(length(location)<=200),
 project_year integer CHECK(project_year BETWEEN 1900 AND 2100),
 category text NOT NULL DEFAULT 'Exterior' CHECK(category IN ('Exterior','Interior','Landscape','Urbanism','Other')),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=4000),
 credits text NOT NULL DEFAULT '' CHECK(length(credits)<=500),
 images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(images)='array' AND jsonb_array_length(images)<=30),
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT published OR jsonb_array_length(images)>0)
);
ALTER TABLE public.visualization_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visualization_projects FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.visualization_projects TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.visualization_projects TO authenticated;
GRANT ALL ON public.visualization_projects TO service_role;
CREATE POLICY visualization_published_read ON public.visualization_projects FOR SELECT TO anon,authenticated USING(published);
CREATE POLICY visualization_admin_manage ON public.visualization_projects FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin=true))
 WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin=true));
CREATE INDEX visualization_published_order_idx ON public.visualization_projects(created_at DESC,id) WHERE published;

-- Portfolio imagery is intended for public display; metadata stays unpublished
-- until every image has uploaded. Only administrators can write or list assets.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('visualization-portfolio','visualization-portfolio',true,6291456,ARRAY['image/webp','image/jpeg'])
ON CONFLICT(id) DO NOTHING;
CREATE POLICY visualization_storage_admin_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='visualization-portfolio' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin=true));
CREATE POLICY visualization_storage_admin_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='visualization-portfolio' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin=true));
CREATE POLICY visualization_storage_admin_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='visualization-portfolio' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin=true));

CREATE FUNCTION public.validate_visualization_images() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE image jsonb;
BEGIN
 FOR image IN SELECT value FROM jsonb_array_elements(NEW.images) LOOP
  IF coalesce(image->>'full','') !~ ('^'||NEW.id::text||'/[a-f0-9-]+-full\.(webp|jpg)$')
   OR coalesce(image->>'thumb','') !~ ('^'||NEW.id::text||'/[a-f0-9-]+-thumb\.(webp|jpg)$')
   OR length(coalesce(image->>'alt','')) NOT BETWEEN 1 AND 300
   OR length(coalesce(image->>'caption',''))>300
   OR coalesce((image->>'width')::integer,0) NOT BETWEEN 1 AND 2560
   OR coalesce((image->>'height')::integer,0) NOT BETWEEN 1 AND 2560
  THEN RAISE EXCEPTION 'Invalid portfolio image metadata'; END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_visualization_images() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_visualization_images BEFORE INSERT OR UPDATE ON public.visualization_projects
FOR EACH ROW EXECUTE FUNCTION public.validate_visualization_images();
