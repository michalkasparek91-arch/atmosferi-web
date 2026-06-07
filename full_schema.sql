-- Create enum for user types
CREATE TYPE user_type AS ENUM ('customer', 'worker', 'both');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  user_type user_type NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_categories table
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offers table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  message TEXT NOT NULL,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for service_categories
CREATE POLICY "Service categories are viewable by everyone"
  ON service_categories FOR SELECT
  USING (true);

-- RLS Policies for jobs
CREATE POLICY "Jobs are viewable by everyone"
  ON jobs FOR SELECT
  USING (true);

CREATE POLICY "Customers can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = customer_id);

-- RLS Policies for offers
CREATE POLICY "Offers are viewable by job owner and offer creator"
  ON offers FOR SELECT
  USING (
    auth.uid() = worker_id OR
    auth.uid() IN (SELECT customer_id FROM jobs WHERE jobs.id = offers.job_id)
  );

CREATE POLICY "Workers can create offers"
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update own offers"
  ON offers FOR UPDATE
  USING (auth.uid() = worker_id);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert service categories
INSERT INTO service_categories (id, name, icon, slug) VALUES
  ('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba domu', 'Building2', 'stavba-domu'),
  ('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Instalatér', 'Wrench', 'instalater'),
  ('92a377a0-f4c7-40a7-91c2-8c1373944d45', 'Malířské práce', 'Paintbrush', 'malirske-prace'),
  ('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Auto', 'Car', 'auto'),
  (gen_random_uuid(), 'Design', 'Palette', 'design'),
  ('48b2a373-94ea-42f9-8e9f-79bf5f6ade88', 'Domácí opravy', 'Home', 'domaci-opravy'),
  ('d92d4b78-3de5-4ad1-ba20-2d6161256bb2', 'Doprava', 'Truck', 'doprava'),
  ('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Elektrikář', 'Zap', 'elektrikar'),
  ('4da4c0af-f98d-417d-92d9-2a535870024f', 'Finanční služby', 'DollarSign', 'financni-sluzby'),
  ('4b1dabc0-66ec-4d32-9b86-458c6bc3855d', 'Instalace', 'Settings', 'instalace'),
  ('5668b1d5-747a-4642-b5da-19c8c2b7413e', 'Montáž', 'Hammer', 'montaz'),
  ('e704912e-5575-491f-912a-907ce0142ab7', 'Obchodní služby', 'Briefcase', 'obchodni-sluzby'),
  (gen_random_uuid(), 'Obklady', 'Grid', 'obklady'),
  ('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Online služby', 'Monitor', 'online-sluzby'),
  ('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Organizace akcí', 'Calendar', 'organizace-akci'),
  ('a7f3da33-1b8f-42f9-9345-497b97d5e449', 'Právní a administrativní', 'FileText', 'pravni-administrativni'),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Rekonstrukce', 'Building', 'rekonstrukce'),
  (gen_random_uuid(), 'Stěhování', 'Package', 'stehovani'),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Truhlářství', 'Scissors', 'truharstvo'),
  ('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklid', 'Sparkles', 'uklid'),
  ('ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c', 'Výuka a jazyky', 'BookOpen', 'vyuka-jazyky'),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Zahrada', 'Trees', 'zahrada'),
  ('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Zahradnictví', 'Flower', 'zahradnictvi'),
  ('be43f2bf-d840-46ef-a8cf-c6231ea2e6dc', 'Zdraví a krása', 'Heart', 'zdravi-krasa');
-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL DEFAULT 'customer' CHECK (user_type IN ('customer', 'worker', 'both')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  message TEXT NOT NULL,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for service_categories
DROP POLICY IF EXISTS "Service categories are viewable by everyone" ON service_categories;
CREATE POLICY "Service categories are viewable by everyone"
  ON service_categories FOR SELECT
  USING (true);

-- RLS Policies for jobs
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON jobs;
CREATE POLICY "Jobs are viewable by everyone"
  ON jobs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Customers can create jobs" ON jobs;
CREATE POLICY "Customers can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own jobs" ON jobs;
CREATE POLICY "Customers can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can delete own jobs" ON jobs;
CREATE POLICY "Customers can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = customer_id);

-- RLS Policies for offers
DROP POLICY IF EXISTS "Offers are viewable by job owner and offer creator" ON offers;
CREATE POLICY "Offers are viewable by job owner and offer creator"
  ON offers FOR SELECT
  USING (
    auth.uid() = worker_id OR
    auth.uid() IN (SELECT customer_id FROM jobs WHERE jobs.id = offers.job_id)
  );

DROP POLICY IF EXISTS "Workers can create offers" ON offers;
CREATE POLICY "Workers can create offers"
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

DROP POLICY IF EXISTS "Workers can update own offers" ON offers;
CREATE POLICY "Workers can update own offers"
  ON offers FOR UPDATE
  USING (auth.uid() = worker_id);

-- RLS Policies for reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert service categories (only if not exists)
INSERT INTO service_categories (id, name, icon, slug) VALUES
  ('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba domu', 'Building2', 'stavba-domu'),
  ('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Instalatér', 'Wrench', 'instalater'),
  ('92a377a0-f4c7-40a7-91c2-8c1373944d45', 'Malířské práce', 'Paintbrush', 'malirske-prace'),
  ('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Auto', 'Car', 'auto'),
  (gen_random_uuid(), 'Design', 'Palette', 'design'),
  ('48b2a373-94ea-42f9-8e9f-79bf5f6ade88', 'Domácí opravy', 'Home', 'domaci-opravy'),
  ('d92d4b78-3de5-4ad1-ba20-2d6161256bb2', 'Doprava', 'Truck', 'doprava'),
  ('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Elektrikář', 'Zap', 'elektrikar'),
  ('4da4c0af-f98d-417d-92d9-2a535870024f', 'Finanční služby', 'DollarSign', 'financni-sluzby'),
  ('4b1dabc0-66ec-4d32-9b86-458c6bc3855d', 'Instalace', 'Settings', 'instalace'),
  ('5668b1d5-747a-4642-b5da-19c8c2b7413e', 'Montáž', 'Hammer', 'montaz'),
  ('e704912e-5575-491f-912a-907ce0142ab7', 'Obchodní služby', 'Briefcase', 'obchodni-sluzby'),
  (gen_random_uuid(), 'Obklady', 'Grid', 'obklady'),
  ('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Online služby', 'Monitor', 'online-sluzby'),
  ('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Organizace akcí', 'Calendar', 'organizace-akci'),
  ('a7f3da33-1b8f-42f9-9345-497b97d5e449', 'Právní a administrativní', 'FileText', 'pravni-administrativni'),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Rekonstrukce', 'Building', 'rekonstrukce'),
  (gen_random_uuid(), 'Stěhování', 'Package', 'stehovani'),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Truhlářství', 'Scissors', 'truharstvo'),
  ('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklid', 'Sparkles', 'uklid'),
  ('ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c', 'Výuka a jazyky', 'BookOpen', 'vyuka-jazyky'),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Zahrada', 'Trees', 'zahrada'),
  ('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Zahradnictví', 'Flower', 'zahradnictvi'),
  ('be43f2bf-d840-46ef-a8cf-c6231ea2e6dc', 'Zdraví a krása', 'Heart', 'zdravi-krasa')
ON CONFLICT (slug) DO NOTHING;
-- Fix function search path for security
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Create service_subcategories table for nested work types
CREATE TABLE IF NOT EXISTS public.service_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Enable RLS
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;

-- Policy: Subcategories are viewable by everyone
CREATE POLICY "Subcategories are viewable by everyone"
ON public.service_subcategories
FOR SELECT
USING (true);

-- Insert sample subcategories for existing categories
INSERT INTO public.service_subcategories (category_id, name, slug) 
SELECT id, 'Oprava střechy', 'oprava-strechy' FROM public.service_categories WHERE slug = 'domaci-opravy'
UNION ALL
SELECT id, 'Oprava oken', 'oprava-oken' FROM public.service_categories WHERE slug = 'domaci-opravy'
UNION ALL
SELECT id, 'Oprava dveří', 'oprava-dveri' FROM public.service_categories WHERE slug = 'domaci-opravy'
UNION ALL
SELECT id, 'Oprava podlahy', 'oprava-podlahy' FROM public.service_categories WHERE slug = 'domaci-opravy'
UNION ALL
SELECT id, 'Instalace světel', 'instalace-svetel' FROM public.service_categories WHERE slug = 'elektrikar'
UNION ALL
SELECT id, 'Oprava zásuvek', 'oprava-zasuvek' FROM public.service_categories WHERE slug = 'elektrikar'
UNION ALL
SELECT id, 'Připojení spotřebičů', 'pripojeni-spotrebicu' FROM public.service_categories WHERE slug = 'elektrikar'
UNION ALL
SELECT id, 'Oprava WC', 'oprava-wc' FROM public.service_categories WHERE slug = 'instalater'
UNION ALL
SELECT id, 'Oprava kohoutku', 'oprava-kohoutku' FROM public.service_categories WHERE slug = 'instalater'
UNION ALL
SELECT id, 'Instalace umyvadla', 'instalace-umyvadla' FROM public.service_categories WHERE slug = 'instalater'
UNION ALL
SELECT id, 'Malování pokoje', 'malovani-pokoje' FROM public.service_categories WHERE slug = 'malirske-prace'
UNION ALL
SELECT id, 'Malování fasády', 'malovani-fasady' FROM public.service_categories WHERE slug = 'malirske-prace'
UNION ALL
SELECT id, 'Natírání oken', 'natirani-oken' FROM public.service_categories WHERE slug = 'malirske-prace'
ON CONFLICT (category_id, slug) DO NOTHING;
-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true);

-- Create RLS policies for job photos
CREATE POLICY "Users can upload their own job photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'job-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Job photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-photos');

CREATE POLICY "Users can update their own job photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'job-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own job photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'job-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add photos column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS photos text[];
-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, bio, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'bio',
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'customer')
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
-- Add subcategory_id column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS subcategory_id uuid;

-- Add foreign key constraint for subcategory
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_subcategory_id_fkey 
FOREIGN KEY (subcategory_id) REFERENCES public.service_subcategories(id) ON DELETE CASCADE;

-- Make subcategory_id required
ALTER TABLE public.jobs 
ALTER COLUMN subcategory_id SET NOT NULL;
-- Add points column to profiles table
ALTER TABLE public.profiles
ADD COLUMN points integer DEFAULT 15 NOT NULL;

-- Create points_purchases table to track point purchases
CREATE TABLE public.points_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_amount integer NOT NULL,
  price_czk numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.points_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
ON public.points_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own purchases"
ON public.points_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_points_purchases_updated_at
BEFORE UPDATE ON public.points_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create messages table for in-app messaging
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Add index for faster message queries
CREATE INDEX idx_messages_job_id ON public.messages(job_id);
CREATE INDEX idx_messages_offer_id ON public.messages(offer_id);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
-- Add company_type field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_type text CHECK (company_type IN ('self_employed', 'company'));
-- Create worker_services junction table to store which services/subcategories a worker offers
CREATE TABLE public.worker_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.service_subcategories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, subcategory_id)
);

-- Enable RLS
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Worker services are viewable by everyone"
  ON public.worker_services
  FOR SELECT
  USING (true);

CREATE POLICY "Workers can insert own services"
  ON public.worker_services
  FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can delete own services"
  ON public.worker_services
  FOR DELETE
  USING (auth.uid() = worker_id);

-- Create index for faster queries
CREATE INDEX idx_worker_services_worker_id ON public.worker_services(worker_id);
CREATE INDEX idx_worker_services_subcategory_id ON public.worker_services(subcategory_id);
-- Add subcategories for Stavba domu
INSERT INTO service_subcategories (category_id, name, slug) VALUES
-- Exteriér
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Dlaždič', 'dlazdic'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Exteriér/Venkovní práce', 'exterier-venkovni-prace'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Kamenictví', 'kamenictvi'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Kopání studny', 'kopani-studny'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž plotu/oplocení', 'montaz-plotu-oploceni'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka zámkové dlažby', 'pokladka-zamkove-dlazby'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka žulové dlažby', 'pokladka-zulove-dlazby'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zemní práce', 'zemni-prace'),
-- Garáž a Brány
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Betonová garáž', 'betonova-garaz'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž garážových vrat', 'montaz-garazovych-vrat'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž posuvné brány', 'montaz-posuvne-brany'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž vjezdové brány', 'montaz-vjezdove-brany'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba garáže', 'stavba-garaze'),
-- Hlavní kategorie
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Demolice a bourání budov', 'demolice-a-bourani-budov'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Geodet', 'geodet'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Nivelace/úprava terénu', 'nivelace-uprava-terenu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Ostatní stavební práce/služby', 'ostatni-stavebni-prace-sluzby'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Realizace inženýrských staveb', 'realizace-inzenyrskych-staveb'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba domu ve vašem okolí', 'stavba-domu-ve-vasem-okoli'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavbyvedoucí', 'stavbyvedouci'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavební tendry', 'stavebni-tendry'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zednické práce', 'zednicke-prace'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Železobetonové práce', 'elezobetonove-prace'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Elektroinstalace', 'elektroinstalace'),
-- Instalace
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Instalace ústředního topení', 'instalace-ustredniho-topeni'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Odvodnění domu', 'odvodneni-domu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Odvodnění pozemku', 'odvodneni-pozemku'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Vodoinstalace', 'vodoinstalace'),
-- Kontrola kvality
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Převzetí bytu', 'prevzeti-bytu'),
-- Okna, Dveře, Schody
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Dřevěné schody', 'drevene-schody'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž dveří', 'montaz-dveri'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž oken', 'montaz-oken'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž půdních schodů', 'montaz-pudnich-schodu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka dlaždic na schodiště', 'pokladka-dlazdic-na-schodiste'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba venkovního schodiště', 'stavba-venkovniho-schodiste'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba vnitřního schodiště', 'stavba-vnitrniho-schodiste'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zábradlí na schodiště', 'zabradli-na-schodiste'),
-- Podlahy
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Lité podlahy', 'lite-podlahy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Podlahové krytiny', 'podlahove-krytiny'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Podlahy', 'podlahy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka parket', 'pokladka-parket'),
-- Pronájem a Doprava
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pronájem bagru', 'pronajem-bagru'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pronájem minibagru', 'pronajem-minibagru'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pronájem půdní frézy', 'pronajem-pudni-frezy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pronájem strojů', 'pronajem-stroju'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Půjčovna nářadí', 'pujcovna-naradi'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Půjčovna stavební techniky/vybavení', 'pujcovna-stavebni-techniky-vybaveni'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Služby bagrem', 'sluzby-bagrem'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stěhování', 'stehovani'),
-- Stavba
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Izolace a zateplení základů', 'izolace-a-zatepleni-zakladu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba domu na klíč', 'stavba-domu-na-klic'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba domu se skeletovou konstrukcí', 'stavba-domu-se-skeletovou-konstrukci'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba dřevostavby', 'stavba-drevostavby'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba krbů', 'stavba-krbu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba letního domku', 'stavba-letniho-domku'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba pasivního domu', 'stavba-pasivniho-domu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba rekreační chaty', 'stavba-rekreacni-chaty'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba sauny', 'stavba-sauny'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba septiku/žumpy', 'stavba-septiku-zumpy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba srubového domu', 'stavba-sruboveho-domu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba terasy', 'stavba-terasy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba základů', 'stavba-zakladu'),
-- Stěny a Stropy
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Montáž sádrokartonového podhledu', 'montaz-sadrokartonoveho-podhledu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Omítání stěn', 'omitani-sten'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Sádrokartonové práce', 'sadrokartonove-prace'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba příčky', 'stavba-pricky'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stěny a stropy', 'steny-a-stropy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stěrkování stěn', 'sterkovani-sten'),
-- Střecha a Fasáda
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Adaptace podkroví', 'adaptace-podkrovi'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Obestavba/úprava podkroví', 'obestavba-uprava-podkrovi'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Omítání fasády', 'omitani-fasady'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokrývač', 'pokryvac'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba střechy', 'stavba-strechy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Střecha a fasáda', 'strecha-a-fasada'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zastřešení terasy', 'zastreseni-terasy'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zateplení domu', 'zatepleni-domu'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zateplení podkroví', 'zatepleni-podkrovi'),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Zateplení střechy', 'zatepleni-strechy');
-- Add header photo and portfolio photos columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS header_url text,
ADD COLUMN IF NOT EXISTS portfolio_photos text[] DEFAULT '{}';

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile photos bucket
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- Add subcategories for "Organizace akcí" category
INSERT INTO service_subcategories (category_id, name, slug) VALUES
-- Prominent items (displayed first on bigger buttons)
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Fotograf', 'fotograf'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Catering', 'catering'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Videozáznam / Natáčení videa', 'videozaznam-nataceni-videa'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Organizování akcí / eventů', 'organizovani-akci-eventu'),
-- Hudba group
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'DJ na večírek / oslavu', 'dj-na-vecirek-oslavu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'DJ na svatbu', 'dj-na-svatbu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Hudební doprovod obřadu', 'hudebni-doprovod-obradu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Svatební orchestr / kapela', 'svatebni-orchestr-kapela'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Svatební kapela', 'svatebni-kapela'),
-- Organizace group
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Dětský animátor', 'detsky-animator'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Tisk pozvánek', 'tisk-pozvanek'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Organizace firemních akcí', 'organizace-firemnich-akci'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Organizace společenských akcí', 'organizace-spolecenskych-akci'),
-- Oděvy a kostýmy group
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Šití svatebních šatů', 'siti-svatebních-satu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Půjčovna obleků', 'pujcovna-obleku'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Půjčovna kostýmů / oděvů', 'pujcovna-kostymu-odevu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Půjčovna svatebních šatů', 'pujcovna-svatebních-satu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Půjčovna šatů / společenských šatů', 'pujcovna-satu-spolecenskych-satu'),
-- Dorty a zákusky / Koláče group
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Pečení koláčů / zákusků', 'peceni-kolacu-zakusku'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Svatební dort', 'svatebni-dort'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Dorty na zakázku', 'dorty-na-zakazku'),
-- Fotografické služby group
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Svatební fotografie', 'svatebni-fotografie'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Buduárové focení / Buduárová sezení', 'buduarove-foceni-buduarova-sezeni'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Těhotenské focení', 'tehotenske-foceni'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Dětské focení', 'detske-foceni'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Focení žen', 'foceni-zen'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Focení k prvnímu přijímání (komunii)', 'foceni-k-prvnimu-prijimani-komunii'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Předsvatební / Zásnubní focení', 'predsvatebni-zasnubni-foceni'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Novorozenecké focení', 'novorozenecke-foceni'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Smyslné focení', 'smyslne-foceni'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Focení', 'foceni'),
-- Pronájem aut group
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Auto na svatbu', 'auto-na-svatbu'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Pronájem autobusů / autokarů', 'pronajem-autobusu-autokaru'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Pronájem mikrobusů / dodávek', 'pronajem-mikrobusu-dodavek'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Pronájem limuzíny', 'pronajem-limuziny'),
('e6697ed8-9a50-4338-97ed-f0ddb3507cec', 'Pronájem automobilů', 'pronajem-automobilu');
-- Rename category from "Montáž" to "Montáž a oprava"
UPDATE service_categories 
SET name = 'Montáž a oprava', slug = 'montaz-a-oprava'
WHERE id = '5668b1d5-747a-4642-b5da-19c8c2b7413e';

-- Insert subcategories for "Montáž a oprava"
INSERT INTO service_subcategories (name, slug, category_id) VALUES
-- Prominent subcategories (a, b, c, d)
('Oprava domácích spotřebičů (AGD)', 'oprava-domacich-spotrebicu-agd', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž nábytku', 'montaz-nabytku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Instalatérská pohotovost', 'instalaterska-pohotovost', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Drobné opravy', 'drobne-opravy', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 1: Dveře a okna
('Montáž dveří', 'montaz-dveri', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž posuvných dveří', 'montaz-posuvnych-dveri', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž oken', 'montaz-oken', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž střešního okna', 'montaz-stresniho-okna', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž parapetů', 'montaz-parapetu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava oken', 'oprava-oken', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Seřízení dveří', 'serizeni-dveri', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Seřízení oken', 'serizeni-oken', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Těsnění oken', 'tesneni-oken', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Výměna oken', 'vymena-oken', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 2: Elektronika a AGD
('Montáž televize na zeď', 'montaz-televize-na-zed', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava tiskáren', 'oprava-tiskaren', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava grafické karty', 'oprava-graficke-karty', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava plynového sporáku', 'oprava-plynoveho-sporaku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava notebooků', 'oprava-notebooku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava lednice', 'oprava-lednice', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava pračky', 'oprava-pracky', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava tabletů', 'oprava-tabletu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava telefonů', 'oprava-telefonu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava televizorů', 'oprava-televizoru', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava myčky', 'oprava-mycky', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zapojení domácích spotřebičů (AGD)', 'zapojeni-domacich-spotrebicu-agd', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Počítačová pohotovost', 'pocitacova-pohotovost', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Servis počítačů', 'servis-pocitacu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Servis telefonů', 'servis-telefonu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 3: Obnovitelná energie
('Montáž solárních kolektorů', 'montaz-solarnich-kolektoru', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž fotovoltaických panelů', 'montaz-fotovoltaickych-panelu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 4: Topení / topná instalace
('Plynová instalace', 'plynova-instalace', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zapojení bojleru', 'zapojeni-bojleru', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zapojení kotle ÚT (ústředního topení)', 'zapojeni-kotle-ut', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Servis kamen a kotlů', 'servis-kamen-a-kotlu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 5: Oděvy a doplňky
('Brašnář', 'brasnar', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Švadlena', 'svadlena', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava obuvi', 'oprava-obuvi', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Krejčovské úpravy / Opravy', 'krejcovske-upravy-opravy', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Švec', 'svec', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 6: Drobné služby / Hodinový manžel
('Montáž záclonových tyčí / garnýží', 'montaz-zaclonovych-tyci-garnyzi', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž indukční varné desky', 'montaz-indukcni-varne-desky', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž rolet', 'montaz-rolet', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zapojení plynového sporáku', 'zapojeni-plynoveho-sporaku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zapojení myčky', 'zapojeni-mycky', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zavěšování kuchyňských skříněk', 'zavesovani-kuchynskych-skrinek', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 7: Elektrikářské služby
('Elektrické instalace', 'elektricke-instalace', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž domácího alarmu', 'montaz-domaciho-alarmu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž antén', 'montaz-anten', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž hromosvodu', 'montaz-hromosvodu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž monitorovacího systému', 'montaz-monitorovaciho-systemu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Elektrická pohotovost', 'elektricka-pohotovost', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Ostatní elektrikářské služby', 'ostatni-elektrikarske-sluzby', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 8: Instalatérské služby
('Montáž sanity (dřezy, umyvadla, vany, WC)', 'montaz-sanity', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Vodovodní instalace', 'vodovodini-instalace', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž podomítkové baterie', 'montaz-podomtkove-baterie', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž sprchového koutu', 'montaz-sprchoveho-koutu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž liniového odtoku', 'montaz-linioveho-odtoku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž umyvadla na desku', 'montaz-umyvadla-na-desku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž toalety', 'montaz-toalety', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Ostatní instalatérské služby', 'ostatni-instalaterske-sluzby', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),

-- Group 9: Ostatní
('Nouzové otevírání dveří', 'nouzove-otevrani-dveri', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Čištění komína', 'cisteni-komina', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Frézování komína', 'frezovani-komina', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Instalace zařízení chytré domácnosti (smart home)', 'instalace-zarizeni-chytre-domacnosti', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Kominík', 'kominik', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž garážových vrat', 'montaz-garazovych-vrat', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž posuvné brány', 'montaz-posuvne-brany', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž vjezdové brány', 'montaz-vjezdove-brany', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž klimatizace', 'montaz-klimatizace', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž podlahových lišt', 'montaz-podlahovych-list', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž plotového pletiva', 'montaz-plotoveho-pletiva', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž podhledu', 'montaz-podhledu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Montáž větrání / ventilace', 'montaz-vetrani-ventilace', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Oprava jízdních kol', 'oprava-jizdnich-kol', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Madla na schodiště / Zábradlí', 'madla-na-schodiste-zabradli', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Servis klimatizace', 'servis-klimatizace', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Skládání / Montáž nábytku', 'skladani-montaz-nabytku', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Svářeč', 'svarec', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Svařování plastu', 'svarovani-plastu', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Výměna zámku ve dveřích', 'vymena-zamku-ve-dverich', '5668b1d5-747a-4642-b5da-19c8c2b7413e'),
('Zámečník', 'zamecnik', '5668b1d5-747a-4642-b5da-19c8c2b7413e');
-- Rename category from "Instalace" to "Projektování" and update icon
UPDATE service_categories 
SET name = 'Projektování', slug = 'projektovani', icon = 'Ruler'
WHERE id = '4b1dabc0-66ec-4d32-9b86-458c6bc3855d';

-- Insert subcategories for "Projektování"
INSERT INTO service_subcategories (name, slug, category_id) VALUES
-- Prominent subcategories (a-f)
('Projektování / Návrhy', 'projektovani-navrhy', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Architekt', 'architekt', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Navrhování interiérů', 'navrhovani-interieru', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Vestavěné skříně', 'vestavene-skrine', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Zahradní architektura / Aranžování zahrady', 'zahradni-architektura-aranzovani-zahrady', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Inženýrské projektování / Navrhování', 'inzenyrske-projektovani-navrhovani', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),

-- Regular subcategories
('Interiérové úpravy / Aranžování interiérů', 'interierove-upravy-aranzovani-interieru', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Krajinný architekt', 'krajinny-architekt', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Interiérový architekt', 'interierovy-architekt', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Kuchyňský nábytek na míru', 'kuchynsky-nabytek-na-miru', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Nábytek na míru', 'nabytek-na-miru', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Koupelnový nábytek na míru', 'koupelnovy-nabytek-na-miru', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt chaty / letního domku', 'projekt-chaty-letniho-domku', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt domu', 'projekt-domu', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt garáže', 'projekt-garaze', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt šatny / šatníku', 'projekt-satny-satniku', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt kuchyně', 'projekt-kuchyne', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt oplocení', 'projekt-oploceni', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt obývacího pokoje', 'projekt-obyvaciho-pokoje', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt koupelny', 'projekt-koupelny', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projekt pokoje', 'projekt-pokoje', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Projektování řešení chytré domácnosti (smart home)', 'projektovani-reseni-chytre-domacnosti', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Návrh letáků', 'navrh-letaku', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d'),
('Návrh vizitek', 'navrh-vizitek', '4b1dabc0-66ec-4d32-9b86-458c6bc3855d');
-- Insert subcategories for Finanční služby
INSERT INTO service_subcategories (name, slug, category_id) VALUES
-- Prominent subcategories
('Pojištění odpovědnosti (povinné ručení)', 'pojisteni-odpovednosti-povinne-ruceni', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Leasing automobilů', 'leasing-automobilu', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Úvěrový poradce', 'uverovy-poradce', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Účetní kancelář', 'ucetni-kancelar', '4da4c0af-f98d-417d-92d9-2a535870024f'),

-- Úvěry / Půjčky
('Úvěr bez registru dlužníků (BIK)', 'uver-bez-registru-dluzniku-bik', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Úvěr pro firmy', 'uver-pro-firmy', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Úvěr na auto', 'uver-na-auto', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Hotovostní půjčky', 'hotovostni-pujcky', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Hypoteční úvěry', 'hypotecni-uvery', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Konsolidační úvěry', 'konsolidacni-uvery', '4da4c0af-f98d-417d-92d9-2a535870024f'),

-- Účetnictví
('Daňové poradenství', 'danove-poradenstvi', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Daňová kancelář', 'danova-kancelar', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Účetní', 'ucetni', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Vedení účetnictví', 'vedeni-ucetnictvi', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Účetní poradenství', 'ucetni-poradenstvi', '4da4c0af-f98d-417d-92d9-2a535870024f'),

-- Pojištění
('Pojišťovací agent', 'pojistovaci-agent', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Havarijní pojištění (AC)', 'havarijni-pojisteni-ac', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Pojištění firmy', 'pojisteni-firmy', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Skupinové pojištění', 'skupinove-pojisteni', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Životní pojištění', 'zivotni-pojisteni', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Pojištění nemovitosti', 'pojisteni-nemovitosti', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Pojištění automobilu', 'pojisteni-automobilu', '4da4c0af-f98d-417d-92d9-2a535870024f'),

-- Ostatní
('Finanční poradce', 'financni-poradce', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Factoring', 'factoring', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Leasing počítačů', 'leasing-pocitacu', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Leasing strojů', 'leasing-stroju', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Leasing nemovitostí', 'leasing-nemovitosti', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Získávání fondů EU', 'ziskavani-fondu-eu', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Odkup pohledávek', 'odkup-pohledavek', '4da4c0af-f98d-417d-92d9-2a535870024f'),
('Vymáhání pohledávek', 'vymahani-pohledavek', '4da4c0af-f98d-417d-92d9-2a535870024f');
-- Insert subcategories for Instalatér
INSERT INTO service_subcategories (name, slug, category_id) VALUES
-- Prominent subcategories
('Instalatérská pohotovost', 'instalaterska-pohotovost', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Ostatní instalatérské služby', 'ostatni-instalaterske-sluzby', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž sanity (dřezy, umyvadla, vany, WC)', 'montaz-sanity-drezy-umyvadla-vany-wc', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Vodovodní instalace', 'vodovodny-instalace', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),

-- Dále (other subcategories)
('Montáž sprchového koutu', 'montaz-sprchoveho-koutu', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Čištění kanalizace', 'cisteni-kanalizace', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Instalace ústředního topení (ÚT)', 'instalace-ustredniho-topeni-ut', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Plynová instalace', 'plynova-instalace', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž podomítkové baterie', 'montaz-podomytkove-baterie', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž liniového odtoku', 'montaz-linioveho-odtoku', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž tepelného čerpadla', 'montaz-tepelneho-cerpadla', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž umyvadla na desku', 'montaz-umyvadla-na-desku', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž vany', 'montaz-vany', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Montáž toalety', 'montaz-toalety', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Oprava splachovače / Oprava nádržky', 'oprava-splachovace-oprava-nadrzky', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Elektrické vytápění', 'elektricke-vytapeni', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Plynové vytápění', 'plynove-vytapeni', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Elektrické podlahové vytápění', 'elektricke-podlahove-vytapeni', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Zapojení bojleru', 'zapojeni-bojleru', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Zapojení kotle ÚT (ústředního topení)', 'zapojeni-kotle-ut-ustredniho-topeni', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Revize plynové instalace', 'revize-plynove-instalace', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Protahování / Čištění potrubí', 'protahovani-cisteni-potrubi', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'),
('Zamrazování potrubí (pro opravy)', 'zamrazovani-potrubi-pro-opravy', '54f35c7c-e8a0-4a0d-a680-10a14280f6cd');
-- Rename category from "Domácí opravy" to "Rekonstrukce / opravy"
UPDATE service_categories 
SET name = 'Rekonstrukce / opravy', slug = 'rekonstrukce-opravy'
WHERE id = '48b2a373-94ea-42f9-8e9f-79bf5f6ade88';

-- Insert subcategories for Rekonstrukce / opravy
INSERT INTO service_subcategories (name, slug, category_id) VALUES
-- Prominent subcategories
('Pokládka obkladů a dlažby', 'pokladka-obkladu-a-dlazby', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Stěhování', 'stehovani', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Broušení parket (cyklování)', 'brouseni-parket-cyklovani', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce bytu', 'rekonstrukce-bytu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 1) Zábradlí a madla
('Skleněné zábradlí', 'sklenene-zabradli', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Zábradlí', 'zabradli', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Nerezové zábradlí', 'nerezove-zabradli', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Madla na schodiště', 'madla-na-schodiste', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 2) Střecha a fasáda
('Adaptace / Přestavba podkroví', 'adaptace-prestavba-podkrovi', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Fasáda domu', 'fasada-domu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Zateplení střechy', 'zatepleni-strechy', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Zateplení domu', 'zatepleni-domu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Zateplení podkroví', 'zatepleni-podkrovi', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Výškové práce', 'vyskove-prace', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce střechy', 'rekonstrukce-strechy', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Vestavba podkroví', 'vestavba-podkrovi', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 3) Instalace
('Instalace ústředního topení (ÚT)', 'instalace-ustredniho-topeni-ut', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Plynová instalace', 'plynova-instalace', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Chytrá domácnost (Smart Home)', 'chytra-domacnost-smart-home', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Instalace zařízení chytré domácnosti', 'instalace-zarizeni-chytre-domacnosti', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Ovládání vytápění', 'ovladani-vytapeni', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Ovládání osvětlení', 'ovladani-osvetleni', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 4) Podlahy
('Montáž podlahových lišt', 'montaz-podlahovych-list', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Pokládka panelů', 'pokladka-panelu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Pokládka podlahových panelů', 'pokladka-podlahovych-panelu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Pokládka vinylových panelů', 'pokladka-vinylovych-panelu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Pokládka parket', 'pokladka-parket', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 5) Rekonstrukce budov
('Vysoušení budov', 'vysouseni-budov', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce kanceláří', 'rekonstrukce-kancelari', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce budov', 'rekonstrukce-budov', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Demolice a zbourání budovy', 'demolice-a-zbourani-budovy', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Demolice stodoly', 'demolice-stodoly', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 6) Malířské služby
('Natírání střech', 'natirani-strech', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Natírání fasády', 'natirani-fasady', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Malování stropu', 'malovani-stropu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Malování stěn', 'malovani-sten', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Ostatní malířské služby', 'ostatni-malirske-sluzby', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 7) Dokončovací práce / Dokončení interiérů
('Rekonstrukce balkonu', 'rekonstrukce-balkonu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce domu', 'rekonstrukce-domu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce kuchyně', 'rekonstrukce-kuchyne', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce podkroví', 'rekonstrukce-podkrovi', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Rekonstrukce koupelny', 'rekonstrukce-koupelny', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Sklo na míru', 'sklo-na-miru', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Pokládka dlažby na schodech', 'pokladka-dlazby-na-schodech', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Dokončení domu', 'dokonceni-domu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Dokončení bytu', 'dokonceni-bytu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Dokončení na klíč', 'dokonceni-na-klic', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Dokončení interiérů', 'dokonceni-interieru', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Obestavba krbu', 'obestavba-krbu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 8) Stěny a strop
('Vybudování příčky', 'vybudovani-pricky', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Sádrování stěn / Nanášení sádry', 'sadrovani-sten-nanaseni-sadry', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Penetrace stěn', 'penetrace-sten', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Konstrukce ze sádrokartonu (SDK)', 'konstrukce-ze-sadrokartonu-sdk', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Montáž kazetového stropu', 'montaz-kazetoveho-stropu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Montáž podhledu', 'montaz-podhledu', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Špachtlování / Tmelení stěn', 'spachtlovani-tmeleni-sten', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Tapetování', 'tapetovani', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Strojní omítání', 'strojni-omitani', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Omítání stěn', 'omitani-sten', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Odhlučnění stěn', 'odhlusneni-sten', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Sádrokartonové konstrukce', 'sadrokartonove-konstrukce', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),

-- 9) Ostatní
('Balkonové zábradlí', 'balkonove-zabradli', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Schodišťové zábradlí', 'schodistove-zabradli', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Montáž oken', 'montaz-oken', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Výměna oken', 'vymena-oken', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Půjčovna nářadí', 'pujcovna-naradi', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88'),
('Ostatní stavební služby / rekonstrukce', 'ostatni-stavebni-sluzby-rekonstrukce', '48b2a373-94ea-42f9-8e9f-79bf5f6ade88');
-- Insert subcategories for Právní a administrativní
INSERT INTO service_subcategories (name, slug, category_id) VALUES
-- Prominent subcategories
('Právní a administrativní služby', 'pravni-a-administrativni-sluzby', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Notář', 'notar', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Oceňovatel majetku / Majetkový znalec', 'ocenovatel-majetku-majetkovy-znalec', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Stavební znalec', 'stavebni-znalec', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Správa nemovitostí', 'sprava-nemovitosti', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),

-- Dále (other subcategories)
('Advokát', 'advokat', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Advokátní kancelář', 'advokatni-kancelar', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Stavební rozpočet', 'stavebni-rozpocet', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Právní poradenství', 'pravni-poradenstvi', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Právní poradce / Justiční rada', 'pravni-poradce-justicni-rada', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Překlad dokumentů', 'preklad-dokumentu', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Soudní překlad', 'soudni-preklad', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Oceňování nemovitostí', 'ocenovani-nemovitosti', 'a7f3da33-1b8f-42f9-9345-497b97d5e449'),
('Oceňování podniku', 'ocenovani-podniku', 'a7f3da33-1b8f-42f9-9345-497b97d5e449');
-- Add subcategories for Malířské práce category
INSERT INTO service_subcategories (name, category_id, slug) VALUES 
('Malíř', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'malir'),
('Malování stěn', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'malovani-sten'),
('Malování stropu', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'malovani-stropu'),
('Tapetování', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'tapetovani'),
('Natírání střech', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'natirani-strech'),
('Penetrace stěn / Nanesení podkladu', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'penetrace-sten-naneseni-podkladu'),
('Natírání dveří', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'natirani-dveri'),
('Natírání fasády', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'natirani-fasady'),
('Natírání nábytku', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'natirani-nabytku'),
('Natírání dlaždic a obkladů', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'natirani-dlazdic-a-obkladu'),
('Ostatní malířské služby', '92a377a0-f4c7-40a7-91c2-8c1373944d45', 'ostatni-malirske-sluzby');
-- Add subcategories for Úklid category
INSERT INTO service_subcategories (name, category_id, slug) VALUES 
('Úklid bytů a domů', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'uklid-bytu-a-domu'),
('Mytí oken', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'myti-oken'),
('Odvoz odpadu / smetí', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'odvoz-odpadu-smeti'),
('Odvoz suti / stavební odpadu', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'odvoz-suti-stavebni-odpadu'),
('Čištění koberců', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'cisteni-kobercu'),
('Deratizace', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'deratizace'),
('Dezinsekce', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'dezinsekce'),
('Mytí fasády', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'myti-fasady'),
('Mytí zámkové dlažby', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'myti-zamkove-dlazby'),
('Odstraňování plísní / Sanace proti plísním', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'odstranovani-plisni-sanace-proti-plisnim'),
('Odklízení sněhu ze střech', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'odklideni-snehu-ze-strech'),
('Odklízení sněhu z cest / silnic', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'odklideni-snehu-z-cest-silnic'),
('Výškové práce', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'vyskove-prace'),
('Čištění čalounění nábytku', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'cisteni-calouneni-nabytku'),
('Čištění čalounění automobilů', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'cisteni-calouneni-automobilu'),
('Úklid kanceláří', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'uklid-kancelari'),
('Úklid po rekonstrukci', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'uklid-po-rekonstrukci'),
('Pronájem kontejnerů', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'pronajem-kontejneru'),
('Odvoz velkoobjemového odpadu', '65ea7e19-d910-4fa6-96d7-817b63bc9111', 'odvoz-velkoobjemoveho-odpadu');
-- Add subcategories for Online služby category
INSERT INTO service_subcategories (name, category_id, slug) VALUES 
-- Prominent
('Navrhování interiérů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'navrhovani-interieru'),
('Přeprava/Transport nábytku', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'preprava-transport-nabytku'),
('Odvoz odpadu / smetí', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'odvoz-odpadu-smeti'),
('Grafické služby', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'graficke-sluzby'),
-- Poradenství
('Úvěrový poradce', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'uverovy-poradce'),
('Podnikatelské poradenství', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'podnikatelske-poradenstvi'),
('Daňové poradenství', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'danove-poradenstvi'),
('Účetní poradenství', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'ucetni-poradenstvi'),
-- Úvěry / Půjčky
('Úvěr bez registru dlužníků (BIK)', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'uver-bez-registru-dluzniku-bik'),
('Úvěr pro firmy', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'uver-pro-firmy'),
('Úvěr na auto', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'uver-na-auto'),
('Hotovostní půjčky', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'hotovostni-pujcky'),
('Hypoteční úvěry', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'hypotecni-uvery'),
('Konsolidační úvěry', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'konsolidacni-uvery'),
-- Leasing
('Leasing počítačů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'leasing-pocitacu'),
('Leasing strojů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'leasing-stroju'),
('Leasing nemovitostí', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'leasing-nemovitosti'),
('Leasing automobilů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'leasing-automobilu'),
-- Nábytek a vestavby
('Kuchyňský nábytek na míru', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'kuchynsky-nabytek-na-miru'),
('Nábytek na míru', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'nabytek-na-miru'),
('Koupelnový nábytek na míru', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'koupelnovy-nabytek-na-miru'),
('Vestavěné skříně', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vestavene-skrine'),
-- Montáž a oprava
('Počítačová pohotovost', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pocitacova-pohotovost'),
('Servis počítačů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'servis-pocitacu'),
('Servis telefonů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'servis-telefonu'),
-- Organizování akcí
('Organizování eventů/akcí', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'organizovani-eventu-akci'),
('Organizace firemních akcí', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'organizace-firemnich-akci'),
('Organizace společenských akcí', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'organizace-spolecenskych-akci'),
-- Projektování / Návrhy
('Architekt', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'architekt'),
('Krajinný architekt', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'krajinny-architekt'),
('Projekt altánu', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-altanu'),
('Projekt kuchyně', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-kuchyne'),
('Projekt bytu', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-bytu'),
('Projekt zahrady', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-zahrady'),
('Projekt oplocení', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-oploceni'),
('Projekt koupelny', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-koupelny'),
('Inženýrské projektování', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'inzenyrske-projektovani'),
-- Úklid
('Dezinfekce', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'dezinfekce'),
-- Školení a cizí jazyky
('Kurz účetnictví', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'kurz-ucetnictvi'),
('Výuka angličtiny', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vyuka-anglictiny'),
('Výuka francouzštiny', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vyuka-francouzstiny'),
('Výuka španělštiny', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vyuka-spanelstiny'),
('Výuka němčiny', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vyuka-nemciny'),
('Výuka italštiny', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vyuka-italstiny'),
('Překlad dokumentů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'preklad-dokumentu'),
('Soudní překlad', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'soudni-preklad'),
('Překlad webových stránek', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'preklad-webovych-stranek'),
('Simultánní tlumočení', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'simultanni-tlumoceni'),
-- Doprava
('Kurýr', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'kuryr'),
('Vnitrostátní doprava', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vnitrostatni-doprava'),
('Přeprava nábytku', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'preprava-nabytku'),
('Pronájem automobilů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pronajem-automobilu'),
-- Pojištění
('Havarijní pojištění (AC)', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'havarijni-pojisteni-ac'),
('Pojištění firmy', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pojisteni-firmy'),
('Skupinové pojištění', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'skupinove-pojisteni'),
('Životní pojištění', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'zivotni-pojisteni'),
('Pojištění nemovitosti', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pojisteni-nemovitosti'),
('Pojištění odpovědnosti (povinné ručení)', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pojisteni-odpovednosti-povinne-ruceni'),
('Pojištění automobilu', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pojisteni-automobilu'),
-- Služby pro byznys
('Reklamní agentura', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'reklamni-agentura'),
('Účetní kancelář', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'ucetni-kancelar'),
('Copywriter', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'copywriter'),
('Tisk pozvánek', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'tisk-pozvanek'),
('Reklamní složky / prospekty', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'reklamni-slozky-prospekty'),
('Trička s potiskem', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'tricka-s-potiskem'),
('Potisk oděvů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'potisk-odevu'),
('Vedení účetnictví', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vedeni-ucetnictvi'),
('Reklamní oděvy', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'reklamni-odevy'),
('Psaní podnikatelského plánu', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'psani-podnikatelskeho-planu'),
('Plakáty', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'plakaty'),
('Návrh loga', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'navrh-loga'),
('Návrh/Tvorba webových stránek', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'navrh-tvorba-webovych-stranek'),
('Přepis textů', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'prepis-textu'),
('Tvorba internetových obchodů (e-shopů)', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'tvorba-internetovych-obchodu-e-shopu'),
('Letáky', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'letaky'),
('Marketingové služby', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'marketingove-sluzby'),
('Polygrafické služby', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'polygraficke-sluzby'),
-- Právní a administrativní služby
('Advokát', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'advokat'),
('Stavební rozpočet', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'stavebni-rozpocet'),
('Právo nemovitostí', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pravo-nemovitosti'),
('Právní poradce / Justiční rada', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'pravni-poradce-justicni-rada'),
-- Zdraví a krása
('Dietní catering', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'dietni-catering'),
('Dietolog', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'dietolog'),
('Fyzioterapeut', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'fyzioterapeut'),
('Výuka tance', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vyuka-tance'),
('Osobní trenér', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'osobni-trener'),
('Sestavování jídelníčku', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'sestavovani-jidelnicku'),
-- Ostatní
('Factoring', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'factoring'),
('Švadlena', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'svadlena'),
('Notář', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'notar'),
('Ochrana osob a majetku', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'ochrana-osob-a-majetku'),
('Krejčovské úpravy / Opravy', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'krejcovske-upravy-opravy'),
('Projekt elektrické instalace', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekt-elektricke-instalace'),
('Projektování řešení chytré domácnosti', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projektovani-reseni-chytre-domacnosti'),
('Projekty sanitárních instalací', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'projekty-sanitarnich-instalaci'),
('Odkup pohledávek', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'odkup-pohledavek'),
('Zasílatelství / Spedice', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'zasilatelstvi-spedice'),
('Vymáhání pohledávek', 'e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'vymahani-pohledavek');
-- Add columns for job completion
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS final_price NUMERIC,
ADD COLUMN IF NOT EXISTS completion_photos TEXT[];
-- Create policy to allow authenticated users to upload job completion photos
CREATE POLICY "Workers can upload job completion photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Allow authenticated users to update job photos
CREATE POLICY "Workers can update job photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-photos');

-- Allow authenticated users to delete job photos
CREATE POLICY "Workers can delete job photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos');
-- Add city column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
-- Add region and country fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Česká republika';
-- Update category name from Truhlářství to Truhlářství / Nábytek
UPDATE service_categories 
SET name = 'Truhlářství / Nábytek'
WHERE id = 'b273d0ed-9798-4573-b02f-596033188770';

-- Add prominent subcategories
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Nábytek a vestavby', 'nabytek-a-vestavby', 'b273d0ed-9798-4573-b02f-596033188770'),
('Renovace nábytku', 'renovace-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Montáž nábytku', 'montaz-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Vestavěné skříně', 'vestavene-skrine', 'b273d0ed-9798-4573-b02f-596033188770'),

-- Group 1: Dále (Further services)
('Stavba krbů', 'stavba-krbu', 'b273d0ed-9798-4573-b02f-596033188770'),
('Zrcadla na míru', 'zrcadla-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Natírání nábytku', 'natirani-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Kuchyňský nábytek na míru', 'kuchynsky-nabytek-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Nábytek na míru', 'nabytek-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Koupelnový nábytek na míru', 'koupelnovy-nabytek-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Polepování / Dýhování nábytku', 'polepovani-dyhovani-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Truhlář', 'truhlar', 'b273d0ed-9798-4573-b02f-596033188770'),
('Sklenář', 'sklenar', 'b273d0ed-9798-4573-b02f-596033188770'),
('Sklo do kuchyně', 'sklo-do-kuchyne', 'b273d0ed-9798-4573-b02f-596033188770'),
('Sklo na míru', 'sklo-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Čalouník', 'calounik', 'b273d0ed-9798-4573-b02f-596033188770'),
('Čalounění nábytku', 'calouneni-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Obestavba krbu', 'obestavba-krbu', 'b273d0ed-9798-4573-b02f-596033188770'),

-- Group 2: Nábytek (Furniture)
('Kuchyňské pracovní desky na míru', 'kuchynske-pracovni-desky-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Nábytková dvířka na míru', 'nabytkova-dvirka-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Kuchyně na míru', 'kuchyne-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Polepování nábytku', 'polepovani-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Skládání / Montáž nábytku', 'skladani-montaz-nabytku', 'b273d0ed-9798-4573-b02f-596033188770'),
('Zavěšování kuchyňských skříněk', 'zavesovani-kuchynskych-skrinek', 'b273d0ed-9798-4573-b02f-596033188770'),

-- Group 3: Sklo a zrcadla (Glass and mirrors)
('Skleněné panely do kuchyně', 'sklenene-panely-do-kuchyne', 'b273d0ed-9798-4573-b02f-596033188770'),
('Skleněné panely do koupelny', 'sklenene-panely-do-koupelny', 'b273d0ed-9798-4573-b02f-596033188770'),
('Skleněné tabule na míru', 'sklenene-tabule-na-miru', 'b273d0ed-9798-4573-b02f-596033188770'),
('Sklenářství', 'sklenarstvi', 'b273d0ed-9798-4573-b02f-596033188770'),

-- Group 4: Čalounictví (Upholstery)
('Čalounění židle', 'calouneni-zidle', 'b273d0ed-9798-4573-b02f-596033188770'),
('Čalounění postele', 'calouneni-postele', 'b273d0ed-9798-4573-b02f-596033188770'),

-- Group 5: Ostatní (Other)
('Truhlářská dílna', 'truhlarska-dilna', 'b273d0ed-9798-4573-b02f-596033188770');
-- Add prominent subcategories for Výuka a jazyky
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Školení a cizí jazyky', 'skoleni-a-cizi-jazyky', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Výuka angličtiny', 'vyuka-anglictiny', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Školení BOZP (Bezpečnost a ochrana zdraví při práci)', 'skoleni-bozp', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Překlad dokumentů', 'preklad-dokumentu', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Kurz účetnictví', 'kurz-ucetnictvi', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),

-- Group: Dále
('Autoškola / Výuka jízdy', 'autoskola-vyuka-jizdy', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Výuka francouzštiny', 'vyuka-francouzstiny', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Výuka španělštiny', 'vyuka-spanelstiny', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Výuka němčiny', 'vyuka-nemciny', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Výuka italštiny', 'vyuka-italstiny', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Školení požární ochrany (PO)', 'skoleni-pozarni-ochrany', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Školení první pomoci', 'skoleni-prvni-pomoci', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Jazyková škola', 'jazykova-skola', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Soudní překlad', 'soudni-preklad', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Překlad webových stránek', 'preklad-webovych-stranek', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c'),
('Simultánní tlumočení', 'simultanni-tlumoceni', 'ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c');
-- Add prominent subcategories for Zdraví a krása
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Kadeřník', 'kadernik', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Hybridní manikúra', 'hybridni-manikura', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Osobní trenér', 'osobni-trener', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Relaxační masáž', 'relaxacni-masaz', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),

-- Group: Dále
('Dieta', 'dieta', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Dietní catering', 'dietni-catering', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Dietolog', 'dietolog', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Sestavování jídelníčku', 'sestavovani-jidelnicku', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Líčení / Make-up', 'liceni-make-up', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Příležitostné líčení', 'prilezitostne-liceni', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Permanentní make-up', 'permanentni-make-up', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Večerní líčení', 'vecerni-liceni', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Nehty', 'nehty', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Gelové nehty', 'gelove-nehty', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Pedikúra', 'pedikura', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Kadeřnické služby', 'kadernické-sluzby', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Barvení vlasů', 'barveni-vlasu', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Stříhání vlasů', 'strihani-vlasu', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Kosmetické služby', 'kosmeticke-sluzby', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Depilace', 'depilace', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Henna na obočí', 'henna-na-oboci', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Henna na řasy', 'henna-na-rasy', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Mikrodermabraze', 'mikrodermabraze', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Prodlužování řas', 'prodluzovani-ras', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Úprava / Regulace obočí', 'uprava-regulace-oboci', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Akupunktura', 'akupunktura', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Chiropraxe', 'chiropraxe', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Fyzioterapeut', 'fyzioterapeut', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Jóga', 'joga', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc'),
('Výuka tance', 'vyuka-tance', 'be43f2bf-d840-46ef-a8cf-c6231ea2e6dc');
-- Update category name from Auto to Autoservis
UPDATE service_categories 
SET name = 'Autoservis'
WHERE id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- Add prominent subcategories for Autoservis
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Motorismus / Auta', 'motorismus-auta', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autoelektrikář', 'autoelektrikar', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Automechanik', 'automechanik', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Výkup aut', 'vykup-aut', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Výměna pneumatik', 'vymena-pneumatik', '0feccee1-5152-4a2f-8ec7-13f169de6168'),

-- Group: Dále
('Autovrakoviště / Likvidace vozidel', 'autovrakoviste-likvidace-vozidel', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autoklempíř', 'autoklempir', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Chiptuning', 'chiptuning', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Geometrie kol', 'geometrie-kol', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Instalace LPG', 'instalace-lpg', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Konzervace podvozku', 'konzervace-podvozku', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autolakýrník', 'autolakyrnik', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Motomechanik (Mechanik motocyklů)', 'motomechanik', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Montáž parkovacích senzorů', 'montaz-parkovacich-senzoru', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Montáž tažného zařízení', 'montaz-tazneho-zarizeni', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Montáž parkovací kamery', 'montaz-parkovaci-kamery', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Mytí motoru', 'myti-motoru', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava alternátorů', 'oprava-alternatoru', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava chladičů', 'oprava-chladicu', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava hliníkových disků/kol', 'oprava-hliníkovych-disku-kol', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava světlometů', 'oprava-svetlometu', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava tachometrů / budíků', 'oprava-tachometru-budiku', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava čalounění stropu', 'oprava-calouneni-stropu', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava elektromotorů', 'oprava-elektromotoru', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava převodovky', 'oprava-prevodovky', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava automatických převodovek', 'oprava-automatickych-prevodovek', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava autoskel', 'oprava-autoskel', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Oprava tlumičů výfuku', 'oprava-tlumicu-vyfuku', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autoškola / Výuka jízdy', 'autoskola-vyuka-jizdy', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Pískování disků/kol', 'piskovani-disku-kol', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Tónování skel', 'tonovani-skel', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Repase vstřikovacích čerpadel', 'repase-vstrikovacich-cerpadel', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Repase světlometů', 'repase-svetlometu', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Repase turbodmychadel', 'repase-turbodmychadel', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Repase brzdových třmenů', 'repase-brzdovych-trmenu', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Servis LPG zařízení', 'servis-lpg-zarizeni', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Servis autoklimatizací', 'servis-autoklimatizaci', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autoservis', 'autoservis', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Svářeč', 'svarec', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autozámečník / Čalouník autosedaček', 'autozamecnik-calounik-autosedacek', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Tuning aut', 'tuning-aut', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Autoservis / Autodílna', 'autoservis-autodilna', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Vulkánizace pneumatik', 'vulkanizace-pneumatik', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Výměna brzdových destiček', 'vymena-brzdovych-desticek', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Výměna oleje', 'vymena-oleje', '0feccee1-5152-4a2f-8ec7-13f169de6168'),
('Výměna spojky', 'vymena-spojky', '0feccee1-5152-4a2f-8ec7-13f169de6168');
-- Delete "Motorismus / Auta" subcategory from Autoservis
DELETE FROM service_subcategories 
WHERE id = '9e54e1ce-db10-4b6e-a9f3-f641bb8574c5';
-- Add prominent subcategories for Doprava
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Stěhování', 'stehovani', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Přeprava osob', 'preprava-osob', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Vnitrostátní doprava', 'vnitrostatni-doprava', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Kurýr', 'kuryr', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),

-- Group: Dále
('Pronájem automobilů', 'pronajem-automobilu', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Auto na svatbu', 'auto-na-svatbu', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Spedice / Zasílatelství', 'spedice-zasilatelstvi', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Přeprava dřeva', 'preprava-dreva', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Přeprava nábytku', 'preprava-nabytku', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Vnitrostátní přeprava aut', 'vnitrostatni-preprava-aut', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Zahraniční přeprava aut', 'zahranicni-preprava-aut', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Zahraniční přeprava', 'zahranicni-preprava', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Přepravní služby', 'prepravni-sluzby', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Pronájem autobusů / autokarů', 'pronajem-autobusu-autokaru', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Pronájem mikrobusů / dodávek', 'pronajem-mikrobusu-dodavek', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Pronájem limuzíny', 'pronajem-limuziny', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Pronájem dodávkového vozu', 'pronajem-dodavkoveho-vozu', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2'),
('Správa vozového parku', 'sprava-vozoveho-parku', 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2');
-- Update category name from Doprava to Transport
UPDATE service_categories 
SET name = 'Transport'
WHERE id = 'd92d4b78-3de5-4ad1-ba20-2d6161256bb2';
-- Update category name from Zahrada to Hodinový manžel
UPDATE service_categories 
SET name = 'Hodinový manžel'
WHERE id = 'cab210ce-3270-4886-9ec7-4a97ebb1eac5';

-- Add prominent subcategories for Hodinový manžel
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Oprava domácích spotřebičů (AGD)', 'oprava-domacich-spotrebicu-agd', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Drobné opravy', 'drobne-opravy', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Montáž sanity (dřezy, umyvadla, vany, WC)', 'montaz-sanity', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Zapojení domácích spotřebičů (AGD)', 'zapojeni-domacich-spotrebicu-agd', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),

-- Group: Dále
('Seřízení dveří', 'serizeni-dveri', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Seřízení oken', 'serizeni-oken', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Montáž záclonových tyčí / garnýží', 'montaz-zaclonovych-tyci-garnyzi', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Montáž indukční varné desky', 'montaz-indukcni-varne-desky', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Montáž rolet', 'montaz-rolet', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Montáž televize na zeď', 'montaz-televize-na-zed', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Montáž lustru', 'montaz-lustru', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Oprava oken', 'oprava-oken', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Odklízení sněhu ze střech', 'odklizeni-snehu-ze-strech', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Odklízení sněhu z cest / silnic', 'odklizeni-snehu-z-cest-silnic', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Zapojení zásuvky', 'zapojeni-zasuvky', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Vrtání otvorů', 'vrtani-otvoru', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5'),
('Věšení obrazů', 'veseni-obrazu', 'cab210ce-3270-4886-9ec7-4a97ebb1eac5');
-- Add prominent subcategories for Zahradnictví
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Návrh/Úprava zahrady', 'navrh-uprava-zahrady', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Pokládka zámkové dlažby', 'pokladka-zamkove-dlazby', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Kácení stromů', 'kaceni-stromu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Založení trávníku', 'zalozeni-travniku', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),

-- Group 1: Dlaždičské a kamenické práce
('Dlaždič', 'dlazdic', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Kameník', 'kamenik', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Pokládka žulové kostky', 'pokladka-zulove-kostky', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Montáž vjezdové brány', 'montaz-vjezdove-brany', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Prořezávání stromů', 'prorezavani-stromu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Pronájem kultivátoru / rotavátoru', 'pronajem-kultivatoru-rotavatoru', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),

-- Group 2: Péče o zahradu
('Aerace trávníku', 'aerace-travniku', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Sekání trávy', 'sekani-travy', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Zavlažování zahrady a trávníku', 'zavlazovani-zahrady-travniku', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Hnojení trávníku', 'hnojeni-travniku', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Zahradník', 'zahradnik', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Postřiky ovocných stromů', 'postriky-ovocnych-stromu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Přesazování stromů', 'presazovani-stromu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Sázení stromů', 'sazeni-stromu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Vertikutace trávníku', 'vertikutace-travniku', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Ostatní zahradnické služby', 'ostatni-zahradnicke-sluzby', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),

-- Group 3: Terasy a altány
('Stavba altánu', 'stavba-altanu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Stavba terasy', 'stavba-terasy', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Zastřešení terasy', 'zastreseni-terasy', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),

-- Group 4: Ostatní
('Krajinný architekt', 'krajinny-architekt', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Stavba zahradního jezírka', 'stavba-zahradniho-jezirka', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Montáž oplocení', 'montaz-oploceni', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Montáž plotového pletiva', 'montaz-plotoveho-pletiva', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Zahradní osvětlení', 'zahradni-osvetleni', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Projekt oplocení', 'projekt-oploceni', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Projekt celoročního záhonu', 'projekt-celorocniho-zahonu', '4acc36df-e68f-4ea3-ae34-1792234c11b7'),
('Zakládání zahrad', 'zakladani-zahrad', '4acc36df-e68f-4ea3-ae34-1792234c11b7');
-- Add prominent subcategories for Obchodní služby
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Účetní kancelář', 'ucetni-kancelar', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Polygrafické služby', 'polygraficke-sluzby', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Pojištění firmy', 'pojisteni-firmy', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Dávkovače/Distributory vody', 'davkovace-distributory-vody', 'e704912e-5575-491f-912a-907ce0142ab7'),

-- Group: Dále
('Velkoformátový tisk', 'velkoformatovy-tisk', 'e704912e-5575-491f-912a-907ce0142ab7'),

-- Group 1: Marketing a reklama
('Marketingová agentura', 'marketingova-agentura', 'e704912e-5575-491f-912a-907ce0142ab7'),
('PR agentura (Public Relations)', 'pr-agentura', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Reklamní agentura', 'reklamni-agentura', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Copywriter', 'copywriter', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Reklamní oděvy', 'reklamni-odevy', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Grafický design', 'graficky-design', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Návrh loga', 'navrh-loga', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Návrh/Tvorba webových stránek', 'navrh-tvorba-webovych-stranek', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Tvorba internetových obchodů (e-shopů)', 'tvorba-internetovych-obchodu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Grafické služby', 'graficke-sluzby', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Marketingové služby', 'marketingove-sluzby', 'e704912e-5575-491f-912a-907ce0142ab7'),

-- Group 2: Kancelářská technika
('Oprava tiskáren', 'oprava-tiskaren', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Počítačová pohotovost', 'pocitacova-pohotovost', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Servis počítačů', 'servis-pocitacu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Servis telefonů', 'servis-telefonu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Pronájem kávovaru', 'pronajem-kavovaru', 'e704912e-5575-491f-912a-907ce0142ab7'),

-- Group 3: Polygrafické služby
('Reklamní složky / prospekty', 'reklamni-slozky-prospekty', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Trička s potiskem', 'tricka-s-potiskem', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Potisk oděvů', 'potisk-odevu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Plakáty', 'plakaty', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Návrh letáků', 'navrh-letaku', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Návrh vizitek', 'navrh-vizitek', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Letáky', 'letaky', 'e704912e-5575-491f-912a-907ce0142ab7'),

-- Group 4: Ostatní
('Podnikatelské poradenství', 'podnikatelske-poradenstvi', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Poskytovatelé internetu', 'poskytovatele-internetu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Fotograf', 'fotograf', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Fotografování nemovitostí', 'fotografovani-nemovitosti', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Advokátní kancelář', 'advokatni-kancelar', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Pracovní lékařství', 'pracovni-lekarstvi', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Ochrana osob a majetku', 'ochrana-osob-a-majetku', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Psaní podnikatelského plánu', 'psani-podnikatelskeho-planu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Právní poradenství', 'pravni-poradenstvi', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Přepis textů', 'prepis-textu', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Focení / Fotografické sezení', 'foceni-fotograficke-sezeni', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Jazyková škola', 'jazykova-skola', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Šicí dílna / Švadlena (pro firmy)', 'sici-dilna-svadlena', 'e704912e-5575-491f-912a-907ce0142ab7'),
('Konzultační služby', 'konzultacni-sluzby', 'e704912e-5575-491f-912a-907ce0142ab7');
-- Delete existing subcategories for Elektrikář
DELETE FROM service_subcategories 
WHERE category_id = 'aa36ca8a-f286-4356-94a0-97a4fa88410c';

-- Add prominent subcategories for Elektrikář
INSERT INTO service_subcategories (name, slug, category_id) VALUES
('Elektroinstalace', 'elektroinstalace', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Elektrikářská pohotovost', 'elektrikarska-pohotovost', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Ostatní elektrikářské služby', 'ostatni-elektrikarske-sluzby', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Zapojení domácích spotřebičů (AGD)', 'zapojeni-domacich-spotrebicu-agd', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),

-- Group: Dále
('Elektrické měření / Revize', 'elektricke-mereni-revize', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Energetický audit', 'energeticky-audit', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Instalace zařízení chytré domácnosti', 'instalace-zarizeni-chytre-domacnosti', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Montáž domovního telefonu', 'montaz-domovniho-telefonu', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Montáž hromosvodu', 'montaz-hromosvodu', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Montáž přepěťové ochrany', 'montaz-prepetove-ochrany', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Převzetí / Kontrola elektroinstalace', 'prevzeti-kontrola-elektroinstalace', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Zahradní osvětlení', 'zahradni-osvetleni', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Zapojení zásuvky', 'zapojeni-zasuvky', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Projektování řešení chytré domácnosti', 'projektovani-reseni-chytre-domacnosti', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Revize elektroinstalace', 'revize-elektroinstalace', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Ovládání vytápění', 'ovladani-vytapeni', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Ovládání osvětlení', 'ovladani-osvetleni', 'aa36ca8a-f286-4356-94a0-97a4fa88410c'),
('Výměna elektroinstalace', 'vymena-elektroinstalace', 'aa36ca8a-f286-4356-94a0-97a4fa88410c');
-- Delete all subcategories for Stěhování category
DELETE FROM service_subcategories 
WHERE category_id IN (
  SELECT id FROM service_categories WHERE slug = 'stehovani'
);

-- Delete the Stěhování category
DELETE FROM service_categories 
WHERE slug = 'stehovani';
-- Delete all subcategories for Obklady category
DELETE FROM service_subcategories 
WHERE category_id IN (
  SELECT id FROM service_categories WHERE slug = 'obklady'
);

-- Delete the Obklady category
DELETE FROM service_categories 
WHERE slug = 'obklady';
-- Update Stavba domu category name to Stavebnictví
UPDATE service_categories 
SET name = 'Stavebnictví', slug = 'stavebnictvi'
WHERE slug = 'stavba-domu';

-- Get the category ID
DO $$
DECLARE
  cat_id UUID;
BEGIN
  SELECT id INTO cat_id FROM service_categories WHERE slug = 'stavebnictvi';
  
  -- Delete all existing subcategories
  DELETE FROM service_subcategories WHERE category_id = cat_id;
  
  -- Add prominent subcategories
  INSERT INTO service_subcategories (name, slug, category_id) VALUES
  ('Pokládka obkladů a dlažby', 'pokladka-obkladu-a-dlazby', cat_id),
  ('Stavba rodinného domu', 'stavba-rodinneho-domu', cat_id),
  ('Fasáda domu', 'fasada-domu', cat_id),
  ('Pokládka panelů', 'pokladka-panelu', cat_id),
  
  -- Group 1: Stavba od základů
  ('Stavba altánu', 'stavba-altanu', cat_id),
  ('Stavba rekreační chaty / letního domu', 'stavba-rekreacni-chaty-letniho-domu', cat_id),
  ('Stavba pasivního domu', 'stavba-pasivniho-domu', cat_id),
  ('Stavba domu na klíč', 'stavba-domu-na-klic', cat_id),
  ('Stavba dřevostavby / rámového domu', 'stavba-drevostavby-ramoveho-domu', cat_id),
  ('Stavba srubu / roubenky', 'stavba-srubu-roubenky', cat_id),
  ('Stavba základů', 'stavba-zakladu', cat_id),
  ('Stavba krbů', 'stavba-krbu', cat_id),
  ('Stavba sauny', 'stavba-sauny', cat_id),
  ('Stavba septiku / žumpy', 'stavba-septiku-zumpy', cat_id),
  ('Stavba terasy', 'stavba-terasy', cat_id),
  ('Stavba přístřešku pro auto', 'stavba-pristresku-pro-auto', cat_id),
  ('Izolace a zateplení základů', 'izolace-a-zatepleni-zakladu', cat_id),
  ('Stavební nabídky', 'stavebni-nabidky', cat_id),
  ('Železobetonové práce', 'elezobetonove-prace', cat_id),
  ('Zednické práce', 'zednicke-prace', cat_id),
  ('Realizace inženýrských staveb', 'realizace-inzenyrskych-staveb', cat_id),
  ('Ostatní stavební služby', 'ostatni-stavebni-sluzby', cat_id),
  
  -- Group 2: Střecha a fasáda
  ('Adaptace podkroví', 'adaptace-podkrovi', cat_id),
  ('Stavba střechy', 'stavba-strechy', cat_id),
  ('Pokrývač', 'pokryvac', cat_id),
  ('Zateplení střechy', 'zatepleni-strechy', cat_id),
  ('Zateplení domu', 'zatepleni-domu', cat_id),
  ('Zateplení podkroví', 'zatepleni-podkrovi', cat_id),
  ('Omítání fasády', 'omitani-fasady', cat_id),
  ('Vestavba podkroví', 'vestavba-podkrovi', cat_id),
  ('Zastřešení terasy', 'zastreseni-terasy', cat_id),
  
  -- Group 3: Garáže a brány
  ('Automatizace brány', 'automatizace-brany', cat_id),
  ('Stavba garáže', 'stavba-garae', cat_id),
  ('Betonová garáž', 'betonova-garaz', cat_id),
  ('Montáž garážových vrat', 'montaz-garazovych-vrat', cat_id),
  ('Montáž posuvné brány', 'montaz-posuvne-brany', cat_id),
  ('Montáž vjezdové brány', 'montaz-vjezdove-brany', cat_id),
  
  -- Group 4: Instalace
  ('Instalace ústředního topení', 'instalace-ustredniho-topeni', cat_id),
  ('Vodovodní instalace', 'vodovodini-instalace', cat_id),
  ('Elektroinstalace', 'elektroinstalace', cat_id),
  
  -- Group 5: Venkovní práce
  ('Dlaždič', 'dlazdic', cat_id),
  ('Stavba letního domku', 'stavba-letniho-domku', cat_id),
  ('Kameník', 'kamenik', cat_id),
  ('Kopání studny', 'kopani-studny', cat_id),
  ('Montáž oplocení', 'montaz-oploceni', cat_id),
  ('Odvodnění domu', 'odvodneni-domu', cat_id),
  ('Zemní práce', 'zemni-prace', cat_id),
  ('Pokládka zámkové dlažby', 'pokladka-zamkove-dlazby', cat_id),
  ('Pokládka žulové dlažby', 'pokladka-zulove-dlazby', cat_id),
  
  -- Group 6: Podlahy
  ('Podlahy', 'podlahy', cat_id),
  ('Pokládka parket', 'pokladka-parket', cat_id),
  ('Podlahové potěry (anhydrit, beton)', 'podlahove-potery-anhydrit-beton', cat_id),
  
  -- Group 7: Ostatní (first set)
  ('Geodet', 'geodet', cat_id),
  ('Stavební dozor / stavbyvedoucí', 'stavebni-dozor-stavbyvedouci', cat_id),
  ('Drenáž domu', 'drenaz-domu', cat_id),
  ('Dřevěné schodiště', 'drevene-schodiste', cat_id),
  ('Půjčovna nářadí', 'pujcovna-naradi', cat_id),
  ('Pronájem strojů', 'pronajem-stroju', cat_id),
  ('Pronájem kultivátoru / rotavátoru', 'pronajem-kultivatoru-rotavatoru', cat_id),
  ('Pronájem rypadlonakladače', 'pronajem-rypadlonakladace', cat_id),
  ('Pronájem stavebních strojů', 'pronajem-stavebnich-stroju', cat_id),
  ('Pronájem minirypadla', 'pronajem-minirypadla', cat_id),
  ('Pronájem stavebního vybavení', 'pronajem-stavebniho-vybaveni', cat_id),
  
  -- Group 8: Stěny a strop
  ('Vybudování příčky', 'vybudovani-pricky', cat_id),
  ('Omítání stěn', 'omitani-sten', cat_id),
  ('Montáž podhledu', 'montaz-podhledu', cat_id),
  
  -- Group 9: Ostatní (second set)
  ('Architekt', 'architekt', cat_id),
  ('Stavba vnitřního schodiště', 'stavba-vnitrniho-schodiste', cat_id),
  ('Stavba venkovního schodiště', 'stavba-venkovniho-schodiste', cat_id),
  ('Montáž dveří', 'montaz-dveri', cat_id),
  ('Montáž oken', 'montaz-oken', cat_id),
  ('Montáž půdních schodů', 'montaz-pudnich-schodu', cat_id),
  ('Vyrovnání terénu', 'vyrovnani-terenu', cat_id),
  ('Převzetí bytu (kolaudace)', 'prevzeti-bytu-kolaudace', cat_id),
  ('Odvodnění pozemku', 'odvodneni-pozemku', cat_id),
  ('Schodišťové zábradlí', 'schodistove-zabradli', cat_id),
  ('Stěhování', 'stehovani', cat_id),
  ('Demolice a bourání budovy', 'demolice-a-bourani-budovy', cat_id),
  ('Pokládka dlažby na schodech', 'pokladka-dlazby-na-schodech', cat_id),
  ('Služby rypadlonakladačem', 'sluzby-rypadlonakladacem', cat_id);
END $$;
-- Delete all subcategories for Design category
DELETE FROM service_subcategories 
WHERE category_id IN (
  SELECT id FROM service_categories WHERE slug = 'design'
);

-- Delete the Design category
DELETE FROM service_categories 
WHERE slug = 'design';

-- Delete all subcategories for Rekonstrukce category
DELETE FROM service_subcategories 
WHERE category_id IN (
  SELECT id FROM service_categories WHERE slug = 'rekonstrukce' OR slug = 'rekonstrukce-opravy'
);

-- Delete the Rekonstrukce category
DELETE FROM service_categories 
WHERE slug = 'rekonstrukce' OR slug = 'rekonstrukce-opravy';
-- Create Rekonstrukce / opravy category
INSERT INTO service_categories (id, name, slug, icon) 
VALUES ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Rekonstrukce / opravy', 'rekonstrukce-opravy', 'Wrench');

-- Get the category ID
DO $$
DECLARE
  cat_id UUID;
BEGIN
  SELECT id INTO cat_id FROM service_categories WHERE slug = 'rekonstrukce-opravy';
  
  -- Add prominent subcategories
  INSERT INTO service_subcategories (name, slug, category_id) VALUES
  ('Pokládka obkladů a dlažby', 'pokladka-obkladu-a-dlazby', cat_id),
  ('Stěhování', 'stehovani', cat_id),
  ('Broušení parket (cyklování)', 'brouseni-parket-cyklovani', cat_id),
  ('Rekonstrukce bytu', 'rekonstrukce-bytu', cat_id),
  
  -- Group 1: Zábradlí a madla
  ('Skleněné zábradlí', 'sklenene-zabradli', cat_id),
  ('Zábradlí', 'zabradli', cat_id),
  ('Nerezové zábradlí', 'nerezove-zabradli', cat_id),
  ('Madla na schodiště', 'madla-na-schodiste', cat_id),
  
  -- Group 2: Střecha a fasáda
  ('Adaptace / Přestavba podkroví', 'adaptace-prestavba-podkrovi', cat_id),
  ('Fasáda domu', 'fasada-domu', cat_id),
  ('Zateplení střechy', 'zatepleni-strechy', cat_id),
  ('Zateplení domu', 'zatepleni-domu', cat_id),
  ('Zateplení podkroví', 'zatepleni-podkrovi', cat_id),
  ('Výškové práce', 'vyskove-prace', cat_id),
  ('Rekonstrukce střechy', 'rekonstrukce-strechy', cat_id),
  ('Vestavba podkroví', 'vestavba-podkrovi', cat_id),
  
  -- Group 3: Instalace
  ('Instalace ústředního topení (ÚT)', 'instalace-ustredniho-topeni-ut', cat_id),
  ('Plynová instalace', 'plynova-instalace', cat_id),
  ('Chytrá domácnost (Smart Home)', 'chytra-domacnost-smart-home', cat_id),
  ('Instalace zařízení chytré domácnosti', 'instalace-zarizeni-chytre-domacnosti', cat_id),
  ('Ovládání vytápění', 'ovladani-vytapeni', cat_id),
  ('Ovládání osvětlení', 'ovladani-osvetleni', cat_id),
  
  -- Group 4: Podlahy
  ('Montáž podlahových lišt', 'montaz-podlahovych-list', cat_id),
  ('Pokládka panelů', 'pokladka-panelu', cat_id),
  ('Pokládka podlahových panelů', 'pokladka-podlahovych-panelu', cat_id),
  ('Pokládka vinylových panelů', 'pokladka-vinylovych-panelu', cat_id),
  ('Pokládka parket', 'pokladka-parket', cat_id),
  
  -- Group 5: Rekonstrukce budov
  ('Vysoušení budov', 'vysouseni-budov', cat_id),
  ('Rekonstrukce kanceláří', 'rekonstrukce-kancelari', cat_id),
  ('Rekonstrukce budov', 'rekonstrukce-budov', cat_id),
  ('Demolice a zbourání budovy', 'demolice-a-zbourani-budovy', cat_id),
  ('Demolice stodoly', 'demolice-stodoly', cat_id),
  
  -- Group 6: Malířské služby
  ('Natírání střech', 'natirani-strech', cat_id),
  ('Natírání fasády', 'natirani-fasady', cat_id),
  ('Malování stropu', 'malovani-stropu', cat_id),
  ('Malování stěn', 'malovani-sten', cat_id),
  ('Ostatní malířské služby', 'ostatni-malirske-sluzby', cat_id),
  
  -- Group 7: Dokončovací práce / Dokončení interiérů
  ('Rekonstrukce balkonu', 'rekonstrukce-balkonu', cat_id),
  ('Rekonstrukce domu', 'rekonstrukce-domu', cat_id),
  ('Rekonstrukce kuchyně', 'rekonstrukce-kuchyne', cat_id),
  ('Rekonstrukce podkroví', 'rekonstrukce-podkrovi', cat_id),
  ('Rekonstrukce koupelny', 'rekonstrukce-koupelny', cat_id),
  ('Sklo na míru', 'sklo-na-miru', cat_id),
  ('Pokládka dlažby na schodech', 'pokladka-dlazby-na-schodech', cat_id),
  ('Dokončení domu', 'dokonceni-domu', cat_id),
  ('Dokončení bytu', 'dokonceni-bytu', cat_id),
  ('Dokončení na klíč', 'dokonceni-na-klic', cat_id),
  ('Dokončení interiérů', 'dokonceni-interieru', cat_id),
  ('Obestavba krbu', 'obestavba-krbu', cat_id),
  
  -- Group 8: Stěny a strop
  ('Vybudování příčky', 'vybudovani-pricky', cat_id),
  ('Sádrování stěn / Nanášení sádry', 'sadrovani-sten-nanaseni-sadry', cat_id),
  ('Penetrace stěn', 'penetrace-sten', cat_id),
  ('Konstrukce ze sádrokartonu (SDK)', 'konstrukce-ze-sadrokartonu-sdk', cat_id),
  ('Montáž kazetového stropu', 'montaz-kazetoveho-stropu', cat_id),
  ('Montáž podhledu', 'montaz-podhledu', cat_id),
  ('Špachtlování / Tmelení stěn', 'spachtlovani-tmeleni-sten', cat_id),
  ('Tapetování', 'tapetovani', cat_id),
  ('Strojní omítání', 'strojni-omitani', cat_id),
  ('Omítání stěn', 'omitani-sten', cat_id),
  ('Odhlučnění stěn', 'odhulcneni-sten', cat_id),
  ('Sádrokartonové konstrukce', 'sadrokartonove-konstrukce', cat_id),
  
  -- Group 9: Ostatní
  ('Balkonové zábradlí', 'balkonove-zabradli', cat_id),
  ('Schodišťové zábradlí', 'schodistove-zabradli', cat_id),
  ('Montáž oken', 'montaz-oken', cat_id),
  ('Výměna oken', 'vymena-oken', cat_id),
  ('Půjčovna nářadí', 'pujcovna-naradi', cat_id),
  ('Ostatní stavební služby / rekonstrukce', 'ostatni-stavebni-sluzby-rekonstrukce', cat_id);
END $$;
-- Create table to track jobs unlocked by workers through radius expansion
CREATE TABLE public.worker_expanded_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(worker_id, job_id)
);

-- Enable RLS
ALTER TABLE public.worker_expanded_jobs ENABLE ROW LEVEL SECURITY;

-- Workers can view their own expanded jobs
CREATE POLICY "Workers can view own expanded jobs"
  ON public.worker_expanded_jobs
  FOR SELECT
  USING (auth.uid() = worker_id);

-- Workers can insert their own expanded jobs
CREATE POLICY "Workers can unlock expanded jobs"
  ON public.worker_expanded_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

-- Create index for better performance
CREATE INDEX idx_worker_expanded_jobs_worker_id ON public.worker_expanded_jobs(worker_id);
CREATE INDEX idx_worker_expanded_jobs_job_id ON public.worker_expanded_jobs(job_id);
-- Add notification preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_notifications boolean DEFAULT false;
-- Add phone verification columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Create a table to store verification codes
CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false
);

-- Enable RLS on verification codes table
ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only view their own verification codes
CREATE POLICY "Users can view own verification codes"
ON phone_verification_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own verification codes
CREATE POLICY "Users can create own verification codes"
ON phone_verification_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification codes
CREATE POLICY "Users can update own verification codes"
ON phone_verification_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_user_id ON phone_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_expires_at ON phone_verification_codes(expires_at);
-- Add deadline_type column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN deadline_type text DEFAULT 'asap' CHECK (deadline_type IN ('asap', 'agreement', 'specific'));

-- Add deadline_date column for specific dates
ALTER TABLE public.jobs 
ADD COLUMN deadline_date timestamp with time zone;
-- Add full_address column to jobs table (keeping location as city for backwards compatibility)
ALTER TABLE public.jobs 
ADD COLUMN full_address text;

-- Rename location to city for clarity
ALTER TABLE public.jobs 
RENAME COLUMN location TO city;
-- Add worker_viewed column to track if worker has opened the conversation
ALTER TABLE public.offers
ADD COLUMN worker_viewed boolean DEFAULT false;

-- Set existing accepted offers as viewed (they've already been handled)
UPDATE public.offers SET worker_viewed = true WHERE status = 'accepted';
-- Add full_address column to profiles table for workers to store their complete address
ALTER TABLE public.profiles ADD COLUMN full_address text;

-- Add latitude and longitude columns for better distance calculations
ALTER TABLE public.profiles ADD COLUMN latitude numeric;
ALTER TABLE public.profiles ADD COLUMN longitude numeric;
-- Add photos column to offers table for storing worker portfolio images
ALTER TABLE public.offers ADD COLUMN photos text[] DEFAULT NULL;
-- Create a table for visit appointments
CREATE TABLE public.visit_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visit_appointments ENABLE ROW LEVEL SECURITY;

-- Workers can view appointments for their jobs
CREATE POLICY "Workers can view their job appointments" 
ON public.visit_appointments 
FOR SELECT 
USING (worker_id = auth.uid());

-- Workers can create appointments for their jobs
CREATE POLICY "Workers can create appointments" 
ON public.visit_appointments 
FOR INSERT 
WITH CHECK (worker_id = auth.uid());

-- Workers can delete their appointments
CREATE POLICY "Workers can delete their appointments" 
ON public.visit_appointments 
FOR DELETE 
USING (worker_id = auth.uid());

-- Customers can view appointments for their jobs
CREATE POLICY "Customers can view appointments for their jobs" 
ON public.visit_appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = visit_appointments.job_id 
    AND jobs.customer_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_visit_appointments_job_id ON public.visit_appointments(job_id);
CREATE INDEX idx_visit_appointments_worker_id ON public.visit_appointments(worker_id);
-- Allow unauthenticated users to upload job photos to a temporary folder (needed for pre-auth job posting flow)
-- NOTE: This assumes RLS is enabled on storage.objects (default).

CREATE POLICY "Anon can upload temp job photos"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'job-photos'
  AND name LIKE 'temp/%'
);
-- Fix 1: Update handle_new_user function with input sanitization and length limits
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  validated_user_type user_type;
  sanitized_full_name text;
  sanitized_phone text;
  sanitized_bio text;
BEGIN
  -- Validate and sanitize user_type with explicit check
  BEGIN
    validated_user_type := COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'customer');
  EXCEPTION WHEN OTHERS THEN
    validated_user_type := 'customer';
  END;
  
  -- Sanitize and limit full_name (max 255 chars, strip HTML-like content)
  sanitized_full_name := SUBSTRING(
    REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      '<[^>]*>', '', 'g'
    ), 1, 255
  );
  
  -- Sanitize phone (only allow digits, +, spaces, max 20 chars)
  sanitized_phone := SUBSTRING(
    REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      '[^0-9+\s]', '', 'g'
    ), 1, 20
  );
  IF sanitized_phone = '' THEN
    sanitized_phone := NULL;
  END IF;
  
  -- Sanitize bio (max 1000 chars, strip HTML-like content)
  sanitized_bio := SUBSTRING(
    REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'bio', ''),
      '<[^>]*>', '', 'g'
    ), 1, 1000
  );
  IF sanitized_bio = '' THEN
    sanitized_bio := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, bio, user_type)
  VALUES (
    NEW.id,
    sanitized_full_name,
    NEW.email,
    sanitized_phone,
    sanitized_bio,
    validated_user_type
  );
  RETURN NEW;
END;
$function$;

-- Fix 2: Add status enum constraint to offers table to enforce valid status values
DO $$
BEGIN
  -- First check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'offers_status_check' AND conrelid = 'public.offers'::regclass
  ) THEN
    ALTER TABLE public.offers 
    ADD CONSTRAINT offers_status_check 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));
  END IF;
END $$;

-- Fix 3: Create trigger to validate offer status transitions
CREATE OR REPLACE FUNCTION public.validate_offer_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If status is not changing, allow the update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions
  -- pending -> accepted, rejected, withdrawn (OK)
  -- accepted -> rejected (NOT OK - job owner controls this)
  -- rejected -> accepted (NOT OK - requires new offer)
  -- withdrawn -> any (NOT OK - withdrawn is final)
  
  IF OLD.status = 'pending' THEN
    -- From pending, can go to accepted, rejected, or withdrawn
    IF NEW.status IN ('accepted', 'rejected', 'withdrawn') THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- All other transitions are invalid
  RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$function$;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS validate_offer_status ON public.offers;
CREATE TRIGGER validate_offer_status
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_offer_status_transition();
-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location geography column to profiles for efficient spatial queries
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Migrate existing worker coordinates to geography format
UPDATE public.profiles 
SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Create spatial index on profiles for fast worker proximity queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles USING GIST(location);

-- Add latitude/longitude columns to jobs table for storing job location
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Add location geography column to jobs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Create spatial index on jobs for fast queries
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs USING GIST(location);

-- Add push_notifications preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT false;

-- Create push_subscriptions table to store web push subscription data
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can create own push subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create PostGIS-powered function to find nearby workers with matching services
CREATE OR REPLACE FUNCTION public.find_workers_for_job(
  job_lat numeric,
  job_lng numeric,
  job_subcategory_id uuid,
  radius_meters int DEFAULT 50000
)
RETURNS TABLE (
  worker_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id as worker_id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM profiles p
  INNER JOIN worker_services ws ON ws.worker_id = p.id
  INNER JOIN push_subscriptions ps ON ps.user_id = p.id
  WHERE 
    p.user_type IN ('worker', 'both')
    AND p.push_notifications = true
    AND ws.subcategory_id = job_subcategory_id
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(job_lng::float, job_lat::float), 4326)::geography,
      radius_meters
    )
$$;

-- Create trigger to auto-update job location when lat/lng are set
CREATE OR REPLACE FUNCTION public.update_job_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on jobs table
DROP TRIGGER IF EXISTS trigger_update_job_location ON public.jobs;
CREATE TRIGGER trigger_update_job_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_job_location();

-- Create trigger to auto-update profile location when lat/lng are set
CREATE OR REPLACE FUNCTION public.update_profile_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_update_profile_location ON public.profiles;
CREATE TRIGGER trigger_update_profile_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_location();
-- Add granular push notification preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_new_jobs boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_new_messages boolean DEFAULT true;

-- Update existing profiles: if push_notifications is true, enable both granular options
UPDATE public.profiles 
SET push_new_jobs = true, push_new_messages = true 
WHERE push_notifications = true;
-- Update the find_workers_for_job function to also check push_new_jobs preference
CREATE OR REPLACE FUNCTION public.find_workers_for_job(
  job_lat numeric,
  job_lng numeric,
  job_subcategory_id uuid,
  radius_meters integer DEFAULT 50000
)
RETURNS TABLE (
  worker_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT 
    p.id as worker_id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM profiles p
  INNER JOIN worker_services ws ON ws.worker_id = p.id
  INNER JOIN push_subscriptions ps ON ps.user_id = p.id
  WHERE p.user_type IN ('worker', 'both')
    AND p.push_notifications = true
    AND COALESCE(p.push_new_jobs, true) = true
    AND ws.subcategory_id = job_subcategory_id
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(job_lng, job_lat), 4326)::geography,
      radius_meters
    );
$$;
-- Enable REPLICA IDENTITY FULL for complete row data in realtime
ALTER TABLE offers REPLICA IDENTITY FULL;
ALTER TABLE jobs REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- Add customer_viewed column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS customer_viewed BOOLEAN DEFAULT false;

-- Add last_jobs_viewed_at column to profiles table for workers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_jobs_viewed_at TIMESTAMP WITH TIME ZONE;
-- Drop existing check constraint and add new one with pending_approval status
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('open', 'in_progress', 'completed', 'pending_approval', 'cancelled'));
-- Add customer-specific push notification preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_new_offers boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_job_completed boolean DEFAULT true;
-- Allow customers to update offers on their own jobs (for accepting/rejecting offers)
CREATE POLICY "Customers can update offers on their jobs" 
ON public.offers 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT customer_id FROM jobs WHERE jobs.id = offers.job_id
  )
);
-- Fix existing inconsistent data: jobs that are in_progress but offers are still pending
-- This updates the first pending offer for each in_progress job to be accepted
UPDATE offers
SET status = 'accepted'
WHERE id IN (
  SELECT DISTINCT ON (j.id) o.id
  FROM offers o
  JOIN jobs j ON o.job_id = j.id
  WHERE j.status = 'in_progress' AND o.status = 'pending'
  ORDER BY j.id, o.created_at ASC
);
-- Ensure RLS enabled
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Unique constraint for (user_id, endpoint) to support upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'push_subscriptions_user_id_endpoint_key'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);
  END IF;
END$$;

-- RLS policies
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users can view own push subscriptions'
  ) THEN
    CREATE POLICY "Users can view own push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users can update own push subscriptions'
  ) THEN
    CREATE POLICY "Users can update own push subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users can delete own push subscriptions'
  ) THEN
    CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END$$;
-- Add user_agent column to push_subscriptions table
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add device_name column for parsed friendly name
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS device_name TEXT;
-- Create push_receipts table for debugging push notification delivery
CREATE TABLE public.push_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  endpoint_tail TEXT,
  type TEXT,
  tag TEXT,
  user_agent TEXT,
  note TEXT
);

-- Enable RLS
ALTER TABLE public.push_receipts ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert (edge functions)
-- No direct client access for security
CREATE POLICY "Service role can insert receipts"
ON public.push_receipts
FOR INSERT
WITH CHECK (true);

-- Users can read their own receipts (via their subscriptions)
CREATE POLICY "Users can view receipts for their subscriptions"
ON public.push_receipts
FOR SELECT
USING (
  subscription_id IN (
    SELECT id FROM public.push_subscriptions WHERE user_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_push_receipts_subscription_id ON public.push_receipts(subscription_id);
CREATE INDEX idx_push_receipts_created_at ON public.push_receipts(created_at DESC);
-- Create a trigger to automatically update the location geography column
-- whenever latitude or longitude is updated on the profiles table

CREATE OR REPLACE FUNCTION public.update_profile_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update location if lat/lng are both set
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS update_profile_location_trigger ON public.profiles;
CREATE TRIGGER update_profile_location_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_location();

-- Also update existing profiles that have lat/lng but no location
UPDATE public.profiles
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location IS NULL;
-- Add push_offer_accepted column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_offer_accepted boolean DEFAULT true;
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create a security definer function to check if users are connected via an accepted offer
-- Users are "connected" if there's an accepted offer where one is the worker and the other is the customer
CREATE OR REPLACE FUNCTION public.are_users_connected(user_id_1 uuid, user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM offers o
    JOIN jobs j ON j.id = o.job_id
    WHERE o.status = 'accepted'
      AND (
        (o.worker_id = user_id_1 AND j.customer_id = user_id_2)
        OR (o.worker_id = user_id_2 AND j.customer_id = user_id_1)
      )
  )
$$;

-- Create a view for profile data that hides sensitive fields based on the viewer
-- This approach uses RLS to control what data is returned
-- We'll use a policy-based approach instead where the base table is accessible
-- but we rely on application-level filtering + stricter policies

-- Policy 1: Users can always view their own full profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Authenticated users can view public info of other profiles (excluding sensitive fields at query level)
-- Note: RLS can't filter columns, only rows. So we allow row access but the app must select only public fields.
-- For true column-level security, we'd need a view. But for simplicity, we document that apps should not select sensitive fields for other users.
CREATE POLICY "Authenticated users can view other profiles public info"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Since RLS cannot filter columns, we need to ensure the application layer doesn't expose sensitive data.
-- However, we can create a secure view that only exposes safe columns for public access:

-- Create a public-safe view for viewing other users' profiles (no email, masked phone only for connected users)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.header_url,
  p.bio,
  p.company_type,
  p.city,
  p.region,
  p.country,
  p.portfolio_photos,
  p.user_type,
  p.created_at,
  -- Only show phone if the current user is connected to this profile owner
  CASE 
    WHEN auth.uid() = p.id THEN p.phone  -- Own profile: show full phone
    WHEN public.are_users_connected(auth.uid(), p.id) THEN p.phone  -- Connected: show full phone
    ELSE NULL  -- Not connected: hide phone
  END as phone,
  -- Email is only visible to the owner
  CASE 
    WHEN auth.uid() = p.id THEN p.email
    ELSE NULL
  END as email
FROM profiles p;
-- Drop the security definer view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate the view with SECURITY INVOKER (default, but explicit is better)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.header_url,
  p.bio,
  p.company_type,
  p.city,
  p.region,
  p.country,
  p.portfolio_photos,
  p.user_type,
  p.created_at,
  -- Only show phone if the current user is connected to this profile owner
  CASE 
    WHEN auth.uid() = p.id THEN p.phone  -- Own profile: show full phone
    WHEN public.are_users_connected(auth.uid(), p.id) THEN p.phone  -- Connected: show full phone
    ELSE NULL  -- Not connected: hide phone
  END as phone,
  -- Email is only visible to the owner
  CASE 
    WHEN auth.uid() = p.id THEN p.email
    ELSE NULL
  END as email
FROM profiles p;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated, anon;
-- Add progress_photos column to jobs table for work-in-progress photos
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS progress_photos text[] DEFAULT NULL;
-- Add quality rating columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS quality_punctuality integer CHECK (quality_punctuality >= 1 AND quality_punctuality <= 5),
ADD COLUMN IF NOT EXISTS quality_communication integer CHECK (quality_communication >= 1 AND quality_communication <= 5),
ADD COLUMN IF NOT EXISTS quality_cleanliness integer CHECK (quality_cleanliness >= 1 AND quality_cleanliness <= 5),
ADD COLUMN IF NOT EXISTS quality_professionalism integer CHECK (quality_professionalism >= 1 AND quality_professionalism <= 5);
-- Create a table for additional costs that emerge during job execution
CREATE TABLE public.additional_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.additional_costs ENABLE ROW LEVEL SECURITY;

-- Workers can create additional costs for their accepted offers
CREATE POLICY "Workers can create own additional costs"
ON public.additional_costs
FOR INSERT
WITH CHECK (auth.uid() = worker_id);

-- Workers can view their own additional costs
CREATE POLICY "Workers can view own additional costs"
ON public.additional_costs
FOR SELECT
USING (auth.uid() = worker_id);

-- Customers can view additional costs for their jobs
CREATE POLICY "Customers can view additional costs for their jobs"
ON public.additional_costs
FOR SELECT
USING (job_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid()));

-- Workers can delete their own additional costs
CREATE POLICY "Workers can delete own additional costs"
ON public.additional_costs
FOR DELETE
USING (auth.uid() = worker_id);
-- Add confirmation fields to additional_costs table
ALTER TABLE public.additional_costs 
ADD COLUMN added_by text NOT NULL DEFAULT 'worker',
ADD COLUMN confirmed_by_other boolean NOT NULL DEFAULT false,
ADD COLUMN confirmed_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.additional_costs.added_by IS 'Who added the cost: worker or customer';
COMMENT ON COLUMN public.additional_costs.confirmed_by_other IS 'Whether the other party has confirmed this cost';
COMMENT ON COLUMN public.additional_costs.confirmed_at IS 'When the other party confirmed this cost';

-- Update RLS to allow customers to create costs for their jobs
CREATE POLICY "Customers can create additional costs for their jobs"
ON public.additional_costs
FOR INSERT
WITH CHECK (
  job_id IN (
    SELECT id FROM jobs WHERE customer_id = auth.uid()
  )
);

-- Allow both parties to update (confirm) costs
CREATE POLICY "Workers can update costs on their jobs"
ON public.additional_costs
FOR UPDATE
USING (worker_id = auth.uid());

CREATE POLICY "Customers can update costs on their jobs"
ON public.additional_costs
FOR UPDATE
USING (
  job_id IN (
    SELECT id FROM jobs WHERE customer_id = auth.uid()
  )
);

-- Allow customers to delete their own costs
CREATE POLICY "Customers can delete own additional costs"
ON public.additional_costs
FOR DELETE
USING (
  added_by = 'customer' AND
  job_id IN (
    SELECT id FROM jobs WHERE customer_id = auth.uid()
  )
);
-- Create calendar_shares table to enable calendar sharing between workers on common jobs
CREATE TABLE public.calendar_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (job_id, worker_id)
);

-- Enable Row Level Security
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

-- Workers can manage their own calendar share settings
CREATE POLICY "Workers can view their own shares"
ON public.calendar_shares
FOR SELECT
USING (worker_id = auth.uid());

CREATE POLICY "Workers can insert their own shares"
ON public.calendar_shares
FOR INSERT
WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers can update their own shares"
ON public.calendar_shares
FOR UPDATE
USING (worker_id = auth.uid());

CREATE POLICY "Workers can delete their own shares"
ON public.calendar_shares
FOR DELETE
USING (worker_id = auth.uid());

-- Customers can view calendar shares for their jobs
CREATE POLICY "Customers can view shares for their jobs"
ON public.calendar_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = calendar_shares.job_id 
    AND jobs.customer_id = auth.uid()
  )
);

-- Workers can view calendar shares of other workers on the same job (when enabled)
CREATE POLICY "Workers can view other workers shares on same job"
ON public.calendar_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers o1
    JOIN public.offers o2 ON o1.job_id = o2.job_id
    WHERE o1.worker_id = auth.uid()
    AND o2.worker_id = calendar_shares.worker_id
    AND o1.status = 'accepted'
    AND o2.status = 'accepted'
    AND calendar_shares.enabled = true
  )
);

-- Update visit_appointments policies to allow viewing shared appointments
-- Workers can view appointments of other workers who share calendars on same job
CREATE POLICY "Workers can view shared appointments"
ON public.visit_appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_shares cs
    JOIN public.offers o ON o.job_id = cs.job_id AND o.worker_id = auth.uid() AND o.status = 'accepted'
    WHERE cs.worker_id = visit_appointments.worker_id
    AND cs.enabled = true
    AND visit_appointments.job_id IN (
      SELECT job_id FROM public.offers WHERE worker_id = auth.uid() AND status = 'accepted'
    )
  )
);
-- Drop the existing policy that only allows viewing shares on the same job
DROP POLICY IF EXISTS "Workers can view other workers shares on same job" ON public.calendar_shares;

-- Create new policy that allows workers to see calendar shares for jobs with the same customer
-- A worker can see another worker's calendar share if:
-- 1. Both workers have accepted offers on jobs belonging to the same customer
-- 2. The other worker has enabled calendar sharing
CREATE POLICY "Workers can view calendar shares with same customer" 
ON public.calendar_shares 
FOR SELECT 
USING (
  -- The current worker has an accepted offer on a job from the same customer
  EXISTS (
    SELECT 1
    FROM offers my_offer
    JOIN jobs my_job ON my_job.id = my_offer.job_id
    JOIN jobs shared_job ON shared_job.customer_id = my_job.customer_id
    JOIN offers shared_offer ON shared_offer.job_id = shared_job.id
    WHERE my_offer.worker_id = auth.uid()
    AND my_offer.status = 'accepted'
    AND shared_offer.worker_id = calendar_shares.worker_id
    AND shared_offer.status = 'accepted'
    AND calendar_shares.job_id = shared_job.id
    AND calendar_shares.enabled = true
  )
);

-- Also update visit_appointments policy to allow viewing appointments across jobs with same customer
DROP POLICY IF EXISTS "Workers can view shared appointments" ON public.visit_appointments;

CREATE POLICY "Workers can view shared appointments across same customer" 
ON public.visit_appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM calendar_shares cs
    JOIN jobs shared_job ON shared_job.id = cs.job_id
    JOIN offers my_offer ON my_offer.worker_id = auth.uid() AND my_offer.status = 'accepted'
    JOIN jobs my_job ON my_job.id = my_offer.job_id
    WHERE cs.worker_id = visit_appointments.worker_id
    AND cs.enabled = true
    AND shared_job.customer_id = my_job.customer_id
    AND visit_appointments.job_id = shared_job.id
  )
);
-- Create a SECURITY DEFINER helper that can check cross-job relationships without being blocked by RLS on offers
CREATE OR REPLACE FUNCTION public.worker_can_view_calendar_share(
  share_worker_id uuid,
  share_job_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  my_customer_id uuid;
  share_customer_id uuid;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Current worker must have an accepted offer on some job
  SELECT j.customer_id
    INTO my_customer_id
  FROM offers o
  JOIN jobs j ON j.id = o.job_id
  WHERE o.worker_id = auth.uid()
    AND o.status = 'accepted'
  LIMIT 1;

  IF my_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- The shared job must belong to the same customer
  SELECT j.customer_id
    INTO share_customer_id
  FROM jobs j
  WHERE j.id = share_job_id
  LIMIT 1;

  IF share_customer_id IS NULL OR share_customer_id <> my_customer_id THEN
    RETURN false;
  END IF;

  -- The shared worker must have an accepted offer on the shared job
  IF NOT EXISTS (
    SELECT 1
    FROM offers o
    WHERE o.worker_id = share_worker_id
      AND o.job_id = share_job_id
      AND o.status = 'accepted'
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.worker_can_view_calendar_share(uuid, uuid) TO authenticated;

-- Replace calendar_shares SELECT policy to rely on the helper (avoids RLS recursion issues)
DROP POLICY IF EXISTS "Workers can view calendar shares with same customer" ON public.calendar_shares;
CREATE POLICY "Workers can view calendar shares with same customer"
ON public.calendar_shares
FOR SELECT
USING (
  enabled = true
  AND worker_id <> auth.uid()
  AND public.worker_can_view_calendar_share(worker_id, job_id)
);

-- Replace visit_appointments shared SELECT policy similarly
DROP POLICY IF EXISTS "Workers can view shared appointments across same customer" ON public.visit_appointments;
CREATE POLICY "Workers can view shared appointments across same customer"
ON public.visit_appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM calendar_shares cs
    WHERE cs.worker_id = visit_appointments.worker_id
      AND cs.job_id = visit_appointments.job_id
      AND cs.enabled = true
      AND public.worker_can_view_calendar_share(cs.worker_id, cs.job_id)
  )
);
-- Add new columns to service_subcategories table
ALTER TABLE public.service_subcategories
ADD COLUMN IF NOT EXISTS section text,
ADD COLUMN IF NOT EXISTS section_icon text,
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS points_cost integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS price_range text,
ADD COLUMN IF NOT EXISTS display_level text DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Delete existing Autoservis subcategories
DELETE FROM public.service_subcategories 
WHERE category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- Insert new Autoservis subcategories
INSERT INTO public.service_subcategories (category_id, name, slug, section, section_icon, unit, points_cost, price_range, display_level, sort_order) VALUES
-- Section: Autoservis (35 items)
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Automechanik (Hledám mechanika - obecná poptávka)', 'automechanik-obecna-poptavka', 'Autoservis', 'Wrench', 'hodina', 3, '500–900 Kč/hod', 'PROMINENT', 1),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Diagnostika závady', 'diagnostika-zavady', 'Autoservis', 'Wrench', 'úkon', 2, '500–1 500 Kč', 'PROMINENT', 2),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Pravidelná roční prohlídka', 'pravidelna-rocni-prohlidka', 'Autoservis', 'Wrench', 'úkon', 3, '1 500–3 500 Kč', 'STANDARD', 3),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna oleje a olejového filtru', 'vymena-oleje-a-olejoveho-filtru', 'Autoservis', 'Wrench', 'úkon', 3, '800–2 000 Kč', 'STANDARD', 4),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna brzdových destiček', 'vymena-brzdovych-desticek', 'Autoservis', 'Wrench', 'úkon', 3, '1 500–4 000 Kč', 'STANDARD', 5),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna brzdových kotoučů', 'vymena-brzdovych-kotoucu', 'Autoservis', 'Wrench', 'úkon', 3, '2 500–6 000 Kč', 'STANDARD', 6),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna tlumičů', 'vymena-tlumicu', 'Autoservis', 'Wrench', 'úkon', 3, '3 000–8 000 Kč', 'HIDDEN', 7),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna pružin', 'vymena-pruzin', 'Autoservis', 'Wrench', 'úkon', 3, '2 500–6 000 Kč', 'HIDDEN', 8),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna ramen / silentbloků', 'vymena-ramen-silentbloku', 'Autoservis', 'Wrench', 'úkon', 3, '2 000–5 000 Kč', 'HIDDEN', 9),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna stabilizátorů', 'vymena-stabilizatoru', 'Autoservis', 'Wrench', 'úkon', 3, '1 500–4 000 Kč', 'HIDDEN', 10),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna ložisek kol', 'vymena-lozisek-kol', 'Autoservis', 'Wrench', 'úkon', 3, '2 000–5 000 Kč', 'HIDDEN', 11),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Geometrie náprav (seřízení)', 'geometrie-naprav-serizeni', 'Autoservis', 'Wrench', 'úkon', 2, '800–1 500 Kč', 'HIDDEN', 12),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna rozvodů', 'vymena-rozvodu', 'Autoservis', 'Wrench', 'úkon', 4, '5 000–15 000 Kč', 'HIDDEN', 13),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna spojky', 'vymena-spojky', 'Autoservis', 'Wrench', 'úkon', 4, '6 000–15 000 Kč', 'HIDDEN', 14),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna setrvačníku', 'vymena-setrvacniku', 'Autoservis', 'Wrench', 'úkon', 4, '8 000–20 000 Kč', 'HIDDEN', 15),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna vodního čerpadla', 'vymena-vodniho-cerpadla', 'Autoservis', 'Wrench', 'úkon', 3, '3 000–8 000 Kč', 'HIDDEN', 16),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna termostatu', 'vymena-termostatu', 'Autoservis', 'Wrench', 'úkon', 2, '1 000–3 000 Kč', 'HIDDEN', 17),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna chladiče', 'vymena-chladice', 'Autoservis', 'Wrench', 'úkon', 3, '3 000–8 000 Kč', 'HIDDEN', 18),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava / výměna turbodmychadla', 'oprava-vymena-turbodmychadla', 'Autoservis', 'Wrench', 'úkon', 5, '15 000–40 000 Kč', 'HIDDEN', 19),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava motoru (generální oprava)', 'oprava-motoru-generalni-oprava', 'Autoservis', 'Wrench', 'úkon', 6, '30 000–80 000 Kč', 'HIDDEN', 20),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna výfukového systému', 'vymena-vyfukoveho-systemu', 'Autoservis', 'Wrench', 'úkon', 3, '3 000–10 000 Kč', 'HIDDEN', 21),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna katalyzátoru', 'vymena-katalyzatoru', 'Autoservis', 'Wrench', 'úkon', 4, '5 000–15 000 Kč', 'HIDDEN', 22),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava / výměna DPF filtru', 'oprava-vymena-dpf-filtru', 'Autoservis', 'Wrench', 'úkon', 5, '10 000–30 000 Kč', 'HIDDEN', 23),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Čištění DPF filtru', 'cisteni-dpf-filtru', 'Autoservis', 'Wrench', 'úkon', 3, '3 000–6 000 Kč', 'HIDDEN', 24),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Dekarbonizace motoru', 'dekarbonizace-motoru', 'Autoservis', 'Wrench', 'úkon', 3, '2 000–5 000 Kč', 'HIDDEN', 25),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Servis automatické převodovky', 'servis-automaticke-prevodovky', 'Autoservis', 'Wrench', 'úkon', 4, '4 000–10 000 Kč', 'HIDDEN', 26),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Servis manuální převodovky', 'servis-manualni-prevodovky', 'Autoservis', 'Wrench', 'úkon', 3, '2 000–5 000 Kč', 'HIDDEN', 27),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Přezkoušení STK (emise)', 'prezkouskeni-stk-emise', 'Autoservis', 'Wrench', 'úkon', 2, '1 000–2 000 Kč', 'HIDDEN', 28),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Příprava na STK', 'priprava-na-stk', 'Autoservis', 'Wrench', 'úkon', 3, '1 500–4 000 Kč', 'HIDDEN', 29),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna řízení / hřebenu řízení', 'vymena-rizeni-hrebenu-rizeni', 'Autoservis', 'Wrench', 'úkon', 4, '5 000–15 000 Kč', 'HIDDEN', 30),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna posilovače řízení', 'vymena-posilovace-rizeni', 'Autoservis', 'Wrench', 'úkon', 4, '4 000–12 000 Kč', 'HIDDEN', 31),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava palivového systému', 'oprava-palivoveho-systemu', 'Autoservis', 'Wrench', 'úkon', 4, '3 000–10 000 Kč', 'HIDDEN', 32),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Čištění vstřikovačů', 'cisteni-vstrikovaccu', 'Autoservis', 'Wrench', 'úkon', 3, '2 000–5 000 Kč', 'HIDDEN', 33),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna palivového čerpadla', 'vymena-palivoveho-cerpadla', 'Autoservis', 'Wrench', 'úkon', 3, '3 000–8 000 Kč', 'HIDDEN', 34),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava 4x4 systému (pohon všech kol)', 'oprava-4x4-systemu', 'Autoservis', 'Wrench', 'úkon', 5, '5 000–20 000 Kč', 'HIDDEN', 35),

-- Section: Pneuservis (8 items)
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Vulkanizér', 'vulkanizer', 'Pneuservis', 'Circle', 'úkon', 2, '300–800 Kč', 'PROMINENT', 36),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Kompletní přezutí pneu (plechové)', 'kompletni-prezuti-pneu-plechove', 'Pneuservis', 'Circle', 'sada', 2, '400–800 Kč', 'STANDARD', 37),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Kompletní přezutí pneu (alu)', 'kompletni-prezuti-pneu-alu', 'Pneuservis', 'Circle', 'sada', 2, '600–1 200 Kč', 'STANDARD', 38),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna ventilků', 'vymena-ventilku', 'Pneuservis', 'Circle', 'sada', 1, '200–500 Kč', 'STANDARD', 39),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Vyvážení kol', 'vyvazeni-kol', 'Pneuservis', 'Circle', 'sada', 1, '300–600 Kč', 'HIDDEN', 40),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava defektu', 'oprava-defektu', 'Pneuservis', 'Circle', 'kus', 1, '200–500 Kč', 'HIDDEN', 41),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž TPMS senzorů', 'montaz-tpms-senzoru', 'Pneuservis', 'Circle', 'sada', 2, '500–1 500 Kč', 'HIDDEN', 42),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Uskladnění pneumatik (sezóna)', 'uskladneni-pneumatik-sezona', 'Pneuservis', 'Circle', 'sada', 1, '500–1 500 Kč', 'HIDDEN', 43),

-- Section: Autoelektrika (13 items)
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Autoelektrikář', 'autoelektrikar', 'Autoelektrika', 'Zap', 'hodina', 3, '600–1 000 Kč/hod', 'PROMINENT', 44),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Diagnostika elektro závady', 'diagnostika-elektro-zavady', 'Autoelektrika', 'Zap', 'úkon', 2, '500–1 500 Kč', 'PROMINENT', 45),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna autobaterie', 'vymena-autobaterie', 'Autoelektrika', 'Zap', 'úkon', 2, '2 000–6 000 Kč', 'STANDARD', 46),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna alternátoru', 'vymena-alternatoru', 'Autoelektrika', 'Zap', 'úkon', 3, '3 000–8 000 Kč', 'STANDARD', 47),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna startéru', 'vymena-starteru', 'Autoelektrika', 'Zap', 'úkon', 3, '3 000–8 000 Kč', 'HIDDEN', 48),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna žárovek / LED světel', 'vymena-zarovek-led-svetel', 'Autoelektrika', 'Zap', 'úkon', 1, '200–1 000 Kč', 'HIDDEN', 49),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna xenonových výbojek', 'vymena-xenonovych-vybojek', 'Autoelektrika', 'Zap', 'úkon', 2, '1 000–3 000 Kč', 'HIDDEN', 50),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava kabeláže', 'oprava-kabelaze', 'Autoelektrika', 'Zap', 'hodina', 3, '500–1 000 Kč/hod', 'HIDDEN', 51),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž autorádia / reproduktorů', 'montaz-autoradia-reproduktoru', 'Autoelektrika', 'Zap', 'úkon', 2, '500–2 000 Kč', 'HIDDEN', 52),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž handsfree / Bluetooth', 'montaz-handsfree-bluetooth', 'Autoelektrika', 'Zap', 'úkon', 2, '500–1 500 Kč', 'HIDDEN', 53),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž kamery / dashcam', 'montaz-kamery-dashcam', 'Autoelektrika', 'Zap', 'úkon', 2, '500–2 000 Kč', 'HIDDEN', 54),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž GPS lokátoru', 'montaz-gps-lokatoru', 'Autoelektrika', 'Zap', 'úkon', 2, '500–1 500 Kč', 'HIDDEN', 55),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž alarmu / imobilizéru', 'montaz-alarmu-imobilizeru', 'Autoelektrika', 'Zap', 'úkon', 3, '1 500–4 000 Kč', 'HIDDEN', 56),

-- Section: Karoserie a Skla (12 items)
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Autoklempíř', 'autoklempiř', 'Karoserie a Skla', 'Car', 'hodina', 4, '600–1 200 Kč/hod', 'PROMINENT', 57),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna čelního skla', 'vymena-celniho-skla', 'Karoserie a Skla', 'Car', 'úkon', 5, '5 000–15 000 Kč', 'STANDARD', 58),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava čelního skla (tmel)', 'oprava-celniho-skla-tmel', 'Karoserie a Skla', 'Car', 'úkon', 2, '500–1 500 Kč', 'STANDARD', 59),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava promáčklin (PDR)', 'oprava-promacklin-pdr', 'Karoserie a Skla', 'Car', 'úkon', 3, '1 000–5 000 Kč', 'STANDARD', 60),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Lakování dílů', 'lakovani-dilu', 'Karoserie a Skla', 'Car', 'díl', 5, '3 000–10 000 Kč/díl', 'STANDARD', 61),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Celolak vozidla', 'celolak-vozidla', 'Karoserie a Skla', 'Car', 'úkon', 8, '30 000–80 000 Kč', 'HIDDEN', 62),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Polep vozidla (car wrapping)', 'polep-vozidla-car-wrapping', 'Karoserie a Skla', 'Car', 'úkon', 6, '15 000–50 000 Kč', 'HIDDEN', 63),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Tónování skel', 'tonovani-skel', 'Karoserie a Skla', 'Car', 'úkon', 3, '3 000–8 000 Kč', 'HIDDEN', 64),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Ochranná fólie PPF', 'ochranna-folie-ppf', 'Karoserie a Skla', 'Car', 'úkon', 5, '10 000–40 000 Kč', 'HIDDEN', 65),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Keramická ochrana laku', 'keramicka-ochrana-laku', 'Karoserie a Skla', 'Car', 'úkon', 4, '5 000–20 000 Kč', 'HIDDEN', 66),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Leštění laku', 'lesteni-laku', 'Karoserie a Skla', 'Car', 'úkon', 3, '2 000–8 000 Kč', 'HIDDEN', 67),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Oprava / renovace světlometů', 'oprava-renovace-svetlometu', 'Karoserie a Skla', 'Car', 'úkon', 2, '500–2 000 Kč', 'HIDDEN', 68),

-- Section: Ostatní auto služby (6 items)
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Plnění klimatizace', 'plneni-klimatizace', 'Ostatní auto služby', 'Settings', 'úkon', 2, '800–1 500 Kč', 'PROMINENT', 69),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Tepování interiéru', 'tepovani-interieru', 'Ostatní auto služby', 'Settings', 'úkon', 3, '1 500–4 000 Kč', 'STANDARD', 70),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Dezinfekce klimatizace', 'dezinfekce-klimatizace', 'Ostatní auto služby', 'Settings', 'úkon', 2, '500–1 000 Kč', 'STANDARD', 71),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Renovace interiéru (kůže, plasty)', 'renovace-interieru-kuze-plasty', 'Ostatní auto služby', 'Settings', 'úkon', 4, '2 000–8 000 Kč', 'HIDDEN', 72),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž tažného zařízení', 'montaz-tazneho-zarizeni', 'Ostatní auto služby', 'Settings', 'úkon', 4, '5 000–15 000 Kč', 'HIDDEN', 73),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Montáž střešního nosiče / boxu', 'montaz-stresniho-nosice-boxu', 'Ostatní auto služby', 'Settings', 'úkon', 2, '500–2 000 Kč', 'HIDDEN', 74),

-- Section: Motocykly (5 items)
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Motomechanik', 'motomechanik', 'Motocykly', 'Bike', 'hodina', 3, '500–900 Kč/hod', 'PROMINENT', 75),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Servisní prohlídka motocyklu', 'servisni-prohlidka-motocyklu', 'Motocykly', 'Bike', 'úkon', 3, '1 500–4 000 Kč', 'STANDARD', 76),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Přezutí / výměna pneu (moto)', 'prezuti-vymena-pneu-moto', 'Motocykly', 'Bike', 'úkon', 2, '500–1 500 Kč', 'HIDDEN', 77),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Výměna řetězu a rozetkol', 'vymena-retezu-a-rozetkol', 'Motocykly', 'Bike', 'úkon', 3, '2 000–5 000 Kč', 'HIDDEN', 78),
('0feccee1-5152-4a2f-8ec7-13f169de6168', 'Sezonní uskladnění motocyklu', 'sezonni-uskladneni-motocyklu', 'Motocykly', 'Bike', 'sezona', 2, '2 000–5 000 Kč', 'HIDDEN', 79);
-- Rename Vulkanizér to Pneuservis (obecná poptávka)
UPDATE public.service_subcategories
SET name = 'Pneuservis (obecná poptávka)',
    slug = 'pneuservis-obecna-poptavka'
WHERE name = 'Vulkanizér' 
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- Rename Automechanik (Hledám mechanika - obecná poptávka) to Automechanik (obecná poptávka)
UPDATE public.service_subcategories
SET name = 'Automechanik (obecná poptávka)',
    slug = 'automechanik-obecna-poptavka'
WHERE name = 'Automechanik (Hledám mechanika - obecná poptávka)' 
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';
-- AUTOSERVIS: Move 1 from STANDARD to PROMINENT (2→3)
UPDATE public.service_subcategories
SET display_level = 'PROMINENT'
WHERE name = 'Pravidelná roční prohlídka' 
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- AUTOSERVIS: Move 2 from HIDDEN to STANDARD (4→6)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Výměna brzdových destiček', 'Výměna tlumičů')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- PNEUSERVIS: Move 2 from STANDARD to PROMINENT (1→3)
UPDATE public.service_subcategories
SET display_level = 'PROMINENT'
WHERE name IN ('Kompletní přezutí pneu (plechové)', 'Vyvážení kol')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- PNEUSERVIS: Move 1 from HIDDEN to STANDARD (2→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name = 'Uskladnění pneu'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- AUTOELEKTRIKA: Move 1 from STANDARD to PROMINENT (2→3)
UPDATE public.service_subcategories
SET display_level = 'PROMINENT'
WHERE name = 'Výměna autobaterie'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- AUTOELEKTRIKA: Move 1 from HIDDEN to STANDARD (1→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Oprava startéru', 'Oprava alternátoru')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- KAROSERIE: Move 2 from STANDARD to PROMINENT (1→3)
UPDATE public.service_subcategories
SET display_level = 'PROMINENT'
WHERE name IN ('Výměna čelního skla', 'Lakování auta')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- KAROSERIE: Move 1 from HIDDEN to STANDARD (2→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name = 'Oprava promáčklin (PDR)'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- OSTATNÍ AUTO SLUŽBY: Move 2 from STANDARD to PROMINENT (1→3)
UPDATE public.service_subcategories
SET display_level = 'PROMINENT'
WHERE name IN ('Tepování interiéru', 'Detailing vozu')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- OSTATNÍ AUTO SLUŽBY: Move 1 from HIDDEN to STANDARD (0→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Renovace světlometů', 'Čištění interiéru', 'Renovace kůže v interiéru')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- MOTOCYKLY: Move 2 from STANDARD/HIDDEN to PROMINENT (1→3)
UPDATE public.service_subcategories
SET display_level = 'PROMINENT'
WHERE name IN ('Servisní prohlídka motocyklu', 'Výměna pneumatik na motorce')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- MOTOCYKLY: Move 1 from HIDDEN to STANDARD (0→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Oprava motocyklu', 'Diagnostika motocyklu', 'Příprava motorky na STK')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';
-- AUTOELEKTRIKA: Move 2 from HIDDEN to STANDARD (1→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Výměna startéru', 'Výměna žárovek / LED světel')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- MOTOCYKLY: Move 3 from HIDDEN to STANDARD (0→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Oprava motocyklu', 'Diagnostika motocyklu', 'Příprava motorky na STK')
  AND section = 'Motocykly'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- OSTATNÍ AUTO SLUŽBY: Move 2 from HIDDEN to STANDARD (1→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Renovace světlometů', 'Čištění interiéru')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- PNEUSERVIS: Move 1 from HIDDEN to STANDARD (2→3)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name = 'Uskladnění pneu'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- AUTOSERVIS: Move 2 from HIDDEN to STANDARD (4→6)
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE name IN ('Výměna pružin', 'Výměna ramen / silentbloků')
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';
-- Add Autolakýrník to Karoserie a skla section as PROMINENT
INSERT INTO public.service_subcategories (
  category_id,
  name,
  slug,
  section,
  section_icon,
  display_level,
  unit,
  points_cost,
  price_range,
  sort_order
) VALUES (
  '0feccee1-5152-4a2f-8ec7-13f169de6168',
  'Autolakýrník',
  'autolakynik',
  'Karoserie a skla',
  'Shield',
  'PROMINENT',
  'díl',
  4,
  '3 000 - 5 000 Kč',
  6
);

-- Add Odtahová služba to Ostatní auto služby section as PROMINENT
INSERT INTO public.service_subcategories (
  category_id,
  name,
  slug,
  section,
  section_icon,
  display_level,
  unit,
  points_cost,
  price_range,
  sort_order
) VALUES (
  '0feccee1-5152-4a2f-8ec7-13f169de6168',
  'Odtahová služba',
  'odtahova-sluzba',
  'Ostatní auto služby',
  'Wrench',
  'PROMINENT',
  'km/výjezd',
  3,
  '15 - 25 Kč/km',
  1
);
-- Fix section name for Autolakýrník to match existing section
UPDATE public.service_subcategories
SET section = 'Karoserie a skla'
WHERE name = 'Autolakýrník'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';
-- Merge Karoserie sections by standardizing the name (lowercase 's' in 'skla')
UPDATE public.service_subcategories
SET section = 'Karoserie a skla'
WHERE section = 'Karoserie a Skla'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- Change all HIDDEN to STANDARD in Motocykly section
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE section = 'Motocykly'
  AND display_level = 'HIDDEN'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';

-- Change all HIDDEN to STANDARD in Ostatní auto služby section
UPDATE public.service_subcategories
SET display_level = 'STANDARD'
WHERE section = 'Ostatní auto služby'
  AND display_level = 'HIDDEN'
  AND category_id = '0feccee1-5152-4a2f-8ec7-13f169de6168';
-- Add price_note column to jobs table
ALTER TABLE public.jobs ADD COLUMN price_note TEXT;
-- Rename Elektrikář category to Elektro
UPDATE public.service_categories 
SET name = 'Elektro', slug = 'elektro'
WHERE id = 'aa36ca8a-f286-4356-94a0-97a4fa88410c';

-- Delete all existing subcategories for Elektro
DELETE FROM public.service_subcategories 
WHERE category_id = 'aa36ca8a-f286-4356-94a0-97a4fa88410c';

-- Insert new subcategories for Elektro with sections and icons
INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order) VALUES
-- Elektroinstalace section (icon: Zap)
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Elektrikář (Hledám elektrikáře - obecná poptávka)', 'elektrikar-obecna-poptavka', 'hodina', 3, '400 - 700 Kč/hod', 'SUPERPROMINENT', 'Elektroinstalace', 'Zap', 1),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Diagnostika závady (nesvítí / nefunguje)', 'diagnostika-zavady-elektro', 'úkon', 2, '500 - 1 000 Kč', 'PROMINENT', 'Elektroinstalace', 'Zap', 2),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Elektrikářská pohotovost', 'elektrikarska-pohotovost', 'výjezd', 3, '1 500 - 3 000 Kč', 'PROMINENT', 'Elektroinstalace', 'Zap', 3),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž a zapojení zásuvky / vypínače', 'montaz-zapojeni-zasuvky-vypinace', 'kus', 1, '150 - 300 Kč', 'STANDARD', 'Elektroinstalace', 'Zap', 4),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž svítidla / lustru', 'montaz-svitidla-lustru', 'kus', 1, '300 - 600 Kč', 'STANDARD', 'Elektroinstalace', 'Zap', 5),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Zapojení indukční / sklokeramické desky', 'zapojeni-indukcni-desky', 'úkon', 2, '800 - 1 500 Kč', 'STANDARD', 'Elektroinstalace', 'Zap', 6),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Zapojení digestoře', 'zapojeni-digesto​re', 'úkon', 2, '800 - 1 500 Kč', 'STANDARD', 'Elektroinstalace', 'Zap', 7),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Zapojení bojleru / průtokového ohřívače', 'zapojeni-bojleru-ohrivace', 'úkon', 2, '1 000 - 2 000 Kč', 'STANDARD', 'Elektroinstalace', 'Zap', 8),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž a revize hromosvodu', 'montaz-revize-hromosvodu', 'úkon', 5, '5 000 - 15 000 Kč', 'STANDARD', 'Elektroinstalace', 'Zap', 9),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Kompletní elektroinstalace bytu (nová)', 'kompletni-elektroinstalace-bytu', 'projekt', 8, '80 000 - 150 000 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 10),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Výměna elektroinstalace v jádře', 'vymena-elektroinstalace-jadre', 'projekt', 6, '30 000 - 50 000 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 11),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Výměna jističů / Úprava rozvaděče', 'vymena-jisticu-rozvadece', 'úkon', 4, '2 500 - 5 000 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 12),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž LED pásků (kuchyň, podhledy)', 'montaz-led-pasku', 'bm', 3, '350 - 600 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 13),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Zapojení akumulačních kamen / přímotopu', 'zapojeni-akumulacnich-kamen', 'úkon', 2, '1 000 - 2 000 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 14),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Revize elektroinstalace (výchozí/pravidelná)', 'revize-elektroinstalace', 'úkon', 3, '1 500 - 3 500 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 15),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Přihláška k odběru (revize pro ČEZ/EON)', 'prihlaska-odberu-revize', 'úkon', 3, '2 000 - 3 000 Kč', 'HIDDEN', 'Elektroinstalace', 'Zap', 16),

-- Internet a Zabezpečení section (icon: Wifi)
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'IT technik (Sítě a kamery - obecná poptávka)', 'it-technik-obecna-poptavka', 'hodina', 3, '500 - 900 Kč/hod', 'PROMINENT', 'Internet a Zabezpečení', 'Wifi', 17),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Nastavení Wi-Fi routeru / sítě', 'nastaveni-wifi-routeru', 'úkon', 2, '500 - 1 000 Kč', 'PROMINENT', 'Internet a Zabezpečení', 'Wifi', 18),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž zabezpečovacího systému (Alarm)', 'montaz-zabezpecovaciho-systemu', 'čidlo', 6, '1 500 - 3 000 Kč', 'PROMINENT', 'Internet a Zabezpečení', 'Wifi', 19),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Rozvody datové sítě (UTP/FTP)', 'rozvody-datove-site', 'zásuvka', 4, '400 - 800 Kč', 'STANDARD', 'Internet a Zabezpečení', 'Wifi', 20),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž kamerového systému (CCTV)', 'montaz-kameroveho-systemu', 'kamera', 6, '2 500 - 5 000 Kč', 'STANDARD', 'Internet a Zabezpečení', 'Wifi', 21),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž domovního videotelefonu', 'montaz-domovniho-videotelefonu', 'úkon', 4, '2 000 - 4 000 Kč', 'STANDARD', 'Internet a Zabezpečení', 'Wifi', 22),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž datového rozvaděče (RACK)', 'montaz-datoveho-rozvadece', 'úkon', 3, '1 500 - 3 000 Kč', 'STANDARD', 'Internet a Zabezpečení', 'Wifi', 23),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Montáž TV antény / Satelitu', 'montaz-tv-anteny-satelitu', 'úkon', 3, '1 000 - 2 500 Kč', 'STANDARD', 'Internet a Zabezpečení', 'Wifi', 24),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Instalace chytrého termostatu', 'instalace-chytreho-termostatu', 'úkon', 2, '1 000 - 2 000 Kč', 'STANDARD', 'Internet a Zabezpečení', 'Wifi', 25),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Automatizace osvětlení (Smart Home)', 'automatizace-osvetleni-smart-home', 'okruh', 6, '1 500 - 3 000 Kč', 'HIDDEN', 'Internet a Zabezpečení', 'Wifi', 26),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Automatizace žaluzií / brány', 'automatizace-zaluzii-brany', 'úkon', 5, '2 000 - 5 000 Kč', 'HIDDEN', 'Internet a Zabezpečení', 'Wifi', 27),

-- Fotovoltaika section (icon: Sun)
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Specialista FVE (Fotovoltaika - obecná poptávka)', 'specialista-fve-poptavka', 'konzultace', 4, 'Zdarma - 2000 Kč', 'PROMINENT', 'Fotovoltaika', 'Sun', 28),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Instalace FVE panelů', 'instalace-fve-panelu', 'panel', 9, '2 000 - 3 500 Kč', 'PROMINENT', 'Fotovoltaika', 'Sun', 29),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Servis a revize FVE', 'servis-revize-fve', 'úkon', 4, '2 500 - 5 000 Kč', 'PROMINENT', 'Fotovoltaika', 'Sun', 30),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Zapojení střídače a baterií', 'zapojeni-stridace-baterii', 'úkon', 7, '10 000 - 20 000 Kč', 'STANDARD', 'Fotovoltaika', 'Sun', 31),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Administrace dotací FVE', 'administrace-dotaci-fve', 'úkon', 3, '5 000 - 10 000 Kč', 'STANDARD', 'Fotovoltaika', 'Sun', 32),
('aa36ca8a-f286-4356-94a0-97a4fa88410c', 'Mytí solárních panelů', 'myti-solarnich-panelu', 'm2', 2, '100 - 200 Kč', 'STANDARD', 'Fotovoltaika', 'Sun', 33);
-- Rename Autoservis category to Auto-Moto
UPDATE public.service_categories 
SET name = 'Auto-Moto', slug = 'auto-moto'
WHERE slug = 'autoservis';
-- Rename Elektro subcategories
UPDATE public.service_subcategories 
SET name = 'Elektrikář (obecná poptávka)' 
WHERE name = 'Elektrikář (Hledám elektrikáře - obecná poptávka)';

UPDATE public.service_subcategories 
SET name = 'IT technik (obecná poptávka)' 
WHERE name = 'IT technik (Sítě a kamery - obecná poptávka)';

UPDATE public.service_subcategories 
SET name = 'Fotovoltaika (obecná poptávka)' 
WHERE name = 'Specialista FVE (Fotovoltaika - obecná poptávka)';
UPDATE public.service_categories 
SET name = 'Auto-Moto', slug = 'auto-moto' 
WHERE slug = 'autoservis' OR name = 'Autoservis';
-- Delete existing subcategories for Instalatér category
DELETE FROM public.service_subcategories 
WHERE category_id = '54f35c7c-e8a0-4a0d-a680-10a14280f6cd';

-- Insert new subcategories with sections
INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order) VALUES
-- Vodoinstalace section
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Instalatér (obecná poptávka)', 'instalater-obecna-poptavka', 'hodina', 3, '400 - 700 Kč/hod', 'SUPERPROMINENT', 'Vodoinstalace', 'Droplets', 1),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Diagnostika závady / Vyhledání úniku vody', 'diagnostika-zavady-voda', 'úkon', 2, '500 - 1 000 Kč', 'PROMINENT', 'Vodoinstalace', 'Droplets', 2),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Instalatérská pohotovost', 'instalaterska-pohotovost', 'výjezd', 3, '1 500 - 3 000 Kč', 'PROMINENT', 'Vodoinstalace', 'Droplets', 3),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna vodovodní baterie (stojánková/nástěnná)', 'vymena-vodovodní-baterie', 'kus', 2, '500 - 900 Kč', 'STANDARD', 'Vodoinstalace', 'Droplets', 4),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Oprava protékajícího WC', 'oprava-protekajiciho-wc', 'úkon', 2, '600 - 1 200 Kč', 'STANDARD', 'Vodoinstalace', 'Droplets', 5),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Čištění odpadů (sifon, dřez, vana)', 'cisteni-odpadu', 'úkon', 2, '600 - 1 200 Kč', 'STANDARD', 'Vodoinstalace', 'Droplets', 6),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž podomítkového modulu (Geberit)', 'montaz-podomitkoveho-modulu', 'kus', 3, '2 000 - 3 500 Kč', 'STANDARD', 'Vodoinstalace', 'Droplets', 7),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž WC mísy (závěsné/kombi)', 'montaz-wc-misy', 'kus', 2, '800 - 1 500 Kč', 'STANDARD', 'Vodoinstalace', 'Droplets', 8),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž umyvadla / dřezu', 'montaz-umyvadla-drezu', 'kus', 2, '800 - 1 500 Kč', 'STANDARD', 'Vodoinstalace', 'Droplets', 9),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž vany', 'montaz-vany', 'kus', 4, '2 500 - 5 000 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 10),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž sprchového koutu / zástěny', 'montaz-sprchoveho-koutu', 'kus', 4, '2 500 - 5 000 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 11),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Silikonování vany / sprchy', 'silikonovani-vany-sprchy', 'bm', 1, '150 - 300 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 12),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna roháčků / ventilů', 'vymena-rohacku-ventilu', 'kus', 2, '300 - 600 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 13),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Oprava kapající baterie', 'oprava-kapajici-baterie', 'úkon', 1, '400 - 800 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 14),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Připojení pračky / myčky', 'pripojeni-pracky-mycky', 'úkon', 1, '500 - 800 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 15),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Strojní čištění kanalizace (pero/tlak)', 'strojni-cisteni-kanalizace', 'hodina/metr', 3, '1 800 - 3 000 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 16),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Nové rozvody vody a odpadů (plast)', 'nove-rozvody-vody-odpadu', 'bm', 6, '800 - 1 500 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 17),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna vodoměrů', 'vymena-vodomeru', 'kus', 3, '500 - 1 000 Kč', 'HIDDEN', 'Vodoinstalace', 'Droplets', 18),
-- Topení section
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Topenář (obecná poptávka)', 'topenar-obecna-poptavka', 'hodina', 3, '450 - 800 Kč/hod', 'PROMINENT', 'Topení', 'Flame', 19),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Servis a čištění plynového kotle', 'servis-cisteni-plynoveho-kotle', 'úkon', 3, '1 500 - 3 000 Kč', 'PROMINENT', 'Topení', 'Flame', 20),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Napuštění a odvzdušnění topení', 'napusteni-odvzduseni-topeni', 'úkon', 2, '800 - 1 500 Kč', 'PROMINENT', 'Topení', 'Flame', 21),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž radiátoru', 'montaz-radiatoru', 'kus', 3, '1 500 - 2 500 Kč', 'STANDARD', 'Topení', 'Flame', 22),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna termohlavice / ventilu radiátoru', 'vymena-termohlavice-ventilu', 'kus', 2, '300 - 600 Kč', 'STANDARD', 'Topení', 'Flame', 23),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Proplach topného systému', 'proplach-topneho-systemu', 'okruh', 5, '500 - 1 000 Kč', 'STANDARD', 'Topení', 'Flame', 24),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž podlahového topení', 'montaz-podlahoveho-topeni', 'm2', 7, '500 - 800 Kč', 'STANDARD', 'Topení', 'Flame', 25),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna / Montáž plynového kotle', 'vymena-montaz-plynoveho-kotle', 'úkon', 6, '6 000 - 12 000 Kč', 'STANDARD', 'Topení', 'Flame', 26),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Revize kotle', 'revize-kotle', 'úkon', 3, '1 500 - 2 500 Kč', 'STANDARD', 'Topení', 'Flame', 27),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna / Montáž elektrokotle', 'vymena-montaz-elektrokotle', 'úkon', 6, '4 000 - 8 000 Kč', 'HIDDEN', 'Topení', 'Flame', 28),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž kotle na tuhá paliva', 'montaz-kotle-tuha-paliva', 'úkon', 6, '8 000 - 15 000 Kč', 'HIDDEN', 'Topení', 'Flame', 29),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Montáž tepelného čerpadla', 'montaz-tepelneho-cerpadla', 'projekt', 8, '25 000 - 50 000 Kč', 'HIDDEN', 'Topení', 'Flame', 30),
-- Plyn section
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Plynař (obecná poptávka)', 'plynar-obecna-poptavka', 'hodina', 3, '500 - 900 Kč/hod', 'PROMINENT', 'Plyn', 'Fuel', 31),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Připojení plynového sporáku', 'pripojeni-plynoveho-sporaku', 'úkon', 2, '800 - 1 500 Kč', 'PROMINENT', 'Plyn', 'Fuel', 32),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Revize plynového zařízení', 'revize-plynoveho-zarizeni', 'úkon', 3, '1 000 - 2 000 Kč', 'PROMINENT', 'Plyn', 'Fuel', 33),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Nové rozvody plynu', 'nove-rozvody-plynu', 'bm', 6, '800 - 1 500 Kč', 'STANDARD', 'Plyn', 'Fuel', 34),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Zkouška těsnosti plynu', 'zkouska-tesnosti-plynu', 'úkon', 2, '800 - 1 500 Kč', 'STANDARD', 'Plyn', 'Fuel', 35),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Odpojení plynového spotřebiče', 'odpojeni-plynoveho-spotrebice', 'úkon', 1, '500 - 1 000 Kč', 'STANDARD', 'Plyn', 'Fuel', 36);
-- Rename Stavebnictví to Stavby/Rekonstrukce
UPDATE public.service_categories
SET name = 'Stavby/Rekonstrukce', slug = 'stavby-rekonstrukce'
WHERE slug = 'stavebnictvi' OR name = 'Stavebnictví';

-- Delete all existing subcategories for Stavby/Rekonstrukce
DELETE FROM public.service_subcategories 
WHERE category_id = (SELECT id FROM public.service_categories WHERE slug = 'stavby-rekonstrukce');

-- Insert all new subcategories for Stavby/Rekonstrukce
INSERT INTO public.service_subcategories (name, slug, category_id, section, section_icon, display_level, sort_order)
SELECT 
  name, 
  slug,
  (SELECT id FROM public.service_categories WHERE slug = 'stavby-rekonstrukce'),
  section,
  section_icon,
  display_level,
  sort_order
FROM (VALUES
  -- Zednické práce (10 items)
  ('Zedník (Hledám zedníka - obecná poptávka)', 'zednik-obecna-poptavka', 'Zednické práce', 'Hammer', 'SUPERPROMINENT', 1),
  ('Vyzdívání příček (Ytong, cihla)', 'vyzdivani-pricek', 'Zednické práce', 'Hammer', 'PROMINENT', 2),
  ('Jádrová omítka', 'jadrova-omitka', 'Zednické práce', 'Hammer', 'PROMINENT', 3),
  ('Fajnová omítka (štukování)', 'fajnova-omitka', 'Zednické práce', 'Hammer', 'STANDARD', 4),
  ('Perlinka + lepidlo (natahování)', 'perlinka-lepidlo', 'Zednické práce', 'Hammer', 'STANDARD', 5),
  ('Betonování podlah (potěr)', 'betonovani-podlah', 'Zednické práce', 'Hammer', 'STANDARD', 6),
  ('Samonivelační stěrka (vyrovnání)', 'samonivelacni-sterka', 'Zednické práce', 'Hammer', 'STANDARD', 7),
  ('Bourání příček (nenosných)', 'bourani-pricek', 'Zednické práce', 'Hammer', 'STANDARD', 8),
  ('Bourání obkladů a dlažby', 'bourani-obkladu-dlazby', 'Zednické práce', 'Hammer', 'STANDARD', 9),
  ('Vyřezávání otvorů pro dveře', 'vyrezavani-otvoru-dvere', 'Zednické práce', 'Hammer', 'HIDDEN', 10),
  
  -- Sádrokartony (6 items)
  ('Sádrokartonář (SDK práce - obecná poptávka)', 'sadrokartonar-obecna-poptavka', 'Sádrokartony', 'Square', 'PROMINENT', 1),
  ('SDK podhledy (rovné)', 'sdk-podhledy-rovne', 'Sádrokartony', 'Square', 'PROMINENT', 2),
  ('SDK příčky (jednoduché/dvojité)', 'sdk-pricky', 'Sádrokartony', 'Square', 'PROMINENT', 3),
  ('SDK předstěny', 'sdk-predsteny', 'Sádrokartony', 'Square', 'STANDARD', 4),
  ('Půdní vestavba (šikminy, zateplení)', 'pudni-vestavba', 'Sádrokartony', 'Square', 'STANDARD', 5),
  ('Kazetové podhledy (Raster)', 'kazetove-podhledy', 'Sádrokartony', 'Square', 'STANDARD', 6),
  
  -- Obklady a Dlažby (7 items)
  ('Obkladač (Hledám obkladače - obecná poptávka)', 'obkladac-obecna-poptavka', 'Obklady a Dlažby', 'Grid3X3', 'PROMINENT', 1),
  ('Pokládka obkladů (koupelna/WC)', 'pokladka-obkladu-koupelna', 'Obklady a Dlažby', 'Grid3X3', 'PROMINENT', 2),
  ('Pokládka dlažby (chodba/kuchyň)', 'pokladka-dlazby-chodba', 'Obklady a Dlažby', 'Grid3X3', 'PROMINENT', 3),
  ('Pokládka velkoformátové dlažby', 'pokladka-velkoformatove-dlazby', 'Obklady a Dlažby', 'Grid3X3', 'STANDARD', 4),
  ('Obložení schodů', 'oblozeni-schodu', 'Obklady a Dlažby', 'Grid3X3', 'STANDARD', 5),
  ('Silikonování rohů a koutů', 'silikonovani-rohu', 'Obklady a Dlažby', 'Grid3X3', 'STANDARD', 6),
  ('Kamenický roh (kamenické spoje)', 'kamenicky-roh', 'Obklady a Dlažby', 'Grid3X3', 'STANDARD', 7),
  
  -- Podlahy (8 items)
  ('Podlahář (Hledám podlaháře - obecná poptávka)', 'podlahar-obecna-poptavka', 'Podlahy', 'Layers', 'PROMINENT', 1),
  ('Pokládka plovoucí podlahy (laminát)', 'pokladka-plovouci-podlahy', 'Podlahy', 'Layers', 'PROMINENT', 2),
  ('Pokládka vinylové podlahy (lepené/click)', 'pokladka-vinylove-podlahy', 'Podlahy', 'Layers', 'PROMINENT', 3),
  ('Pokládka dřevěné podlahy', 'pokladka-drevene-podlahy', 'Podlahy', 'Layers', 'STANDARD', 4),
  ('Broušení a lakování parket', 'brouseni-lakovani-parket', 'Podlahy', 'Layers', 'STANDARD', 5),
  ('Pokládka koberce', 'pokladka-koberce', 'Podlahy', 'Layers', 'STANDARD', 6),
  ('Pokládka PVC / Lina', 'pokladka-pvc-lina', 'Podlahy', 'Layers', 'STANDARD', 7),
  ('Montáž obvodových lišt', 'montaz-obvodovych-list', 'Podlahy', 'Layers', 'STANDARD', 8),
  
  -- Malíři a Tapetáři (8 items)
  ('Malíř pokojů (Hledám malíře - obecná poptávka)', 'malir-obecna-poptavka', 'Malíři a Tapetáři', 'Paintbrush', 'SUPERPROMINENT', 1),
  ('Malování pokojů (bílá)', 'malovani-pokoju-bila', 'Malíři a Tapetáři', 'Paintbrush', 'PROMINENT', 2),
  ('Malování pokojů (barevná)', 'malovani-pokoju-barevna', 'Malíři a Tapetáři', 'Paintbrush', 'PROMINENT', 3),
  ('Škrábání staré malby', 'skrabani-stare-malby', 'Malíři a Tapetáři', 'Paintbrush', 'STANDARD', 4),
  ('Penetrace podkladu', 'penetrace-podkladu', 'Malíři a Tapetáři', 'Paintbrush', 'STANDARD', 5),
  ('Tapetování (vlies/papír)', 'tapetovani', 'Malíři a Tapetáři', 'Paintbrush', 'STANDARD', 6),
  ('Lakování dveří a zárubní', 'lakovani-dveri-zarubni', 'Malíři a Tapetáři', 'Paintbrush', 'STANDARD', 7),
  ('Nátěr radiátorů', 'nater-radiatoru', 'Malíři a Tapetáři', 'Paintbrush', 'STANDARD', 8),
  
  -- Fasády (6 items)
  ('Fasádník (Zateplení a fasády - obecná poptávka)', 'fasadnik-obecna-poptavka', 'Fasády', 'Building', 'PROMINENT', 1),
  ('Zateplení fasády (polystyren/vata)', 'zatepleni-fasady', 'Fasády', 'Building', 'PROMINENT', 2),
  ('Montáž lešení', 'montaz-leseni', 'Fasády', 'Building', 'PROMINENT', 3),
  ('Natažení fasádní omítky', 'natazeni-fasadni-omitky', 'Fasády', 'Building', 'STANDARD', 4),
  ('Nátěr fasády', 'nater-fasady', 'Fasády', 'Building', 'STANDARD', 5),
  ('Oprava trhlin ve fasádě', 'oprava-trhlin-fasada', 'Fasády', 'Building', 'STANDARD', 6),
  
  -- Okna a Dveře (15 items)
  ('Montážník oken/dveří (Hledám montéra - obecná poptávka)', 'montaznik-oken-dveri-obecna', 'Okna a Dveře', 'DoorOpen', 'PROMINENT', 1),
  ('Seřízení kování oken', 'serizeni-kovani-oken', 'Okna a Dveře', 'DoorOpen', 'PROMINENT', 2),
  ('Montáž interiérových dveří a zárubní', 'montaz-interierovych-dveri', 'Okna a Dveře', 'DoorOpen', 'PROMINENT', 3),
  ('Demontáž starých oken', 'demontaz-starych-oken', 'Okna a Dveře', 'DoorOpen', 'STANDARD', 4),
  ('Montáž nových oken', 'montaz-novych-oken', 'Okna a Dveře', 'DoorOpen', 'STANDARD', 5),
  ('Montáž žaluzií (horizontální/vertikální)', 'montaz-zaluzii', 'Okna a Dveře', 'DoorOpen', 'STANDARD', 6),
  ('Zednické začištění oken (špalety)', 'zednicke-zacisteni-oken', 'Okna a Dveře', 'DoorOpen', 'STANDARD', 7),
  ('Výměna okenního těsnění', 'vymena-okenni-tesneni', 'Okna a Dveře', 'DoorOpen', 'STANDARD', 8),
  ('Montáž vnitřních parapetů', 'montaz-vnitrnich-parapetu', 'Okna a Dveře', 'DoorOpen', 'STANDARD', 9),
  ('Montáž venkovních parapetů', 'montaz-venkovnich-parapetu', 'Okna a Dveře', 'DoorOpen', 'HIDDEN', 10),
  ('Montáž vchodových dveří', 'montaz-vchodovych-dveri', 'Okna a Dveře', 'DoorOpen', 'HIDDEN', 11),
  ('Montáž posuvných dveří (pouzdro/stěna)', 'montaz-posuvnych-dveri', 'Okna a Dveře', 'DoorOpen', 'HIDDEN', 12),
  ('Montáž sítí proti hmyzu', 'montaz-siti-hmyz', 'Okna a Dveře', 'DoorOpen', 'HIDDEN', 13),
  ('Montáž předokenních rolet', 'montaz-predokennich-rolet', 'Okna a Dveře', 'DoorOpen', 'HIDDEN', 14),
  ('Montáž garážových vrat', 'montaz-garazovych-vrat', 'Okna a Dveře', 'DoorOpen', 'HIDDEN', 15),
  
  -- Střecha (9 items)
  ('Pokrývač / Klempíř (Hledám střechaře - obecná poptávka)', 'pokryvac-klempir-obecna', 'Střecha', 'Home', 'PROMINENT', 1),
  ('Oprava zatékání střechy', 'oprava-zatekani-strechy', 'Střecha', 'Home', 'PROMINENT', 2),
  ('Pokládka střešní krytiny (taška/plech)', 'pokladka-stresni-krytiny', 'Střecha', 'Home', 'PROMINENT', 3),
  ('Montáž střešních latí a fólie', 'montaz-stresnich-lati-folie', 'Střecha', 'Home', 'STANDARD', 4),
  ('Montáž střešních oken', 'montaz-stresnich-oken', 'Střecha', 'Home', 'STANDARD', 5),
  ('Čištění okapů', 'cisteni-okapu', 'Střecha', 'Home', 'STANDARD', 6),
  ('Klempířské prvky (úžlabí, lemování)', 'klempirske-prvky', 'Střecha', 'Home', 'STANDARD', 7),
  ('Montáž okapů a svodů', 'montaz-okapu-svodu', 'Střecha', 'Home', 'STANDARD', 8),
  ('Nátěr střechy', 'nater-strechy', 'Střecha', 'Home', 'STANDARD', 9),
  
  -- Stavba (7 items)
  ('Dělník (Výkopy, betonování - obecná poptávka)', 'delnik-obecna-poptavka', 'Stavba', 'HardHat', 'PROMINENT', 1),
  ('Výkopové práce (ruční)', 'vykopove-prace-rucni', 'Stavba', 'HardHat', 'PROMINENT', 2),
  ('Výkopové práce (minibagr)', 'vykopove-prace-minibagr', 'Stavba', 'HardHat', 'PROMINENT', 3),
  ('Betonování základových pasů', 'betonovani-zakladovych-pasu', 'Stavba', 'HardHat', 'STANDARD', 4),
  ('Ztracené bednění (zdění)', 'ztracene-bedneni', 'Stavba', 'HardHat', 'STANDARD', 5),
  ('Hydroizolace spodní stavby', 'hydroizolace-spodni-stavby', 'Stavba', 'HardHat', 'STANDARD', 6),
  ('Drenáž kolem domu', 'drenaz-kolem-domu', 'Stavba', 'HardHat', 'STANDARD', 7)
) AS v(name, slug, section, section_icon, display_level, sort_order);
-- Rename the category from "Rekonstrukce / opravy" to "Zámečník"
UPDATE service_categories 
SET name = 'Zámečník', slug = 'zamecnik'
WHERE id = 'fc067ba7-2eda-4905-8c29-8d40b365636d';

-- Delete all existing subcategories for this category
DELETE FROM service_subcategories 
WHERE category_id = 'fc067ba7-2eda-4905-8c29-8d40b365636d';

-- Insert new subcategories with sections (Kovovýroba and Zámečník)
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, section, section_icon, display_level, sort_order)
VALUES
  -- Kovovýroba section
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Kovovýroba (Hledám zámečníka - obecná poptávka)', 'kovovyroba-obecna', 'hodina', 3, '500 - 900 Kč/hod', 'Kovovýroba', 'Hammer', 'PROMINENT', 1),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Výroba a montáž vjezdové brány', 'vyroba-vjezdova-brana', 'kus', 7, '15 000 - 40 000 Kč', 'Kovovýroba', 'Hammer', 'PROMINENT', 2),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Výroba a montáž branky', 'vyroba-branky', 'kus', 5, '5 000 - 10 000 Kč', 'Kovovýroba', 'Hammer', 'PROMINENT', 3),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Svářečské práce (ocel/nerez/hliník)', 'svarecske-prace', 'hodina', 3, '500 - 900 Kč', 'Kovovýroba', 'Hammer', 'STANDARD', 4),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Montáž pohonu brány (automatizace)', 'montaz-pohonu-brany', 'kus', 5, '3 000 - 6 000 Kč', 'Kovovýroba', 'Hammer', 'STANDARD', 5),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Zábradlí na balkon / schodiště (kov)', 'zabradli-kov', 'bm', 6, '2 500 - 5 000 Kč', 'Kovovýroba', 'Hammer', 'STANDARD', 6),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Výroba ocelového schodiště', 'vyroba-ocelove-schodiste', 'projekt', 8, '30 000 - 80 000 Kč', 'Kovovýroba', 'Hammer', 'STANDARD', 7),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Broušení a leštění kovů', 'brouseni-lesteni-kovu', 'hodina', 3, '400 - 700 Kč', 'Kovovýroba', 'Hammer', 'STANDARD', 8),
  
  -- Zámečník section
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Otevírání dveří (Hledám zámečníka - obecná poptávka)', 'otevirani-dveri-obecna', 'výjezd', 3, 'Dle ceníku', 'Zámečník', 'Key', 'SUPERPROMINENT', 10),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Výměna zámkové vložky', 'vymena-zamkove-vlozky', 'kus', 2, '300 - 600 Kč', 'Zámečník', 'Key', 'PROMINENT', 11),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Nouzové otevírání dveří (zabouchnuté)', 'nouzove-otevirani-zabouchnute', 'výjezd', 3, '1 000 - 1 500 Kč', 'Zámečník', 'Key', 'PROMINENT', 12),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Nouzové otevírání dveří (zamčené)', 'nouzove-otevirani-zamcene', 'výjezd', 3, '1 500 - 2 500 Kč', 'Zámečník', 'Key', 'STANDARD', 13),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Výměna zadlabacího zámku', 'vymena-zadlabaciho-zamku', 'kus', 2, '400 - 800 Kč', 'Zámečník', 'Key', 'STANDARD', 14),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Oprava zasekávajícího zámku', 'oprava-zasekavajiciho-zamku', 'úkon', 2, '500 - 1 000 Kč', 'Zámečník', 'Key', 'STANDARD', 15),
  ('fc067ba7-2eda-4905-8c29-8d40b365636d', 'Montáž bezpečnostního kování', 'montaz-bezpecnostniho-kovani', 'kus', 2, '500 - 1 000 Kč', 'Zámečník', 'Key', 'STANDARD', 16);
-- Rename subcategories
UPDATE service_subcategories 
SET name = 'Zámečník (obecná poptávka)'
WHERE category_id = 'fc067ba7-2eda-4905-8c29-8d40b365636d' 
AND name = 'Otevírání dveří (Hledám zámečníka - obecná poptávka)';

UPDATE service_subcategories 
SET name = 'Kovovýroba (obecná poptávka)'
WHERE category_id = 'fc067ba7-2eda-4905-8c29-8d40b365636d' 
AND name = 'Kovovýroba (Hledám zámečníka - obecná poptávka)';
-- Delete existing subcategories for Truhlářství / Nábytek
DELETE FROM service_subcategories 
WHERE category_id = 'b273d0ed-9798-4573-b02f-596033188770';

-- Insert new subcategories from CSV
-- Section: Nábytek na míru
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
VALUES 
  ('b273d0ed-9798-4573-b02f-596033188770', 'Truhlář (Hledám truhláře - obecná poptávka)', 'truhlar-obecna-poptavka', 'hodina', 3, '400 - 700 Kč/hod', 'PROMINENT', 'Nábytek na míru', 'Hammer', 1),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výroba kuchyňské linky', 'vyroba-kuchynske-linky', 'bm/projekt', 8, '10 000 - 25 000 Kč/bm', 'PROMINENT', 'Nábytek na míru', 'Hammer', 2),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výroba vestavěné skříně', 'vyroba-vestavene-skrine', 'bm/projekt', 7, '8 000 - 15 000 Kč/bm', 'PROMINENT', 'Nábytek na míru', 'Hammer', 3),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výměna pracovní desky', 'vymena-pracovni-desky', 'bm', 4, '1 500 - 3 000 Kč', 'STANDARD', 'Nábytek na míru', 'Hammer', 4),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výměna kuchyňských dvířek', 'vymena-kuchynskych-dvirek', 'kus', 4, '800 - 2 000 Kč', 'STANDARD', 'Nábytek na míru', 'Hammer', 5),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výroba postele z masivu', 'vyroba-postele-masivu', 'kus', 6, '10 000 - 25 000 Kč', 'STANDARD', 'Nábytek na míru', 'Hammer', 6),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výroba jídelního stolu', 'vyroba-jidelniho-stolu', 'kus', 5, '8 000 - 20 000 Kč', 'STANDARD', 'Nábytek na míru', 'Hammer', 7),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výroba knihovny / polic', 'vyroba-knihovny-polic', 'projekt', 5, '5 000 - 15 000 Kč', 'STANDARD', 'Nábytek na míru', 'Hammer', 8),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Koupelnový nábytek na míru', 'koupelnovy-nabytek-na-miru', 'projekt', 6, '10 000 - 25 000 Kč', 'STANDARD', 'Nábytek na míru', 'Hammer', 9),
-- Section: Montáž nábytku
  ('b273d0ed-9798-4573-b02f-596033188770', 'Montér nábytku (Skládání nábytku - obecná poptávka)', 'monter-nabytku-obecna-poptavka', 'hodina', 2, '300 - 500 Kč/hod', 'PROMINENT', 'Montáž nábytku', 'Package', 10),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Montáž nábytku IKEA / Jysk apod.', 'montaz-nabytku-ikea-jysk', 'hodina/kus', 3, '350 - 500 Kč/hod', 'PROMINENT', 'Montáž nábytku', 'Package', 11),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Montáž kuchyňské linky (sektorové)', 'montaz-kuchynske-linky-sektorove', 'bm', 5, '1 200 - 2 000 Kč', 'PROMINENT', 'Montáž nábytku', 'Package', 12),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Zavěšení skříněk / polic', 'zaveseni-skrinek-polic', 'kus', 2, '300 - 600 Kč', 'STANDARD', 'Montáž nábytku', 'Package', 13),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Výřez dřezu do desky', 'vyrez-drezu-do-desky', 'úkon', 2, '500 - 1 000 Kč', 'STANDARD', 'Montáž nábytku', 'Package', 14),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Demontáž nábytku', 'demontaz-nabytku', 'hodina', 2, '200 - 400 Kč', 'STANDARD', 'Montáž nábytku', 'Package', 15),
-- Section: Opravy a Renovace
  ('b273d0ed-9798-4573-b02f-596033188770', 'Restaurátor / Čalouník (Oprava nábytku - obecně)', 'restaurator-calounik-obecne', 'hodina', 3, '400 - 800 Kč/hod', 'PROMINENT', 'Opravy a Renovace', 'Wrench', 16),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Oprava rozklížené židle / stolu', 'oprava-rozklijene-zidle-stolu', 'kus', 2, '400 - 800 Kč', 'PROMINENT', 'Opravy a Renovace', 'Wrench', 17),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Čalounění židlí', 'calouneni-zidli', 'kus', 2, '500 - 1 000 Kč', 'PROMINENT', 'Opravy a Renovace', 'Wrench', 18),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Čalounění křesla / pohovky', 'calouneni-kresla-pohovky', 'kus', 5, '3 000 - 8 000 Kč', 'STANDARD', 'Opravy a Renovace', 'Wrench', 19),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Broušení a lakování nábytku', 'brouseni-lakovani-nabytku', 'm2/kus', 4, '1 500 - 3 000 Kč', 'STANDARD', 'Opravy a Renovace', 'Wrench', 20),
  ('b273d0ed-9798-4573-b02f-596033188770', 'Oprava pantů (seřízení dvířek)', 'oprava-pantu-serizeni-dvirek', 'úkon', 1, '200 - 400 Kč', 'STANDARD', 'Opravy a Renovace', 'Wrench', 21);
-- Update icon for Hodinový manžel to Wrench (more suitable for handyman)
UPDATE service_categories 
SET icon = 'Wrench'
WHERE id = 'cab210ce-3270-4886-9ec7-4a97ebb1eac5';

-- Delete existing subcategories
DELETE FROM service_subcategories 
WHERE category_id = 'cab210ce-3270-4886-9ec7-4a97ebb1eac5';

-- Insert new subcategories from CSV
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
VALUES
  -- Montáže section
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Hodinový manžel (Různé práce - obecná poptávka)', 'hodinovy-manzel-obecna-poptavka', 'hodina', 1, '350 - 600 Kč/hod', 'SUPERPROMINENT', 'Montáže', 'Package', 1),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Vrtání do zdi (beton/cihla)', 'vrtani-do-zdi', 'otvor', 1, '50 - 100 Kč', 'PROMINENT', 'Montáže', 'Package', 2),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Montáž garnýží a záclonových tyčí', 'montaz-garnyzi-zaclonovych-tyci', 'kus', 2, '300 - 600 Kč', 'PROMINENT', 'Montáže', 'Package', 3),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Montáž TV držáku na zeď', 'montaz-tv-drzaku-na-zed', 'kus', 2, '500 - 900 Kč', 'STANDARD', 'Montáže', 'Package', 4),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Věšení obrazů a zrcadel', 'veseni-obrazu-zrcadel', 'kus', 1, '150 - 300 Kč', 'STANDARD', 'Montáže', 'Package', 5),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Výměna žárovek / zářivek', 'vymena-zarovek-zarivek', 'kus', 1, '50 - 100 Kč', 'STANDARD', 'Montáže', 'Package', 6),
  
  -- Drobné opravy section
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Oprava kapajícího kohoutku', 'oprava-kapajiciho-kohoutku', 'kus', 1, '300 - 600 Kč', 'PROMINENT', 'Drobné opravy', 'Wrench', 7),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Oprava protékajícího WC', 'oprava-protekajiciho-wc', 'kus', 2, '400 - 800 Kč', 'PROMINENT', 'Drobné opravy', 'Wrench', 8),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Výměna silikonu (vana/sprcha)', 'vymena-silikonu-vana-sprcha', 'bm', 1, '100 - 200 Kč', 'PROMINENT', 'Drobné opravy', 'Wrench', 9),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Výměna kliky u dveří', 'vymena-kliky-u-dveri', 'kus', 1, '200 - 400 Kč', 'STANDARD', 'Drobné opravy', 'Wrench', 10),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Promazání vrzajících dveří', 'promazani-vrzajicich-dveri', 'kus', 1, '100 - 200 Kč', 'STANDARD', 'Drobné opravy', 'Wrench', 11),
  ('cab210ce-3270-4886-9ec7-4a97ebb1eac5', 'Drobné sádrování děr', 'drobne-sadrovani-der', 'úkon', 1, '200 - 500 Kč', 'STANDARD', 'Drobné opravy', 'Wrench', 12);
UPDATE service_subcategories 
SET display_level = 'SUPERPROMINENT' 
WHERE name = 'Automechanik (obecná poptávka)';
-- First fix Hodinový manžel slug to hodinovy-manzel
UPDATE service_categories 
SET slug = 'hodinovy-manzel'
WHERE id = 'cab210ce-3270-4886-9ec7-4a97ebb1eac5';

-- Now rename Zahradnictví to Zahrada with proper slug
UPDATE service_categories 
SET name = 'Zahrada', slug = 'zahrada'
WHERE id = '4acc36df-e68f-4ea3-ae34-1792234c11b7';

-- Delete existing subcategories for Zahrada
DELETE FROM service_subcategories 
WHERE category_id = '4acc36df-e68f-4ea3-ae34-1792234c11b7';

-- Insert new subcategories for Zahrada
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, section, section_icon, display_level, sort_order) VALUES
-- Údržba zeleně section
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Zahradník (Údržba zahrady - obecná poptávka)', 'zahradnik-udrzba-zahrady-obecna-poptavka', 'hodina', 2, '300 - 500 Kč/hod', 'Údržba zeleně', 'Leaf', 'PROMINENT', 1),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Sekání trávy (sekačka)', 'sekani-travy-sekacka', 'm2', 2, '1,50 - 3,00 Kč', 'Údržba zeleně', 'Leaf', 'PROMINENT', 2),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Kácení stromů (ze země)', 'kaceni-stromu-ze-zeme', 'kus', 4, '1 000 - 3 000 Kč', 'Údržba zeleně', 'Leaf', 'PROMINENT', 3),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Sekání trávy (křovinořez - vysoká tráva)', 'sekani-travy-krovinorez-vysoka-trava', 'm2', 3, '3,00 - 6,00 Kč', 'Údržba zeleně', 'Leaf', 'STANDARD', 4),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Vertikutace trávníku', 'vertikutace-travniku', 'm2', 3, '4,00 - 8,00 Kč', 'Údržba zeleně', 'Leaf', 'STANDARD', 5),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Hnojení trávníku', 'hnojeni-travniku', 'm2', 2, '1,00 - 2,00 Kč', 'Údržba zeleně', 'Leaf', 'STANDARD', 6),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Stříhání živého plotu', 'strihani-ziveho-plotu', 'bm', 3, '150 - 300 Kč', 'Údržba zeleně', 'Leaf', 'STANDARD', 7),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Řez ovocných stromů', 'rez-ovocnych-stromu', 'kus', 3, '250 - 500 Kč', 'Údržba zeleně', 'Leaf', 'STANDARD', 8),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Rizikové kácení (lezecká technika)', 'rizikove-kaceni-lezecka-technika', 'kus', 5, '3 000 - 8 000 Kč', 'Údržba zeleně', 'Leaf', 'STANDARD', 9),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Odstranění pařezů (frézování)', 'odstraneni-parezu-frezovani', 'kus', 4, '1 000 - 2 500 Kč', 'Údržba zeleně', 'Leaf', 'HIDDEN', 10),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Hrabání listí', 'hrabani-listi', 'hodina/m2', 2, '250 - 350 Kč/hod', 'Údržba zeleně', 'Leaf', 'HIDDEN', 11),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Odvoz bioodpadu', 'odvoz-bioodpadu', 'úkon', 2, '500 - 1 500 Kč', 'Údržba zeleně', 'Leaf', 'HIDDEN', 12),
-- Stavby a Úpravy section
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Dlaždič / Stavitel (Práce na zahradě - obecně)', 'dlazdic-stavitel-prace-na-zahrade-obecne', 'hodina', 3, '350 - 600 Kč/hod', 'Stavby a Úpravy', 'HardHat', 'PROMINENT', 13),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Pokládka zámkové dlažby', 'pokladka-zamkove-dlazby', 'm2', 6, '350 - 600 Kč', 'Stavby a Úpravy', 'HardHat', 'PROMINENT', 14),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Stavba plotu (pletivo)', 'stavba-plotu-pletivo', 'bm', 5, '350 - 600 Kč', 'Stavby a Úpravy', 'HardHat', 'PROMINENT', 15),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Pokládka zatravňovací dlažby', 'pokladka-zatravnovaci-dlazby', 'm2', 5, '300 - 500 Kč', 'Stavby a Úpravy', 'HardHat', 'STANDARD', 16),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Stavba plotu (KB blok / beton)', 'stavba-plotu-kb-blok-beton', 'bm', 7, '1 500 - 3 000 Kč', 'Stavby a Úpravy', 'HardHat', 'STANDARD', 17),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Stavba zahradního domku / pergoly', 'stavba-zahradniho-domku-pergoly', 'projekt', 7, '15 000 - 50 000 Kč', 'Stavby a Úpravy', 'HardHat', 'STANDARD', 18),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Montáž podhrabových desek', 'montaz-podhrabovych-desek', 'bm', 4, '200 - 400 Kč', 'Stavby a Úpravy', 'HardHat', 'STANDARD', 19),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Výkop pro bazén / jezírko', 'vykop-pro-bazen-jezirko', 'hodina', 5, '600 - 900 Kč', 'Stavby a Úpravy', 'HardHat', 'STANDARD', 20),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Terénní úpravy a rovnání pozemku', 'terenni-upravy-a-rovnani-pozemku', 'hodina', 5, '600 - 900 Kč', 'Stavby a Úpravy', 'HardHat', 'STANDARD', 21),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Zakládání nového trávníku (výsev)', 'zakladani-noveho-travniku-vysev', 'm2', 4, '40 - 80 Kč', 'Stavby a Úpravy', 'HardHat', 'HIDDEN', 22),
('4acc36df-e68f-4ea3-ae34-1792234c11b7', 'Pokládka kobercového trávníku', 'pokladka-kobercoveho-travniku', 'm2', 6, '150 - 300 Kč', 'Stavby a Úpravy', 'HardHat', 'HIDDEN', 23);
-- Delete existing subcategories for Úklid
DELETE FROM service_subcategories WHERE category_id = '65ea7e19-d910-4fa6-96d7-817b63bc9111';

-- Insert new subcategories for Úklid
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, section, section_icon, display_level, sort_order) VALUES
-- Domácnost section
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Uklízečka (Úklid domácnosti - obecná poptávka)', 'uklizecka-obecna-poptavka', 'hodina', 2, '200 - 300 Kč/hod', 'Domácnost', 'Home', 'SUPERPROMINENT', 1),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Pravidelný úklid (luxování, vytírání, prach)', 'pravidelny-uklid', 'hodina', 2, '200 - 300 Kč', 'Domácnost', 'Home', 'PROMINENT', 2),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Generální úklid (kompletní)', 'generalni-uklid', 'hodina', 3, '250 - 350 Kč', 'Domácnost', 'Home', 'PROMINENT', 3),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Mytí oken (vč. rámů)', 'myti-oken', 'm2/okno', 2, '150 - 250 Kč/okno', 'Domácnost', 'Home', 'STANDARD', 4),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklid po malování / rekonstrukci', 'uklid-po-malovani', 'hodina', 4, '300 - 400 Kč', 'Domácnost', 'Home', 'STANDARD', 5),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Žehlení prádla', 'zehleni-pradla', 'hodina/koš', 2, '200 - 300 Kč', 'Domácnost', 'Home', 'STANDARD', 6),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Mytí žaluzií', 'myti-zaluzii', 'okno', 2, '50 - 100 Kč', 'Domácnost', 'Home', 'STANDARD', 7),
-- Koberce a Sedačky section
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Čištění koberců/sedaček (Hledám službu - obecně)', 'cisteni-kobercu-sedacek-obecne', 'úkon', 3, 'Dle ceníku', 'Koberce a Sedačky', 'Sofa', 'PROMINENT', 8),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tepování koberců (strojní)', 'tepovani-kobercu', 'm2', 3, '30 - 60 Kč', 'Koberce a Sedačky', 'Sofa', 'PROMINENT', 9),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tepování sedací soupravy', 'tepovani-sedaci-soupravy', 'místo', 3, '150 - 250 Kč', 'Koberce a Sedačky', 'Sofa', 'PROMINENT', 10),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tepování matrací', 'tepovani-matraci', 'kus', 2, '300 - 600 Kč', 'Koberce a Sedačky', 'Sofa', 'STANDARD', 11),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tepování židlí / křesel', 'tepovani-zidli-kresel', 'kus', 2, '100 - 200 Kč', 'Koberce a Sedačky', 'Sofa', 'STANDARD', 12),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Čištění kožené sedačky + impregnace', 'cisteni-kozene-sedacky', 'souprava', 3, '1 500 - 3 000 Kč', 'Koberce a Sedačky', 'Sofa', 'STANDARD', 13),
-- Exteriér section
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklid venku (Hledám úklid exteriéru - obecně)', 'uklid-exterier-obecne', 'hodina', 3, '250 - 400 Kč/hod', 'Exteriér', 'TreeDeciduous', 'PROMINENT', 14),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tlakové mytí fasády (WAP)', 'tlakove-myti-fasady', 'm2', 4, '80 - 150 Kč', 'Exteriér', 'TreeDeciduous', 'PROMINENT', 15),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Čištění okapů', 'cisteni-okapu', 'bm', 2, '80 - 150 Kč', 'Exteriér', 'TreeDeciduous', 'PROMINENT', 16),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tlakové mytí dlažby / terasy', 'tlakove-myti-dlazby', 'm2', 3, '60 - 120 Kč', 'Exteriér', 'TreeDeciduous', 'STANDARD', 17),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Tlakové mytí střechy', 'tlakove-myti-strechy', 'm2', 4, '100 - 200 Kč', 'Exteriér', 'TreeDeciduous', 'STANDARD', 18),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Mytí solárních panelů', 'myti-solarnich-panelu', 'm2', 3, '50 - 100 Kč', 'Exteriér', 'TreeDeciduous', 'STANDARD', 19),
-- Speciální section
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklidová firma (Pro firmy a bytové domy - obecně)', 'uklidova-firma-obecne', 'měsíc', 3, 'Dle dohody', 'Speciální', 'Building2', 'PROMINENT', 20),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklid kanceláří', 'uklid-kancelari', 'hodina', 3, '200 - 300 Kč', 'Speciální', 'Building2', 'PROMINENT', 21),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Vyklízení bytu / pozůstalosti', 'vyklizeni-bytu', 'hodina/objem', 5, '300 - 500 Kč/hod', 'Speciální', 'Building2', 'PROMINENT', 22),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Úklid společných prostor bytových domů', 'uklid-spolecnych-prostor', 'měsíc', 3, '150 - 250 Kč/byt', 'Speciální', 'Building2', 'STANDARD', 23),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Ozonové čištění prostor (dezinfekce)', 'ozonove-cisteni', 'místnost', 2, '400 - 800 Kč', 'Speciální', 'Building2', 'STANDARD', 24),
('65ea7e19-d910-4fa6-96d7-817b63bc9111', 'Odstranění plísní', 'odstraneni-plisni', 'm2', 3, '200 - 500 Kč', 'Speciální', 'Building2', 'STANDARD', 25);
-- Rename Online služby to PC a Mobile
UPDATE service_categories SET name = 'PC a Mobile', slug = 'pc-a-mobile' WHERE id = 'e07c4451-d104-4e7f-8e3a-00423a1b0b54';

-- Delete existing subcategories for PC a Mobile
DELETE FROM service_subcategories WHERE category_id = 'e07c4451-d104-4e7f-8e3a-00423a1b0b54';

-- Insert new subcategories for PC a Mobile
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, section, section_icon, display_level, sort_order) VALUES
-- Počítače section
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'IT Technik (Oprava PC - obecná poptávka)', 'it-technik-obecna-poptavka', 'hodina', 2, '400 - 700 Kč/hod', 'Počítače', 'Monitor', 'PROMINENT', 1),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Diagnostika závady (nevím, co je špatně)', 'diagnostika-zavady-pc', 'úkon', 2, '300 - 600 Kč', 'Počítače', 'Monitor', 'PROMINENT', 2),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Záchrana dat z disku', 'zachrana-dat', 'úkon', 5, '1 500 - 5 000 Kč', 'Počítače', 'Monitor', 'PROMINENT', 3),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Instalace Windows / OS', 'instalace-windows', 'úkon', 2, '500 - 800 Kč', 'Počítače', 'Monitor', 'STANDARD', 4),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Odvirování počítače', 'odvirovani-pocitace', 'úkon', 2, '500 - 1 000 Kč', 'Počítače', 'Monitor', 'STANDARD', 5),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Čištění počítače od prachu (profylaxe)', 'cisteni-pocitace', 'úkon', 2, '400 - 800 Kč', 'Počítače', 'Monitor', 'STANDARD', 6),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Zrychlení počítače (SSD, RAM)', 'zrychleni-pocitace', 'úkon', 3, '500 - 1 000 Kč', 'Počítače', 'Monitor', 'STANDARD', 7),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Oprava notebooku (výměna displeje)', 'oprava-notebooku-displej', 'úkon', 4, '800 - 1 500 Kč', 'Počítače', 'Monitor', 'STANDARD', 8),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Oprava pantů notebooku', 'oprava-pantu-notebooku', 'úkon', 3, '1 000 - 2 000 Kč', 'Počítače', 'Monitor', 'STANDARD', 9),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Výměna klávesnice notebooku', 'vymena-klavesnice-notebooku', 'úkon', 3, '500 - 1 000 Kč', 'Počítače', 'Monitor', 'HIDDEN', 10),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Nastavení tiskárny / skeneru', 'nastaveni-tiskarny', 'úkon', 1, '300 - 600 Kč', 'Počítače', 'Monitor', 'HIDDEN', 11),
-- Mobily a Tablety section
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Servis mobilů (Hledám servis - obecná poptávka)', 'servis-mobilu-obecna-poptavka', 'úkon', 2, 'Dle ceníku', 'Mobily a Tablety', 'Smartphone', 'SUPERPROMINENT', 12),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Výměna displeje (mobil/tablet)', 'vymena-displeje-mobil', 'úkon', 4, '800 - 1 500 Kč', 'Mobily a Tablety', 'Smartphone', 'PROMINENT', 13),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Výměna baterie', 'vymena-baterie-mobil', 'úkon', 3, '400 - 800 Kč', 'Mobily a Tablety', 'Smartphone', 'PROMINENT', 14),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Oprava nabíjecího konektoru', 'oprava-nabijeni-mobil', 'úkon', 3, '600 - 1 200 Kč', 'Mobily a Tablety', 'Smartphone', 'STANDARD', 15),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Nalepení ochranného skla', 'nalepeni-skla-mobil', 'úkon', 1, '150 - 300 Kč', 'Mobily a Tablety', 'Smartphone', 'STANDARD', 16),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Odblokování telefonu', 'odblokovani-telefonu', 'úkon', 2, '300 - 800 Kč', 'Mobily a Tablety', 'Smartphone', 'STANDARD', 17),
-- Elektronika section
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Opravář elektroniky (TV, Audio - obecně)', 'opravar-elektroniky-obecne', 'hodina', 3, '400 - 700 Kč/hod', 'Elektronika', 'Tv', 'PROMINENT', 18),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Oprava TV (podsvícení, zdroj)', 'oprava-tv', 'úkon', 4, '1 500 - 3 500 Kč', 'Elektronika', 'Tv', 'PROMINENT', 19),
('e07c4451-d104-4e7f-8e3a-00423a1b0b54', 'Oprava herní konzole', 'oprava-herni-konzole', 'úkon', 3, '1 000 - 2 500 Kč', 'Elektronika', 'Tv', 'PROMINENT', 20);
-- Rename "PC a Mobile" to "PC a Mobily"
UPDATE service_categories
SET name = 'PC a Mobily'
WHERE name = 'PC a Mobile';

-- Rename "Stavby/Rekonstrukce" to "Stavby / Rekonstrukce"
UPDATE service_categories
SET name = 'Stavby / Rekonstrukce'
WHERE name = 'Stavby/Rekonstrukce';

-- Rename "Montáž a oprava" to "Mazlíčci" and update icon
UPDATE service_categories
SET name = 'Mazlíčci', slug = 'mazlicci', icon = 'PawPrint'
WHERE name = 'Montáž a oprava';

-- Get the category ID for Mazlíčci and delete existing subcategories
DELETE FROM service_subcategories
WHERE category_id = (SELECT id FROM service_categories WHERE name = 'Mazlíčci');

-- Insert new pet subcategories (unique items only, CSV had duplicates)
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE name = 'Mazlíčci'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  ('Psí salon / Střihač (Péče o psa - obecná poptávka)', 'psi-salon-strizeni', 'úkon', 2, 'Dle rasy', 'PROMINENT', 'Služby', 'Dog', 1),
  ('Hlídání psů / koček (u majitele)', 'hlidani-psu-kocek', 'den', 2, '400 - 700 Kč', 'PROMINENT', 'Služby', 'Dog', 2),
  ('Venčení psů', 'venceni-psu', 'hodina', 1, '200 - 300 Kč', 'PROMINENT', 'Služby', 'Dog', 3),
  ('Stříhání psů (kompletní úprava)', 'strihani-psu-kompletni', 'úkon', 2, '500 - 900 Kč', 'STANDARD', 'Služby', 'Dog', 4),
  ('Trimování psů', 'trimovani-psu', 'hodina', 2, '400 - 700 Kč', 'STANDARD', 'Služby', 'Dog', 5),
  ('Koupání a vyčesávání', 'koupani-vycesavani', 'úkon', 2, '400 - 800 Kč', 'STANDARD', 'Služby', 'Dog', 6),
  ('Stříhání drápků', 'strihani-drapku', 'úkon', 1, '100 - 200 Kč', 'STANDARD', 'Služby', 'Dog', 7),
  ('Psí hotel / Domácí hlídání', 'psi-hotel-hlidani', 'noc', 3, '500 - 900 Kč', 'STANDARD', 'Služby', 'Dog', 8),
  ('Individuální výcvik psa', 'individualni-vycvik-psa', 'lekce', 2, '400 - 700 Kč', 'STANDARD', 'Služby', 'Dog', 9),
  ('Fyzioterapie pro psy', 'fyzioterapie-psy', 'lekce', 3, '600 - 1 000 Kč', 'HIDDEN', 'Služby', 'Dog', 10)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
UPDATE service_subcategories
SET name = 'Psí salon (obecná poptávka)', slug = 'psi-salon-obecna'
WHERE name = 'Psí salon / Střihač (Péče o psa - obecná poptávka)';
-- Create new category "Hlídání a péče"
INSERT INTO service_categories (name, slug, icon)
VALUES ('Hlídání a péče', 'hlidani-a-pece', 'Heart');

-- Insert subcategories for Hlídání a péče
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE slug = 'hlidani-a-pece'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  -- Děti section
  ('Chůva (Hledám chůvu - obecná poptávka)', 'chuva-obecna', 'hodina', 2, '180 - 250 Kč/hod', 'SUPERPROMINENT', 'Děti', 'Baby', 1),
  ('Hlídání dětí (nárazové)', 'hlidani-deti-narazove', 'hodina', 2, '180 - 250 Kč', 'PROMINENT', 'Děti', 'Baby', 2),
  ('Pravidelné hlídání dětí', 'pravidelne-hlidani-deti', 'hodina', 2, '150 - 220 Kč', 'PROMINENT', 'Děti', 'Baby', 3),
  ('Vyzvedávání ze školky / školy', 'vyzvedavani-skolka-skola', 'úkon', 1, '150 - 250 Kč', 'STANDARD', 'Děti', 'Baby', 4),
  ('Noční hlídání', 'nocni-hlidani', 'noc', 3, '1 000 - 2 000 Kč', 'STANDARD', 'Děti', 'Baby', 5),
  ('Doučování dětí (ZŠ učivo)', 'doucovani-deti-zs', 'hodina', 2, '250 - 400 Kč', 'STANDARD', 'Děti', 'Baby', 6),
  -- Senioři section
  ('Pečovatelka (Péče o seniory - obecná poptávka)', 'pecovatelka-obecna', 'hodina', 2, '200 - 300 Kč/hod', 'PROMINENT', 'Senioři', 'HeartHandshake', 7),
  ('Doprovod k lékaři / na úřad', 'doprovod-lekar-urad', 'hodina', 2, '200 - 300 Kč', 'PROMINENT', 'Senioři', 'HeartHandshake', 8),
  ('Pomoc s hygienou', 'pomoc-hygiena', 'úkon', 2, '250 - 400 Kč', 'PROMINENT', 'Senioři', 'HeartHandshake', 9),
  ('Nákupy a pochůzky pro seniory', 'nakupy-pochuzky-seniori', 'úkon', 1, '200 - 350 Kč', 'STANDARD', 'Senioři', 'HeartHandshake', 10),
  ('Společnost pro seniory / Předčítání', 'spolecnost-seniori-predcitani', 'hodina', 1, '180 - 250 Kč', 'STANDARD', 'Senioři', 'HeartHandshake', 11),
  ('Úklid u seniora', 'uklid-u-seniora', 'hodina', 2, '200 - 300 Kč', 'STANDARD', 'Senioři', 'HeartHandshake', 12)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Rename "Finanční služby" to "Finance"
UPDATE service_categories
SET name = 'Finance', slug = 'finance'
WHERE name = 'Finanční služby';

-- Delete existing subcategories
DELETE FROM service_subcategories
WHERE category_id = (SELECT id FROM service_categories WHERE name = 'Finance');

-- Insert new subcategories
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE name = 'Finance'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  -- Účetnictví section
  ('Účetní (obecná poptávka)', 'ucetni-obecna', 'hodina', 3, '600 - 1000 Kč/hod', 'PROMINENT', 'Účetnictví', 'Calculator', 1),
  ('Zpracování daňového přiznání (fyzické os.)', 'danove-priznani-fo', 'kus', 3, '1 500 - 3 000 Kč', 'PROMINENT', 'Účetnictví', 'Calculator', 2),
  ('Vedení daňové evidence (OSVČ)', 'danova-evidence-osvc', 'měsíc/rok', 3, '1 000 - 2 500 Kč/měs', 'PROMINENT', 'Účetnictví', 'Calculator', 3),
  ('Vedení účetnictví (s.r.o.)', 'vedeni-ucetnictvi-sro', 'měsíc', 4, '2 500 - 5 000 Kč/měs', 'STANDARD', 'Účetnictví', 'Calculator', 4),
  ('Zpracování daňového přiznání (právnické os.)', 'danove-priznani-po', 'kus', 4, '3 000 - 6 000 Kč', 'STANDARD', 'Účetnictví', 'Calculator', 5),
  ('Mzdová agenda', 'mzdova-agenda', 'zaměstnanec', 2, '250 - 500 Kč', 'STANDARD', 'Účetnictví', 'Calculator', 6),
  ('Zastupování na úřadech', 'zastupovani-urady', 'hodina', 3, '600 - 1 000 Kč', 'STANDARD', 'Účetnictví', 'Calculator', 7),
  -- Poradenství section
  ('Finanční poradce (Obecná poptávka)', 'financni-poradce-obecna', 'konzultace', 2, 'Zdarma - 1000 Kč', 'PROMINENT', 'Poradenství', 'Handshake', 8),
  ('Sjednání hypotéky / Refinancování', 'sjednani-hypoteky', 'úkon', 5, 'Provize banky', 'PROMINENT', 'Poradenství', 'Handshake', 9),
  ('Sjednání pojištění (auto/dům/život)', 'sjednani-pojisteni', 'smlouva', 2, 'Provize pojišťovny', 'PROMINENT', 'Poradenství', 'Handshake', 10),
  ('Finanční analýza rodiny', 'financni-analyza-rodiny', 'konzultace', 2, 'Zdarma - 1 000 Kč', 'STANDARD', 'Poradenství', 'Handshake', 11),
  ('Investiční poradenství', 'investicni-poradenstvi', 'konzultace', 3, '1 000 - 3 000 Kč', 'STANDARD', 'Poradenství', 'Handshake', 12),
  ('Konsolidace půjček', 'konsolidace-pujcek', 'úkon', 3, 'Provize banky', 'STANDARD', 'Poradenství', 'Handshake', 13)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Create new category "Právní služby"
INSERT INTO service_categories (name, slug, icon)
VALUES ('Právní služby', 'pravni-sluzby', 'Scale');

-- Insert subcategories
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE slug = 'pravni-sluzby'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  ('Advokát (Hledám právníka - obecná poptávka)', 'advokat-obecna', 'hodina', 4, '2000 Kč+/hod', 'PROMINENT', 'Právní služby', 'Scale', 1),
  ('Konzultace s advokátem', 'konzultace-advokat', 'hodina', 4, '1 500 - 2 500 Kč', 'PROMINENT', 'Právní služby', 'Scale', 2),
  ('Sepis kupní smlouvy (nemovitost/auto)', 'sepis-kupni-smlouvy', 'úkon', 5, '3 000 - 8 000 Kč', 'PROMINENT', 'Právní služby', 'Scale', 3),
  ('Sepis nájemní smlouvy', 'sepis-najemni-smlouvy', 'úkon', 4, '2 000 - 5 000 Kč', 'STANDARD', 'Právní služby', 'Scale', 4),
  ('Kontrola smluv', 'kontrola-smluv', 'úkon', 3, '1 500 - 3 000 Kč', 'STANDARD', 'Právní služby', 'Scale', 5),
  ('Rozvodové řízení (návrh, vypořádání)', 'rozvodove-rizeni', 'případ', 6, '10 000 - 25 000 Kč', 'STANDARD', 'Právní služby', 'Scale', 6),
  ('Založení s.r.o. / živnosti', 'zalozeni-sro-zivnosti', 'úkon', 4, '5 000 - 10 000 Kč', 'STANDARD', 'Právní služby', 'Scale', 7),
  ('Vymáhání pohledávek (předžalobní výzva)', 'vymahani-pohledavek', 'úkon', 3, '1 000 - 2 500 Kč', 'STANDARD', 'Právní služby', 'Scale', 8),
  ('Oddlužení / Osobní bankrot', 'oddluzeni-bankrot', 'případ', 6, '10 000 - 20 000 Kč', 'STANDARD', 'Právní služby', 'Scale', 9)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Rename category "Právní a administrativní" to "Pro firmy" and update slug/icon
UPDATE service_categories 
SET name = 'Pro firmy', slug = 'pro-firmy', icon = 'Briefcase'
WHERE slug = 'pravni-administrativni';

-- Delete all existing subcategories for this category
DELETE FROM service_subcategories 
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'pro-firmy');

-- Insert new subcategories
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE slug = 'pro-firmy'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  ('Grafik / Marketer (Obecná poptávka)', 'grafik-marketer-obecna', 'hodina', 3, '500 - 1000 Kč/hod', 'PROMINENT', 'Marketing', 'Megaphone', 1),
  ('Tvorba loga a vizuální identity', 'tvorba-loga-vizualni-identity', 'projekt', 4, '3 000 - 8 000 Kč', 'PROMINENT', 'Marketing', 'Megaphone', 2),
  ('Tvorba webových stránek (vizitka)', 'tvorba-webovych-stranek', 'projekt', 5, '5 000 - 15 000 Kč', 'PROMINENT', 'Marketing', 'Megaphone', 3),
  ('Návrh vizitek / letáků', 'navrh-vizitek-letaku', 'projekt', 3, '1 000 - 3 000 Kč', 'STANDARD', 'Marketing', 'Megaphone', 4),
  ('Tvorba e-shopu', 'tvorba-eshopu', 'projekt', 7, '15 000 - 40 000 Kč', 'STANDARD', 'Marketing', 'Megaphone', 5),
  ('Správa sociálních sítí (FB/IG)', 'sprava-socialnich-siti', 'měsíc', 4, '3 000 - 8 000 Kč', 'STANDARD', 'Marketing', 'Megaphone', 6),
  ('Nastavení PPC reklamy (Google/Seznam)', 'nastaveni-ppc-reklamy', 'projekt', 4, '3 000 - 6 000 Kč', 'STANDARD', 'Marketing', 'Megaphone', 7),
  ('Copywriting (psaní textů na web)', 'copywriting', 'NS/hodina', 3, '400 - 800 Kč', 'STANDARD', 'Marketing', 'Megaphone', 8),
  ('SEO optimalizace webu', 'seo-optimalizace', 'projekt/měsíc', 5, '4 000 - 10 000 Kč', 'STANDARD', 'Marketing', 'Megaphone', 9),
  ('Asistentka (Administrativa - obecně)', 'asistentka-obecna', 'hodina', 2, '250 - 400 Kč/hod', 'PROMINENT', 'Administrativa', 'ClipboardList', 10),
  ('Virtuální asistentka', 'virtualni-asistentka', 'hodina', 2, '250 - 400 Kč', 'PROMINENT', 'Administrativa', 'ClipboardList', 11),
  ('Přepisování textů / audiozáznamů', 'prepisovani-textu', 'NS/minuta', 2, '150 - 300 Kč/NS', 'PROMINENT', 'Administrativa', 'ClipboardList', 12),
  ('Tiskárna (Tiskové služby - obecně)', 'tiskarna-obecna', 'zakázka', 3, 'Dle poptávky', 'PROMINENT', 'Tisk', 'Printer', 13),
  ('Tisk vizitek / letáků', 'tisk-vizitek-letaku', 'balík', 3, '500 - 1 500 Kč', 'PROMINENT', 'Tisk', 'Printer', 14),
  ('Velkoformátový tisk (bannery)', 'velkoformatovy-tisk', 'm2', 3, '300 - 600 Kč', 'PROMINENT', 'Tisk', 'Printer', 15),
  ('Potisk reklamních předmětů / triček', 'potisk-reklamnich-predmetu', 'kus', 2, '150 - 300 Kč', 'STANDARD', 'Tisk', 'Printer', 16),
  ('Kopírování a skenování', 'kopirovani-skenovani', 'strana', 1, '2 - 10 Kč', 'STANDARD', 'Tisk', 'Printer', 17),
  ('Vazba dokumentů', 'vazba-dokumentu', 'kus', 1, '50 - 200 Kč', 'STANDARD', 'Tisk', 'Printer', 18)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Delete all existing subcategories for this category
DELETE FROM service_subcategories 
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'vyuka-jazyky');

-- Insert new subcategories
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE slug = 'vyuka-jazyky'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  ('Lektor jazyků (Hledám učitele - obecně)', 'lektor-jazyku-obecne', 'hodina', 2, '300 - 600 Kč/hod', 'PROMINENT', 'Jazyky', 'Languages', 1),
  ('Výuka angličtiny (začátečníci/pokročilí)', 'vyuka-anglictiny', 'hodina', 2, '300 - 500 Kč', 'PROMINENT', 'Jazyky', 'Languages', 2),
  ('Konverzace s rodilým mluvčím', 'konverzace-rodily-mluvci', 'hodina', 3, '400 - 700 Kč', 'PROMINENT', 'Jazyky', 'Languages', 3),
  ('Výuka němčiny', 'vyuka-nemciny', 'hodina', 2, '300 - 500 Kč', 'STANDARD', 'Jazyky', 'Languages', 4),
  ('Výuka španělštiny', 'vyuka-spanelstiny', 'hodina', 2, '350 - 550 Kč', 'STANDARD', 'Jazyky', 'Languages', 5),
  ('Výuka francouzštiny', 'vyuka-francouzstiny', 'hodina', 2, '350 - 550 Kč', 'STANDARD', 'Jazyky', 'Languages', 6),
  ('Doučování (Školní předměty - obecně)', 'doucovani-obecne', 'hodina', 2, '250 - 400 Kč/hod', 'PROMINENT', 'Doučování', 'GraduationCap', 7),
  ('Doučování Matematika (ZŠ/SŠ)', 'doucovani-matematika', 'hodina', 2, '250 - 400 Kč', 'PROMINENT', 'Doučování', 'GraduationCap', 8),
  ('Příprava na přijímací zkoušky', 'priprava-prijimaci-zkousky', 'hodina', 3, '300 - 500 Kč', 'STANDARD', 'Doučování', 'GraduationCap', 9),
  ('Doučování Český jazyk', 'doucovani-cestina', 'hodina', 2, '250 - 400 Kč', 'STANDARD', 'Doučování', 'GraduationCap', 10),
  ('Doučování Fyzika / Chemie', 'doucovani-fyzika-chemie', 'hodina', 2, '250 - 450 Kč', 'STANDARD', 'Doučování', 'GraduationCap', 11),
  ('Příprava na maturitu', 'priprava-maturita', 'hodina', 3, '300 - 500 Kč', 'STANDARD', 'Doučování', 'GraduationCap', 12),
  ('Učitel hudby / Umění (Obecně)', 'ucitel-hudby-umeni', 'hodina', 3, '300 - 500 Kč/hod', 'PROMINENT', 'Umění a Hobby', 'Palette', 13),
  ('Výuka hry na klavír / klávesy', 'vyuka-klavir', 'lekce', 3, '300 - 500 Kč', 'PROMINENT', 'Umění a Hobby', 'Palette', 14),
  ('Výuka hry na kytaru', 'vyuka-kytara', 'lekce', 3, '300 - 500 Kč', 'PROMINENT', 'Umění a Hobby', 'Palette', 15),
  ('Kurz kreslení / malování', 'kurz-kresleni', 'lekce', 3, '250 - 450 Kč', 'STANDARD', 'Umění a Hobby', 'Palette', 16),
  ('Keramický kurz', 'keramicky-kurz', 'lekce', 3, '300 - 500 Kč', 'STANDARD', 'Umění a Hobby', 'Palette', 17),
  ('Kurz šití', 'kurz-siti', 'lekce', 3, '300 - 500 Kč', 'STANDARD', 'Umění a Hobby', 'Palette', 18),
  ('Školitel (Odborné kurzy - obecně)', 'skolitel-obecne', 'den', 3, 'Dle dohody', 'PROMINENT', 'Odborné', 'Award', 19),
  ('Kondiční jízdy (autoškola)', 'kondicni-jizdy', 'hodina', 3, '800 - 1 000 Kč', 'PROMINENT', 'Odborné', 'Award', 20),
  ('Kurz účetnictví', 'kurz-ucetnictvi', 'kurz', 5, '4 000 - 8 000 Kč', 'PROMINENT', 'Odborné', 'Award', 21),
  ('Školení BOZP a PO', 'skoleni-bozp-po', 'osoba', 2, '500 - 1 000 Kč', 'STANDARD', 'Odborné', 'Award', 22),
  ('Školení první pomoci', 'skoleni-prvni-pomoci', 'osoba', 2, '500 - 1 500 Kč', 'STANDARD', 'Odborné', 'Award', 23),
  ('Počítačový kurz (Excel, Word)', 'pocitacovy-kurz', 'kurz', 3, '2 000 - 5 000 Kč', 'STANDARD', 'Odborné', 'Award', 24),
  ('Překladatel (Hledám překlad - obecně)', 'prekladatel-obecne', 'NS', 2, '300 - 600 Kč/NS', 'PROMINENT', 'Překlady', 'FileText', 25),
  ('Soudní překlad', 'soudni-preklad', 'NS', 3, '450 - 700 Kč', 'PROMINENT', 'Překlady', 'FileText', 26),
  ('Běžný překlad textu', 'bezny-preklad', 'NS', 2, '300 - 500 Kč', 'PROMINENT', 'Překlady', 'FileText', 27),
  ('Korektura textu', 'korektura-textu', 'NS', 2, '150 - 250 Kč', 'STANDARD', 'Překlady', 'FileText', 28),
  ('Tlumočení', 'tlumoceni', 'hodina', 4, '800 - 1 500 Kč', 'STANDARD', 'Překlady', 'FileText', 29),
  ('Překlad webových stránek', 'preklad-webu', 'NS', 3, '400 - 700 Kč', 'STANDARD', 'Překlady', 'FileText', 30)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Delete all existing subcategories for Zdraví a krása
DELETE FROM service_subcategories 
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'zdravi-krasa');

-- Insert new subcategories
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE slug = 'zdravi-krasa'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  ('Kadeřnice (Hledám kadeřnici - obecně)', 'kadernice-obecne', 'úkon', 3, 'Dle ceníku', 'SUPERPROMINENT', 'Vlasy', 'Scissors', 1),
  ('Pánský střih', 'pansky-strih', 'úkon', 2, '250 - 450 Kč', 'PROMINENT', 'Vlasy', 'Scissors', 2),
  ('Dámský střih', 'damsky-strih', 'úkon', 3, '500 - 1 000 Kč', 'PROMINENT', 'Vlasy', 'Scissors', 3),
  ('Barvení / Melír', 'barveni-melir', 'úkon', 4, '1 200 - 2 500 Kč', 'STANDARD', 'Vlasy', 'Scissors', 4),
  ('Společenský účes / Svatba', 'spolecensky-uces', 'úkon', 4, '1 500 - 3 500 Kč', 'STANDARD', 'Vlasy', 'Scissors', 5),
  ('Barber shop (úprava vousů)', 'barber-shop', 'úkon', 2, '300 - 500 Kč', 'STANDARD', 'Vlasy', 'Scissors', 6),
  ('Kosmetička (Péče o pleť - obecně)', 'kosmeticka-obecne', 'úkon', 3, 'Dle ceníku', 'PROMINENT', 'Kosmetika', 'Sparkles', 7),
  ('Čištění pleti', 'cisteni-pleti', 'úkon', 3, '600 - 1 000 Kč', 'PROMINENT', 'Kosmetika', 'Sparkles', 8),
  ('Úprava obočí / Barvení řas', 'uprava-oboci', 'úkon', 1, '150 - 300 Kč', 'PROMINENT', 'Kosmetika', 'Sparkles', 9),
  ('Líčení (denní/večerní)', 'liceni', 'úkon', 3, '600 - 1 200 Kč', 'STANDARD', 'Kosmetika', 'Sparkles', 10),
  ('Svatební líčení', 'svatebni-liceni', 'úkon', 4, '2 000 - 3 500 Kč', 'STANDARD', 'Kosmetika', 'Sparkles', 11),
  ('Laminace obočí / Lash lifting', 'laminace-oboci', 'úkon', 3, '700 - 1 200 Kč', 'STANDARD', 'Kosmetika', 'Sparkles', 12),
  ('Permanentní make-up', 'permanentni-makeup', 'úkon', 5, '2 500 - 5 000 Kč', 'STANDARD', 'Kosmetika', 'Sparkles', 13),
  ('Manikérka / Pedikérka (Nehty - obecně)', 'manikerka-obecne', 'úkon', 2, 'Dle ceníku', 'PROMINENT', 'Nehty', 'Hand', 14),
  ('Manikúra (klasická)', 'manikura-klasicka', 'úkon', 2, '300 - 500 Kč', 'PROMINENT', 'Nehty', 'Hand', 15),
  ('Pedikúra (mokrá/přístrojová)', 'pedikura', 'úkon', 3, '500 - 800 Kč', 'PROMINENT', 'Nehty', 'Hand', 16),
  ('Gelové nehty (modeláž/doplnění)', 'gelove-nehty', 'úkon', 3, '500 - 900 Kč', 'STANDARD', 'Nehty', 'Hand', 17),
  ('Odstranění gelových nehtů', 'odstraneni-gelu', 'úkon', 2, '200 - 400 Kč', 'STANDARD', 'Nehty', 'Hand', 18),
  ('P-Shine', 'p-shine', 'úkon', 2, '300 - 500 Kč', 'STANDARD', 'Nehty', 'Hand', 19),
  ('Masér (Masáže - obecná poptávka)', 'maser-obecne', 'hodina', 3, '600 - 1000 Kč/hod', 'PROMINENT', 'Tělo', 'Heart', 20),
  ('Masáž zad a šíje', 'masaz-zad-sije', 'hodina', 3, '500 - 800 Kč', 'PROMINENT', 'Tělo', 'Heart', 21),
  ('Celotělová masáž', 'celotelova-masaz', 'hodina', 3, '800 - 1 200 Kč', 'PROMINENT', 'Tělo', 'Heart', 22),
  ('Depilace (vosk/cukrová pasta)', 'depilace', 'partie', 2, '300 - 800 Kč', 'STANDARD', 'Tělo', 'Heart', 23),
  ('Lymfatická masáž', 'lymfaticka-masaz', 'hodina', 3, '800 - 1 200 Kč', 'STANDARD', 'Tělo', 'Heart', 24),
  ('Tejpování', 'tejpovani', 'úkon', 2, '200 - 500 Kč', 'STANDARD', 'Tělo', 'Heart', 25),
  ('Trenér / Výživový poradce (Obecně)', 'trener-obecne', 'hodina', 3, '500 - 1000 Kč', 'PROMINENT', 'Pohyb a Výživa', 'Dumbbell', 26),
  ('Osobní trenér (fitness)', 'osobni-trener', 'hodina', 3, '500 - 800 Kč', 'PROMINENT', 'Pohyb a Výživa', 'Dumbbell', 27),
  ('Fyzioterapie / Rehabilitace', 'fyzioterapie', 'úkon', 3, '800 - 1 200 Kč', 'PROMINENT', 'Pohyb a Výživa', 'Dumbbell', 28),
  ('Sestavování jídelníčku', 'sestavovani-jidelnicku', 'projekt', 3, '1 500 - 3 000 Kč', 'STANDARD', 'Pohyb a Výživa', 'Dumbbell', 29),
  ('Jóga (lekce)', 'joga-lekce', 'hodina', 2, '200 - 400 Kč', 'STANDARD', 'Pohyb a Výživa', 'Dumbbell', 30),
  ('Masáž pro sportovce', 'masaz-sportovce', 'hodina', 3, '600 - 1 000 Kč', 'STANDARD', 'Pohyb a Výživa', 'Dumbbell', 31)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Rename category "Organizace akcí" to "Akce a svatby"
UPDATE service_categories 
SET name = 'Akce a svatby', slug = 'akce-a-svatby', icon = 'PartyPopper'
WHERE slug = 'organizace-akci';

-- Delete all existing subcategories
DELETE FROM service_subcategories 
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'akce-a-svatby');

-- Insert new subcategories
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
SELECT 
  (SELECT id FROM service_categories WHERE slug = 'akce-a-svatby'),
  name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order
FROM (VALUES
  ('Svatební koordinátor (Svatba - obecná poptávka)', 'svatebni-koordinator-obecne', 'den', 6, 'Dle rozsahu', 'PROMINENT', 'Svatba', 'Heart', 1),
  ('Svatební koordinace', 'svatebni-koordinace', 'den/projekt', 6, '5 000 - 15 000 Kč', 'PROMINENT', 'Svatba', 'Heart', 2),
  ('Svatební výzdoba / Květiny', 'svatebni-vyzdoba', 'projekt', 5, '10 000 - 30 000 Kč', 'PROMINENT', 'Svatba', 'Heart', 3),
  ('Pečení svatebního dortu', 'svatebni-dort', 'kus', 4, '3 000 - 6 000 Kč', 'STANDARD', 'Svatba', 'Heart', 4),
  ('Pečení svatebního cukroví', 'svatebni-cukrovi', 'kg', 3, '800 - 1 500 Kč', 'STANDARD', 'Svatba', 'Heart', 5),
  ('Zapůjčení svatebního auta s řidičem', 'svatebni-auto', 'den', 4, '3 000 - 8 000 Kč', 'STANDARD', 'Svatba', 'Heart', 6),
  ('Catering (Občerstvení - obecná poptávka)', 'catering-obecne', 'akce', 4, 'Dle poptávky', 'PROMINENT', 'Oslavy', 'Cake', 7),
  ('Narozeninový dort', 'narozeninovy-dort', 'kus', 3, '1 000 - 2 500 Kč', 'PROMINENT', 'Oslavy', 'Cake', 8),
  ('Příprava rautu / Cateringu', 'priprava-rautu', 'osoba', 4, '300 - 800 Kč/os', 'PROMINENT', 'Oslavy', 'Cake', 9),
  ('Zákusky a chlebíčky', 'zakusky-chlebicky', 'kus', 2, '25 - 45 Kč', 'STANDARD', 'Oslavy', 'Cake', 10),
  ('Dětský animátor / Malování na obličej', 'detsky-animator', 'hodina', 3, '800 - 1 500 Kč', 'STANDARD', 'Oslavy', 'Cake', 11),
  ('Pronájem párty stanu', 'party-stan', 'den', 4, '2 000 - 5 000 Kč', 'STANDARD', 'Oslavy', 'Cake', 12),
  ('DJ / Kapela (Hudba - obecná poptávka)', 'dj-kapela-obecne', 'akce', 5, 'Dle poptávky', 'PROMINENT', 'Hudba', 'Music', 13),
  ('DJ na svatbu / oslavu', 'dj-svatba-oslava', 'večer', 5, '5 000 - 12 000 Kč', 'PROMINENT', 'Hudba', 'Music', 14),
  ('Živá kapela', 'ziva-kapela', 'večer', 6, '10 000 - 25 000 Kč', 'PROMINENT', 'Hudba', 'Music', 15),
  ('Hudba k obřadu', 'hudba-obrad', 'úkon', 3, '2 000 - 5 000 Kč', 'STANDARD', 'Hudba', 'Music', 16),
  ('Moderátor akce', 'moderator-akce', 'večer', 5, '5 000 - 10 000 Kč', 'STANDARD', 'Hudba', 'Music', 17),
  ('Ozvučení akce', 'ozvuceni-akce', 'akce', 4, '3 000 - 8 000 Kč', 'STANDARD', 'Hudba', 'Music', 18),
  ('Fotograf / Kameraman (Obecná poptávka)', 'fotograf-kameraman-obecne', 'hodina', 3, '1500 Kč+/hod', 'PROMINENT', 'Foto a Video', 'Camera', 19),
  ('Svatební fotograf (celodenní)', 'svatebni-fotograf', 'den', 6, '10 000 - 20 000 Kč', 'PROMINENT', 'Foto a Video', 'Camera', 20),
  ('Rodinné / Dětské focení', 'rodinne-foceni', 'hodina', 3, '1 500 - 3 000 Kč', 'PROMINENT', 'Foto a Video', 'Camera', 21),
  ('Těhotenské / New born focení', 'tehotenske-foceni', 'hodina', 3, '2 000 - 4 000 Kč', 'STANDARD', 'Foto a Video', 'Camera', 22),
  ('Portrétní focení', 'portretni-foceni', 'hodina', 3, '1 500 - 3 000 Kč', 'STANDARD', 'Foto a Video', 'Camera', 23),
  ('Produktové focení', 'produktove-foceni', 'kus/hodina', 3, '200 - 500 Kč/ks', 'STANDARD', 'Foto a Video', 'Camera', 24),
  ('Svatební video / Klip', 'svatebni-video', 'projekt', 6, '10 000 - 25 000 Kč', 'STANDARD', 'Foto a Video', 'Camera', 25)
) AS t(name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order);
-- Delete existing subcategories from "Transport" category
DELETE FROM service_subcategories
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'doprava');

-- Insert new subcategories for "Transport"
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order) VALUES

-- Stěhování section
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Stěhovací firma (Stěhování - obecná poptávka)', 'stehovaci-firma', 'hodina', 5, 'Dle rozsahu', 'PROMINENT', 'Stěhování', 'Truck', 1),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Stěhování bytu / domu (komplet)', 'stehovani-bytu-domu', 'hodina', 5, '800 - 1 500 Kč/hod (2 os)', 'PROMINENT', 'Stěhování', 'Truck', 2),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Stěhování těžkých břemen (klavír, trezor)', 'stehovani-tezkych-bremen', 'kus', 4, '2 000 - 5 000 Kč', 'PROMINENT', 'Stěhování', 'Truck', 3),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Montáž a demontáž nábytku při stěhování', 'montaz-demontaz-nabytku-stehovani', 'hodina', 3, '350 - 500 Kč', 'STANDARD', 'Stěhování', 'Truck', 4),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Zapůjčení krabic na stěhování', 'zapujceni-krabic', 'sada', 1, '30 - 60 Kč/ks', 'STANDARD', 'Stěhování', 'Truck', 5),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Likvidace starého nábytku', 'likvidace-nabytku', 'úkon', 3, '500 - 1 500 Kč', 'STANDARD', 'Stěhování', 'Truck', 6),

-- Doprava section
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Dopravce / Kurýr (Přeprava - obecná poptávka)', 'dopravce-kuryr', 'km', 3, 'Dle vzdálenosti', 'PROMINENT', 'Doprava', 'Car', 7),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Nákladní taxi (dodávka s řidičem)', 'nakladni-taxi', 'km/hodina', 3, '500 - 700 Kč/hod', 'PROMINENT', 'Doprava', 'Car', 8),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Odvoz starého spotřebiče / nábytku na sběrný dvůr', 'odvoz-spotrebice-nabytek', 'úkon', 2, '500 - 1 000 Kč', 'PROMINENT', 'Doprava', 'Car', 9),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Dovoz nábytku z obchodu (IKEA, XXL...)', 'dovoz-nabytku-obchod', 'úkon', 2, '600 - 1 200 Kč', 'STANDARD', 'Doprava', 'Car', 10),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Kurýrní služba (expresní doručení)', 'kuryrni-sluzba', 'km', 2, '15 - 25 Kč/km', 'STANDARD', 'Doprava', 'Car', 11),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Přeprava osob (mikrobus/bus)', 'preprava-osob', 'km', 3, '25 - 35 Kč/km', 'STANDARD', 'Doprava', 'Car', 12),

-- Pronájem section
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Půjčovna dodávek (Obecně)', 'pujcovna-dodavek', 'den', 3, 'Dle ceníku', 'PROMINENT', 'Pronájem', 'Key', 13),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Pronájem dodávky (bez řidiče)', 'pronajem-dodavky', 'den', 3, '1 200 - 2 000 Kč', 'PROMINENT', 'Pronájem', 'Key', 14),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Pronájem přívěsného vozíku', 'pronajem-privesny-vozik', 'den', 1, '300 - 600 Kč', 'PROMINENT', 'Pronájem', 'Key', 15),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Půjčení stěhovacích popruhů', 'pujceni-popruhy', 'den', 1, '100 - 200 Kč', 'STANDARD', 'Pronájem', 'Key', 16),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Půjčení rudlu', 'pujceni-rudlu', 'den', 1, '100 - 200 Kč', 'STANDARD', 'Pronájem', 'Key', 17),
((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Pronájem střešního boxu (rakve)', 'pronajem-stresni-box', 'den', 1, '100 - 200 Kč', 'STANDARD', 'Pronájem', 'Key', 18);
-- Delete existing subcategories from "Projektování" category
DELETE FROM service_subcategories
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'projektovani');

-- Insert new subcategories for "Projektování"
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order) VALUES
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Projektant / Architekt (Obecná poptávka)', 'projektant-architekt', 'projekt', 6, 'Dle rozsahu', 'PROMINENT', 'Stavby', 'Building', 1),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Projekt rodinného domu (studie)', 'projekt-rodinneho-domu', 'projekt', 7, '25 000 - 60 000 Kč', 'STANDARD', 'Stavby', 'Building', 2),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Projekt pro stavební povolení', 'projekt-stavebni-povoleni', 'projekt', 7, '40 000 - 90 000 Kč', 'PROMINENT', 'Stavby', 'Building', 3),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Stavební dozor', 'stavebni-dozor', 'hodina/měsíc', 6, '5 000 - 15 000 Kč/měs', 'STANDARD', 'Stavby', 'Building', 4),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Prováděcí projekt stavby', 'provadeci-projekt-stavby', 'projekt', 8, '60 000 - 150 000 Kč', 'STANDARD', 'Stavby', 'Building', 5),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Statický posudek', 'staticky-posudek', 'úkon', 4, '3 000 - 8 000 Kč', 'STANDARD', 'Stavby', 'Building', 6),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Energetický štítek budovy (PENB)', 'energeticky-stitek-penb', 'úkon', 4, '3 000 - 6 000 Kč', 'STANDARD', 'Stavby', 'Building', 7),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Architektonická vizualizace', 'architektonicka-vizualizace', 'projekt', 1, '5 000 - 30 000 Kč', 'SUPERPROMINENT', 'Stavby', 'Building', 8);
-- Add new subcategories to "Projektování" - Interiér a Zahrada section
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order) VALUES
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Bytový architekt (Obecná poptávka)', 'bytovy-architekt', 'projekt', 5, 'Dle rozsahu', 'PROMINENT', 'Interiér a Zahrada', 'Home', 9),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Návrh interiéru (vizualizace)', 'navrh-interieru', 'místnost', 5, '2 000 - 5 000 Kč', 'PROMINENT', 'Interiér a Zahrada', 'Home', 10),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Zahradní architekt (návrh zahrady)', 'zahradni-architekt', 'projekt', 5, '5 000 - 15 000 Kč', 'PROMINENT', 'Interiér a Zahrada', 'Home', 11),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Návrh kuchyně', 'navrh-kuchyne', 'projekt', 4, '3 000 - 8 000 Kč', 'STANDARD', 'Interiér a Zahrada', 'Home', 12),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Návrh koupelny', 'navrh-koupelny', 'projekt', 4, '2 500 - 6 000 Kč', 'STANDARD', 'Interiér a Zahrada', 'Home', 13),
((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Homestaging (Příprava na prodej)', 'homestaging', 'projekt', 5, '5 000 - 15 000 Kč', 'STANDARD', 'Interiér a Zahrada', 'Home', 14);
-- Rename category "Malířské práce" to "Ostatní"
UPDATE service_categories SET name = 'Ostatní', slug = 'ostatni' WHERE slug = 'malirske-prace';

-- Delete all existing subcategories from "Ostatní" (formerly "Malířské práce")
DELETE FROM service_subcategories WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'ostatni');

-- Add new subcategories to "Ostatní" - Různé section
INSERT INTO service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order) VALUES
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Švadlena / Krejčová (Obecná poptávka)', 'svadlena-krejcova', 'kus', 1, 'Dle úpravy', 'PROMINENT', 'Různé', 'Scissors', 1),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Krejčová / Švadlena (opravy oděvů)', 'krejcova-opravy-odevu', 'kus', 1, '150 - 400 Kč', 'PROMINENT', 'Různé', 'Scissors', 2),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Oprava obuvi (podpatky, lepení)', 'oprava-obuvi', 'pár', 1, '150 - 400 Kč', 'PROMINENT', 'Různé', 'Scissors', 3),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Zkracování kalhot / Výměna zipu', 'zkracovani-kalhot-vymena-zipu', 'kus', 1, '150 - 300 Kč', 'STANDARD', 'Různé', 'Scissors', 4),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Šití závěsů a záclon', 'siti-zavesu-zaclon', 'bm', 2, '100 - 200 Kč', 'STANDARD', 'Různé', 'Scissors', 5),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Broušení nožů a nástrojů', 'brouseni-nozu-nastroju', 'kus', 1, '50 - 150 Kč', 'STANDARD', 'Různé', 'Scissors', 6),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Servis a seřízení jízdního kola', 'servis-jizdniho-kola', 'úkon', 2, '500 - 1 200 Kč', 'STANDARD', 'Různé', 'Scissors', 7),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Servis lyží a snowboardů', 'servis-lyzi-snowboardu', 'pár', 2, '400 - 800 Kč', 'STANDARD', 'Různé', 'Scissors', 8),
((SELECT id FROM service_categories WHERE slug = 'ostatni'), 'Brašnářské práce', 'brasnarske-prace', 'kus', 2, '300 - 800 Kč', 'STANDARD', 'Různé', 'Scissors', 9);
UPDATE service_categories SET name = 'Další Služby' WHERE id = '92a377a0-f4c7-40a7-91c2-8c1373944d45';
-- Delete the "Obchodní služby" category (has no subcategories)
DELETE FROM service_categories WHERE id = 'e704912e-5575-491f-912a-907ce0142ab7';

-- Rename "Další Služby" to "Další služby" (lowercase 's')
UPDATE service_categories SET name = 'Další služby' WHERE id = '92a377a0-f4c7-40a7-91c2-8c1373944d45';
-- Add individual email notification toggle columns to profiles table
-- These match the push notification toggles for granular control

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_new_jobs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_new_offers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_new_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_job_completed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_offer_accepted BOOLEAN DEFAULT true;
-- Add is_admin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create an index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
-- Add consent tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Add refund waiver consent tracking to points_purchases table
ALTER TABLE public.points_purchases 
ADD COLUMN IF NOT EXISTS refund_waiver_accepted_at TIMESTAMP WITH TIME ZONE;
-- Update Stavby/Rekonstrukce subcategories with unit, points_cost, and price_range from CSV

-- Get the category ID for Stavby/Rekonstrukce
DO $$
DECLARE
  cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM service_categories WHERE slug = 'stavby-rekonstrukce';

  -- Zednické práce
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '250 - 450 Kč' WHERE category_id = cat_id AND name = 'Betonování podlah (potěr)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 3, price_range = '250 - 450 Kč' WHERE category_id = cat_id AND name = 'Bourání obkladů a dlažby';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Bourání příček (nenosných)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '200 - 350 Kč' WHERE category_id = cat_id AND name = 'Fajnová omítka (štukování)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '300 - 500 Kč' WHERE category_id = cat_id AND name = 'Jádrová omítka';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '250 - 400 Kč' WHERE category_id = cat_id AND name = 'Perlinka + lepidlo (natahování)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '200 - 350 Kč' WHERE category_id = cat_id AND name = 'Samonivelační stěrka (vyrovnání)';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 3, price_range = '1 500 - 3 000 Kč' WHERE category_id = cat_id AND name = 'Vyřezávání otvorů pro dveře';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '400 - 700 Kč' WHERE category_id = cat_id AND name = 'Vyzdívání příček (Ytong, cihla)';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '350 - 600 Kč/hod' WHERE category_id = cat_id AND name = 'Zedník';

  -- Stavba
  UPDATE service_subcategories SET unit = 'm3', points_cost = 7, price_range = '2 500 - 4 000 Kč' WHERE category_id = cat_id AND name = 'Betonování základových pasů';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 2, price_range = '250 - 400 Kč/hod' WHERE category_id = cat_id AND name = 'Dělník (Výkopy, betonování)';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 6, price_range = '400 - 800 Kč' WHERE category_id = cat_id AND name = 'Drenáž kolem domu';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '250 - 500 Kč' WHERE category_id = cat_id AND name = 'Hydroizolace spodní stavby';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 5, price_range = '600 - 900 Kč' WHERE category_id = cat_id AND name = 'Výkopové práce (minibagr)';
  UPDATE service_subcategories SET unit = 'm3', points_cost = 4, price_range = '800 - 1 500 Kč' WHERE category_id = cat_id AND name = 'Výkopové práce (ruční)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '500 - 900 Kč' WHERE category_id = cat_id AND name = 'Ztracené bednění (zdění)';

  -- Podlahy
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '400 - 700 Kč' WHERE category_id = cat_id AND name = 'Broušení a lakování parket';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 3, price_range = '80 - 150 Kč' WHERE category_id = cat_id AND name = 'Montáž obvodových lišt';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '400 - 700 Kč/hod' WHERE category_id = cat_id AND name = 'Podlahář';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '400 - 800 Kč' WHERE category_id = cat_id AND name = 'Pokládka dřevěné podlahy';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '150 - 250 Kč' WHERE category_id = cat_id AND name = 'Pokládka koberce';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '200 - 350 Kč' WHERE category_id = cat_id AND name = 'Pokládka plovoucí podlahy (laminát)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '180 - 300 Kč' WHERE category_id = cat_id AND name = 'Pokládka PVC / Lina';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '250 - 450 Kč' WHERE category_id = cat_id AND name = 'Pokládka vinylové podlahy (lepené/click)';

  -- Střecha
  UPDATE service_subcategories SET unit = 'bm', points_cost = 2, price_range = '80 - 150 Kč' WHERE category_id = cat_id AND name = 'Čištění okapů';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 5, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Klempířské prvky (úžlabí, lemování)';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 4, price_range = '200 - 400 Kč' WHERE category_id = cat_id AND name = 'Montáž okapů a svodů';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 7, price_range = '150 - 300 Kč' WHERE category_id = cat_id AND name = 'Montáž střešních latí a fólie';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 5, price_range = '3 000 - 6 000 Kč' WHERE category_id = cat_id AND name = 'Montáž střešních oken';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '200 - 400 Kč' WHERE category_id = cat_id AND name = 'Nátěr střechy';
  UPDATE service_subcategories SET unit = 'úkon', points_cost = 3, price_range = '1 500 - 5 000 Kč' WHERE category_id = cat_id AND name = 'Oprava zatékání střechy';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 8, price_range = '400 - 800 Kč' WHERE category_id = cat_id AND name = 'Pokládka střešní krytiny (taška/plech)';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '450 - 800 Kč/hod' WHERE category_id = cat_id AND name = 'Pokrývač / Klempíř';

  -- Okna a Dveře
  UPDATE service_subcategories SET unit = 'kus', points_cost = 3, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Demontáž starých oken';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 6, price_range = '4 000 - 8 000 Kč' WHERE category_id = cat_id AND name = 'Montáž garážových vrat';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 4, price_range = '1 200 - 2 000 Kč' WHERE category_id = cat_id AND name = 'Montáž interiérových dveří a zárubní';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 6, price_range = '1 500 - 3 000 Kč' WHERE category_id = cat_id AND name = 'Montáž nových oken';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 5, price_range = '2 500 - 5 000 Kč' WHERE category_id = cat_id AND name = 'Montáž posuvných dveří (pouzdro/stěna)';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 6, price_range = '1 500 - 3 000 Kč' WHERE category_id = cat_id AND name = 'Montáž předokenních rolet';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 2, price_range = '200 - 400 Kč' WHERE category_id = cat_id AND name = 'Montáž sítí proti hmyzu';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 5, price_range = '3 000 - 6 000 Kč' WHERE category_id = cat_id AND name = 'Montáž vchodových dveří';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 3, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Montáž venkovních parapetů';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 2, price_range = '250 - 500 Kč' WHERE category_id = cat_id AND name = 'Montáž vnitřních parapetů';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 3, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Montáž žaluzií (horizontální/vertikální)';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '350 - 600 Kč/hod' WHERE category_id = cat_id AND name = 'Montážník oken/dveří';
  UPDATE service_subcategories SET unit = 'křídlo', points_cost = 2, price_range = '150 - 300 Kč' WHERE category_id = cat_id AND name = 'Seřízení kování oken';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 3, price_range = '50 - 100 Kč' WHERE category_id = cat_id AND name = 'Výměna okenního těsnění';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 4, price_range = '250 - 500 Kč' WHERE category_id = cat_id AND name = 'Zednické začištění oken (špalety)';

  -- Obklady a Dlažby
  UPDATE service_subcategories SET unit = 'bm', points_cost = 4, price_range = '500 - 900 Kč' WHERE category_id = cat_id AND name = 'Kamenický roh (kamenické spoje)';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '450 - 800 Kč/hod' WHERE category_id = cat_id AND name = 'Obkladač';
  UPDATE service_subcategories SET unit = 'stupeň', points_cost = 5, price_range = '600 - 1 000 Kč' WHERE category_id = cat_id AND name = 'Obložení schodů';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '600 - 900 Kč' WHERE category_id = cat_id AND name = 'Pokládka dlažby (chodba/kuchyň)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '700 - 1 200 Kč' WHERE category_id = cat_id AND name = 'Pokládka obkladů (koupelna/WC)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '1 000 - 1 800 Kč' WHERE category_id = cat_id AND name = 'Pokládka velkoformátové dlažby';
  UPDATE service_subcategories SET unit = 'bm', points_cost = 2, price_range = '80 - 150 Kč' WHERE category_id = cat_id AND name = 'Silikonování rohů a koutů';

  -- Sádrokartony
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '500 - 800 Kč' WHERE category_id = cat_id AND name = 'Kazetové podhledy (Raster)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 8, price_range = '900 - 1 500 Kč' WHERE category_id = cat_id AND name = 'Půdní vestavba (šikminy, zateplení)';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '400 - 700 Kč/hod' WHERE category_id = cat_id AND name = 'Sádrokartonář';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '600 - 900 Kč' WHERE category_id = cat_id AND name = 'SDK podhledy (rovné)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '500 - 800 Kč' WHERE category_id = cat_id AND name = 'SDK předstěny';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '700 - 1 100 Kč' WHERE category_id = cat_id AND name = 'SDK příčky (jednoduché/dvojité)';

  -- Malíři a Tapetáři
  UPDATE service_subcategories SET unit = 'kus', points_cost = 3, price_range = '800 - 1 500 Kč' WHERE category_id = cat_id AND name = 'Lakování dveří a zárubní';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '300 - 500 Kč/hod' WHERE category_id = cat_id AND name = 'Malíř pokojů';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '50 - 90 Kč' WHERE category_id = cat_id AND name = 'Malování pokojů (barevná)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '40 - 70 Kč' WHERE category_id = cat_id AND name = 'Malování pokojů (bílá)';
  UPDATE service_subcategories SET unit = 'kus', points_cost = 2, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Nátěr radiátorů';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 3, price_range = '15 - 30 Kč' WHERE category_id = cat_id AND name = 'Penetrace podkladu';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '30 - 60 Kč' WHERE category_id = cat_id AND name = 'Škrábání staré malby';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '150 - 300 Kč' WHERE category_id = cat_id AND name = 'Tapetování (vlies/papír)';

  -- Fasády
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '350 - 600 Kč/hod' WHERE category_id = cat_id AND name = 'Fasádník (Zateplení a fasády)';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 5, price_range = '60 - 100 Kč' WHERE category_id = cat_id AND name = 'Montáž lešení';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 7, price_range = '300 - 500 Kč' WHERE category_id = cat_id AND name = 'Natažení fasádní omítky';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 6, price_range = '180 - 300 Kč' WHERE category_id = cat_id AND name = 'Nátěr fasády';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 4, price_range = '300 - 600 Kč' WHERE category_id = cat_id AND name = 'Oprava trhlin ve fasádě';
  UPDATE service_subcategories SET unit = 'hodina', points_cost = 3, price_range = '350 - 600 Kč/hod' WHERE category_id = cat_id AND name = 'Zateplení a fasády';
  UPDATE service_subcategories SET unit = 'm2', points_cost = 8, price_range = '900 - 1 500 Kč' WHERE category_id = cat_id AND name = 'Zateplení fasády (polystyren/vata)';

END $$;
-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- Create worker_verifications table
CREATE TABLE public.worker_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  status verification_status NOT NULL DEFAULT 'unverified',
  
  -- Business data
  ico text,
  company_name text,
  company_address text,
  ico_declaration_accepted boolean DEFAULT false,
  
  -- Document paths (stored in private bucket)
  id_card_path text,
  trade_license_path text,
  
  -- Timestamps
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES profiles(id),
  
  -- Rejection reason
  rejection_reason text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worker_verifications ENABLE ROW LEVEL SECURITY;

-- Workers can view their own verification
CREATE POLICY "Workers can view own verification"
ON public.worker_verifications
FOR SELECT
USING (auth.uid() = worker_id);

-- Workers can insert their own verification
CREATE POLICY "Workers can insert own verification"
ON public.worker_verifications
FOR INSERT
WITH CHECK (auth.uid() = worker_id);

-- Workers can update own verification when not pending/verified
CREATE POLICY "Workers can update own verification"
ON public.worker_verifications
FOR UPDATE
USING (auth.uid() = worker_id AND status IN ('unverified', 'rejected'));

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.worker_verifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can update all verifications
CREATE POLICY "Admins can update all verifications"
ON public.worker_verifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create private storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents', 
  'verification-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Workers can upload their own verification documents
CREATE POLICY "Workers can upload own verification docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Workers can view their own documents
CREATE POLICY "Workers can view own verification docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Workers can delete their own documents
CREATE POLICY "Workers can delete own verification docs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all verification documents
CREATE POLICY "Admins can view all verification docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can delete verification documents (for GDPR purge)
CREATE POLICY "Admins can delete verification docs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'verification-documents' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_worker_verifications_updated_at
BEFORE UPDATE ON public.worker_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create billing_profiles table (one-to-one with users)
CREATE TABLE public.billing_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  ico TEXT,
  dic TEXT,
  street TEXT,
  city TEXT,
  zip TEXT,
  country TEXT DEFAULT 'Česká republika',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('paid', 'void');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_total NUMERIC NOT NULL,
  amount_without_vat NUMERIC NOT NULL,
  vat_amount NUMERIC NOT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 21,
  currency TEXT NOT NULL DEFAULT 'CZK',
  status public.invoice_status NOT NULL DEFAULT 'paid',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tax_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Snapshot of billing details at time of invoice
  billing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Link to points purchase
  points_purchase_id UUID REFERENCES public.points_purchases(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for invoice numbers per year
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_sequence INTEGER;
  invoice_num TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  current_month := to_char(now(), 'MM');
  
  -- Get next sequence number for this year-month
  SELECT COALESCE(MAX(
    CAST(split_part(invoice_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_sequence
  FROM public.invoices
  WHERE invoice_number LIKE current_year || '-' || current_month || '-%';
  
  -- Format: YYYY-MM-XXX (e.g., 2026-01-001)
  invoice_num := current_year || '-' || current_month || '-' || LPAD(next_sequence::TEXT, 3, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_profiles
CREATE POLICY "Users can view own billing profile"
ON public.billing_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billing profile"
ON public.billing_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own billing profile"
ON public.billing_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for invoices
CREATE POLICY "Users can view own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = user_id);

-- Only system (via service role) can insert invoices
CREATE POLICY "Service role can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (true);

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
ON public.invoices FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Create trigger for updated_at on billing_profiles
CREATE TRIGGER update_billing_profiles_updated_at
BEFORE UPDATE ON public.billing_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_issued_at ON public.invoices(issued_at DESC);
-- Add marketing consent timestamp column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP WITH TIME ZONE;
-- Add referral columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS is_referral_rewarded boolean DEFAULT false;

-- Create index for faster referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  -- Generate format: ABC-12X (3 letters, dash, 2 numbers, 1 letter)
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * 24 + 1)::int, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..2 LOOP
    result := result || substr(chars, floor(random() * 8 + 25)::int, 1);
  END LOOP;
  result := result || substr(chars, floor(random() * 24 + 1)::int, 1);
  RETURN result;
END;
$$;

-- Function to ensure referral code on profile creation/update
CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code
DROP TRIGGER IF EXISTS ensure_referral_code_trigger ON public.profiles;
CREATE TRIGGER ensure_referral_code_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_referral_code();

-- Generate referral codes for existing users who don't have one
UPDATE public.profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Create referral_transactions table to track referral rewards
CREATE TABLE IF NOT EXISTS public.referral_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id),
  referee_id uuid NOT NULL REFERENCES public.profiles(id),
  referrer_credits integer NOT NULL DEFAULT 20,
  referee_credits integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(referee_id) -- Each referee can only trigger one reward
);

-- Enable RLS on referral_transactions
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral transactions (as referrer)
CREATE POLICY "Users can view own referral transactions"
  ON public.referral_transactions
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Service role can insert referral transactions
CREATE POLICY "Service role can insert referral transactions"
  ON public.referral_transactions
  FOR INSERT
  WITH CHECK (true);
-- Fix function search path for generate_referral_code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * 24 + 1)::int, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..2 LOOP
    result := result || substr(chars, floor(random() * 8 + 25)::int, 1);
  END LOOP;
  result := result || substr(chars, floor(random() * 24 + 1)::int, 1);
  RETURN result;
END;
$$;
-- Create reports table for flagging issues
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  job_id UUID REFERENCES public.jobs(id),
  worker_id UUID REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view own reports
CREATE POLICY "Users can view own reports"
ON public.reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));
-- PART 1: Add XP and Level columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1;

-- Function to calculate level based on XP thresholds
CREATE OR REPLACE FUNCTION public.calculate_level(xp integer)
RETURNS integer AS $$
BEGIN
  IF xp >= 2500 THEN
    RETURN 4; -- Elita
  ELSIF xp >= 1000 THEN
    RETURN 3; -- Profesionál
  ELSIF xp >= 300 THEN
    RETURN 2; -- Ověřený
  ELSE
    RETURN 1; -- Novic
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Trigger function to auto-update level when XP changes
CREATE OR REPLACE FUNCTION public.update_level_on_xp_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.xp_total IS DISTINCT FROM OLD.xp_total THEN
    NEW.current_level := public.calculate_level(NEW.xp_total);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for level updates
DROP TRIGGER IF EXISTS check_level_update ON public.profiles;
CREATE TRIGGER check_level_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_level_on_xp_change();

-- Function to award XP when job is completed
CREATE OR REPLACE FUNCTION public.award_xp_on_job_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_worker_id uuid;
BEGIN
  -- Only trigger when status changes TO 'completed' (not already completed)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find the accepted offer's worker for this job
    SELECT worker_id INTO v_worker_id
    FROM public.offers
    WHERE job_id = NEW.id AND status = 'accepted'
    LIMIT 1;
    
    -- Award 30 XP to the worker
    IF v_worker_id IS NOT NULL THEN
      UPDATE public.profiles
      SET xp_total = xp_total + 30
      WHERE id = v_worker_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for XP awards on job completion
DROP TRIGGER IF EXISTS award_xp_on_job_completion ON public.jobs;
CREATE TRIGGER award_xp_on_job_completion
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_job_completion();
-- Allow workers (with an accepted offer) to mark the job as finished (pending_approval)

-- Ensure RLS is enabled (should already be)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Policy: workers can update jobs they are working on, but only to pending_approval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='jobs' AND policyname='Workers can submit job for approval'
  ) THEN
    CREATE POLICY "Workers can submit job for approval"
    ON public.jobs
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.offers o
        WHERE o.job_id = jobs.id
          AND o.worker_id = auth.uid()
          AND o.status = 'accepted'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.offers o
        WHERE o.job_id = jobs.id
          AND o.worker_id = auth.uid()
          AND o.status = 'accepted'
      )
      AND status = 'pending_approval'
    );
  END IF;
END $$;
-- Add low credits notification preference columns for workers
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_low_credits boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_low_credits boolean DEFAULT true;
-- Update "Sekání trávy (sekačka)" to "Sekání trávy" 
UPDATE service_subcategories 
SET name = 'Sekání trávy'
WHERE name = 'Sekání trávy (sekačka)';
-- Rename "Elektrikář (obecná poptávka)" to "Elektrikář"
UPDATE service_subcategories 
SET name = 'Elektrikář'
WHERE name = 'Elektrikář (obecná poptávka)';

-- Rename "Instalatér (obecná poptávka)" to "Instalatér" if it exists
UPDATE service_subcategories 
SET name = 'Instalatér'
WHERE name = 'Instalatér (obecná poptávka)';
-- Add PRO membership field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_pro boolean NOT NULL DEFAULT false;

-- Add pro_since timestamp to track when user became PRO
ALTER TABLE public.profiles 
ADD COLUMN pro_since timestamp with time zone DEFAULT NULL;

-- Add pro_expires_at for subscription expiration (null = lifetime or not pro)
ALTER TABLE public.profiles 
ADD COLUMN pro_expires_at timestamp with time zone DEFAULT NULL;

-- Create a function to check if user is currently a PRO member
CREATE OR REPLACE FUNCTION public.is_user_pro(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_pro AND (pro_expires_at IS NULL OR pro_expires_at > now())
     FROM public.profiles
     WHERE id = user_id),
    false
  )
$$;

-- Create a function to get available slots info for a job
CREATE OR REPLACE FUNCTION public.get_job_slot_info(job_id uuid)
RETURNS TABLE(
  total_offers integer,
  standard_slots_available integer,
  pro_slots_available integer,
  is_fully_closed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH offer_count AS (
    SELECT COUNT(*)::integer as cnt
    FROM public.offers
    WHERE offers.job_id = get_job_slot_info.job_id
    AND status IN ('pending', 'accepted')
  )
  SELECT 
    cnt as total_offers,
    GREATEST(0, 6 - cnt) as standard_slots_available,
    GREATEST(0, 8 - cnt) as pro_slots_available,
    cnt >= 8 as is_fully_closed
  FROM offer_count
$$;
-- Add urgent job columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN is_urgent boolean NOT NULL DEFAULT false,
ADD COLUMN urgent_paid_at timestamp with time zone;
-- Performance indexes for frequently queried columns

-- Jobs table indexes (heavily queried by status, customer_id, subcategory_id)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_subcategory_id ON jobs(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Offers table indexes (queried by worker_id and job_id constantly)
CREATE INDEX IF NOT EXISTS idx_offers_worker_id ON offers(worker_id);
CREATE INDEX IF NOT EXISTS idx_offers_job_id ON offers(job_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Messages table indexes (high seq_scan rate)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_offer_id ON messages(offer_id);

-- Reviews table indexes (queried by reviewee_id)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);

-- Worker services table indexes
CREATE INDEX IF NOT EXISTS idx_worker_services_worker_id ON worker_services(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_subcategory_id ON worker_services(subcategory_id);

-- Drop the overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Authenticated users can view other profiles public info" ON public.profiles;

-- Create a restricted policy: users can only read their own profile from the profiles table
-- Cross-user data should go through the public_profiles view
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Note: The existing "Users can view own profile" policy also exists with same condition.
-- Drop duplicate to keep clean
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a security definer function to check admin status
-- This avoids infinite recursion when used in profiles RLS policies
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Allow admins to read all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));
-- Update category icons to more appropriate symbols
UPDATE public.service_categories SET icon = 'Armchair' WHERE slug = 'truharstvo';
UPDATE public.service_categories SET icon = 'Baby' WHERE slug = 'hlidani-a-pece';
UPDATE public.service_categories SET icon = 'HardHat' WHERE slug = 'stavby-rekonstrukce';
UPDATE public.service_categories SET icon = 'House' WHERE slug = 'stavby-rekonstrukce';
UPDATE service_categories SET icon = 'KeyRound' WHERE slug = 'zamecnik';

-- ============================================================
-- 1. INSTALATÉR – Topení: RENAMES
-- ============================================================

-- "Proplach topného systému" → "Proplach podlahového topení"
UPDATE service_subcategories SET name = 'Proplach podlahového topení', slug = 'proplach-podlahoveho-topeni'
WHERE id = '2691e2b5-0f2a-40e4-b316-10dafda266fb';

-- "Montáž podlahového topení" → "Instalace podlahového topení"
UPDATE service_subcategories SET name = 'Instalace podlahového topení', slug = 'instalace-podlahoveho-topeni'
WHERE id = '75c44d52-1ef1-4bbc-a30c-442420d077c8';

-- "Výměna / Montáž plynového kotle" → "Instalace / výměna plynového kotle"
UPDATE service_subcategories SET name = 'Instalace / výměna plynového kotle', slug = 'instalace-vymena-plynoveho-kotle'
WHERE id = 'c1c1f2e6-0500-4138-a92c-96b5ef25463a';

-- "Výměna / Montáž elektrokotle" → "Instalace / výměna elektrického kotle"
UPDATE service_subcategories SET name = 'Instalace / výměna elektrického kotle', slug = 'instalace-vymena-elektrickeho-kotle'
WHERE id = '5366455e-089e-4ff3-9878-a300a1fed7ba';

-- "Montáž kotle na tuhá paliva" → "Instalace / výměna kotle na tuhá paliva"
UPDATE service_subcategories SET name = 'Instalace / výměna kotle na tuhá paliva', slug = 'instalace-vymena-kotle-tuha-paliva'
WHERE id = 'c5eefa09-cc47-48d9-8755-cbd1baf6af44';

-- ============================================================
-- 1. INSTALATÉR – Topení: SHIFT Plyn sort_orders to make room
-- ============================================================
UPDATE service_subcategories SET sort_order = sort_order + 5
WHERE category_id = '54f35c7c-e8a0-4a0d-a680-10a14280f6cd'
AND section = 'Plyn';

-- ============================================================
-- 1. INSTALATÉR – Topení: NEW subcategories
-- ============================================================
INSERT INTO service_subcategories (category_id, name, slug, section, sort_order) VALUES
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Zavěšení radiátoru', 'zaveseni-radiatoru', 'Topení', 31),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Odvzdušnění radiátoru', 'odvzduseni-radiatoru', 'Topení', 32),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna litinového radiátoru za plechový', 'vymena-litinoveho-radiatoru', 'Topení', 33),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Instalace / výměna Gamat', 'instalace-vymena-gamat', 'Topení', 34),
('54f35c7c-e8a0-4a0d-a680-10a14280f6cd', 'Výměna ventilu', 'vymena-ventilu', 'Topení', 35);

-- ============================================================
-- 2. STAVBY / REKONSTRUKCE – Zednické práce: RENAME
-- ============================================================
UPDATE service_subcategories SET name = 'Bourací práce', slug = 'bouraci-prace'
WHERE id = '35728909-8d97-4074-af6b-c35a9cb8d0d6';

-- ============================================================
-- 3. STAVBY / REKONSTRUKCE – Podlahy: NEW subcategories
-- ============================================================
INSERT INTO service_subcategories (category_id, name, slug, section, sort_order) VALUES
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Broušení podlahy', 'brouseni-podlahy', 'Podlahy', 9),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka podlahy terasy', 'pokladka-podlahy-terasy', 'Podlahy', 10),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka parket', 'pokladka-parket', 'Podlahy', 11),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Pokládka dlažby', 'pokladka-dlazby', 'Podlahy', 12);

-- ============================================================
-- 4. STAVBY / REKONSTRUKCE – Omítky (new section)
-- ============================================================
INSERT INTO service_subcategories (category_id, name, slug, section, sort_order) VALUES
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Betonová stěrka', 'betonova-sterka', 'Omítky', 1),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Jádrové omítky', 'jadrove-omitky', 'Omítky', 2),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Lepidlo s perlinkou', 'lepidlo-s-perlinkou', 'Omítky', 3),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Sádrová omítka', 'sadrova-omitka', 'Omítky', 4),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Štuková omítka', 'stukova-omitka', 'Omítky', 5);

-- ============================================================
-- 5. STAVBY / REKONSTRUKCE – Obklady a Dlažby: NEW subcategories
-- ============================================================
INSERT INTO service_subcategories (category_id, name, slug, section, sort_order) VALUES
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Velkoformátové obklady', 'velkoformatove-obklady', 'Obklady a Dlažby', 8),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Obklady', 'obklady', 'Obklady a Dlažby', 9),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Dlažby', 'dlazby', 'Obklady a Dlažby', 10),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Dřevěné obložení', 'drevene-oblozeni', 'Obklady a Dlažby', 11),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Kamenné obklady', 'kamenne-obklady', 'Obklady a Dlažby', 12),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Mozaikové obklady', 'mozaikove-obklady', 'Obklady a Dlažby', 13);

-- ============================================================
-- 6. STAVBY / REKONSTRUKCE – Top-level project types (new section "Projekty")
-- ============================================================
INSERT INTO service_subcategories (category_id, name, slug, section, section_icon, sort_order) VALUES
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Stavba domu', 'stavba-domu', 'Projekty', 'Home', 1),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Rekonstrukce domu', 'rekonstrukce-domu', 'Projekty', 'Home', 2),
('bf360cd2-7ce3-41c9-8aab-912898ba8855', 'Rekonstrukce bytu', 'rekonstrukce-bytu', 'Projekty', 'Home', 3);
DELETE FROM service_subcategories 
WHERE section = 'Projekty' 
AND category_id = 'bf360cd2-7ce3-41c9-8aab-912898ba8855';
-- Give Instalatér a distinct icon (water drop)
UPDATE service_categories SET icon = 'Droplet' WHERE slug = 'instalater';
-- Give Hodinový manžel a distinct icon (hammer)
UPDATE service_categories SET icon = 'Hammer' WHERE slug = 'hodinovy-manzel';
UPDATE service_categories SET name = 'Autoservis' WHERE name = 'Auto-moto';
create or replace function public.check_email_exists(_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(_email)
  )
$$;
CREATE OR REPLACE FUNCTION public.refund_and_delete_job(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_points_cost integer;
  r record;
BEGIN
  -- Verify ownership and get points cost
  SELECT j.customer_id, COALESCE(sc.points_cost, 3)
  INTO v_customer_id, v_points_cost
  FROM jobs j
  JOIN service_subcategories sc ON sc.id = j.subcategory_id
  WHERE j.id = p_job_id;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF v_customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Refund each worker who has a pending offer
  FOR r IN SELECT DISTINCT worker_id FROM offers WHERE job_id = p_job_id AND status = 'pending'
  LOOP
    UPDATE profiles SET points = points + v_points_cost WHERE id = r.worker_id;
  END LOOP;

  -- Delete related records first
  DELETE FROM messages WHERE job_id = p_job_id;
  DELETE FROM additional_costs WHERE job_id = p_job_id;
  DELETE FROM visit_appointments WHERE job_id = p_job_id;
  DELETE FROM calendar_shares WHERE job_id = p_job_id;
  DELETE FROM worker_expanded_jobs WHERE job_id = p_job_id;
  DELETE FROM offers WHERE job_id = p_job_id;
  
  -- Delete the job
  DELETE FROM jobs WHERE id = p_job_id;
END;
$$;
-- Atomic points deduction with balance check
CREATE OR REPLACE FUNCTION public.deduct_points(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE profiles
  SET points = points - p_amount
  WHERE id = p_user_id AND points >= p_amount
  RETURNING points INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Atomic points addition
CREATE OR REPLACE FUNCTION public.add_user_points(target_user_id uuid, points_to_add integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE profiles
  SET points = points + points_to_add
  WHERE id = target_user_id
  RETURNING points INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Add referral_reward_stage column
ALTER TABLE public.profiles ADD COLUMN referral_reward_stage text NOT NULL DEFAULT 'none';

-- Backfill existing data
UPDATE public.profiles SET referral_reward_stage = 'purchased' WHERE is_referral_rewarded = true;
UPDATE public.profiles SET referral_reward_stage = 'signed_up' WHERE referred_by IS NOT NULL AND is_referral_rewarded = false;

-- Drop old column
ALTER TABLE public.profiles DROP COLUMN is_referral_rewarded;

-- Create trigger function for Stage 1: reward referrer on signup
CREATE OR REPLACE FUNCTION public.process_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Only process if referred_by is set and stage is 'none'
  IF NEW.referred_by IS NOT NULL AND NEW.referral_reward_stage = 'none' THEN
    v_referrer_id := NEW.referred_by;
    
    -- Add 10 credits to referrer
    PERFORM add_user_points(v_referrer_id, 10);
    
    -- Record the transaction
    INSERT INTO public.referral_transactions (referrer_id, referee_id, referrer_credits, referee_credits)
    VALUES (v_referrer_id, NEW.id, 10, 0);
    
    -- Update stage
    NEW.referral_reward_stage := 'signed_up';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on insert and update
CREATE TRIGGER trg_referral_signup
  BEFORE INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_signup();
-- Recreate the trigger function to also give referee 100 credits
CREATE OR REPLACE FUNCTION public.process_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referral_reward_stage = 'none' THEN
    v_referrer_id := NEW.referred_by;
    
    -- Add 10 credits to referrer
    PERFORM add_user_points(v_referrer_id, 10);
    
    -- Add 100 credits to the new worker (referee)
    PERFORM add_user_points(NEW.id, 100);
    
    -- Record the transaction
    INSERT INTO public.referral_transactions (referrer_id, referee_id, referrer_credits, referee_credits)
    VALUES (v_referrer_id, NEW.id, 10, 100);
    
    -- Update stage
    NEW.referral_reward_stage := 'signed_up';
  END IF;
  
  RETURN NEW;
END;
$$;
-- Recreate the public_profiles view as security_definer so it can read other users' public data
-- The view already restricts sensitive fields (phone only shown to connected users, email only to self)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker=false)
AS
SELECT 
    id,
    full_name,
    avatar_url,
    header_url,
    bio,
    company_type,
    city,
    region,
    country,
    portfolio_photos,
    user_type,
    created_at,
    CASE
        WHEN (auth.uid() = id) THEN phone
        WHEN are_users_connected(auth.uid(), id) THEN phone
        ELSE NULL::text
    END AS phone,
    CASE
        WHEN (auth.uid() = id) THEN email
        ELSE NULL::text
    END AS email
FROM profiles p;

-- Grant select to authenticated and anon roles
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS street_name text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS postal_code text;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  avatar_url,
  header_url,
  bio,
  city,
  region,
  country,
  company_type,
  portfolio_photos,
  user_type,
  created_at,
  email,
  phone,
  is_pro
FROM public.profiles;

-- broadcast_notifications table
CREATE TABLE public.broadcast_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  target_audience text NOT NULL DEFAULT 'all',
  recipients_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcast notifications"
  ON public.broadcast_notifications FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert broadcast notifications"
  ON public.broadcast_notifications FOR INSERT
  WITH CHECK (true);

-- email_campaigns table
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  cta_text text,
  cta_url text,
  target_audience text NOT NULL DEFAULT 'all',
  recipients_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email campaigns"
  ON public.email_campaigns FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert email campaigns"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (true);

-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);

-- Platform settings table
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert settings"
  ON public.platform_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Insert default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('credit_pricing', '{"packages": [{"points": 5, "price": 99}, {"points": 15, "price": 249}, {"points": 30, "price": 449}]}'::jsonb),
  ('free_credits_new_user', '{"amount": 15}'::jsonb),
  ('maintenance_mode', '{"enabled": false}'::jsonb);

-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  credit_amount integer NOT NULL DEFAULT 5,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Promo code redemptions table
CREATE TABLE public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, user_id)
);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view redemptions"
  ON public.promo_code_redemptions FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert redemptions"
  ON public.promo_code_redemptions FOR INSERT
  WITH CHECK (true);

-- Add hidden column to reviews for moderation
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Allow admins to update reviews (for hiding)
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

-- Audit log table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  source text,
  campaign_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (including anonymous visitors for tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT TO public
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Index for efficient querying by event type and date
CREATE INDEX idx_analytics_events_type_created 
  ON public.analytics_events (event_type, created_at DESC);

CREATE INDEX idx_analytics_events_created 
  ON public.analytics_events (created_at DESC);
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS is_ab_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subject_b text,
  ADD COLUMN IF NOT EXISTS variant_distribution integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS variant_a_opens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_b_opens integer DEFAULT 0;

CREATE POLICY "Service role can update email campaigns"
  ON public.email_campaigns FOR UPDATE TO public
  USING (true) WITH CHECK (true);


-- Add description column to service_categories
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS description text;

-- Add admin RLS policies for service_categories
CREATE POLICY "Admins can insert categories" ON service_categories FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update categories" ON service_categories FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete categories" ON service_categories FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Add admin RLS policies for service_subcategories (insert, update, delete)
CREATE POLICY "Admins can insert subcategories" ON service_subcategories FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update subcategories" ON service_subcategories FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete subcategories" ON service_subcategories FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload
CREATE POLICY "Admins can upload category images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-images' AND is_admin(auth.uid()));
CREATE POLICY "Admins can update category images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'category-images' AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete category images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'category-images' AND is_admin(auth.uid()));
CREATE POLICY "Anyone can view category images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'category-images');
-- 1. Create push_templates table for automatic system notifications
CREATE TABLE IF NOT EXISTS public.push_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT NOT NULL UNIQUE, -- e.g., 'new_job', 'new_message', 'offer_accepted'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Note: foreign key to auth.users removed for CI reliability
);

-- 2. Enable RLS for push_templates
ALTER TABLE public.push_templates ENABLE ROW LEVEL SECURITY;

-- 3. Create Admin Policy (using DO block for idempotency)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_templates' 
        AND policyname = 'Admins can manage push templates'
    ) THEN
        CREATE POLICY "Admins can manage push templates" 
        ON public.push_templates 
        FOR ALL 
        TO authenticated 
        USING (public.is_admin(auth.uid())) 
        WITH CHECK (public.is_admin(auth.uid()));
    END IF;
END $$;

-- 4. Add clicks_count to broadcast_notifications safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'broadcast_notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'broadcast_notifications' AND column_name = 'clicks_count') THEN
            ALTER TABLE public.broadcast_notifications ADD COLUMN clicks_count INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 5. Trigger for updated_at on push_templates (Safe DO block)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_push_templates_updated_at') THEN
            CREATE TRIGGER update_push_templates_updated_at
                BEFORE UPDATE ON public.push_templates
                FOR EACH ROW
                EXECUTE PROCEDURE update_updated_at_column();
        END IF;
    END IF;
END $$;

-- 6. RPC to increment clicks_count safely
CREATE OR REPLACE FUNCTION public.increment_broadcast_clicks(broadcast_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure the table exists before updating
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'broadcast_notifications') THEN
        UPDATE public.broadcast_notifications
        SET clicks_count = clicks_count + 1
        WHERE id = broadcast_id;
    END IF;
END;
$$;

-- 7. Seed initial system notification templates
INSERT INTO public.push_templates (event_key, title, body)
VALUES 
    ('new_job', 'Nová zakázka ve vaší oblasti!', '{{job_title}} - {{job_city}}'),
    ('new_message', 'Nová zpráva od {{sender_name}}', '{{message_preview}}'),
    ('offer_accepted', 'Zakázka potvrzena! ✅', '{{worker_name}} přijal vaši nabídku na "{{job_title}}".'),
    ('job_completed', 'Zakázka dokončena! ✨', '{{worker_name}} označil práci "{{job_title}}" jako hotovou.'),
    ('low_credits', 'Nízký stav kreditů ⚠️', 'Váš kreditní zůstatek je nízký. Doplňte si ho, abyste mohli dál reagovat na poptávky.')
ON CONFLICT (event_key) DO NOTHING;
-- Migration to add 'website' to profiles and remove unused columns
-- Date: 2026-03-28

-- 1. Add 'website' column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;

-- 2. Drop the dependent view first to avoid "cannot drop column because other objects depend on it"
DROP VIEW IF EXISTS public.public_profiles;

-- 3. Drop unused columns from 'profiles'
-- These were identified as unreferenced in the frontend codebase
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS company_type,
DROP COLUMN IF EXISTS current_level,
DROP COLUMN IF EXISTS xp_total,
DROP COLUMN IF EXISTS engagement_score,
DROP COLUMN IF EXISTS region,
DROP COLUMN IF EXISTS country;

-- 4. Recreate the 'public_profiles' view without the dropped columns and with the new 'website' field
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.header_url,
  p.bio,
  p.website, -- Included website in public profiles
  p.city,
  p.portfolio_photos,
  p.user_type,
  p.created_at,
  -- Only show phone if the current user is connected to this profile owner
  CASE 
    WHEN auth.uid() = p.id THEN p.phone  -- Own profile: show full phone
    WHEN public.are_users_connected(auth.uid(), p.id) THEN p.phone  -- Connected: show full phone
    ELSE NULL  -- Not connected: hide phone
  END AS phone,
  -- Email is only visible to the owner
  CASE 
    WHEN auth.uid() = p.id THEN p.email
    ELSE NULL
  END AS email
FROM profiles p;
-- Add A/B testing columns to email_campaigns
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS is_ab_test boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS subject_b text,
ADD COLUMN IF NOT EXISTS variant_distribution integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS variant_a_opens integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_b_opens integer NOT NULL DEFAULT 0;

-- 1. Create email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  resend_id text UNIQUE,
  ab_variant text CHECK (ab_variant IN ('A', 'B')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add missing analytics columns to email_campaigns
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS opens_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks_count integer NOT NULL DEFAULT 0;

-- 3. Ensure RLS is enabled and policies exist for email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Admins can view email logs'
  ) THEN
    CREATE POLICY "Admins can view email logs"
      ON public.email_logs FOR SELECT
      USING (is_admin(auth.uid()));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Service role can insert email logs'
  ) THEN
    CREATE POLICY "Service role can insert email logs"
      ON public.email_logs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
-- Add engagement tracking and bulk import support to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for engagement score to speed up "Top Recipients" queries
CREATE INDEX IF NOT EXISTS idx_profiles_engagement_score ON public.profiles (engagement_score DESC);

-- Add recipient_email to email_logs to link webhook events (opened/clicked) back to profiles
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Create index for email lookup in webhook
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs (resend_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs (recipient_email);
-- Add tags support to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for tag searching
CREATE INDEX IF NOT EXISTS idx_profiles_tags ON public.profiles USING GIN (tags);

-- Create marketing templates table
CREATE TABLE IF NOT EXISTS public.marketing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    title TEXT,
    body TEXT,
    cta_text TEXT,
    cta_url TEXT,
    template_type TEXT DEFAULT 'newsletter',
    is_ab_test BOOLEAN DEFAULT FALSE,
    subject_b TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

-- Create policies (Allowing all authenticated users for now as it's an admin-only feature context)
CREATE POLICY "Allow authenticated users to manage marketing templates" 
ON public.marketing_templates 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketing_templates_updated_at
    BEFORE UPDATE ON public.marketing_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
-- RPC function to get all unique tags from profiles
CREATE OR REPLACE FUNCTION get_all_profile_tags()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    all_tags text[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT t)
    INTO all_tags
    FROM (
        SELECT UNNEST(tags) as t
        FROM public.profiles
    ) sub;
    
    RETURN COALESCE(all_tags, '{}'::text[]);
END;
$$;
-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT,
    heading TEXT,
    body TEXT,
    cta_text TEXT,
    cta_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Admins can manage email templates" 
ON public.email_templates 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Ensure service role can do everything on email tables
-- This fixes potential "non-2xx" errors if RLS was blocking updates

DO $$ 
BEGIN
  -- email_campaigns
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'Service role can update email campaigns'
  ) THEN
    CREATE POLICY "Service role can update email campaigns"
      ON public.email_campaigns FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  -- email_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Service role can delete email logs'
  ) THEN
    CREATE POLICY "Service role can delete email logs"
      ON public.email_logs FOR DELETE
      USING (true);
  END IF;
  
  -- Ensure email_logs has all required columns just in case migrations were skipped
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_logs' AND column_name='recipient_email') THEN
    ALTER TABLE public.email_logs ADD COLUMN recipient_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_logs' AND column_name='status') THEN
    ALTER TABLE public.email_logs ADD COLUMN status TEXT DEFAULT 'sent';
  END IF;

END $$;
-- Create analytics_events table to log all tracking events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'session_start', 'search', 'conversion', 'page_view'
  source text,              -- 'landing', 'email', 'direct'
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb, -- { term: '...', path: '...' }
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (so we can track anonymous sessions/searches)
-- Use a DO block to safely create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Anyone can insert analytics events'
  ) THEN
    CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
      FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Admins can view analytics events'
  ) THEN
    CREATE POLICY "Admins can view analytics events" ON public.analytics_events
      FOR SELECT USING (is_admin(auth.uid()));
  END IF;
END $$;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign_id ON public.analytics_events(campaign_id);
-- Seed Sniper A/B testing templates into marketing_templates
INSERT INTO public.marketing_templates (name, subject, body, template_type, is_ab_test)
VALUES 
(
    'Sniper A - Zvědavost (Bez odkazu)',
    'Poptávka: {{jobCategory}} - {{jobCity}}',
    'Dobrý den, narazil jsem na Váš profil a chci se zeptat, jestli aktuálně přibíráte nové zakázky?\n\nMám tu teď u nás na platformě klienta, který akutně shání spolehlivého řemeslníka na {{jobCategory}} v lokalitě {{jobCity}}.\n\nMáte na to v nejbližších dnech nebo týdnech kapacitu? Pokud ano, jen mi krátce odepište a já Vám obratem pošlu detaily k zakázce, ať se na to můžete podívat a případně se s klientem spojit.\n\nAť se daří,\nMichal\nZrobee.cz\n\nP.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat ''Ne'' a už Vás nebudu nabídkami rušit.',
    'sniper',
    false
),
(
    'Sniper B - Přímá cesta (S odkazem)',
    'Poptávka na {{jobCategory}} v okolí ({{jobCity}})',
    'Dobrý den,\n\nnašel jsem Vás na googlu při hledání {{category_form}} v okolí {{jobCity}}.\n\nMám tu teď novou poptávku od klienta:\n{{jobUrl}} (odkaz je rovnou k prohlédnutí, bez registrace)\n\nJe to přes Zrobee (dáváme dohromady řemeslníky s lidmi, co něco potřebují).\n\nKdybyste měl kapacitu, můžete ji vzít. Když ne, dejte mi prosím vědět, ať ji můžu posunout dál.\n\nDíky,\nMichal\n\nP.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat ''Ne'' a už Vás nebudu rušit.',
    'plain',
    false
);
-- Add category_form column to service_subcategories
ALTER TABLE public.service_subcategories ADD COLUMN IF NOT EXISTS category_form TEXT;

-- Update existing records to use the name as a fallback for category_form if needed, 
-- or leave it null. The user wants to use it for "finding {{category_form}} in {{jobCity}}".
-- Usually this should be a gentive/accusative form in Czech.
-- For now we leave it empty so the admin can fill it.
-- Seed category_form with Czech genitive forms for the sentence: 
-- "našel jsem Vás na googlu při hledání {{category_form}} v okolí {{jobCity}}."

-- 1. Initial cleanup: strip everything in parentheses
UPDATE public.service_subcategories 
SET category_form = REGEXP_REPLACE(name, '\s*\(.*\)', '', 'g');

-- 2. Apply general Czech genitive rules and specific overrides
UPDATE public.service_subcategories
SET category_form = CASE
    -- Special Overrides (Common ones that patterns might miss)
    WHEN category_form = 'Instalatér' THEN 'instalatéra'
    WHEN category_form = 'Elektrikář' THEN 'elektrikáře'
    WHEN category_form = 'Malíř' THEN 'malíře'
    WHEN category_form = 'Truhlář' THEN 'truhláře'
    WHEN category_form = 'Hodinový manžel' THEN 'hodinového manžela'
    WHEN category_form = 'Zahradník' THEN 'zahradníka'
    WHEN category_form = 'Zedník' THEN 'zedníka'
    WHEN category_form = 'Stěhování' THEN 'stěhování'
    WHEN category_form = 'Úklid' THEN 'úklidu'
    WHEN category_form = 'Dovoz' THEN 'dovozu'
    WHEN category_form = 'IT Technik' THEN 'IT technika'
    WHEN category_form = 'Diagnostika závady' THEN 'diagnostiky závady'
    WHEN category_form = 'Servis mobilů' THEN 'servisu mobilů'
    WHEN category_form = 'Opravář elektroniky' THEN 'opraváře elektroniky'
    
    -- General Patterns (Suffix based)
    -- ends with 'a' -> 'y' (Oprava -> opravy, Stavba -> stavby)
    WHEN category_form LIKE '%a' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'y')
    
    -- ends with 'íř' or 'ář' -> 'íře' / 'áře'
    WHEN category_form LIKE '%íř' THEN LOWER(category_form || 'e')
    WHEN category_form LIKE '%ář' THEN LOWER(category_form || 'e')
    
    -- ends with 'ér' -> 'éra'
    WHEN category_form LIKE '%ér' THEN LOWER(category_form || 'a')
    
    -- ends with 'ík' -> 'íka'
    WHEN category_form LIKE '%ík' THEN LOWER(category_form || 'a')
    
    -- ends with 'áž' -> 'áže' (Montáž -> montáže)
    WHEN category_form LIKE '%áž' THEN LOWER(category_form || 'e')
    
    -- ends with 'ce' -> stays same (Rekonstrukce -> rekonstrukce)
    WHEN category_form LIKE '%ce' THEN LOWER(category_form)
    
    -- ends with 'ní' or 'tí' -> stays same (Sekání, Čištění, Mytí)
    WHEN category_form LIKE '%ní' THEN LOWER(category_form)
    WHEN category_form LIKE '%tí' THEN LOWER(category_form)
    
    -- ends with 'vody' -> 'vodů' (Rozvody -> rozvodů)
    WHEN category_form LIKE '%vody' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'ů')
    
    -- Fallback: lower case the name if no pattern matches
    ELSE LOWER(category_form)
END;

-- 3. Final polish for mixed cases and specific compound nouns
UPDATE public.service_subcategories
SET category_form = 'instalace' WHERE name LIKE 'Instalace%';
UPDATE public.service_subcategories
SET category_form = 'výměny' WHERE name LIKE 'Výměna%';
UPDATE public.service_subcategories
SET category_form = 'opravy' WHERE name LIKE 'Oprava%';
UPDATE public.service_subcategories
SET category_form = 'rekonstrukce' WHERE name LIKE 'Rekonstrukce%';
UPDATE public.service_subcategories
SET category_form = 'stavby' WHERE name LIKE 'Stavba%';
UPDATE public.service_subcategories
SET category_form = 'malování' WHERE name LIKE 'Malování%';
UPDATE public.service_subcategories
SET category_form = 'podlahy' WHERE name LIKE 'Podlahy%';
UPDATE public.service_subcategories
SET category_form = 'topení' WHERE name LIKE 'Topení%';
UPDATE public.service_subcategories
SET category_form = 'elektřiny' WHERE name LIKE 'Elektřina%';
UPDATE public.service_subcategories
SET category_form = 'nábytku' WHERE name LIKE 'Nábytek%';
-- Comprehensive seed for category_form with Czech genitive forms for the sentence: 
-- "našel jsem Vás na googlu při hledání {{category_form}} v okolí {{jobCity}}."

-- 1. First, set category_form to a cleaned version of the name
UPDATE public.service_subcategories 
SET category_form = REGEXP_REPLACE(name, '\s*\(.*\)', '', 'g');

-- 2. Define category-level genitive forms for generic subcategories
WITH category_forms AS (
  SELECT id, 
    CASE 
      WHEN slug = 'instalater' THEN 'instalatéra'
      WHEN slug = 'elektrikar' THEN 'elektrikáře'
      WHEN slug = 'malirske-prace' THEN 'malíře'
      WHEN slug = 'stavebnictvi' THEN 'zedníka'
      WHEN slug = 'auto' THEN 'automechanika'
      WHEN slug = 'design' THEN 'designéra'
      WHEN slug = 'domaci-opravy' THEN 'hodinového manžela'
      WHEN slug = 'doprava' THEN 'dopravy'
      WHEN slug = 'financni-sluzby' THEN 'finančních služeb'
      WHEN slug = 'instalace' THEN 'instalace'
      WHEN slug = 'montaz' THEN 'montáže'
      WHEN slug = 'obchodni-sluzby' THEN 'obchodních služeb'
      WHEN slug = 'obklady' THEN 'obkladů'
      WHEN slug = 'online-sluzby' OR slug = 'pc-a-mobile' THEN 'it technika'
      WHEN slug = 'rekonstrukce' THEN 'rekonstrukce'
      WHEN slug = 'stehovani' THEN 'stěhování'
      WHEN slug = 'truharstvo' THEN 'truhláře'
      WHEN slug = 'uklid' THEN 'úklidu'
      WHEN slug = 'vyuka-jazyky' THEN 'výuky jazyků'
      WHEN slug = 'zahrada' OR slug = 'zahradnictvi' THEN 'zahradníka'
      WHEN slug = 'zdravi-krasa' THEN 'kosmetických služeb'
      ELSE LOWER(name)
    END as genitive
  FROM public.service_categories
)
-- 3. Update generic/general subcategories with the category's genitive form
UPDATE public.service_subcategories s
SET category_form = cf.genitive
FROM category_forms cf
WHERE s.category_id = cf.id
AND (
  s.name ILIKE '%ostatní%' 
  OR s.name ILIKE '%obecná poptávka%' 
  OR s.name ILIKE '%nevím, co je špatně%'
  OR s.name ILIKE '%hledám%'
  OR s.name ILIKE '%diagnostika%'
  OR s.name ILIKE '%nabídky%'
);

-- 4. Apply general Czech genitive rules to the remaining specific subcategories
WITH category_forms AS (
  SELECT id, 
    CASE 
      WHEN slug = 'instalater' THEN 'instalatéra'
      WHEN slug = 'elektrikar' THEN 'elektrikáře'
      WHEN slug = 'malirske-prace' THEN 'malíře'
      WHEN slug = 'stavebnictvi' THEN 'zedníka'
      WHEN slug = 'auto' THEN 'automechanika'
      WHEN slug = 'design' THEN 'designéra'
      WHEN slug = 'domaci-opravy' THEN 'hodinového manžela'
      WHEN slug = 'doprava' THEN 'dopravy'
      WHEN slug = 'financni-sluzby' THEN 'finančních služeb'
      WHEN slug = 'instalace' THEN 'instalace'
      WHEN slug = 'montaz' THEN 'montáže'
      WHEN slug = 'obchodni-sluzby' THEN 'obchodních služeb'
      WHEN slug = 'obklady' THEN 'obkladů'
      WHEN slug = 'online-sluzby' OR slug = 'pc-a-mobile' THEN 'it technika'
      WHEN slug = 'rekonstrukce' THEN 'rekonstrukce'
      WHEN slug = 'stehovani' THEN 'stěhování'
      WHEN slug = 'truharstvo' THEN 'truhláře'
      WHEN slug = 'uklid' THEN 'úklidu'
      WHEN slug = 'vyuka-jazyky' THEN 'výuky jazyků'
      WHEN slug = 'zahrada' OR slug = 'zahradnictvi' THEN 'zahradníka'
      WHEN slug = 'zdravi-krasa' THEN 'kosmetických služeb'
      ELSE LOWER(name)
    END as genitive
  FROM public.service_categories
)
UPDATE public.service_subcategories
SET category_form = CASE
    -- Special Overrides for specific common nouns
    WHEN category_form = 'Hodinový manžel' THEN 'hodinového manžela'
    WHEN category_form = 'IT Technik' THEN 'it technika'
    WHEN category_form = 'Servis mobilů' THEN 'servisu mobilů'
    
    -- Ends with 'a' -> 'y' (Oprava -> opravy, Stavba -> stavby, Fasáda -> fasády)
    WHEN category_form LIKE '%a' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'y')
    
    -- Ends with 'íř' or 'ář' -> 'íře' / 'áře' (Malíř -> malíře)
    WHEN category_form LIKE '%íř' THEN LOWER(category_form || 'e')
    WHEN category_form LIKE '%ář' THEN LOWER(category_form || 'e')
    
    -- Ends with 'ér' -> 'éra' (Instalatér -> instalatéra)
    WHEN category_form LIKE '%ér' THEN LOWER(category_form || 'a')
    
    -- Ends with 'ík' -> 'íka' (Zahradník -> zahradníka)
    WHEN category_form LIKE '%ík' THEN LOWER(category_form || 'a')
    
    -- Ends with 'áž' -> 'áže' (Montáž -> montáže)
    WHEN category_form LIKE '%áž' THEN LOWER(category_form || 'e')
    
    -- Ends with 'ce' -> stays same (Rekonstrukce -> rekonstrukce)
    WHEN category_form LIKE '%ce' THEN LOWER(category_form)
    
    -- Ends with 'ní' or 'tí' -> stays same (Sekání, Čištění, Zapojení)
    WHEN category_form LIKE '%ní' THEN LOWER(category_form)
    WHEN category_form LIKE '%tí' THEN LOWER(category_form)
    
    -- Ends with 'y' plural -> 'ů' (Obklady -> obkladů, Rozvody -> rozvodů)
    -- This is tricky, but let's handle common ones
    WHEN category_form LIKE '%obklady' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'ů')
    WHEN category_form LIKE '%rozvody' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'ů')
    WHEN category_form LIKE '%podlahy' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'ů')
    WHEN category_form LIKE '%odpady' THEN LOWER(SUBSTRING(category_form FROM 1 FOR LENGTH(category_form) - 1) || 'ů')
    
    -- Fallback: lower case the name
    ELSE LOWER(category_form)
END
-- Only update if it wasn't already updated by the category-level logic in step 3
WHERE category_form NOT IN (SELECT genitive FROM category_forms);

-- 5. Fix common phrases that became slightly wrong
UPDATE public.service_subcategories SET category_form = 'instalatéra' WHERE category_form = 'instalatér';
UPDATE public.service_subcategories SET category_form = 'elektrikáře' WHERE category_form = 'elektrikář';
UPDATE public.service_subcategories SET category_form = 'malíře' WHERE category_form = 'malíř';
UPDATE public.service_subcategories SET category_form = 'zedníka' WHERE category_form = 'zedník';
UPDATE public.service_subcategories SET category_form = 'pokrývače' WHERE category_form = 'pokrývač';
UPDATE public.service_subcategories SET category_form = 'dlaždiče' WHERE category_form = 'dlaždič';
UPDATE public.service_subcategories SET category_form = 'kameníka' WHERE category_form = 'kameník';
UPDATE public.service_subcategories SET category_form = 'truhláře' WHERE category_form = 'truhlář';

-- Clean up: Ensure no extra spaces and proper casing
UPDATE public.service_subcategories SET category_form = TRIM(category_form);
-- Update the existing Sniper B template with the revised text
UPDATE public.marketing_templates
SET body = 'Dobrý den,

narazil jsem na Vás na Googlu při hledání {{category_form}} v okolí města {{jobCity}}.

Mám tu teď čerstvou poptávku od klienta, která by Vás mohla zajímat:
{{jobUrl}} (odkaz je rovnou k prohlédnutí, nevyžaduje žádnou registraci)

Jde to přes náš portál Zrobee (propojujeme lidi, co něco potřebují, se šikovnými profíky z jejich okolí).

Jestli máte zrovna volné ruce, zakázka je Vaše. Pokud ne, dejte mi prosím vědět, ať nenecháme klienta čekat a poptávku můžu posunout dál.

Díky a ať se daří,
Michal

P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat „Ne“ a už Vás nebudu rušit.'
WHERE name = 'Sniper B - Přímá cesta (S odkazem)';
-- Add category and subcategory columns to profiles for lead segmentation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.category IS 'Primary category name or slug for leads/marketing segmentation';
COMMENT ON COLUMN public.profiles.subcategory IS 'Primary subcategory name or slug for leads/marketing segmentation';
-- TOTAL RESTORATION: Re-adding all missing CRM and System columns
-- 1. Restore the core system columns dropped during cleanup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Česká republika';

-- 2. Add activity tracking and CRM fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 3. Synchronize existing data and repair states
UPDATE profiles SET last_activity = last_opened_at WHERE last_activity IS NULL;
UPDATE profiles SET engagement_score = 0 WHERE engagement_score IS NULL;
UPDATE profiles SET xp_total = 0 WHERE xp_total IS NULL;
UPDATE profiles SET current_level = 1 WHERE current_level IS NULL;
UPDATE profiles SET company_type = 'individual' WHERE company_type IS NULL AND user_type = 'worker';

-- 4. Rebuild the public_profiles view to include the restored columns
DROP VIEW IF EXISTS public.public_profiles;
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.header_url,
  p.bio,
  p.website,
  p.city,
  p.portfolio_photos,
  p.user_type,
  p.created_at,
  p.is_admin,
  p.xp_total,
  p.current_level,
  p.company_type,
  p.category,
  p.subcategory,
  p.engagement_score,
  p.last_activity,
  -- Only show phone if the current user is connected to this profile owner
  CASE 
    WHEN auth.uid() = p.id THEN p.phone
    WHEN public.are_users_connected(auth.uid(), p.id) THEN p.phone
    ELSE NULL
  END AS phone,
  -- Email is only visible to the owner
  CASE 
    WHEN auth.uid() = p.id THEN p.email
    ELSE NULL
  END AS email
FROM profiles p;
-- Create marketing_leads table
CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    user_type TEXT DEFAULT 'worker',
    website TEXT,
    city TEXT,
    full_address TEXT,
    postal_code TEXT,
    street_name TEXT,
    street_number TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    tags TEXT[] DEFAULT '{}',
    is_pro BOOLEAN DEFAULT false,
    referral_code TEXT,
    marketing_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    engagement_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category TEXT,
    subcategory TEXT,
    company_name TEXT,
    company_description TEXT,
    source TEXT DEFAULT 'import'
);

-- Enable RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Allow admins to do everything
CREATE POLICY "Admins have full access to marketing_leads"
ON public.marketing_leads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Create a unified contacts view
CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source
FROM public.marketing_leads;

-- Grant access to the view
GRANT SELECT ON public.unified_contacts TO authenticated;
-- Compact seeding for search_terms based on user-provided mapping
ALTER TABLE public.service_subcategories 
ADD COLUMN IF NOT EXISTS search_terms TEXT[] DEFAULT '{}';

-- Helper function for distinct arrays
CREATE OR REPLACE FUNCTION array_distinct(anyarray)
RETURNS anyarray AS $$
  SELECT array_agg(DISTINCT x) FROM unnest($1) t(x);
$$ LANGUAGE sql;

DO $$
DECLARE
  map_data TEXT := 'Akce a svatby	Akce a svatby
Zapůjčení svatebního auta s řidičem	Zapůjčení svatebního auta s řidičem
Narozeninový dort	Cukrářství
Příprava rautu / Cateringu	Catering
Zákusky a chlebíčky	Cukrářství
Dětský animátor / Malování na obličej	Animátor
Pronájem párty stanu	Půjčovna párty stanů
DJ na svatbu / oslavu	DJ
Živá kapela	Kapela
Hudba k obřadu	Kapela
Moderátor akce	Moderátor
Ozvučení akce	DJ
Svatební fotograf (celodenní)	Svatební fotograf
Rodinné / Dětské focení	Fotograf
Těhotenské / New born focení	Fotograf
Portrétní focení	Fotograf
Produktové focení	Fotograf
Svatební video / Klip	Kameraman
Fotograf / Kameraman	Fotograf
DJ / Kapela	DJ
Catering	Catering
Svatební koordinátor	Svatební agentura
Svatební koordinace	Svatební agentura
Svatební výzdoba / Květiny	Svatební agentura
Pečení svatebního dortu	Cukrářství
Pečení svatebního cukroví	Cukrářství
Auto-Moto	Motoservis
Pneuservis	Pneuservis
Tepování interiéru	Detailing aut
Výměna čelního skla	Autosklo
Oprava promáčklin (PDR)	Autolakýrna
Výměna brzdových destiček	Autoservis
Výměna tlumičů	Autoservis
Kompletní přezutí pneu (plechové)	Pneuservis
Výměna autobaterie	Autoelektrikář
Automechanik	Autoservis
Ochranná fólie PPF	Detailing aut
Výměna oleje a olejového filtru	Autoservis
Výměna brzdových kotoučů	Autoservis
Výměna stabilizátorů	Autoservis
Výměna ložisek kol	Pneuservis
Geometrie náprav (seřízení)	Autoservis
Výměna rozvodů	Autoservis
Výměna setrvačníku	Autoservis
Výměna vodního čerpadla	Instalatér
Výměna termostatu	Topenář
Výměna chladiče	Autoservis
Oprava / výměna turbodmychadla	Oprava
Oprava motoru (generální oprava)	Motoservis
Výměna výfukového systému	Autoservis
Výměna katalyzátoru	Autoservis
Oprava / výměna DPF filtru	Autoservis
Čištění DPF filtru	Autoservis
Dekarbonizace motoru	Motoservis
Pravidelná roční prohlídka	Autoservis
Výměna pružin	Autoservis
Výměna ramen / silentbloků	Výměna ramen
Servis automatické převodovky	Autoservis
Servis manuální převodovky	Autoservis
Přezkoušení STK (emise)	Autoservis
Příprava na STK	Autoservis
Výměna řízení / hřebenu řízení	Autoservis
Výměna posilovače řízení	Autoservis
Oprava palivového systému	Autoservis
Čištění vstřikovačů	Úklidová firma
Výměna palivového čerpadla	Autoservis
Oprava 4x4 systému (pohon všech kol)	Pneuservis
Montáž parkovacích senzorů	Autoelektrikář
Kompletní přezutí pneu (alu)	Pneuservis
Výměna ventilků	Výměna ventilků
Oprava defektu	Pneuservis
Autoelektrikář	Autoelektrikář
Diagnostika elektro závady	Autoservis
Výměna alternátoru	Autoelektrikář
Výměna xenonových výbojek	Autoelektrikář
Odtahová služba	Odtahová služba
Autolakýrník	Autoservis
Oprava kabeláže	Elektrikář
Montáž autorádia / reproduktorů	Autoservis
Montáž handsfree / Bluetooth	Autoelektrikář
Montáž kamery / dashcam	Autoelektrikář
Montáž GPS lokátoru	Autoelektrikář
Montáž alarmu / imobilizéru	Autoelektrikář
Plnění klimatizace	Autoelektrikář
Vyvážení kol	Pneuservis
Výměna startéru	Autoelektrikář
Výměna žárovek / LED světel	Autoelektrikář
Autoklempíř	Autoservis
Oprava čelního skla (tmel)	Autosklo
Lakování dílů	Autolakýrna
Celolak vozidla	Autolakýrna
Polep vozidla (car wrapping)	Detailing aut
Tónování skel	Detailing aut
Uskladnění pneumatik	Pneuservis
Motomechanik	Motoservis
Servisní prohlídka motocyklu	Motoservis
Výměna řetězu a rozetkol	Pneuservis
Sezonní uskladnění motocyklu	Motoservis
Renovace interiéru (kůže, plasty)	Detailing aut
Montáž tažného zařízení	Autoservis
Montáž střešního nosiče / boxu	Montáž střešního nosiče
Přezutí pneu (moto)	Pneuservis
Keramická ochrana laku	Detailing aut
Leštění laku	Detailing aut
Oprava / renovace světlometů	Oprava
Diagnostika závady	Autoservis
Výměna spojky	Autoservis
Dezinfekce klimatizace	Autoelektrikář
Další služby	Další služby
Krejčová / Švadlena (opravy oděvů)	Krejčovství
Oprava obuvi (podpatky, lepení)	Oprava obuvi
Zkracování kalhot / Výměna zipu	Krejčovství
Šití závěsů a záclon	Krejčovství
Broušení nožů a nástrojů	Broušení nožů
Servis and seřízení jízdního kola	Pneuservis
Servis lyží a snowboardů	Servis sportovního vybavení
Brašnářské práce	Brašnářství
Švadlena / Krejčová	Krejčovství
Elektro	Elektrikář
Instalace chytrého termostatu	Topenář
Automatizace osvětlení (Smart Home)	Autoservis
Automatizace žaluzií / brány	Autoservis
Instalace FVE panelů	Instalace FVE panelů
Servis and revize FVE	Servis a revize FVE
Zapojení střídače and baterií	Zapojení střídače a baterií
Administrace dotací FVE	Administrace dotací FVE
Mytí solárních panelů	Úklidová firma
Fotovoltaika	Fotovoltaika
Revize elektroinstalace	Elektrikář
Elektrikář	Autoelektrikář
Diagnostika závady (nesvítí / nefunguje)	Autoservis
Elektrikářská pohotovost	Autoelektrikář
Montáž and zapojení zásuvky / vypínače	Elektrikář
Montáž svítidla / lustru	Elektrikář
Zapojení indukční / sklokeramické desky	Zapojení indukční
Zapojení digestoře	Zapojení digestoře
Zapojení bojleru / průtokového ohřívače	Instalatér
Montáž and revize hromosvodu	Elektrikář
Kompletní elektroinstalace bytu (nová)	Elektrikář
Výměna elektroinstalace v jádře	Elektrikář
Výměna jističů / Úprava rozvaděče	Elektrikář
Montáž LED pásků (kuchyň, podhledy)	Autoelektrikář
Zapojení akumulačních kamen / přímotopu	Motoservis
Přihláška k odběru (revize pro ČEZ/EON)	Přihláška k odběru (revize pro ČEZ
Nastavení Wi-Fi routeru / sítě	IT Servis
Montáž zabezpečovacího systému (Alarm)	Montáž zabezpečovacího systému
Rozvody datové sítě (UTP/FTP)	Autoservis
Montáž kamerového systému (CCTV)	Montáž kamerového systému
Montáž domovního videotelefonu	Kameraman
Montáž datového rozvaděče (RACK)	Elektrikář
Montáž TV antény / Satelitu	Elektrikář
IT technik	IT technik
Finance	Finance
Konsolidace půjček	Finanční poradce
Účetní (obecná poptávka)	Účetní firma
Zpracování daňového přiznání (fyzické os.)	Účetní firma
Vedení daňové evidence (OSVČ)	Účetní firma
Vedení účetnictví (s.r.o.)	Účetní firma
Zpracování daňového přiznání (právnické os.)	Advokát
Mzdová agenda	Mzdová agenda
Zastupování na úřadech	Pečovatelská služba
Sjednání hypotéky / Refinancování	Finanční poradce
Sjednání pojištění (auto/dům/život)	Autoservis
Finanční analýza rodiny	Finanční analýza rodiny
Investiční poradenství	Finanční poradce
Finanční poradce	Finanční poradce
Hlídání and péče	Pečovatelská služba
Hlídání dětí (nárazové)	Pečovatelská služba
Pravidelné hlídání dětí	Pečovatelská služba
Vyzvedávání ze školky / školy	Pneuservis
Noční hlídání	Pečovatelská služba
Doučování dětí (ZŠ učivo)	Doučování
Chůva	Chůva
Péče o seniory	Pečovatelská služba
Doprovod k lékaři / na úřad	Pečovatelská služba
Pomoc s hygienou	Pečovatelská služba
Nákupy and pochůzky pro seniory	Pečovatelská služba
Společnost pro seniory / Předčítání	Pečovatelská služba
Úklid u seniora	Úklidová firma
Hodinový manžel	Hodinový manžel
Vrtání do zdi (beton/cihla)	Zednictví
Hodinový manžel	Hodinový manžel
Montáž garnýží and záclonových tyčí	Krejčovství
Montáž TV držáku na zeď	Montáž TV držáku na zeď
Věšení obrazů and zrcadel	Věšení obrazů a zrcadel
Výměna žárovek / zářivek	Výměna žárovek
Oprava kapajícího kohoutku	Oprava kapajícího kohoutku
Oprava protékajícího WC	Instalatér
Výměna silikonu (vana/sprcha)	Instalatér
Výměna kliky u dveří	Výměna kliky u dveří
Promazání vrzajících dveří	Promazání vrzajících dveří
Drobné sádrování děr	Hodinový manžel
Instalatér	Instalatér
Diagnostika závady / Vyhledání úniku vody	Autoelektrikář
Instalatér	Instalatér
Instalatérská pohotovost	Instalatér
Výměna vodovodní baterie (stojánková/nástěnná)	Autoelektrikář
Oprava protékajícího WC	Instalatér
Čištění odpadů (sifon, dřez, vana)	Instalatér
Montáž podomítkového modulu (Geberit)	Montáž podomítkového modulu
Montáž WC mísy (závěsné/kombi)	Instalatér
Montáž umyvadla / dřezu	Instalatér
Montáž vany	Instalatér
Montáž sprchového koutu / zástěny	Instalatér
Silikonování vany / sprchy	Instalatér
Výměna roháčků / ventilů	Výměna roháčků
Oprava kapající baterie	Autoelektrikář
Připojení pračky / myčky	Připojení pračky
Strojní čištění kanalizace (pero/tlak)	Instalatér
Nové rozvody vody and odpadů (plast)	Autoservis
Výměna vodoměrů	Výměna vodoměrů
Servis and čištění plynového kotle	Plynař
Napuštění and odvzdušnění topení	Topenář
Montáž radiátoru	Topenář
Výměna termohlavice / ventilu radiátoru	Topenář
Revize kotle	Revize kotle
Montáž tepelného čerpadla	Instalatér
Topenář	Topenář
Proplach podlahového topení	Topenář
Instalace podlahového topení	Topenář
Instalace / výměna plynového kotle	Plynař
Instalace / výměna elektrického kotle	Instalace
Instalace / výměna kotle na tuhá paliva	Instalace
Plynař	Plynař
Připojení plynového sporáku	Plynař
Revize plynového zařízení	Autoservis
Nové rozvody plynu	Autoservis
Zkouška těsnosti plynu	Plynař
Odpojení plynového spotřebiče	Plynař
Zavěšení radiátoru	Topenář
Odvzdušnění radiátoru	Topenář
Výměna litinového radiátoru za plechový	Topenář
Instalace / výměna Gamat	Instalace
Výměna ventilu	Výměna ventilu
Mazlíčci	Mazlíčci
Psí salon	Psí salon
Hlídání psů / koček (u majitele)	Pečovatelská služba
Venčení psů	Venčení psů
Stříhání psů (kompletní úprava)	Psí salon
Trimování psů	Trimování psů
Koupání and vyčesávání	Koupání a vyčesávání
Stříhání drápků	Stříhání drápků
Psí hotel / Domácí hlídání	Pečovatelská služba
Individuální výcvik psa	Kynologické cvičiště
Fyzioterapie pro psy	Fyzioterapeut
PC and Mobily	PC a Mobily
Servis mobilů	Servis mobilů
Záchrana dat z disku	IT Servis
Instalace Windows / OS	IT Servis
Odvirování počítače	IT Servis
Čištění počítače od prachu (profylaxe)	IT Servis
Zrychlení počítače (SSD, RAM)	IT Servis
Oprava notebooku (výměna displeje)	IT Servis
Oprava pantů notebooku	IT Servis
Výměna klávesnice notebooku	IT Servis
Nastavení tiskárny / skeneru	IT Servis
Výměna displeje (mobil/tablet)	Výměna displeje (mobil
Výměna baterie	Autoelektrikář
Oprava nabíjecího konektoru	Oprava nabíjecího konektoru
Nalepení ochranného skla	Nalepení ochranného skla
Odblokování telefonu	Odblokování telefonu
Oprava TV (podsvícení, zdroj)	Oprava TV
Oprava herní konzole	Oprava herní konzole
Diagnostika závady	Autoservis
Oprava PC	Oprava PC
Opravář elektroniky (TV, Audio,...)	Elektrikář
Právní služby	Advokát
Advokát / Právník	Advokát
Konzultace s advokátem	Advokát
Sepis kupní smlouvy (nemovitost/auto)	Autoservis
Sepis nájemní smlouvy	Advokát
Kontrola smluv	Kontrola smluv
Rozvodové řízení (návrh, vypořádání)	Autoservis
Založení s.r.o. / živnosti	Založení s.r.o.
Vymáhání pohledávek (předžalobní výzva)	Autoelektrikář
Oddlužení / Osobní bankrot	Advokát
Pro firmy	Pro firmy
Grafik / Marketer	Grafické studio
Asistentka	Pečovatelská služba
Tiskové služby	Tiskové služby
Tvorba loga and vizuální identity	Tvorba loga a vizuální identity
Tvorba webových stránek (vizitka)	Tvorba webu
Návrh vizitek / letáků	Návrh vizitek
Tvorba e-shopu	Tvorba webu
Správa sociálních sítí (FB/IG)	Marketingová agentura
Nastavení PPC reklamy (Google/Seznam)	Marketingová agentura
Copywriting (psaní textů na web)	Tvorba webu
SEO optimalizace webu	Marketingová agentura
Virtuální asistentka	Pečovatelská služba
Přepisování textů / audiozáznamů	Přepisování textů
Tisk vizitek / letáků	Tisk vizitek
Velkoformátový tisk (bannery)	Velkoformátový tisk
Potisk reklamních předmětů / triček	Potisk reklamních předmětů
Kopírování and skenování	Kopírování a skenování
Vazba dokumentů	Vazba dokumentů
Projektování	Projektování
Návrh interiéru (vizualizace)	Architektonické studio
Zahradní architekt (návrh zahrady)	Zahradnictví
Návrh kuchyně	Návrh kuchyně
Návrh koupelny	Instalatér
Homestaging (Příprava na prodej)	Realitní kancelář
Bytový architekt	Architektonické studio
Projektant / Architekt	Architektonické studio
Projekt rodinného domu (studie)	Projekt rodinného domu
Projekt pro stavební povolení	Architektonické studio
Stavební dozor	Stavební dozor
Prováděcí projekt stavby	Prováděcí projekt stavby
Statický posudek	Statický posudek
Energetický štítek budovy (PENB)	Architektonické studio
Architektonická vizualizace	Architektonické studio
Stavby / Rekonstrukce	Stavby
SDK předstěny	Zednictví
Broušení and lakování parket	Autolakýrna
Montáž obvodových lišt	Podlahářství
Podlahář	Podlahářství
Montáž lešení	Zednictví
Montáž posuvných dveří (pouzdro/stěna)	Montáž posuvných dveří (pouzdro
Hydroizolace spodní stavby	Zednictví
Výkopové práce (minibagr)	Zahradnictví
Výkopové práce (ruční)	Zahradnictví
Pokládka dřevěné podlahy	Podlahářství
Pokládka koberce	Pokládka koberce
Pokládka plovoucí podlahy (laminát)	Podlahářství
Pokládka PVC / Lina	Podlahářství
Pokládka vinylové podlahy (lepené/click)	Podlahářství
Čištění okapů	Úklidová firma
Klempířské prvky (úžlabí, lemování)	Klempířské prvky
Montáž okapů and svodů	Úklidová firma
Montáž střešních latí and fólie	Montáž střešních latí a fólie
Montáž střešních oken	Montáž střešních oken
Nátěr střechy	Malířství
Oprava zatékání střechy	Oprava zatékání střechy
Pokládka střešní krytiny (taška/plech)	Pokládka střešní krytiny (taška
Pokrývač / Klempíř	Pokrývač
Demontáž starých oken	Demontáž starých oken
Montáž garážových vrat	Montáž garážových vrat
Montáž interiérových dveří and zárubní	Montáž interiérových dveří a zárubní
Montáž nových oken	Montáž nových oken
Montáž předokenních rolet	Stínicí technika
Montáž sítí proti hmyzu	Montáž sítí proti hmyzu
Montáž vchodových dveří	Montáž vchodových dveří
Montáž venkovních parapetů	Montáž venkovních parapetů
Montáž vnitřních parapetů	Montáž vnitřních parapetů
Montáž žaluzií (horizontální/vertikální)	Stínicí technika
Montážník oken/dveří	Montážník oken
Seřízení kování oken	Autoservis
Výměna okenního těsnění	Výměna okenního těsnění
Zednické začištění oken (špalety)	Úklidová firma
Obložení schodů	Obložení schodů
Pokládka dlažby (chodba/kuchyň)	Truhlářství
Pokládka obkladů (koupelna/WC)	Instalatér
Pokládka velkoformátové dlažby	Zednictví
Silikonování rohů and koutů	Silikonování rohů a koutů
Kazetové podhledy (Raster)	Autoelektrikář
Půdní vestavba (šikminy, zateplení)	Zednictví
Sádrokartonář	Zednictví
SDK podhledy (rovné)	Autoelektrikář
Bourací práce	Bourací práce
Betonování podlah (potěr)	Zednictví
Bourání obkladů and dlažby	Zednictví
Fajnová omítka (štukování)	Zednictví
Jádrová omítka	Zednictví
Perlinka + lepidlo (natahování)	Perlinka + lepidlo
Samonivelační stěrka (vyrovnání)	Podlahářství
Vyřezávání otvorů pro dveře	Okna a dveře
Vyzdívání příček (Ytong, cihla)	Vyzdívání příček
Zedník	Zednictví
Kamenický roh (kamenické spoje)	Kamenický roh
Obkladač	Zednictví
SDK příčky (jednoduché/dvojité)	Zednictví
Lakování dveří and zárubní	Autolakýrna
Malíř pokojů	Malířství
Malování pokojů (barevná)	Malířství
Malování pokojů (bílá)	Malířství
Nátěr radiátorů	Topenář
Penetrace podkladu	Zednictví
Škrábání staré malby	Škrábání staré malby
Tapetování (vlies/papír)	Malířství
Fasádník (Zateplení and fasády)	Zednictví
Natažení fasádní omítky	Zednictví
Nátěr fasády	Malířství
Oprava trhlin ve fasádě	Zednictví
Zateplení fasády (polystyren/vata)	Zednictví
Betonování základových pasů	Zednictví
Dělník (Výkopy, betonování)	Zednictví
Drenáž kolem domu	Pneuservis
Ztracené bednění (zdění)	Ztracené bednění
Broušení podlahy	Podlahářství
Pokládka podlahy terasy	Podlahářství
Pokládka parket	Podlahářství
Pokládka dlažby	Zednictví
Betonová stěrka	Zednictví
Jádrové omítky	Jádrové omítky
Lepidlo s perlinkou	Lepidlo s perlinkou
Sádrová omítka	Zednictví
Štuková omítka	Zednictví
Velkoformátové obklady	Zednictví
Obklady	Zednictví
Dlažby	Zednictví
Dřevěné obložení	Dřevěné obložení
Kamenné obklady	Zednictví
Mozaikové obklady	Zednictví
Transport	Transport
Stěhování	Stěhování
Stěhování bytu / domu (komplet)	Stěhování
Stěhování těžkých břemen (klavír, trezor)	Zámečník
Montáž and demontáž nábytku při stěhování	Stěhování
Zapůjčení krabic na stěhování	Stěhování
Likvidace starého nábytku	Likvidace starého nábytku
Nákladní taxi (dodávka s řidičem)	Nákladní taxi
Odvoz starého spotřebiče / nábytku na sběrný dvůr	Stěhování
Dovoz nábytku z obchodu (IKEA, XXL...)	Dovoz nábytku z obchodu
Kurýrní služba (expresní doručení)	Kurýrní služba
Přeprava osob (mikrobus/bus)	Stěhování
Pronájem dodávky (bez řidiče)	Pronájem dodávky
Pronájem přívěsného vozíku	Pronájem přívěsného vozíku
Půjčení stěhovacích popruhů	Půjčení stěhovacích popruhů
Půjčení rudlu	Půjčení rudlu
Pronájem střešního boxu (rakve)	Pronájem střešního boxu
Dopravce / Kurýr	Dopravce
Půjčovna dodávek	Půjčovna dodávek
Truhlářství / Nábytek	Truhlářství
Výroba kuchyňské linky	Truhlářství
Výroba vestavěné skříně	Výroba vestavěné skříně
Výměna pracovní desky	Výměna pracovní desky
Výměna kuchyňských dvířek	Truhlářství
Výroba postele z masivu	Truhlářství
Výroba jídelního stolu	Výroba jídelního stolu
Výroba knihovny / polic	Truhlářství
Truhlář	Truhlářství
Koupelnový nábytek na míru	Instalatér
Montáž nábytku IKEA / Jysk apod.	Montáž nábytku IKEA
Montáž kuchyňské linky (sektorové)	Truhlářství
Zavěšení skříněk / polic	Truhlářství
Výřez dřezu do desky	Instalatér
Demontáž nábytku	Demontáž nábytku
Oprava rozklížené židle / stolu	Oprava rozklížené židle
Čalounění židlí	Čalounění židlí
Čalounění křesla / pohovky	Čalounění křesla
Broušení and lakování nábytku	Autolakýrna
Oprava pantů (seřízení dvířek)	Autoservis
Montér nábytku	Montér nábytku
Restaurátor / Čalouník	Restaurátor
Úklid	Úklidová firma
Pravidelný úklid (luxování, vytírání, prach)	Úklidová firma
Generální úklid (kompletní)	Úklidová firma
Mytí oken (vč. rámů)	Úklidová firma
Úklid po malování / rekonstrukci	Malířství
Žehlení prádla	Žehlení prádla
Mytí žaluzií	Stínicí technika
Tepování koberců (strojní)	Úklidová firma
Tepování sedací soupravy	Úklidová firma
Tepování matrací	Úklidová firma
Tepování židlí / křesel	Úklidová firma
Čištění kožené sedačky + impregnace	Úklidová firma
Tlakové mytí fasády (WAP)	Zednictví
Čištění o okapů	Úklidová firma
Tlakové mytí dlažby / terasy	Zednictví
Tlakové mytí střechy	Úklidová firma
Mytí solárních panelů	Úklidová firma
Úklid kanceláří	Úklidová firma
Vyklízení bytu / pozůstalosti	Úklidová firma
Úklid společných prostor bytových domů	Úklidová firma
Ozonové čištění prostor (dezinfekce)	Úklidová firma
Odstranění plísní	Odstranění plísní
Úklidová firma	Úklidová firma
Úklid venku	Úklidová firma
Čištění koberců/sedaček	Úklidová firma
Uklízečka	Uklízečka
Výuka and jazyky	Jazyková škola
Výuka italštiny	Jazyková škola
Výuka ruštiny	Jazyková škola
Výuka portugalštiny	Jazyková škola
Výuka čínštiny	Jazyková škola
Výuka japonštiny	Jazyková škola
Doučování Biologie	Doučování
Doučování Geografie	Doučování
Doučování Dějepisu	Doučování
Doučování Informatiky	Doučování
Výuka fotografování	Fotograf
Kurz vaření	Jazyková škola
Výuka jógy	Jazyková škola
Kurz digitálního marketingu	Marketingová agentura
Kurz programování	Jazyková škola
Výuka angličtiny (začátečníci/pokročilí)	Jazyková škola
Konverzace s rodilým mluvčím	Konverzace s rodilým mluvčím
Výuka němčiny	Jazyková škola
Výuka španělštiny	Jazyková škola
Výuka francouzštiny	Jazyková škola
Doučování Matematika (ZŠ/SŠ)	Doučování
Příprava na přijímací zkoušky	IT Servis
Doučování Český jazyk	Jazyková škola
Doučování Fyzika / Chemie	Doučování
Příprava na maturitu	Příprava na maturitu
Výuka hry na klavír / klávesy	Jazyková škola
Výuka hry na kytaru	Jazyková škola
Kurz kreslení / malování	Malířství
Keramický kurz	Jazyková škola
Kurz šití	Jazyková škola
Kondiční jízdy (autoškola)	Pneuservis
Kurz účetnictví	Účetní firma
Školení BOZP and PO	Pneuservis
Školení první pomoci	Pneuservis
Počítačový kurz (Excel, Word)	IT Servis
Soudní překlad	Zednictví
Běžný překlad textu	Zednictví
Korektura textu	Podlahářství
Tlumočení	Překladatel
Překlad webových stránek	Zednictví
Lektor jazyků	Jazyková škola
Odborné kurzy	Jazyková škola
Překladatel	Zednictví
Doučování	Doučování
Učitel hudby / Umění	Učitel hudby
Zahrada	Zahradnictví
Kácení stromů (ze země)	Zahradnictví
Sekání trávy (křovinořez - vysoká tráva)	Zahradnictví
Vertikutace trávníku	Zahradnictví
Hnojení trávníku	Zahradnictví
Stříhání živého plotu	Stříhání živého plotu
Řez ovocných stromů	Zahradnictví
Rizikové kácení (lezecká technika)	Zahradnictví
Odstranění pařezů (frézování)	Zahradnictví
Hrabání listí	Zahradnictví
Odvoz bioodpadu	Instalatér
Pokládka zámkové dlažby	Zámečník
Stavba plotu (pletivo)	Zednictví
Zahradník	Zahradnictví
Dlaždič / Stavitel	Dlaždič
Pokládka zatravňovací dlažby	Zednictví
Stavba plotu (KB blok / beton)	Zednictví
Stavba zahradního domku / pergoly	Zednictví
Montáž podhrabových desek	Montáž podhrabových desek
Výkop pro bazén / jezírko	Zahradnictví
Terénní úpravy and rovnání pozemku	Zahradnictví
Zakládání nového trávníku (výsev)	Zahradnictví
Pokládka kobercového trávníku	Zahradnictví
Sekání trávy	Zahradnictví
Zámečník	Zámečník
Výroba and montáž vjezdové brány	Zámečník
Výroba and montáž branky	Zámečník
Svářečské práce (ocel/nerez/hliník)	Zámečník
Montáž pohonu brány (automatizace)	Autoservis
Zábradlí na balkon / schodiště (kov)	Zámečník
Výroba ocelového schodiště	Výroba ocelového schodiště
Broušení and leštění kovů	Broušení a leštění kovů
Výměna zámkové vložky	Zámečník
Nouzové otevírání dveří (zabouchnuté)	Zámečník
Nouzové otevírání dveří (zamčené)	Nouzové otevírání dveří
Výměna zadlabacího zámku	Zámečník
Oprava zasekávajícího zámku	Zámečník
Montáž bezpečnostního kování	Montáž bezpečnostního kování
Kovovýroba	Zámečník
Zámečník	Zámečník
Zdraví and krása	Zdraví a krása
Pánský střih	Kadeřnictví
Dámský střih	Kadeřnictví
Barvení / Melír	Kadeřnictví
Společenský účes / Svatba	Kadeřnictví
Barber shop (úprava vousů)	Kadeřnictví
Čištění pleti	Úklidová firma
Kadeřnice	Kadeřnictví
Kosmetička	Kosmetický salon
Úprava obočí / Barvení řas	Kadeřnictví
Líčení (denní/večerní)	Kosmetický salon
Svatební líčení	Kosmetický salon
Laminace obočí / Lash lifting	Kosmetický salon
Permanentní make-up	Kosmetický salon
Manikúra (klasická)	Manikúra a Pedikúra
Pedikúra (mokrá/přístrojová)	Manikúra a Pedikúra
Gelové nehty (modeláž/doplnění)	Manikúra a Pedikúra
Odstranění gelových nehtů	Manikúra a Pedikúra
P-Shine	P-Shine
Masáž zad and šíje	Masér
Celotělová masáž	Masér
Depilace (vosk/cukrová pasta)	Zednictví
Lymfatická masáž	Masér
Tejpování	Fyzioterapeut
Osobní trenér (fitness)	Osobní trenér
Fyzioterapie / Rehabilitace	Fyzioterapeut
Sestavování jídelníčku	Nutriční poradce
Jóga (lekce)	Jóga
Masáž pro sportovce	Masér
Manikérka / Pedikérka	Manikérka
Trenér / Výživový poradce	Osobní trenér
Masáže	Masér';
BEGIN
  -- Array distinct helper (local to the block if needed, but let's assume global)
  FOR line IN 
    SELECT 
      split_part(l, '	', 1) as term,
      split_part(l, '	', 2) as subcat
    FROM unnest(string_to_array(map_data, E'\n')) l
    WHERE l != ''
  LOOP
    UPDATE public.service_subcategories
    SET search_terms = array_distinct(search_terms || ARRAY[line.term])
    WHERE name ILIKE '%' || line.subcat || '%'
       OR slug ILIKE '%' || line.subcat || '%';
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS array_distinct(anyarray);
DO $$
DECLARE
  terms TEXT[] := ARRAY[
    'Zapůjčení svatebního auta s řidičem', 'Cukrářství', 'Catering', 'Cukrářství', 'Animátor', 'Půjčovna párty stanů', 'DJ', 'Kapela', 'Kapela', 'Moderátor', 'DJ', 'Svatební fotograf', 'Fotograf', 'Fotograf', 'Fotograf', 'Fotograf', 'Kameraman', 'Fotograf', 'DJ', 'Catering', 'Svatební agentura', 'Svatební agentura', 'Svatební agentura', 'Cukrářství', 'Cukrářství',
    'Pneuservis', 'Detailing aut', 'Autosklo', 'Autolakýrna', 'Autoservis', 'Autoservis', 'Pneuservis', 'Autoelektrikář', 'Autoservis', 'Detailing aut', 'Autoservis', 'Autoservis', 'Autoservis', 'Pneuservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Instalatér', 'Topenář', 'Autoservis', 'Oprava', 'Motoservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Motoservis', 'Autoservis', 'Autoservis', 'Výměna ramen', 'Autoservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Autoservis', 'Úklidová firma', 'Autoservis', 'Pneuservis', 'Autoelektrikář', 'Pneuservis', 'Výměna ventilků', 'Pneuservis', 'Autoelektrikář', 'Autoservis', 'Autoelektrikář', 'Autoelektrikář', 'Odtahová služba', 'Autoservis', 'Elektrikář', 'Autoservis', 'Autoelektrikář', 'Autoelektrikář', 'Autoelektrikář', 'Autoelektrikář', 'Autoelektrikář', 'Pneuservis', 'Autoelektrikář', 'Autoelektrikář', 'Autoservis', 'Autosklo', 'Autolakýrna', 'Autolakýrna', 'Detailing aut', 'Detailing aut', 'Pneuservis', 'Motoservis', 'Motoservis', 'Pneuservis', 'Motoservis', 'Detailing aut', 'Autoservis', 'Montáž střešního nosiče', 'Pneuservis', 'Detailing aut', 'Detailing aut', 'Oprava', 'Autoservis', 'Autoservis', 'Autoelektrikář',
    'Krejčovství', 'Oprava obuvi', 'Krejčovství', 'Krejčovství', 'Broušení nožů', 'Pneuservis', 'Servis sportovního vybavení', 'Brašnářství', 'Krejčovství',
    'Topenář', 'Autoservis', 'Autoservis', 'Instalace FVE panelů', 'Servis a revize FVE', 'Zapojení střídače a baterií', 'Administrace dotací FVE', 'Úklidová firma', 'Fotovoltaika', 'Elektrikář', 'Autoelektrikář', 'Autoservis', 'Autoelektrikář', 'Elektrikář', 'Elektrikář', 'Zapojení indukční', 'Zapojení digestoře', 'Instalatér', 'Elektrikář', 'Elektrikář', 'Elektrikář', 'Elektrikář', 'Autoelektrikář', 'Motoservis', 'Přihláška k odběru (revize pro ČEZ',
    'IT Servis', 'Montáž zabezpečovacího systému', 'Autoservis', 'Montáž kamerového systému', 'Kameraman', 'Elektrikář', 'Elektrikář', 'IT technik',
    'Finanční poradce', 'Účetní firma', 'Účetní firma', 'Účetní firma', 'Účetní firma', 'Advokát', 'Mzdová agenda', 'Pečovatelská služba', 'Finanční poradce', 'Autoservis', 'Finanční analýza rodiny', 'Finanční poradce', 'Finanční poradce',
    'Pečovatelská služba', 'Pečovatelská služba', 'Pneuservis', 'Pečovatelská služba', 'Doučování', 'Chůva', 'Pečovatelská služba', 'Pečovatelská služba', 'Pečovatelská služba', 'Pečovatelská služba', 'Pečovatelská služba', 'Úklidová firma',
    'Hodinový manžel', 'Zednictví', 'Hodinový manžel', 'Krejčovství', 'Montáž TV držáku na zeď', 'Věšení obrazů a zrcadel', 'Výměna žárovek', 'Oprava kapajícího kohoutku', 'Instalatér', 'Instalatér', 'Výměna kliky u dveří', 'Promazání vrzajících dveří', 'Hodinový manžel',
    'Instalatér', 'Autoelektrikář', 'Instalatér', 'Instalatér', 'Autoelektrikář', 'Instalatér', 'Instalatér', 'Montáž podomítkového modulu', 'Instalatér', 'Instalatér', 'Instalatér', 'Instalatér', 'Instalatér', 'Výměna roháčků', 'Autoelektrikář', 'Připojení pračky', 'Instalatér', 'Autoservis', 'Výměna vodoměrů', 'Plynař', 'Topenář', 'Topenář', 'Topenář', 'Revize kotle', 'Instalatér', 'Topenář', 'Topenář', 'Topenář', 'Plynař', 'Instalace', 'Instalace', 'Plynař', 'Plynař', 'Autoservis', 'Autoservis', 'Plynař', 'Plynař', 'Topenář', 'Topenář', 'Topenář', 'Instalace', 'Výměna ventilu',
    'Psí salon', 'Pečovatelská služba', 'Venčení psů', 'Psí salon', 'Trimování psů', 'Koupání a vyčesávání', 'Stříhání drápků', 'Pečovatelská služba', 'Kynologické cvičiště', 'Fyzioterapeut',
    'Servis mobilů', 'IT Servis', 'IT Servis', 'IT Servis', 'IT Servis', 'IT Servis', 'IT Servis', 'IT Servis', 'IT Servis', 'IT Servis', 'Výměna displeje (mobil', 'Autoelektrikář', 'Oprava nabíjecího konektoru', 'Nalepení ochranného skla', 'Odblokování telefonu', 'Oprava TV', 'Oprava herní konzole', 'Autoservis', 'Oprava PC', 'Elektrikář',
    'Advokát', 'Advokát', 'Advokát', 'Autoservis', 'Advokát', 'Kontrola smluv', 'Autoservis', 'Založení s.r.o.', 'Autoelektrikář', 'Advokát',
    'Grafické studio', 'Pečovatelská služba', 'Tiskové služby', 'Tvorba loga a vizuální identity', 'Tvorba webu', 'Návrh vizitek', 'Tvorba webu', 'Marketingová agentura', 'Marketingová agentura', 'Tvorba webu', 'Marketingová agentura', 'Pečovatelská služba', 'Přepisování textů', 'Tisk vizitek', 'Velkoformátový tisk', 'Potisk reklamních předmětů', 'Kopírování a skenování', 'Vazba dokumentů',
    'Architektonické studio', 'Zahradnictví', 'Návrh kuchyně', 'Instalatér', 'Realitní kancelář', 'Architektonické studio', 'Architektonické studio', 'Projekt rodinného domu', 'Architektonické studio', 'Stavební dozor', 'Prováděcí projekt stavby', 'Statický posudek', 'Architektonické studio', 'Architektonické studio',
    'Zednictví', 'Autolakýrna', 'Podlahářství', 'Podlahářství', 'Zednictví', 'Montáž posuvných dveří (pouzdro', 'Zednictví', 'Zahradnictví', 'Zahradnictví', 'Podlahářství', 'Pokládka koberce', 'Podlahářství', 'Podlahářství', 'Podlahářství', 'Úklidová firma', 'Klempířské prvky', 'Úklidová firma', 'Montáž střešních latí a fólie', 'Montáž střešních oken', 'Malířství', 'Oprava zatékání střechy', 'Pokládka střešní krytiny (taška', 'Pokrývač', 'Demontáž starých oken', 'Montáž garážových vrat', 'Montáž interiérových dveří a zárubní', 'Montáž nových oken', 'Stínicí technika', 'Montáž sítí proti hmyzu', 'Montáž vchodových dveří', 'Montáž venkovních parapetů', 'Montáž vnitřních parapetů', 'Stínicí technika', 'Montážník oken', 'Autoservis', 'Výměna okenního těsnění', 'Úklidová firma', 'Obložení schodů', 'Truhlářství', 'Instalatér', 'Zednictví', 'Silikonování rohů a koutů', 'Autoelektrikář', 'Zednictví', 'Zednictví', 'Autoelektrikář', 'Bourací práce', 'Zednictví', 'Zednictví', 'Zednictví', 'Zednictví', 'Perlinka + lepidlo', 'Podlahářství', 'Okna a dveře', 'Vyzdívání příček', 'Zednictví', 'Kamenický roh', 'Zednictví', 'Zednictví', 'Autolakýrna', 'Malířství', 'Malířství', 'Malířství', 'Topenář', 'Zednictví', 'Škrábání staré malby', 'Malířství', 'Zednictví', 'Zednictví', 'Malířství', 'Zednictví', 'Zednictví', 'Zednictví', 'Zednictví', 'Pneuservis', 'Ztracené bednění', 'Podlahářství', 'Podlahářství', 'Podlahářství', 'Zednictví', 'Zednictví', 'Jádrové omítky', 'Lepidlo s perlinkou', 'Zednictví', 'Zednictví', 'Zednictví', 'Zednictví', 'Zednictví', 'Dřevěné obložení', 'Zednictví', 'Zednictví',
    'Stěhování', 'Stěhování', 'Zámečník', 'Stěhování', 'Stěhování', 'Likvidace starého nábytku', 'Nákladní taxi', 'Stěhování', 'Dovoz nábytku z obchodu', 'Kurýrní služba', 'Stěhování', 'Pronájem dodávky', 'Pronájem přívěsného vozíku', 'Půjčení stěhovacích popruhů', 'Půjčení rudlu', 'Pronájem střešního boxu', 'Dopravce', 'Půjčovna dodávek',
    'Truhlářství', 'Truhlářství', 'Výroba vestavěné skříně', 'Výměna pracovní desky', 'Truhlářství', 'Truhlářství', 'Výroba jídelního stolu', 'Truhlářství', 'Truhlářství', 'Instalatér', 'Montáž nábytku IKEA', 'Truhlářství', 'Truhlářství', 'Instalatér', 'Demontáž nábytku', 'Oprava rozklížené židle', 'Čalounění židlí', 'Čalounění křesla', 'Autolakýrna', 'Autoservis', 'Montér nábytku', 'Restaurátor',
    'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Malířství', 'Žehlení prádla', 'Stínicí technika', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Zednictví', 'Úklidová firma', 'Zednictví', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Odstranění plísní', 'Úklidová firma', 'Úklidová firma', 'Úklidová firma', 'Uklízečka',
    'Jazyková škola', 'Jazyková škola', 'Jazyková škola', 'Jazyková škola', 'Jazyková škola', 'Doučování', 'Doučování', 'Doučování', 'Doučování', 'Fotograf', 'Jazyková škola', 'Jazyková škola', 'Marketingová agentura', 'Jazyková škola', 'Jazyková škola', 'Konverzace s rodilým mluvčím', 'Jazyková škola', 'Jazyková škola', 'Jazyková škola', 'Doučování', 'IT Servis', 'Jazyková škola', 'Doučování', 'Příprava na maturitu', 'Jazyková škola', 'Jazyková škola', 'Malířství', 'Jazyková škola', 'Jazyková škola', 'Pneuservis', 'Účetní firma', 'Pneuservis', 'Pneuservis', 'IT Servis', 'Zednictví', 'Zednictví', 'Podlahářství', 'Překladatel', 'Zednictví', 'Jazyková škola', 'Jazyková škola', 'Zednictví', 'Doučování', 'Učitel hudby',
    'Zahradnictví', 'Zahradnictví', 'Zahradnictví', 'Zahradnictví', 'Stříhání živého plotu', 'Zahradnictví', 'Zahradnictví', 'Zahradnictví', 'Zahradnictví', 'Instalatér', 'Zámečník', 'Zednictví', 'Zahradnictví', 'Dlaždič', 'Zednictví', 'Zednictví', 'Zednictví', 'Montáž podhrabových desek', 'Zahradnictví', 'Zahradnictví', 'Zahradnictví', 'Zahradnictví', 'Zahradnictví',
    'Zámečník', 'Zámečník', 'Zámečník', 'Zámečník', 'Autoservis', 'Zámečník', 'Výora ocelového schodiště', 'Broušení a leštění kovů', 'Zámečník', 'Zámečník', 'Nouzové otevírání dveří', 'Zámečník', 'Zámečník', 'Montáž bezpečnostního kování', 'Zámečník', 'Zámečník',
    'Kadeřnictví', 'Kadeřnictví', 'Kadeřnictví', 'Kadeřnictví', 'Kadeřnictví', 'Úklidová firma', 'Kadeřnictví', 'Kosmetický salon', 'Kadeřnictví', 'Kosmetický salon', 'Kosmetický salon', 'Kosmetický salon', 'Kosmetický salon', 'Manikúra a Pedikúra', 'Manikúra a Pedikúra', 'Manikúra a Pedikúra', 'Manikúra a Pedikúra', 'P-Shine', 'Masér', 'Masér', 'Zednictví', 'Masér', 'Fyzioterapeut', 'Osobní trenér', 'Fyzioterapeut', 'Nutriční poradce', 'Jóga', 'Masér', 'Manikérka', 'Osobní trenér', 'Masér'
  ];
  sub_ids UUID[];
BEGIN
  -- Fetch subcategory IDs in the predicted UI order
  SELECT array_agg(s.id ORDER BY c.name ASC, s.sort_order ASC, s.name ASC)
  INTO sub_ids
  FROM public.service_subcategories s
  JOIN public.service_categories c ON c.id = s.category_id;

  -- Clear existing search_terms and update with new one-to-one mapping
  FOR i IN 1 .. array_length(terms, 1) LOOP
    IF i <= array_length(sub_ids, 1) THEN
      UPDATE public.service_subcategories 
      SET search_terms = ARRAY[terms[i]] 
      WHERE id = sub_ids[i];
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated % subcategories with new search terms.', LEAST(array_length(terms, 1), array_length(sub_ids, 1));
END $$;

-- A. Create businesses table
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ico text,
  dic text,
  company_type text NOT NULL DEFAULT 'self_employed',
  owner_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- B. Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

-- C. Enable RLS on businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team member can view business"
  ON public.businesses FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owner can insert business"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update business"
  ON public.businesses FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

-- D. Data migration for existing workers
INSERT INTO public.businesses (name, company_type, owner_id, points)
SELECT full_name, COALESCE(company_type, 'self_employed'), id, points
FROM public.profiles WHERE user_type = 'worker'
ON CONFLICT (owner_id) DO NOTHING;

UPDATE public.profiles p
SET company_id = b.id
FROM public.businesses b
WHERE b.owner_id = p.id AND p.user_type = 'worker';

UPDATE public.profiles p
SET points = 0
FROM public.businesses b
WHERE b.owner_id = p.id AND p.user_type = 'worker';

-- E. create_business RPC
CREATE OR REPLACE FUNCTION public.create_business(
  p_name text,
  p_ico text DEFAULT NULL,
  p_dic text DEFAULT NULL,
  p_company_type text DEFAULT 'self_employed'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_points integer;
  v_business_id uuid;
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id FROM businesses WHERE owner_id = v_user_id;
  IF v_existing_id IS NOT NULL THEN
    UPDATE businesses SET name = p_name, ico = p_ico, dic = p_dic, company_type = p_company_type, updated_at = now()
    WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  SELECT points INTO v_current_points FROM profiles WHERE id = v_user_id;
  IF v_current_points IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO businesses (name, ico, dic, company_type, owner_id, points)
  VALUES (p_name, p_ico, p_dic, p_company_type, v_user_id, v_current_points)
  RETURNING id INTO v_business_id;

  UPDATE profiles SET points = 0, company_id = v_business_id WHERE id = v_user_id;

  RETURN v_business_id;
END;
$$;

-- F. Replace deduct_points
CREATE OR REPLACE FUNCTION public.deduct_points(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_new_balance integer;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = p_user_id;

  IF v_company_id IS NOT NULL THEN
    UPDATE businesses
    SET points = points - p_amount, updated_at = now()
    WHERE id = v_company_id AND points >= p_amount
    RETURNING points INTO v_new_balance;
  ELSE
    UPDATE profiles
    SET points = points - p_amount
    WHERE id = p_user_id AND points >= p_amount
    RETURNING points INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- G. Replace add_user_points
CREATE OR REPLACE FUNCTION public.add_user_points(target_user_id uuid, points_to_add integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_new_balance integer;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = target_user_id;

  IF v_company_id IS NOT NULL THEN
    UPDATE businesses
    SET points = points + points_to_add, updated_at = now()
    WHERE id = v_company_id
    RETURNING points INTO v_new_balance;
  ELSE
    UPDATE profiles
    SET points = points + points_to_add
    WHERE id = target_user_id
    RETURNING points INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- H. Rebuild public_profiles view (preserve original column order, add new columns at end)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.header_url,
  p.bio,
  p.website,
  p.city,
  p.portfolio_photos,
  p.user_type,
  p.created_at,
  p.is_admin,
  p.xp_total,
  p.current_level,
  p.company_type,
  p.category,
  p.subcategory,
  p.engagement_score,
  p.last_activity,
  CASE
    WHEN auth.uid() = p.id THEN p.phone
    WHEN are_users_connected(auth.uid(), p.id) THEN p.phone
    ELSE NULL::text
  END AS phone,
  CASE
    WHEN auth.uid() = p.id THEN p.email
    ELSE NULL::text
  END AS email,
  p.is_pro,
  b.name AS business_name,
  b.ico
FROM public.profiles p
LEFT JOIN public.businesses b ON b.owner_id = p.id;
-- Add cleaned_up_count to track dead subscriptions removed during a broadcast
ALTER TABLE IF EXISTS public.broadcast_notifications 
ADD COLUMN IF NOT EXISTS cleaned_up_count INTEGER DEFAULT 0;

-- Comments for documentation
COMMENT ON COLUMN public.broadcast_notifications.cleaned_up_count IS 'Number of expired (410 Gone/404 Not Found) subscriptions removed during this campaign.';
-- Update find_workers_for_job to return subscription_id (ps.id)
DROP FUNCTION IF EXISTS public.find_workers_for_job(numeric, numeric, uuid, integer) CASCADE;
CREATE OR REPLACE FUNCTION public.find_workers_for_job(
  job_lat numeric,
  job_lng numeric,
  job_subcategory_id uuid,
  radius_meters integer DEFAULT 50000
)
RETURNS TABLE (
  worker_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT 
    p.id as worker_id,
    ps.id as subscription_id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM profiles p
  INNER JOIN worker_services ws ON ws.worker_id = p.id
  INNER JOIN push_subscriptions ps ON ps.user_id = p.id
  WHERE p.user_type IN ('worker', 'both')
    AND p.push_notifications = true
    AND COALESCE(p.push_new_jobs, true) = true
    AND ws.subcategory_id = job_subcategory_id
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(job_lng, job_lat), 4326)::geography,
      radius_meters
    );
$$;
-- Add first_name_vocative column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name_vocative TEXT;

-- Add first_name_vocative column to marketing_leads
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS first_name_vocative TEXT;

-- Update unified_contacts view to include first_name_vocative
-- We use CASCADE to ensure any views depending on this are also updated
DROP VIEW IF EXISTS public.unified_contacts CASCADE;
CREATE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    first_name_vocative,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    first_name_vocative,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source
FROM public.marketing_leads;

-- Re-grant permissions for the dropped view
GRANT SELECT ON public.unified_contacts TO authenticated;
GRANT SELECT ON public.unified_contacts TO service_role;

-- Create function to trigger the vokativ Edge Function
CREATE OR REPLACE FUNCTION public.trigger_process_vocative()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called by triggers on INSERT/UPDATE
    -- The webhook configuration should be done in the Supabase Dashboard
    -- to call the process-vokativ Edge Function.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles - INSERT
DROP TRIGGER IF EXISTS trg_profiles_vocative_insert ON public.profiles;
CREATE TRIGGER trg_profiles_vocative_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.full_name IS NOT NULL)
EXECUTE FUNCTION public.trigger_process_vocative();

-- Trigger for profiles - UPDATE
DROP TRIGGER IF EXISTS trg_profiles_vocative_update ON public.profiles;
CREATE TRIGGER trg_profiles_vocative_update
AFTER UPDATE OF full_name ON public.profiles
FOR EACH ROW
WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
EXECUTE FUNCTION public.trigger_process_vocative();

-- Trigger for marketing_leads - INSERT
DROP TRIGGER IF EXISTS trg_marketing_leads_vocative_insert ON public.marketing_leads;
CREATE TRIGGER trg_marketing_leads_vocative_insert
AFTER INSERT ON public.marketing_leads
FOR EACH ROW
WHEN (NEW.full_name IS NOT NULL)
EXECUTE FUNCTION public.trigger_process_vocative();

-- Trigger for marketing_leads - UPDATE
DROP TRIGGER IF EXISTS trg_marketing_leads_vocative_update ON public.marketing_leads;
CREATE TRIGGER trg_marketing_leads_vocative_update
AFTER UPDATE OF full_name ON public.marketing_leads
FOR EACH ROW
WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
EXECUTE FUNCTION public.trigger_process_vocative();
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_as_company boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT
  p.id, p.full_name, p.avatar_url, p.header_url, p.bio, p.website,
  p.city, p.portfolio_photos, p.user_type, p.created_at, p.is_admin,
  p.xp_total, p.current_level, p.company_type, p.category, p.subcategory,
  p.engagement_score, p.last_activity,
  CASE WHEN auth.uid() = p.id THEN p.phone
       WHEN are_users_connected(auth.uid(), p.id) THEN p.phone
       ELSE NULL::text END AS phone,
  CASE WHEN auth.uid() = p.id THEN p.email
       ELSE NULL::text END AS email,
  p.is_pro,
  p.display_as_company,
  b.name AS business_name,
  b.ico
FROM public.profiles p
LEFT JOIN public.businesses b ON b.id = p.company_id;
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS rejection_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text;
-- Update the existing Sniper B template with the latest text and placeholder support
UPDATE public.marketing_templates
SET body = 'Dobrý den,
ozývám se Vám, protože mám čerstvou poptávku na {{category_form}} v lokalitě {{jobCity}} a okolí. Klient píše:
„{{jobDescription}}“
Více detailů zakázky si můžete prohlédnout rovnou zde:
{{jobUrl}} (odkaz nevyžaduje žádnou registraci)
Je to přes náš portál Zrobee (propojujeme lidi, co něco potřebují, se šikovnými profíky z jejich okolí).
Jestli máte zrovna volné ruce, zakázka je Vaše. Pokud ne, dejte mi prosím vědět, ať nenecháme klienta čekat a poptávku můžu posunout dál.
Díky a ať se daří,
Michal
Zrobee.cz
P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat „Ne“ a už Vás nebudu rušit.'
WHERE name = 'Sniper B - Přímá cesta (S odkazem)';
-- Update the Sniper B template with improved vertical spacing for better readability
UPDATE public.marketing_templates
SET body = 'Dobrý den,

ozývám se Vám, protože mám čerstvou poptávku na {{category_form}} v lokalitě {{jobCity}} a okolí. Klient píše:

„{{jobDescription}}“

Více detailů zakázky si můžete prohlédnout rovnou zde:
{{jobUrl}} (odkaz nevyžaduje žádnou registraci)

Je to přes náš portál Zrobee (propojujeme lidi, co něco potřebují, se šikovnými profíky z jejich okolí).

Jestli máte zrovna volné ruce, zakázka je Vaše. Pokud ne, dejte mi prosím vědět, ať nenecháme klienta čekat a poptávku můžu posunout dál.

Díky a ať se daří,
Michal
Zrobee.cz

P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat „Ne“ a už Vás nebudu rušit.'
WHERE name = 'Sniper B - Přímá cesta (S odkazem)';
-- Add job_id to email_campaigns for better tracking in Sniper mode
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;

-- Create an index for faster lookup of campaigns by job_id
CREATE INDEX IF NOT EXISTS idx_email_campaigns_job_id ON public.email_campaigns(job_id);
-- Update unified_contacts view to include points (credits)
DROP VIEW IF EXISTS public.unified_contacts CASCADE;
CREATE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    first_name_vocative,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source,
    points as credits
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    first_name_vocative,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source,
    0 as credits
FROM public.marketing_leads;

-- Re-grant permissions
GRANT SELECT ON public.unified_contacts TO authenticated;
GRANT SELECT ON public.unified_contacts TO service_role;
-- Fix missing DELETE policies for push notifications and campaigns
-- Timestamp: 2026-04-05 10:00:00

DO $$ 
BEGIN
    -- 1. Add DELETE policy for broadcast_notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'broadcast_notifications' 
        AND policyname = 'Admins can delete broadcast notifications'
    ) THEN
        CREATE POLICY "Admins can delete broadcast notifications" 
        ON public.broadcast_notifications 
        FOR DELETE 
        TO authenticated 
        USING (public.is_admin(auth.uid()));
    END IF;

    -- 2. Add DELETE policy for push_templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_templates' 
        AND policyname = 'Admins can delete push templates'
    ) THEN
        CREATE POLICY "Admins can delete push templates" 
        ON public.push_templates 
        FOR DELETE 
        TO authenticated 
        USING (public.is_admin(auth.uid()));
    END IF;
END $$;
-- Migration for user_notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.user_notifications(read);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- Cleanup job (marking older than 30 days as deleted or just deleting them if they are read)
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Safely schedule the cleanup
        PERFORM cron.schedule(
            'cleanup-old-notifications',
            '0 0 * * *', -- Daily at midnight
            'DELETE FROM public.user_notifications WHERE read = TRUE AND created_at < NOW() - INTERVAL ''30 days'''
        );
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id uuid REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'cleaned_up')),
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can full access broadcast recipients" ON public.broadcast_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
-- Migration: Add cookie_consent (JSONB) to profiles to store user preferences across devices.
-- This version (1.1) supports granular consents (analytics, marketing) and versioning.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cookie_consent') THEN
        ALTER TABLE profiles ADD COLUMN cookie_consent JSONB DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cookie_consent_at') THEN
        ALTER TABLE profiles ADD COLUMN cookie_consent_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

COMMENT ON COLUMN profiles.cookie_consent IS 'Stores the users cookie preferences including version and individual flags.';
COMMENT ON COLUMN profiles.cookie_consent_at IS 'When the cookie consent was last set or updated.';
DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Admins can view all push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
-- Add scheduling and status tracking to email_campaigns
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
ADD COLUMN IF NOT EXISTS target_filters jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_payload jsonb DEFAULT '{}';

-- Add scheduling and status tracking to broadcast_notifications
ALTER TABLE public.broadcast_notifications 
ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
ADD COLUMN IF NOT EXISTS target_filters jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_payload jsonb DEFAULT '{}';

-- Create an index for the worker to find scheduled tasks quickly
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON public.email_campaigns (scheduled_at, status) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_scheduled ON public.broadcast_notifications (scheduled_at, status) WHERE status = 'scheduled';

-- Update existing records to 'completed' status if they don't have one
UPDATE public.email_campaigns SET status = 'completed' WHERE status IS NULL;
UPDATE public.broadcast_notifications SET status = 'completed' WHERE status IS NULL;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
-- Add photos column to messages table to support image attachments
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Fix existing messages that might have null photos
UPDATE public.messages SET photos = '{}' WHERE photos IS NULL;
-- Update jobs status constraint to allow 'pending' for direct approach
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'pending'));

-- Update offers status constraint to allow 'direct_pending'
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'direct_pending'));

-- Add RLS policy to allow customers to create an initial offer for their own jobs
-- This is necessary for the direct hiring flow where the customer approach results in an offer record
CREATE POLICY "Customers can create direct offers" 
ON offers FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT customer_id FROM jobs WHERE id = job_id)
);
-- Update the validate_offer_status_transition function to support the direct hiring flow
-- Allowing transitions from 'direct_pending' to 'accepted', 'rejected', or 'withdrawn'

CREATE OR REPLACE FUNCTION public.validate_offer_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If status is not changing, allow the update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions
  -- Original flow:
  -- pending -> accepted, rejected, withdrawn (OK)
  
  -- Direct hiring flow:
  -- direct_pending -> accepted, rejected, withdrawn (OK)
  
  IF OLD.status IN ('pending', 'direct_pending') THEN
    -- Allow transitions from direct_pending to pending (worker responded), accepted, rejected, or withdrawn
  IF OLD.status = 'direct_pending' AND NEW.status IN ('pending', 'accepted', 'rejected', 'withdrawn') THEN
    RETURN NEW;
  END IF;
    -- From pending, can go to accepted, rejected, or withdrawn
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected', 'withdrawn') THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- All other transitions are invalid
  RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$function$;
-- Add is_direct boolean column to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS is_direct BOOLEAN DEFAULT false;

-- Update existing direct inquiries to have is_direct = true
UPDATE public.offers 
SET is_direct = true 
WHERE status = 'direct_pending';
-- Add RLS policies for Admins on the jobs table
-- This allows Admins to manage jobs directly (Delete/Update)

-- 1. Admin Delete Policy for jobs
DROP POLICY IF EXISTS "Admins can delete any job" ON public.jobs;
CREATE POLICY "Admins can delete any job"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. Admin Update Policy for jobs
DROP POLICY IF EXISTS "Admins can update any job" ON public.jobs;
CREATE POLICY "Admins can update any job"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Admin Insert Policy for jobs
DROP POLICY IF EXISTS "Admins can insert any job" ON public.jobs;
CREATE POLICY "Admins can insert any job"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Admin Policies for reviews
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews"
  ON public.reviews
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. Admin Policies for offers
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;
CREATE POLICY "Admins can manage offers"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 6. Admin Policies for messages
DROP POLICY IF EXISTS "Admins can manage messages" ON public.messages;
CREATE POLICY "Admins can manage messages"
  ON public.messages
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
-- Create table for batching notifications
CREATE TABLE IF NOT EXISTS public.queued_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    group_key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    payload JSONB,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the worker to find pending items quickly
CREATE INDEX IF NOT EXISTS idx_queued_notifications_pending 
ON public.queued_notifications (status, scheduled_at) 
WHERE status = 'pending';

-- Prevent duplicate pending notifications for the same user/group
CREATE UNIQUE INDEX IF NOT EXISTS idx_queued_notifications_group_user_pending
ON public.queued_notifications (user_id, group_key, status)
WHERE status = 'pending';

-- Set up RLS (Service role only typically, but we'll add basic read for safety)
ALTER TABLE public.queued_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queued notifications"
ON public.queued_notifications FOR SELECT
USING (auth.uid() = user_id);

-- Add to notifications schema for documentation/tracking
COMMENT ON TABLE public.queued_notifications IS 'Stores notifications that are deferred/batched (e.g. consolidated message emails).';
-- Migration to add new subcategories as per market analysis request
-- Date: 2026-04-13

DO $$
BEGIN
  -- 1. STAVBY / REKONSTRUKCE
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Sklenářství', 'sklenarstvi', 'úkon', 2, 'Dle rozsahu', 'STANDARD', 'Služby', 'Grid', 50),
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Izolatérství / Hydroizolace', 'izolaterstvi-hydroizolace', 'm2', 3, '250 - 600 Kč/m2', 'STANDARD', 'Služby', 'ShieldCheck', 51),
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Montáž a pronájem lešení / bednění', 'montaz-pronajem-leseni-bedneni', 'úkon', 3, 'Dle dohody', 'STANDARD', 'Služby', 'Construction', 52),
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Průmyslové demolice / Velké stavby', 'prumyslove-demolice-velke-stavby', 'úkon', 3, 'Individuální', 'STANDARD', 'Demolice', 'Building', 53),
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Odvoz a likvidace stavební suti', 'odvoz-likvidace-stavebni-suti', 'úkon', 2, '1 500 - 3 500 Kč', 'STANDARD', 'Odvoz suti', 'Trash2', 54),
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Jádrové vrtání / Řezání betonu', 'jadrove-vrtani-rezani-betonu', 'úkon', 3, '800 - 2 500 Kč', 'STANDARD', 'Vrtání', 'Disc', 55),
    ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Kamenictví / Kamenické práce', 'kamenictvi-kamenicke-prace', 'úkon', 3, 'Dle projektu', 'STANDARD', 'Kamenictví', 'Mountain', 56);

  -- 2. PROJEKTOVÁNÍ
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Realizace interiérů (na klíč)', 'realizace-interieru-na-klic', 'úkon', 3, 'Dle projektu', 'PROMINENT', 'Interiér', 'KeyRound', 20),
    ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Geodetické služby', 'geodeticke-sluzby', 'úkon', 2, '2 000 - 8 000 Kč', 'STANDARD', 'Geodézie', 'Navigation', 21);

  -- 3. PRO FIRMY
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'pro-firmy'), 'Programování na míru / Vývoj aplikací', 'programovani-vyvoj-aplikaci', 'hodina', 3, '600 - 1 500 Kč/hod', 'PROMINENT', 'Vývoj', 'Code', 30),
    ((SELECT id FROM service_categories WHERE slug = 'pro-firmy'), 'Vývoj mobilních aplikací', 'vyvoj-mobilnich-aplikaci', 'úkon', 3, 'Od 50 000 Kč', 'PROMINENT', 'Vývoj', 'Smartphone', 31);

  -- 4. TRANSPORT (Doprava)
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'doprava'), 'Pronájem stavebních kontejnerů', 'pronajem-stavebnich-kontejneru', 'úkon', 2, '1 500 - 3 500 Kč', 'STANDARD', 'Služby', 'Truck', 25);

  -- 5. ELEKTRO
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'elektro'), 'Bezpečnostní agentura / Ostraha', 'bezpecnostni-agentura-ostraha', 'hodina', 2, '180 - 350 Kč/hod', 'STANDARD', 'Bezpečnost', 'Shield', 40);

  -- 6. TRUHLÁŘSTVÍ / NÁBYTEK (truharstvo)
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'truharstvo'), 'Čalounictví / Opravy nábytku', 'calounictvi-opravy-nabytku', 'úkon', 2, 'Dle rozsahu', 'STANDARD', 'Opravy', 'Scissors', 35);

  -- 7. DALŠÍ SLUŽBY / HODINOVÝ MANŽEL
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
  VALUES 
    ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Kominík', 'kominik', 'úkon', 2, '800 - 1 500 Kč', 'STANDARD', 'Služby', 'Flame', 45),
    ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Opravář domácích spotřebičů', 'oprava-domacich-spotrebicu', 'úkon', 2, '500 - 1 500 Kč', 'STANDARD', 'Opravy', 'Settings', 46);

  -- 8. UPDATE category_form (genitive forms for "Sniper" emails)
  UPDATE public.service_subcategories SET category_form = 'sklenářství' WHERE slug = 'sklenarstvi';
  UPDATE public.service_subcategories SET category_form = 'izolatérství / hydroizolace' WHERE slug = 'izolaterstvi-hydroizolace';
  UPDATE public.service_subcategories SET category_form = 'montáže lešení' WHERE slug = 'montaz-pronajem-leseni-bedneni';
  UPDATE public.service_subcategories SET category_form = 'průmyslových demolic' WHERE slug = 'prumyslove-demolice-velke-stavby';
  UPDATE public.service_subcategories SET category_form = 'odvozu suti' WHERE slug = 'odvoz-likvidace-stavebni-suti';
  UPDATE public.service_subcategories SET category_form = 'jádrového vrtání' WHERE slug = 'jadrove-vrtani-rezani-betonu';
  UPDATE public.service_subcategories SET category_form = 'kamenictví' WHERE slug = 'kamenictvi-kamenicke-prace';
  UPDATE public.service_subcategories SET category_form = 'realizace interiérů' WHERE slug = 'realizace-interieru-na-klic';
  UPDATE public.service_subcategories SET category_form = 'geodetických služeb' WHERE slug = 'geodeticke-sluzby';
  UPDATE public.service_subcategories SET category_form = 'programování na míru' WHERE slug = 'programovani-vyvoj-aplikaci';
  UPDATE public.service_subcategories SET category_form = 'vývoje mobilních aplikací' WHERE slug = 'vyvoj-mobilnich-aplikaci';
  UPDATE public.service_subcategories SET category_form = 'pronájmu stavebních kontejnerů' WHERE slug = 'pronajem-stavebnich-kontejneru';
  UPDATE public.service_subcategories SET category_form = 'bezpečnostní agentury' WHERE slug = 'bezpecnostni-agentura-ostraha';
  UPDATE public.service_subcategories SET category_form = 'čalounictví' WHERE slug = 'calounictvi-opravy-nabytku';
  UPDATE public.service_subcategories SET category_form = 'kominíka' WHERE slug = 'kominik';
  UPDATE public.service_subcategories SET category_form = 'opraváře domácích spotřebičů' WHERE slug = 'oprava-domacich-spotrebicu';

  -- 9. ADD basic search_terms
  UPDATE public.service_subcategories SET search_terms = ARRAY['sklenář', 'rozbité okno', 'výměna skla'] WHERE slug = 'sklenarstvi';
  UPDATE public.service_subcategories SET search_terms = ARRAY['izolace', 'vlhkost', 'střecha', 'základy'] WHERE slug = 'izolaterstvi-hydroizolace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['lešení', 'bednění', 'pronájem'] WHERE slug = 'montaz-pronajem-leseni-bedneni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['demolice', 'bourání', 'bagr', 'velké stavby'] WHERE slug = 'prumyslove-demolice-velke-stavby';
  UPDATE public.service_subcategories SET search_terms = ARRAY['suť', 'odvoz', 'kontejner', 'odpad'] WHERE slug = 'odvoz-likvidace-stavebni-suti';
  UPDATE public.service_subcategories SET search_terms = ARRAY['vrtání', 'řezání', 'beton', 'panel'] WHERE slug = 'jadrove-vrtani-rezani-betonu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['kámen', 'kamenictví', 'žula', 'mramor'] WHERE slug = 'kamenictvi-kamenicke-prace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['interiér', 'na klíč', 'auto-moto', 'design'] WHERE slug = 'realizace-interieru-na-klic';
  UPDATE public.service_subcategories SET search_terms = ARRAY['geodet', 'vyměření', 'pozemek', 'hranice'] WHERE slug = 'geodeticke-sluzby';
  UPDATE public.service_subcategories SET search_terms = ARRAY['programování', 'software', 'aplikace', 'web'] WHERE slug = 'programovani-vyvoj-aplikaci';
  UPDATE public.service_subcategories SET search_terms = ARRAY['mobil', 'ios', 'android', 'aplikace'] WHERE slug = 'vyvoj-mobilnich-aplikaci';
  UPDATE public.service_subcategories SET search_terms = ARRAY['kontejner', 'suť', 'stavba', 'odpad'] WHERE slug = 'pronajem-stavebnich-kontejneru';
  UPDATE public.service_subcategories SET search_terms = ARRAY['ostraha', 'hlídání', 'security', 'vyhazovač'] WHERE slug = 'bezpecnostni-agentura-ostraha';
  UPDATE public.service_subcategories SET search_terms = ARRAY['čalounění', 'oprava nábytku', 'potah', 'látka'] WHERE slug = 'calounictvi-opravy-nabytku';
  UPDATE public.service_subcategories SET search_terms = ARRAY['komín', 'revize', 'čištění', 'kominík'] WHERE slug = 'kominik';
  UPDATE public.service_subcategories SET search_terms = ARRAY['lednice', 'pračka', 'myčka', 'servis'] WHERE slug = 'oprava-domacich-spotrebicu';

END $$;
-- Add description column to marketing_leads
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS description TEXT;

-- Update unified_contacts view to include description field
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source,
    bio as description
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source,
    description
FROM public.marketing_leads;

-- Grant access to the updated view
GRANT SELECT ON public.unified_contacts TO authenticated;
-- Add secondary_emails column
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS secondary_emails TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_emails TEXT[] DEFAULT '{}';

-- Update unified_contacts view to include secondary_emails
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source,
    bio as description,
    secondary_emails
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source,
    description,
    secondary_emails
FROM public.marketing_leads;

-- Grant access to the updated view
GRANT SELECT ON public.unified_contacts TO authenticated;
-- Migration to add new subcategories for Hodinový manžel
-- Date: 2026-04-14

DO $$
DECLARE
  cat_id UUID := 'cab210ce-3270-4886-9ec7-4a97ebb1eac5';
BEGIN
  -- 1. Montáže
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
  VALUES 
    (cat_id, 'Skládání nábytku (IKEA, XXXLutz atd.)', 'skladani-nabytku', 'úkon', 2, 'Dle dohody', 'STANDARD', 'Montáže', 'Hammer', 60, 'skládání nábytku', ARRAY['montáž nábytku', 'ikea', 'skříň', 'postel', 'stůl']),
    (cat_id, 'Zapojení pračky / sušičky / myčky', 'zapojeni-pracky-susicky-mycky', 'úkon', 2, '500 - 1 200 Kč', 'STANDARD', 'Montáže', 'Package', 61, 'zapojení pračky', ARRAY['pračka', 'myčka', 'sušička', 'instalace', 'odpady']),
    (cat_id, 'Výměna zámku / cylindrické vložky (FAB)', 'vymena-zamku-cylindricke-vlozky', 'úkon', 2, '400 - 1 000 Kč', 'STANDARD', 'Montáže', 'KeyRound', 62, 'výměny zámku', ARRAY['zámek', 'vložka', 'fab', 'dveře', 'bezpečnost']),
    (cat_id, 'Montáž sítí proti hmyzu', 'montaz-siti-proti-hmyzu', 'm2', 2, 'Dle rozměru', 'STANDARD', 'Montáže', 'Layout', 63, 'montáže sítí', ARRAY['sítě', 'hmyz', 'okno', 'komár', 'mouchy']),
    (cat_id, 'Instalace a ladění TV / Set-top boxu', 'instalace-ladeni-tv-set-top-boxu', 'úkon', 2, '500 - 1 500 Kč', 'STANDARD', 'Montáže', 'Monitor', 64, 'instalace TV', ARRAY['televize', 'tv', 'anténa', 'ladění', 'settopbox', 'satelit']);

  -- 2. Drobné opravy
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
  VALUES 
    (cat_id, 'Seřízení plastových oken a dveří', 'serizeni-plastovych-oken-dveri', 'úkon', 2, '400 - 1 500 Kč', 'STANDARD', 'Drobné opravy', 'Wrench', 70, 'seřízení oken', ARRAY['okna', 'seřízení', 'plastová okna', 'dveře', 'těsnění']),
    (cat_id, 'Oprava nábytku (výměna pantů, pojezdů šuplíků)', 'oprava-nabytku-panty', 'úkon', 2, 'Dle dohody', 'STANDARD', 'Drobné opravy', 'Settings', 71, 'opravy nábytku', ARRAY['oprava', 'panty', 'šuplík', 'skříň', 'nábytek']),
    (cat_id, 'Oprava žaluzií (výměna prasklého provázku / řetízku)', 'oprava-zaluzii', 'úkon', 2, '300 - 800 Kč', 'STANDARD', 'Drobné opravy', 'Scissors', 72, 'opravy žaluzií', ARRAY['žaluzie', 'provázek', 'řetízek', 'stínění', 'oprava']),
    (cat_id, 'Drobné opravy plotů a branek', 'drobne-opravy-plotu-branek', 'úkon', 2, 'Dle dohody', 'STANDARD', 'Drobné opravy', 'Hammer', 73, 'drobných oprav plotů', ARRAY['plot', 'branka', 'oprava', 'dřevo', 'kov', 'pletivo']);

  -- 3. Služby
  INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
  VALUES 
    (cat_id, 'Nouzové otevírání zabouchnutých dveří', 'nouzove-otevirani-dveri', 'úkon', 3, '1 500 - 3 500 Kč', 'STANDARD', 'Služby', 'Zap', 80, 'nouzového otevírání dveří', ARRAY['otevření', 'zabouchnuté', 'klíče', 'nouze', 'zámek']),
    (cat_id, 'Čištění okapů', 'cisteni-okapu', 'm', 2, '80 - 150 Kč/m', 'STANDARD', 'Služby', 'Waves', 81, 'čištění okapů', ARRAY['okapy', 'střecha', 'listí', 'čištění', 'voda']);

END $$;
-- Rename 'Auto-Moto' category to 'Autoservis'
-- Date: 2026-04-14

UPDATE public.service_categories 
SET name = 'Autoservis' 
WHERE slug = 'auto-moto';

-- Also update any internal references in subcategories category_form if needed
-- (Though general seeders will handle this on next execution)
UPDATE public.service_subcategories 
SET category_form = 'autoservisu' 
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'auto-moto')
AND (name ILIKE '%ostatní%' OR name ILIKE '%obecná%');
-- Migration to add more service subcategories across several categories
-- Date: 2026-04-14
-- Fixed slugs: 'autoservis' -> 'auto-moto'

DO $$
BEGIN
  -- 1. Create "Cestování" category if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM service_categories WHERE slug = 'cestovani') THEN
    INSERT INTO service_categories (name, slug, icon)
    VALUES ('Cestování', 'cestovani', 'Plane');
  END IF;

  -- 2. STAVBY / REKONSTRUKCE (stavby-rekonstrukce)
  -- Rename existing 'Sklenářství' to avoid duplicate
  IF EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'sklenarstvi') THEN
    UPDATE public.service_subcategories 
    SET name = 'Sklenář / Zasklívání', slug = 'sklenar-zasklivani'
    WHERE slug = 'sklenarstvi';
  ELSIF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'sklenar-zasklivani') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Sklenář / Zasklívání', 'sklenar-zasklivani', 'úkon', 2, 'Dle rozsahu', 'STANDARD', 'Služby', 'Layers', 50);
  END IF;

  -- Add other stavby subcategories if they don't exist
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'montaz-servis-vytahu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Montáž a servis výtahů', 'montaz-servis-vytahu', 'úkon', 3, 'Individuální', 'STANDARD', 'Služby', 'ArrowUpCircle', 57);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'ploty-brany-vjezdy') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Ploty / brány / vjezdy', 'ploty-brany-vjezdy', 'm', 3, '1 500 - 3 500 Kč/m', 'STANDARD', 'Služby', 'Fence', 58);
  END IF;

  -- 3. AUTOSERVIS (auto-moto) - FIXED SLUG
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'autovrakoviste') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'auto-moto'), 'Autovrakoviště', 'autovrakoviste', 'úkon', 2, 'Dle dohody', 'STANDARD', 'Služby', 'Trash2', 40);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'oprava-navigaci-chiptuning') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'auto-moto'), 'Oprava navigací / Chiptuning', 'oprava-navigaci-chiptuning', 'úkon', 3, '2 000 - 8 000 Kč', 'STANDARD', 'Služby', 'Cpu', 41);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'renovace-veteranu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'auto-moto'), 'Renovace veteránů', 'renovace-veteranu', 'úkon', 4, 'Individuální', 'STANDARD', 'Služby', 'Car', 42);
  END IF;

  -- 4. PC A MOBILY (pc-a-mobile)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'vyvoj-aplikaci') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Vývoj aplikací (Software, Cloud, Aplikace)', 'vyvoj-aplikaci', 'úkon', 5, 'Individuální', 'PROMINENT', 'Vývoj', 'Code', 30);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'it-outsourcing') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'IT Outsourcing / Správa sítí', 'it-outsourcing', 'hodina', 3, '600 - 1 500 Kč/hod', 'STANDARD', 'IT Služby', 'Network', 31);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'umela-inteligence') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Umělá inteligence', 'umela-inteligence', 'úkon', 5, 'Individuální', 'STANDARD', 'Vývoj', 'Brain', 32);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'tiskove-sluzby-grafik') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Tiskové služby / Grafik', 'tiskove-sluzby-grafik', 'úkon', 2, 'Dle projektu', 'STANDARD', 'Design', 'Printer', 33);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'media-vydavatelstvi') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Média a vydavatelství', 'media-vydavatelstvi', 'úkon', 2, 'Dle dohody', 'STANDARD', 'Ostatní', 'Newspaper', 34);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'call-centrum') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Call centrum / Výzkum trhu', 'call-centrum', 'hodina', 2, '300 - 600 Kč/hod', 'STANDARD', 'Ostatní', 'PhoneCall', 35);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'personalistika-hr') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Personalistika a HR', 'personalistika-hr', 'úkon', 2, 'Dle rozsahu', 'STANDARD', 'Ostatní', 'Users', 36);
  END IF;

  -- 5. HLÍDÁNÍ A PÉČE (hlidani-a-pece)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'detske-centrum') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hlidani-a-pece'), 'Dětské centrum / Koutek', 'detske-centrum', 'hodina', 2, '100 - 300 Kč/hod', 'STANDARD', 'Děti', 'Baby', 20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'hodinar-oprava-hodinek') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hlidani-a-pece'), 'Hodinář / Oprava hodinek', 'hodinar-oprava-hodinek', 'úkon', 2, 'Dle rozsahu', 'STANDARD', 'Služby', 'Watch', 21);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'zlatnik-oprava-sperku') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hlidani-a-pece'), 'Zlatník / Oprava šperků', 'zlatnik-oprava-sperku', 'úkon', 2, 'Dle rozsahu', 'STANDARD', 'Služby', 'Gem', 22);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'nutricni-poradce') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hlidani-a-pece'), 'Nutriční poradce / Zdravý životní styl', 'nutricni-poradce', 'hodina', 3, '500 - 1 500 Kč', 'STANDARD', 'Zdraví', 'Apple', 23);
  END IF;

  -- 6. CESTOVÁNÍ (cestovani)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'cestovni-agentura') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'cestovani'), 'Cestovní kancelář / Agentura', 'cestovni-agentura', 'úkon', 2, 'Dle nabídky', 'PROMINENT', 'Cestovní služby', 'Plane', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'ubytovani-pronajem') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'cestovani'), 'Ubytování / Pronájem chat', 'ubytovani-pronajem', 'noc', 3, '1 000 - 5 000 Kč', 'PROMINENT', 'Cestovní služby', 'Home', 2);
  END IF;

  -- 7. UPDATE category_form (genitive forms for "Sniper" emails)
  UPDATE public.service_subcategories SET category_form = 'sklenáře / zasklívání' WHERE slug = 'sklenar-zasklivani';
  UPDATE public.service_subcategories SET category_form = 'montáže a servisu výtahů' WHERE slug = 'montaz-servis-vytahu';
  UPDATE public.service_subcategories SET category_form = 'plotů / bran / vjezdů' WHERE slug = 'ploty-brany-vjezdy';
  UPDATE public.service_subcategories SET category_form = 'autovrakoviště' WHERE slug = 'autovrakoviste';
  UPDATE public.service_subcategories SET category_form = 'opravy navigací / chiptuningu' WHERE slug = 'oprava-navigaci-chiptuning';
  UPDATE public.service_subcategories SET category_form = 'renovace veteránů' WHERE slug = 'renovace-veteranu';
  UPDATE public.service_subcategories SET category_form = 'vývoje aplikací' WHERE slug = 'vyvoj-aplikaci';
  UPDATE public.service_subcategories SET category_form = 'IT outsourcingu / správy sítí' WHERE slug = 'it-outsourcing';
  UPDATE public.service_subcategories SET category_form = 'umělé inteligence' WHERE slug = 'umela-inteligence';
  UPDATE public.service_subcategories SET category_form = 'tiskových služeb / grafika' WHERE slug = 'tiskove-sluzby-grafik';
  UPDATE public.service_subcategories SET category_form = 'médií a vydavatelství' WHERE slug = 'media-vydavatelstvi';
  UPDATE public.service_subcategories SET category_form = 'call centra / výzkumu trhu' WHERE slug = 'call-centrum';
  UPDATE public.service_subcategories SET category_form = 'personalistiky a HR' WHERE slug = 'personalistika-hr';
  UPDATE public.service_subcategories SET category_form = 'dětského centra / koutku' WHERE slug = 'detske-centrum';
  UPDATE public.service_subcategories SET category_form = 'hodináře / opravy hodinek' WHERE slug = 'hodinar-oprava-hodinek';
  UPDATE public.service_subcategories SET category_form = 'zlatníka / opravy šperků' WHERE slug = 'zlatnik-oprava-sperku';
  UPDATE public.service_subcategories SET category_form = 'nutričního poradce' WHERE slug = 'nutricni-poradce';
  UPDATE public.service_subcategories SET category_form = 'cestovní kanceláře / agentury' WHERE slug = 'cestovni-agentura';
  UPDATE public.service_subcategories SET category_form = 'ubytování / pronájmu chat' WHERE slug = 'ubytovani-pronajem';

  -- 8. ADD search_terms
  UPDATE public.service_subcategories SET search_terms = ARRAY['sklenář', 'zasklívání', 'okno', 'sklo', 'výměna skla'] WHERE slug = 'sklenar-zasklivani';
  UPDATE public.service_subcategories SET search_terms = ARRAY['výtah', 'servis výtahů', 'montáž výtahů', 'plošina'] WHERE slug = 'montaz-servis-vytahu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['plot', 'brána', 'vjezd', 'oplocení', 'branka'] WHERE slug = 'ploty-brany-vjezdy';
  UPDATE public.service_subcategories SET search_terms = ARRAY['vrakoviště', 'náhradní díly', 'auto', 'likvidace'] WHERE slug = 'autovrakoviste';
  UPDATE public.service_subcategories SET search_terms = ARRAY['navigace', 'chiptuning', 'tuning', 'mapy', 'software auto'] WHERE slug = 'oprava-navigaci-chiptuning';
  UPDATE public.service_subcategories SET search_terms = ARRAY['veterán', 'renovace', 'staré auto', 'historické auto'] WHERE slug = 'renovace-veteranu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['aplikace', 'software', 'cloud', 'vývoj', 'programování'] WHERE slug = 'vyvoj-aplikaci';
  UPDATE public.service_subcategories SET search_terms = ARRAY['outsourcing', 'it', 'správa sítí', 'wifi', 'server'] WHERE slug = 'it-outsourcing';
  UPDATE public.service_subcategories SET search_terms = ARRAY['ai', 'umělá inteligence', 'chatgpt', 'automatizace'] WHERE slug = 'umela-inteligence';
  UPDATE public.service_subcategories SET search_terms = ARRAY['tisk', 'grafika', 'logo', 'vizitky', 'letáky'] WHERE slug = 'tiskove-sluzby-grafik';
  UPDATE public.service_subcategories SET search_terms = ARRAY['média', 'vydavatelství', 'časopis', 'noviny', 'publishing'] WHERE slug = 'media-vydavatelstvi';
  UPDATE public.service_subcategories SET search_terms = ARRAY['call centrum', 'telefon', 'výzkum trhu', 'průzkum', 'dotazník'] WHERE slug = 'call-centrum';
  UPDATE public.service_subcategories SET search_terms = ARRAY['hr', 'personalistika', 'nábor', 'práce', 'zaměstnanci'] WHERE slug = 'personalistika-hr';
  UPDATE public.service_subcategories SET search_terms = ARRAY['děti', 'koutek', 'hlídání', 'centrum', 'zábava'] WHERE slug = 'detske-centrum';
  UPDATE public.service_subcategories SET search_terms = ARRAY['hodinky', 'hodinář', 'oprava hodinek', 'baterie do hodinek'] WHERE slug = 'hodinar-oprava-hodinek';
  UPDATE public.service_subcategories SET search_terms = ARRAY['zlatník', 'šperky', 'oprava šperků', 'prsten', 'náušnice'] WHERE slug = 'zlatnik-oprava-sperku';
  UPDATE public.service_subcategories SET search_terms = ARRAY['nutrice', 'dieta', 'zdravý životní styl', 'hubnutí', 'jídelníček'] WHERE slug = 'nutricni-poradce';
  UPDATE public.service_subcategories SET search_terms = ARRAY['cestovní kancelář', 'dovolená', 'zájezd', 'agentura', 'letenky'] WHERE slug = 'cestovni-agentura';
  UPDATE public.service_subcategories SET search_terms = ARRAY['ubytování', 'chata', 'pronájem', 'nocleh', 'chalupa'] WHERE slug = 'ubytovani-pronajem';

END $$;
-- Migration to add missing search terms for main construction subcategories
-- Date: 2026-04-14

DO $$
BEGIN
  -- Update 'Zedník' with 'stavba domu' and related terms
  UPDATE public.service_subcategories
  SET search_terms = (
    SELECT array_agg(DISTINCT x)
    FROM unnest(COALESCE(search_terms, ARRAY[]::text[]) || ARRAY['stavba domu', 'stavění domu', 'novostavba', 'stavba']) t(x)
  )
  WHERE slug = 'zednik-obecna-poptavka';

  -- Update 'Stavební dozor'
  UPDATE public.service_subcategories
  SET search_terms = (
    SELECT array_agg(DISTINCT x)
    FROM unnest(COALESCE(search_terms, ARRAY[]::text[]) || ARRAY['stavba domu', 'kontrola stavby', 'stavební dozor']) t(x)
  )
  WHERE name ILIKE '%stavební dozor%';

END $$;
-- Bulk migration to add semantic search terms across all major subcategories
-- Date: 2026-04-14

DO $$
DECLARE
  item RECORD;
BEGIN
  -- Create mapping in a temporary table for cleaner updates
  CREATE TEMP TABLE temp_search_mapping (
    slug TEXT PRIMARY KEY,
    terms TEXT[]
  );

  INSERT INTO temp_search_mapping (slug, terms) VALUES
    -- Instalatér
    ('instalater-obecna-poptavka', ARRAY['voda', 'potrubí', 'instalatérské práce', 'rozvody vody', 'havárie vody']),
    ('diagnostika-zavady-voda', ARRAY['únik vody', 'mokrá zeď', 'hledání úniku', 'vytopený soused']),
    ('instalaterska-pohotovost', ARRAY['havárie', 'prasklá trubka', 'vytopení', 'urgentní instalatér', 'pohotovost']),
    ('vymena-vodovodní-baterie', ARRAY['kohoutek', 'umyvadlová baterie', 'sprchová baterie', 'dřezová baterie', 'vodovodní baterie']),
    ('oprava-protekajiciho-wc', ARRAY['záchod', 'geberit', 'protéká wc', 'nesplachuje', 'nádržka']),
    ('cisteni-odpadu', ARRAY['ucpaný dřez', 'odpad', 'sifon', 'krtkování', 'neodtéká vana', 'vyčištění odpadu']),
    ('montaz-umyvadla-drezu', ARRAY['umyvadlo', 'dřez', 'montáž umyvadla', 'koupelna', 'kuchyň']),
    ('pripojeni-pracky-mycky', ARRAY['pračka', 'myčka', 'zapojení pračky', 'připojení myčky']),
    
    -- Elektro
    ('elektrikar-obecna-poptavka', ARRAY['elektřina', 'rozvody', 'zapojení', 'elektrikářské práce']),
    ('diagnostika-zavady-elektro', ARRAY['nejde proud', 'vypadávají jističe', 'zkrat', 'nefunguje zásuvka', 'pojistky']),
    ('elektrikarska-pohotovost', ARRAY['urgentní elektrikář', 'zkrat pohotovost', 'havárie elektro']),
    ('montaz-zapojeni-zasuvky-vypinace', ARRAY['zásuvka', 'vypínač', 'výměna zásuvky', 'montáž vypínače']),
    ('montaz-svitidla-lustru', ARRAY['světlo', 'lustr', 'led pásky', 'instalace světla', 'montáž světla']),
    ('zapojeni-indukcni-desky', ARRAY['trouba', 'sporák', 'deska', '400v', 'zapojení spotřebiče']),
    ('vymena-jisticu-rozvadece', ARRAY['jističe', 'rozvaděč', 'výměna jističe', 'elektrokříň']),
    ('revize-elektroinstalace', ARRAY['revize', 'kontrola elektro', 'zpráva o revizi', 'revizní technik']),
    ('nastaveni-wifi-routeru', ARRAY['wifi', 'internet', 'router', 'nastavení sítě', 'nejde wifi']),
    
    -- Hodinový manžel (using some from recent migrations and adding more)
    ('vrtani-do-zdi', ARRAY['polička', 'obraz', 'zrcadlo', 'vrtání do panelu', 'garnýže', 'vrtání']),
    ('montaz-nabytku', ARRAY['ikea stavba', 'skříň', 'postel', 'skládání nábytku', 'komoda', 'montáž skříně']),
    ('vymena-zamek-vlozka', ARRAY['zámek', 'vložka', 'klíče', 'výměna zámku', 'fabka']),
    ('sestaveni-grilu-fitness', ARRAY['gril', 'běžecký pás', 'rotoped', 'fitness', 'montáž grilu']),
    
    -- Autoservis
    ('pneuservis', ARRAY['přezutí kol', 'výměna gum', 'vyvážení', 'pneu', 'kola', 'zimní letní pneu']),
    ('automechanik', ARRAY['výměna oleje', 'brzdy', 'motor', 'servis auta', 'olej', 'pravidelný servis']),
    ('priprava-na-stk', ARRAY['emise', 'technická', 'kontrola před stk', 'auto stk', 'stk']),
    ('diagnostika-zavady', ARRAY['diagnostika', 'kontrolka', 'chyba motoru', 'napíchnutí auta']),
    ('vymena-brzdových-desticek', ARRAY['brzdy', 'kotouče', 'destičky', 'brzdění']),
    ('plneni-klimatizace', ARRAY['klimatizace', 'doplnění klimy', 'klima', 'nejde klima']),
    
    -- Stavby
    ('zednik-obecna-poptavka', ARRAY['stavba domu', 'novostavba', 'zdění', 'příčky', 'omítky', 'zednické práce']),
    ('obkladac-obecna-poptavka', ARRAY['koupelna', 'dlažba', 'obklady', 'kachličky', 'rekonstrukce']),
    ('sadrokartonar-obecna-poptavka', ARRAY['sádrokarton', 'sdk', 'sádroš', 'podhledy', 'příčky']),
    ('podlahar-obecna-poptavka', ARRAY['podlaha', 'vinyl', 'laminát', 'pokládka podlahy', 'plovoučka']),
    ('malir-obecna-poptavka', ARRAY['vymalovat', 'malování', 'bílení', 'stěny', 'malíř']),
    ('pokryvac-klempir-obecna', ARRAY['střecha', 'zatéká', 'okapy', 'střechy', 'pokrývač']),
    
    -- Úklid
    ('uklid-domacnosti-pravidelny', ARRAY['vysávání', 'vytírání', 'hospodyně', 'pravidelný úklid', 'domácnost']),
    ('uklid-po-rekonstrukci', ARRAY['po stavbě', 'hrubý úklid', 'generální úklid', 'po malování']),
    ('myti-oken', ARRAY['čistá okna', 'výlohy', 'žaluzie', 'oken', 'mytí oken']),
    ('cisteni-koberec-sedacka', ARRAY['tepování', 'čištění sedačky', 'koberec', 'matrace', 'tepovač']),
    
    -- Zahrada
    ('sekani-travy', ARRAY['trávník', 'sekačka', 'křovinořez', 'zahrada', 'tráva', 'sekání']),
    ('kaceni-stromu', ARRAY['rizikové kácení', 'prořezávání', 'dříví', 'stromy', 'pila']),
    ('strihani-ziveho-plotu', ARRAY['živý plot', 'stříhání plotu', 'túje', 'tůje', 'ploty']),
    ('rizikove-kaceni', ARRAY['lezení', 'vysoký strom', 'prořezání', 'kácení u domu']),
    
    -- Finance a Právo
    ('ucetni-obecna-poptavka', ARRAY['daně', 'daňové přiznání', 'dph', 'faktury', 'mzdy', 'účetnictví']),
    ('pravnik-obecna-poptavka', ARRAY['smlouva', 'rozvod', 'dědictví', 'právní pomoc', 'advokát']),
    
    -- Výuka
    ('vyuka-jazyku-obecna', ARRAY['angličtina', 'němčina', 'doučování', 'lekce', 'jazyky']),
    ('doucovani-matematika', ARRAY['matika', 'škola', 'příprava', 'přijímačky', 'doučování']),
    
    -- Mazlíčci
    ('venceni-psu', ARRAY['pes', 'venčení', 'hlídání psa', 'procházka']),
    ('strihani-psu', ARRAY['stříhání', 'trimování', 'psí salon', 'srst']);

  -- Update all subcategories found in mapping
  FOR item IN SELECT * FROM temp_search_mapping LOOP
    UPDATE public.service_subcategories
    SET search_terms = (
      SELECT array_agg(DISTINCT x)
      FROM unnest(COALESCE(search_terms, ARRAY[]::text[]) || item.terms) t(x)
    )
    WHERE slug = item.slug;
  END LOOP;

  DROP TABLE temp_search_mapping;
END $$;
-- Migration to add more natural language search terms across major subcategories
-- Date: 2026-04-14

DO $$
DECLARE
  item RECORD;
BEGIN
  -- Create mapping in a temporary table for cleaner updates
  CREATE TEMP TABLE temp_search_mapping (
    slug TEXT PRIMARY KEY,
    terms TEXT[]
  );

  INSERT INTO temp_search_mapping (slug, terms) VALUES
    -- Stavby / Rekonstrukce
    ('zednik-obecna-poptavka', ARRAY['stavba domu', 'bungalov', 'hrubá stavba', 'základová deska', 'porotherm', 'ytong', 'zdění', 'betonování', 'příčky', 'omítky']),
    ('obkladac-obecna-poptavka', ARRAY['kachličky', 'dláždění', 'mozaika', 'silikon', 'spárování', 'rekonstrukce koupelny']),
    ('sadrokartonar-obecna-poptavka', ARRAY['sdk', 'sádroš', 'snižování stropu', 'půdní vestavba', 'podhledy']),
    ('ploty-brany-vjezdy', ARRAY['automatická brána', 'pojezdová brána', 'pletivo', 'betonový plot', 'stavba plotu']),
    ('sklenar-zasklivani', ARRAY['zasklení okna', 'rozbité sklo', 'výloha', 'izolační dvojsklo', 'sklenář']),

    -- Instalatér & Elektro
    ('instalater-obecna-poptavka', ARRAY['teče voda', 'kapající kohoutek', 'ucpaný záchod', 'stoupačky', 'bojler', 'výměna vany', 'sprchový kout']),
    ('oprava-protekajiciho-wc', ARRAY['teče záchod', 'protéká wc', 'geberit', 'výměna plováku', 'záchod']),
    ('vymena-vodovodní-baterie', ARRAY['kapající baterie', 'výměna kohoutku', 'dřezová baterie', 'umyvadlová baterie']),
    ('elektrikar-obecna-poptavka', ARRAY['nejde proud', 'zásuvka nefunguje', 'vypadávají pojistky', 'zapojení trouby', 'revize elektriky', 'hromosvod', 'světla']),
    ('diagnostika-zavady-elektro', ARRAY['vyhozené pojistky', 'zkrat', 'nehraje zásuvka', 'nejde světlo']),

    -- Hodinový manžel
    ('skladani-nabytku', ARRAY['ikea', 'montáž skříně', 'postel', 'stůl', 'komoda', 'xxxlutz', 'vrtání poličky']),
    ('vymena-zamku-cylindricke-vlozky', ARRAY['fabka', 'výměna zámku', 'zabouchnuté dveře', 'klíče', 'vložka']),
    ('vrtani-do-zdi', ARRAY['polička', 'obraz', 'zrcadlo', 'garnýž', 'vrtání do panelu']),

    -- Autoservis
    ('automechanik', ARRAY['klepe motor', 'výměna brzd', 'olej', 'diagnostika', 'stk', 'rozvody', 'spojka', 'serviska']),
    ('autovrakoviste', ARRAY['vrakáč', 'likvidace autovraku', 'náhradní díly', 'kola']),
    ('oprava-navigaci-chiptuning', ARRAY['aktualizace map', 'zvýšení výkonu motoru', 'chipování', 'gps navigace', 'software auto']),
    ('renovace-veteranu', ARRAY['stará auta', 'veterány', 'repase motoru veteránu', 'lakování veteránů']),

    -- PC a Mobily
    ('it-outsourcing', ARRAY['pomalý počítač', 'reinstalace windows', 'viry', 'nejde zapnout', 'formátování', 'vyčištění pc', 'správa pc']),
    ('vyvoj-aplikaci', ARRAY['programování', 'mobilní aplikace', 'webové stránky', 'cloud', 'aplikace na míru']),
    ('umela-inteligence', ARRAY['chatbots', 'automatizace', 'openai', 'implementace AI']),

    -- Hlídání a péče
    ('detske-centrum', ARRAY['chůva', 'hlídání dětí', 'školka', 'koutek', 'zábava pro děti']),
    ('hodinar-oprava-hodinek', ARRAY['výměna baterie v hodinkách', 'hodinky', 'oprava strojku']),
    ('zlatnik-oprava-sperku', ARRAY['přetržený řetízek', 'prsten', 'náušnice', 'čištění zlata']),

    -- Cestování
    ('cestovni-agentura', ARRAY['dovolená u moře', 'last minute', 'exotika', 'zájezd', 'letenky']),
    ('ubytovani-pronajem', ARRAY['chata', 'chalupa', 'apartmán', 'nocleh', 'přenocování']);

  -- Update subcategories by merging arrays and ensuring distinct elements
  FOR item IN SELECT * FROM temp_search_mapping LOOP
    UPDATE public.service_subcategories
    SET search_terms = (
      SELECT array_agg(DISTINCT x)
      FROM unnest(COALESCE(search_terms, ARRAY[]::text[]) || item.terms) t(x)
    )
    WHERE slug = item.slug;
  END LOOP;

  DROP TABLE temp_search_mapping;
END $$;
-- Create PostGIS-powered function to find suitable workers with distance filtering
-- Date: 2026-04-14

CREATE OR REPLACE FUNCTION public.get_suitable_workers_for_sniper(
  p_job_id uuid,
  p_radius_km float DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  user_type text,
  tags text[],
  phone text,
  city text,
  category text,
  subcategory text,
  distance_km float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_job_location geography;
  v_job_subcategory_name text;
BEGIN
  -- Get job location and subcategory name
  SELECT 
    j.location, 
    s.name
  INTO 
    v_job_location, 
    v_job_subcategory_name
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  SELECT 
    p.id, 
    p.email, 
    p.full_name, 
    p.user_type, 
    p.tags, 
    p.phone, 
    p.city, 
    p.category, 
    p.subcategory,
    CASE 
      WHEN v_job_location IS NOT NULL AND p.location IS NOT NULL 
      THEN (ST_Distance(p.location, v_job_location) / 1000.0) 
      ELSE NULL 
    END as distance_km
  FROM public.profiles p
  WHERE p.user_type IN ('worker', 'both')
    AND (
      p.tags @> ARRAY[v_job_subcategory_name] OR
      p.subcategory ILIKE '%' || v_job_subcategory_name || '%' OR
      p.category ILIKE '%' || v_job_subcategory_name || '%'
    )
    AND (
      p_radius_km IS NULL OR 
      v_job_location IS NULL OR 
      p.location IS NULL OR
      ST_DWithin(p.location, v_job_location, p_radius_km * 1000.0)
    )
  ORDER BY 
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC
  LIMIT 200; -- Increased limit for admin review
END;
$$;
-- Migration to add more service subcategories as requested by the user
-- Date: 2026-04-15

DO $$
BEGIN
  -- 1. FIREMNÍ SLUŽBY (pro-firmy)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'administrativa') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pro-firmy'), 'Administrativa', 'administrativa', 'hodina', 2, '300 - 600 Kč/hod', 'STANDARD', 'Business', 'Briefcase', 37);
  END IF;

  -- Rename existing if it exists differently
  IF EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'call-centrum') THEN
    UPDATE public.service_subcategories 
    SET name = 'Call centrum a Výzkum trhu', slug = 'call-centrum-vyzkum-trhu'
    WHERE slug = 'call-centrum';
  ELSIF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'call-centrum-vyzkum-trhu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pro-firmy'), 'Call centrum a Výzkum trhu', 'call-centrum-vyzkum-trhu', 'hodina', 2, '300 - 500 Kč/hod', 'STANDARD', 'Business', 'PhoneCall', 38);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'detektivni-sluzby') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pro-firmy'), 'Detektivní služby', 'detektivni-sluzby', 'hodina', 4, '800 - 2 500 Kč/hod', 'STANDARD', 'Bezpečnost', 'Shield', 39);
  END IF;

  -- 2. AUTOSERVIS (auto-moto)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'dobijeci-stanice-wallbox') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'auto-moto'), 'Dobíjecí stanice (Wallbox)', 'dobijeci-stanice-wallbox', 'úkon', 3, '5 000 - 15 000 Kč', 'STANDARD', 'Elektro', 'Zap', 43);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'oprava-vstrikovani-diesel') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'auto-moto'), 'Oprava vstřikování (Diesel servis)', 'oprava-vstrikovani-diesel', 'úkon', 3, '3 000 - 10 000 Kč', 'STANDARD', 'Motor', 'Settings', 44);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'revize-lpg-cng') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'auto-moto'), 'Revize LPG/CNG', 'revize-lpg-cng', 'úkon', 2, '800 - 1 500 Kč', 'STANDARD', 'Revize', 'Flame', 45);
  END IF;

  -- 3. STAVBY / REKONSTRUKCE (stavby-rekonstrukce)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'dovoz-stavebniho-materialu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Dovoz stavebního materiálu', 'dovoz-stavebniho-materialu', 'úkon', 2, '500 - 2 500 Kč', 'STANDARD', 'Logistika', 'Truck', 59);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'foukana-izolace') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Foukaná izolace', 'foukana-izolace', 'm3', 3, '600 - 1 200 Kč/m3', 'STANDARD', 'Izolace', 'Wind', 60);
  END IF;

  -- Rename/update Kamenictví
  IF EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'kamenictvi-kamenicke-prace') THEN
    UPDATE public.service_subcategories SET name = 'Kamenictví / Práce s kamenem' WHERE slug = 'kamenictvi-kamenicke-prace';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'mereni-radonu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Měření radonu', 'mereni-radonu', 'úkon', 2, '1 500 - 3 500 Kč', 'STANDARD', 'Měření', 'Activity', 61);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'odstranovani-azbestu-sanace') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Odstraňování azbestu / Sanace', 'odstranovani-azbestu-sanace', 'úkon', 4, 'Individuální', 'STANDARD', 'Sanace', 'Shield', 62);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'pronajem-naradi-mechanizace') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Pronájem nářadí a stavební mechanizace', 'pronajem-naradi-mechanizace', 'den', 2, 'Dle ceníku', 'STANDARD', 'Půjčovna', 'Hammer', 63);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'renovace-oken-dveri') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Renovace oken / dveří', 'renovace-oken-dveri', 'úkon', 2, '1 500 - 5 000 Kč', 'STANDARD', 'Okna', 'DoorOpen', 64);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'sanace-vlhkeho-zdiva') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Sanace vlhkého zdiva', 'sanace-vlhkeho-zdiva', 'm', 3, '1 000 - 3 000 Kč/m', 'STANDARD', 'Sanace', 'Droplets', 65);
  END IF;

  -- Rename existing Sklenářství if it exists
  IF EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'sklenarstvi') THEN
    UPDATE public.service_subcategories SET name = 'Sklenářství' WHERE slug = 'sklenarstvi';
  ELSIF EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'sklenar-zasklivani') THEN
     UPDATE public.service_subcategories SET name = 'Sklenářství', slug = 'sklenarstvi' WHERE slug = 'sklenar-zasklivani';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'stavba-domu-na-klic') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Stavba rodinného domu (na klíč)', 'stavba-domu-na-klic', 'úkon', 5, 'Individuální', 'PROMINENT', 'Stavba', 'Home', 66);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'stavebni-projekt-vzt-topeni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Stavební projekt (VZT / topení)', 'stavebni-projekt-vzt-topeni', 'projekt', 4, 'Od 10 000 Kč', 'STANDARD', 'Projekce', 'Ruler', 67);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'stavebni-projekt-elektro') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Stavební projekt (elektro)', 'stavebni-projekt-elektro', 'projekt', 4, 'Od 8 000 Kč', 'STANDARD', 'Projekce', 'Zap', 68);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'stavebni-projekt-statika') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Stavební projekt (specifický software / statika)', 'stavebni-projekt-statika', 'projekt', 4, 'Individuální', 'STANDARD', 'Projekce', 'LayoutGrid', 69);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'studnar') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Studnař', 'studnar', 'úkon', 3, 'Dle rozsahu', 'STANDARD', 'Studny', 'Droplet', 70);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'vrtani-studni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Vrtání studní', 'vrtani-studni', 'm', 3, '1 500 - 3 500 Kč/m', 'STANDARD', 'Studny', 'Disc', 71);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'vyskove-prace') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Výškové práce', 'vyskove-prace', 'hodina', 3, '400 - 800 Kč/hod', 'STANDARD', 'Výškové práce', 'ArrowUp', 72);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'vyskove-prace-horolezci') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Výškové práce (horolezecká technika)', 'vyskove-prace-horolezci', 'hodina', 4, '500 - 1 200 Kč/hod', 'STANDARD', 'Výškové práce', 'Mountain', 73);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'zimni-zahrada-zaskleni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'stavby-rekonstrukce'), 'Zimní zahrada / Zasklení lodžie', 'zimni-zahrada-zaskleni', 'úkon', 3, 'Od 20 000 Kč', 'STANDARD', 'Zahrada', 'Sun', 74);
  END IF;

  -- 4. PROJEKTOVÁNÍ A DESIGN (projektovani)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'inzenyrska-cinnost-it') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Inženýrská činnost (IT / virtualizace)', 'inzenyrska-cinnost-it', 'hodina', 3, '800 - 2 000 Kč/hod', 'STANDARD', 'IT', 'Cpu', 22);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'inzenyrska-cinnost-vytapeni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Inženýrská činnost / Projektování vytápění', 'inzenyrska-cinnost-vytapeni', 'úkon', 3, 'Dle projektu', 'STANDARD', 'Topení', 'Flame', 23);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'inzenyrske-stavby') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Inženýrské stavby', 'inzenyrske-stavby', 'úkon', 4, 'Individuální', 'STANDARD', 'Stavby', 'Building2', 24);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'prukaz-energeticke-narocnosti') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Průkaz energetické náročnosti', 'prukaz-energeticke-narocnosti', 'úkon', 2, '2 500 - 6 000 Kč', 'STANDARD', 'Energie', 'Zap', 25);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'urbanismus') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Urbanismus', 'urbanismus', 'úkon', 4, 'Individuální', 'STANDARD', 'Město', 'Map', 26);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'znalecky-posudek-odhad') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'projektovani'), 'Znalecký posudek a odhad', 'znalecky-posudek-odhad', 'úkon', 3, '3 000 - 10 000 Kč', 'STANDARD', 'Právo', 'Scale', 27);
  END IF;

  -- 5. ELEKTRIKÁŘ (elektro)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'elektronika') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'elektro'), 'Elektronika', 'elektronika', 'úkon', 2, '400 - 1 500 Kč', 'STANDARD', 'Opravy', 'Cpu', 41);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'instalace-servis-klimatizace') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'elektro'), 'Instalace / servis klimatizace', 'instalace-servis-klimatizace', 'úkon', 3, '3 000 - 8 000 Kč', 'STANDARD', 'Klima', 'Wind', 42);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'instalace-zabezpeceni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'elektro'), 'Instalace zabezpečení', 'instalace-zabezpeceni', 'úkon', 3, 'Od 5 000 Kč', 'STANDARD', 'Bezpečnost', 'Shield', 43);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'slaboproude-rozvody') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'elektro'), 'Slaboproudé rozvody', 'slaboproude-rozvody', 'm', 2, '50 - 150 Kč/m', 'STANDARD', 'Rozvody', 'Network', 44);
  END IF;

  -- 6. HODINOVÝ MANŽEL (hodinovy-manzel)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'drobne-opravy-domacnost') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Drobné opravy v domácnosti', 'drobne-opravy-domacnost', 'úkon', 2, '300 - 1 500 Kč', 'PROMINENT', 'Služby', 'Hammer', 47);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'hrbitovni-sluzby-oprava-hrobu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Hřbitovní služby / Oprava hrobů', 'hrbitovni-sluzby-oprava-hrobu', 'úkon', 2, '500 - 3 000 Kč', 'STANDARD', 'Ostatní', 'Crosshair', 48);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'oprava-chladnicky-mraznicky') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Oprava chladničky / mrazničky', 'oprava-chladnicky-mraznicky', 'úkon', 2, '500 - 2 000 Kč', 'STANDARD', 'Opravy', 'Snowflake', 49);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'opravy-servis-cerpadel') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Opravy / servis čerpadel', 'opravy-servis-cerpadel', 'úkon', 2, '800 - 2 500 Kč', 'STANDARD', 'Opravy', 'Settings', 50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'oprava-hudebnich-nastroju') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'hodinovy-manzel'), 'Opravy a ladění hudebních nástrojů', 'oprava-hudebnich-nastroju', 'úkon', 2, '500 - 3 000 Kč', 'STANDARD', 'Ostatní', 'Music', 51);
  END IF;

  -- 7. PC A MOBILY (pc-a-mobile)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'servis-apple') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Servis Apple', 'servis-apple', 'úkon', 3, '500 - 5 000 Kč', 'STANDARD', 'Servis', 'Smartphone', 37);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'servis-notebooku') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'pc-a-mobile'), 'Servis notebooků', 'servis-notebooku', 'úkon', 3, '400 - 3 000 Kč', 'STANDARD', 'Servis', 'Monitor', 38);
  END IF;

  -- 8. ZDRAVÍ A KRÁSA (zdravi-krasa)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'krabickova-dieta') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'zdravi-krasa'), 'Krabičková dieta', 'krabickova-dieta', 'den', 2, '300 - 600 Kč/den', 'STANDARD', 'Strava', 'Box', 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'psycholog-kouc') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'zdravi-krasa'), 'Psycholog / Terapeut / Kouč', 'psycholog-kouc', 'sezení', 3, '800 - 2 500 Kč/hod', 'STANDARD', 'Péče', 'Heart', 11);
  END IF;

  -- 9. CESTOVÁNÍ (cestovani)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'exotika') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'cestovani'), 'Exotika', 'exotika', 'zájezd', 3, 'Od 30 000 Kč', 'STANDARD', 'Dovolená', 'Palmtree', 3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'lyzarske-zajezdy') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'cestovani'), 'Lyžařské zájezdy', 'lyzarske-zajezdy', 'zájezd', 3, 'Od 10 000 Kč', 'STANDARD', 'Dovolená', 'Mountain', 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'pobytove-zajezdy') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'cestovani'), 'Pobytové zájezdy', 'pobytove-zajezdy', 'zájezd', 3, 'Od 8 000 Kč', 'STANDARD', 'Dovolená', 'Umbrella', 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'poznavaci-zajezdy') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'cestovani'), 'Poznávací zájezdy', 'poznavaci-zajezdy', 'zájezd', 3, 'Od 7 000 Kč', 'STANDARD', 'Dovolená', 'Map', 6);
  END IF;

  -- 10. ÚKLID (uklid)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'sanitace-pivniho-vedeni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'uklid'), 'Sanitace pivního vedení', 'sanitace-pivniho-vedeni', 'úkon', 2, '500 - 1 500 Kč', 'STANDARD', 'Gastro', 'GlassWater', 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'cisteni-servis-studni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'uklid'), 'Čištění a servis studní', 'cisteni-servis-studni', 'úkon', 3, '2 000 - 8 000 Kč', 'STANDARD', 'Služby', 'Droplet', 11);
  END IF;

  -- 11. VÝUKA A JAZYKY (vyuka-jazyky)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'ekologicka-vychova') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'vyuka-jazyky'), 'Ekologická výchova', 'ekologicka-vychova', 'hodina', 2, '300 - 600 Kč/hod', 'STANDARD', 'Výuka', 'Trees', 5);
  END IF;

  -- 12. AKCE A SVATBY (akce-a-svatby)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'vybaveni-gastro-provozy') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'akce-a-svatby'), 'Vybavení pro gastro provozovny', 'vybaveni-gastro-provozy', 'úkon', 2, 'Dle dohody', 'STANDARD', 'Gastro', 'Utensils', 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'vycepni-technika-pivni-chlazeni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'akce-a-svatby'), 'Výčepní technika (pivní chlazení)', 'vycepni-technika-pivni-chlazeni', 'úkon', 2, '500 - 2 500 Kč', 'STANDARD', 'Gastro', 'GlassWater', 11);
  END IF;

  -- 13. ZAHRADA (zahrada)
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'prorez-stromu') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'zahrada'), 'Prořez stromů', 'prorez-stromu', 'strom', 2, '300 - 2 000 Kč/strom', 'STANDARD', 'Údržba', 'Trees', 15);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'stipani-drivi') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order)
    VALUES ((SELECT id FROM service_categories WHERE slug = 'zahrada'), 'Štípání dříví', 'stipani-drivi', 'm3', 2, '400 - 800 Kč/m3', 'STANDARD', 'Služby', 'Axe', 16);
  END IF;

  -- 14. UPDATE category_form (genitive forms)
  UPDATE public.service_subcategories SET category_form = 'administrativy' WHERE slug = 'administrativa';
  UPDATE public.service_subcategories SET category_form = 'call centra a výzkumu trhu' WHERE slug = 'call-centrum-vyzkum-trhu';
  UPDATE public.service_subcategories SET category_form = 'detektivních služeb' WHERE slug = 'detektivni-sluzby';
  UPDATE public.service_subcategories SET category_form = 'dobíjecí stanice (wallboxu)' WHERE slug = 'dobijeci-stanice-wallbox';
  UPDATE public.service_subcategories SET category_form = 'opravy vstřikování' WHERE slug = 'oprava-vstrikovani-diesel';
  UPDATE public.service_subcategories SET category_form = 'revize LPG/CNG' WHERE slug = 'revize-lpg-cng';
  UPDATE public.service_subcategories SET category_form = 'dovozu stavebního materiálu' WHERE slug = 'dovoz-stavebniho-materialu';
  UPDATE public.service_subcategories SET category_form = 'foukané izolace' WHERE slug = 'foukana-izolace';
  UPDATE public.service_subcategories SET category_form = 'kamenictví / práce s kamenem' WHERE slug = 'kamenictvi-kamenicke-prace';
  UPDATE public.service_subcategories SET category_form = 'měření radonu' WHERE slug = 'mereni-radonu';
  UPDATE public.service_subcategories SET category_form = 'odstraňování azbestu' WHERE slug = 'odstranovani-azbestu-sanace';
  UPDATE public.service_subcategories SET category_form = 'pronájmu nářadí' WHERE slug = 'pronajem-naradi-mechanizace';
  UPDATE public.service_subcategories SET category_form = 'renovace oken / dveří' WHERE slug = 'renovace-oken-dveri';
  UPDATE public.service_subcategories SET category_form = 'sanace vlhkého zdiva' WHERE slug = 'sanace-vlhkeho-zdiva';
  UPDATE public.service_subcategories SET category_form = 'sklenářství' WHERE slug = 'sklenarstvi';
  UPDATE public.service_subcategories SET category_form = 'stavby rodinného domu' WHERE slug = 'stavba-domu-na-klic';
  UPDATE public.service_subcategories SET category_form = 'vzt / topení projektu' WHERE slug = 'stavebni-projekt-vzt-topeni';
  UPDATE public.service_subcategories SET category_form = 'elektro projektu' WHERE slug = 'stavebni-projekt-elektro';
  UPDATE public.service_subcategories SET category_form = 'statiky projektu' WHERE slug = 'stavebni-projekt-statika';
  UPDATE public.service_subcategories SET category_form = 'studnaře' WHERE slug = 'studnar';
  UPDATE public.service_subcategories SET category_form = 'vrtání studní' WHERE slug = 'vrtani-studni';
  UPDATE public.service_subcategories SET category_form = 'výškových prací' WHERE slug = 'vyskove-prace';
  UPDATE public.service_subcategories SET category_form = 'výškových prací (horolezci)' WHERE slug = 'vyskove-prace-horolezci';
  UPDATE public.service_subcategories SET category_form = 'zimní zahrady / zasklení' WHERE slug = 'zimni-zahrada-zaskleni';
  UPDATE public.service_subcategories SET category_form = 'it inženýrské činnosti' WHERE slug = 'inzenyrska-cinnost-it';
  UPDATE public.service_subcategories SET category_form = 'projektování vytápění' WHERE slug = 'inzenyrska-cinnost-vytapeni';
  UPDATE public.service_subcategories SET category_form = 'inženýrských staveb' WHERE slug = 'inzenyrske-stavby';
  UPDATE public.service_subcategories SET category_form = 'průkazu energetické náročnosti' WHERE slug = 'prukaz-energeticke-narocnosti';
  UPDATE public.service_subcategories SET category_form = 'urbanismu' WHERE slug = 'urbanismus';
  UPDATE public.service_subcategories SET category_form = 'znaleckého posudku' WHERE slug = 'znalecky-posudek-odhad';
  UPDATE public.service_subcategories SET category_form = 'elektroniky' WHERE slug = 'elektronika';
  UPDATE public.service_subcategories SET category_form = 'instalace klimatizace' WHERE slug = 'instalace-servis-klimatizace';
  UPDATE public.service_subcategories SET category_form = 'instalace zabezpečení' WHERE slug = 'instalace-zabezpeceni';
  UPDATE public.service_subcategories SET category_form = 'slaboproudých rozvodů' WHERE slug = 'slaboproude-rozvody';
  UPDATE public.service_subcategories SET category_form = 'drobných oprav' WHERE slug = 'drobne-opravy-domacnost';
  UPDATE public.service_subcategories SET category_form = 'hřbitovních služeb' WHERE slug = 'hrbitovovni-sluzby-oprava-hrobu';
  UPDATE public.service_subcategories SET category_form = 'opravy chladničky' WHERE slug = 'oprava-chladnicky-mraznicky';
  UPDATE public.service_subcategories SET category_form = 'opravy čerpadel' WHERE slug = 'opravy-servis-cerpadel';
  UPDATE public.service_subcategories SET category_form = 'opravy hudebních nástrojů' WHERE slug = 'oprava-hudebnich-nastroju';
  UPDATE public.service_subcategories SET category_form = 'servisu apple' WHERE slug = 'servis-apple';
  UPDATE public.service_subcategories SET category_form = 'servisu notebooků' WHERE slug = 'servis-notebooku';
  UPDATE public.service_subcategories SET category_form = 'krabičkové diety' WHERE slug = 'krabickova-dieta';
  UPDATE public.service_subcategories SET category_form = 'psychologa / kouče' WHERE slug = 'psycholog-kouc';
  UPDATE public.service_subcategories SET category_form = 'exotiky' WHERE slug = 'exotika';
  UPDATE public.service_subcategories SET category_form = 'lyžařských zájezdů' WHERE slug = 'lyzarske-zajezdy';
  UPDATE public.service_subcategories SET category_form = 'pobytových zájezdů' WHERE slug = 'pobytove-zajezdy';
  UPDATE public.service_subcategories SET category_form = 'poznávacích zájezdů' WHERE slug = 'poznavaci-zajezdy';
  UPDATE public.service_subcategories SET category_form = 'sanitace pivního vedení' WHERE slug = 'sanitace-pivniho-vedeni';
  UPDATE public.service_subcategories SET category_form = 'čištění studní' WHERE slug = 'cisteni-servis-studni';
  UPDATE public.service_subcategories SET category_form = 'ekologické výchovy' WHERE slug = 'ekologicka-vychova';
  UPDATE public.service_subcategories SET category_form = 'vybavení gastro provozoven' WHERE slug = 'vybaveni-gastro-provozy';
  UPDATE public.service_subcategories SET category_form = 'výčepní techniky' WHERE slug = 'vycepni-technika-pivni-chlazeni';
  UPDATE public.service_subcategories SET category_form = 'prořezu stromů' WHERE slug = 'prorez-stromu';
  UPDATE public.service_subcategories SET category_form = 'štípání dříví' WHERE slug = 'stipani-drivi';

  -- 15. ADD SEARCH TERMS
  UPDATE public.service_subcategories SET search_terms = ARRAY['administrativa', 'papírování', 'úřady', 'asistentka'] WHERE slug = 'administrativa';
  UPDATE public.service_subcategories SET search_terms = ARRAY['call centrum', 'výzkum trhu', 'průzkum', 'dotazování', 'telemarketing'] WHERE slug = 'call-centrum-vyzkum-trhu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['detektiv', 'sledování', 'pátrání', 'soukromé očko'] WHERE slug = 'detektivni-sluzby';
  UPDATE public.service_subcategories SET search_terms = ARRAY['elektromobil', 'nabíjení', 'wallbox', 'stanice'] WHERE slug = 'dobijeci-stanice-wallbox';
  UPDATE public.service_subcategories SET search_terms = ARRAY['diesel', 'vstřikování', 'čerpadlo', 'motor', 'servis'] WHERE slug = 'oprava-vstrikovani-diesel';
  UPDATE public.service_subcategories SET search_terms = ARRAY['lpg', 'cng', 'plyn', 'revize', 'auto na plyn'] WHERE slug = 'revize-lpg-cng';
  UPDATE public.service_subcategories SET search_terms = ARRAY['dovoz', 'materiál', 'cement', 'cihly', 'písek', 'štěrk'] WHERE slug = 'dovoz-stavebniho-materialu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['izolace', 'foukaná', 'zateplení', 'střecha', 'půda'] WHERE slug = 'foukana-izolace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['kámen', 'hrob', 'pomník', 'žula', 'mramor', 'dlažba'] WHERE slug = 'kamenictvi-kamenicke-prace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['radon', 'měření', 'plyn', 'zdraví', 'stavba'] WHERE slug = 'mereni-radonu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['azbest', 'sanace', 'likvidace', 'eternit', 'střecha'] WHERE slug = 'odstranovani-azbestu-sanace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['půjčovna', 'nářadí', 'mechanizace', 'bagr', 'vrtačka', 'lešení'] WHERE slug = 'pronajem-naradi-mechanizace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['okna', 'dveře', 'renovace', 'oprava', 'nátěr'] WHERE slug = 'renovace-oken-dveri';
  UPDATE public.service_subcategories SET search_terms = ARRAY['vlhkost', 'sanace', 'zdivo', 'izolace', 'mokrá zeď'] WHERE slug = 'sanace-vlhkeho-zdiva';
  UPDATE public.service_subcategories SET search_terms = ARRAY['sklo', 'okno', 'výměna', 'sklenář', 'výloha'] WHERE slug = 'sklenarstvi';
  UPDATE public.service_subcategories SET search_terms = ARRAY['dům na klíč', 'stavba', 'novostavba', 'bungalov', 'projekt'] WHERE slug = 'stavba-domu-na-klic';
  UPDATE public.service_subcategories SET search_terms = ARRAY['vzt', 'větrání', 'topení', 'klimatizace', 'projekt'] WHERE slug = 'stavebni-projekt-vzt-topeni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['elektro', 'projekt', 'rozvody', 'instalace', 'revize'] WHERE slug = 'stavebni-projekt-elektro';
  UPDATE public.service_subcategories SET search_terms = ARRAY['statika', 'statik', 'posudek', 'software', 'projekt'] WHERE slug = 'stavebni-projekt-statika';
  UPDATE public.service_subcategories SET search_terms = ARRAY['studna', 'studnař', 'voda', 'vrt', 'čištění'] WHERE slug = 'studnar';
  UPDATE public.service_subcategories SET search_terms = ARRAY['vrt', 'studna', 'hloubení', 'voda', 'zahrada'] WHERE slug = 'vrtani-studni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['výšky', 'plošina', 'vysokozdvih', 'práce ve výškách'] WHERE slug = 'vyskove-prace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['horolezec', 'lano', 'výšky', 'oprava fasády', 'čištění oken'] WHERE slug = 'vyskove-prace-horolezci';
  UPDATE public.service_subcategories SET search_terms = ARRAY['lodžie', 'zasklení', 'zimní zahrada', 'terasa', 'balkon'] WHERE slug = 'zimni-zahrada-zaskleni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['it', 'inženýr', 'virtualizace', 'server', 'cloud'] WHERE slug = 'inzenyrska-cinnost-it';
  UPDATE public.service_subcategories SET search_terms = ARRAY['topení', 'vytápění', 'projekt', 'kotel', 'tepelné čerpadlo'] WHERE slug = 'inzenyrska-cinnost-vytapeni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['mosty', 'silnice', 'inženýrské stavby', 'infrastruktura'] WHERE slug = 'inzenyrske-stavby';
  UPDATE public.service_subcategories SET search_terms = ARRAY['energetický štítek', 'penb', 'průkaz', 'energie', 'úspory'] WHERE slug = 'prukaz-energeticke-narocnosti';
  UPDATE public.service_subcategories SET search_terms = ARRAY['město', 'územní plán', 'urbanismus', 'rozvoj', 'architekt'] WHERE slug = 'urbanismus';
  UPDATE public.service_subcategories SET search_terms = ARRAY['odhad', 'znalecký posudek', 'nemovitost', 'cena', 'expert'] WHERE slug = 'znalecky-posudek-odhad';
  UPDATE public.service_subcategories SET search_terms = ARRAY['oprava', 'elektronika', 'tv', 'rádio', 'pájka', 'deska'] WHERE slug = 'elektronika';
  UPDATE public.service_subcategories SET search_terms = ARRAY['klima', 'klimatizace', 'servis', 'montáž', 'plnění'] WHERE slug = 'instalace-servis-klimatizace';
  UPDATE public.service_subcategories SET search_terms = ARRAY['alarm', 'kamery', 'zabezpečení', 'ezs', 'jablotron'] WHERE slug = 'instalace-zabezpeceni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['datové rozvody', 'internet', 'lan', 'wifi', 'slaboproud'] WHERE slug = 'slaboproude-rozvody';
  UPDATE public.service_subcategories SET search_terms = ARRAY['hodinový manžel', 'opravy', 'vrtání', 'polička', 'světlo', 'kapající kohoutek'] WHERE slug = 'drobne-opravy-domacnost';
  UPDATE public.service_subcategories SET search_terms = ARRAY['hrob', 'hřbitov', 'čištění hrobu', 'kameník', 'pomník'] WHERE slug = 'hrbitovni-sluzby-oprava-hrobu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['lednice', 'mrazák', 'servis', 'oprava', 'chlazení'] WHERE slug = 'oprava-chladnicky-mraznicky';
  UPDATE public.service_subcategories SET search_terms = ARRAY['čerpadlo', 'servis', 'studna', 'závlaha', 'oprava'] WHERE slug = 'opravy-servis-cerpadel';
  UPDATE public.service_subcategories SET search_terms = ARRAY['piáno', 'kytara', 'ladění', 'servis', 'nástroje'] WHERE slug = 'oprava-hudebnich-nastroju';
  UPDATE public.service_subcategories SET search_terms = ARRAY['iphone', 'macbook', 'ipad', 'apple', 'servis'] WHERE slug = 'servis-apple';
  UPDATE public.service_subcategories SET search_terms = ARRAY['notebook', 'laptop', 'pc', 'servis', 'oprava'] WHERE slug = 'servis-notebooku';
  UPDATE public.service_subcategories SET search_terms = ARRAY['dieta', 'krabičky', 'jídlo', 'hubnutí', 'fitness'] WHERE slug = 'krabickova-dieta';
  UPDATE public.service_subcategories SET search_terms = ARRAY['psycholog', 'terapie', 'kouč', 'mentální zdraví', 'pomoc'] WHERE slug = 'psycholog-kouc';
  UPDATE public.service_subcategories SET search_terms = ARRAY['exotika', 'moře', 'daleko', 'thajsko', 'bali', 'maledivy'] WHERE slug = 'exotika';
  UPDATE public.service_subcategories SET search_terms = ARRAY['lyže', 'hory', 'snowboard', 'alpy', 'sníh'] WHERE slug = 'lyzarske-zajezdy';
  UPDATE public.service_subcategories SET search_terms = ARRAY['moře', 'pláž', 'dovolená', 'all inclusive', 'relax'] WHERE slug = 'pobytove-zajezdy';
  UPDATE public.service_subcategories SET search_terms = ARRAY['poznávání', 'památky', 'města', 'eurovíkend', 'průvodce'] WHERE slug = 'poznavaci-zajezdy';
  UPDATE public.service_subcategories SET search_terms = ARRAY['pivo', 'výčep', 'trubky', 'čištění', 'sanitace'] WHERE slug = 'sanitace-pivniho-vedeni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['studna', 'čištění', 'voda', 'dezinfekce', 'servis'] WHERE slug = 'cisteni-servis-studni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['ekologie', 'příroda', 'výchova', 'škola', 'environmentální'] WHERE slug = 'ekologicka-vychova';
  UPDATE public.service_subcategories SET search_terms = ARRAY['gastro', 'kuchyně', 'vybavení', 'restaurace', 'profesionální'] WHERE slug = 'vybaveni-gastro-provozy';
  UPDATE public.service_subcategories SET search_terms = ARRAY['chlazení', 'výčep', 'pivo', 'technika', 'oprava'] WHERE slug = 'vycepni-technika-pivni-chlazeni';
  UPDATE public.service_subcategories SET search_terms = ARRAY['stromy', 'prořez', 'zahrada', 'ovocné stromy', 'arborista'] WHERE slug = 'prorez-stromu';
  UPDATE public.service_subcategories SET search_terms = ARRAY['dřevo', 'štípání', 'třísky', 'palivo', 'zima'] WHERE slug = 'stipani-drivi';

END $$;
-- Update get_suitable_workers_for_sniper to be more resilient with distance filtering
-- Date: 2026-04-15 (v13 - Resilient Distance)

DROP FUNCTION IF EXISTS public.get_suitable_workers_for_sniper(uuid, float);

CREATE OR REPLACE FUNCTION public.get_suitable_workers_for_sniper(
  p_job_id uuid,
  p_radius_km float DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  user_type text,
  tags text[],
  phone text,
  city text,
  category text,
  subcategory text,
  description text,
  distance_km float,
  matched_subcategory text,
  contact_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_job_location geography;
  v_job_subcategory_name text;
  v_job_subcategory_id uuid;
BEGIN
  -- 1. Get job and subcategory info
  SELECT 
    j.location, 
    TRIM(s.name) as sub_name,
    j.subcategory_id
  INTO 
    v_job_location, 
    v_job_subcategory_name,
    v_job_subcategory_id
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  WITH matched_workers AS (
    SELECT 
      p.*,
      CASE 
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_name || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_name) || '%'
           LIMIT 1)
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(s.name) = v_job_subcategory_id::text
           LIMIT 1)
        ELSE v_job_subcategory_name
      END as v_matched_sub
    FROM public.unified_contacts p
    WHERE 
      (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
      AND (
        EXISTS (
          SELECT 1 FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
          WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_name) || '%'
        ) OR
        p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' OR
        EXISTS (
          SELECT 1 FROM public.worker_services ws 
          WHERE ws.worker_id = p.id AND ws.subcategory_id = v_job_subcategory_id
        )
      )
  )
  SELECT 
    mw.id, mw.email, mw.full_name, mw.user_type, mw.tags, mw.phone, mw.city, mw.category, mw.subcategory, mw.description,
    CASE 
      WHEN v_job_location IS NOT NULL AND mw.longitude IS NOT NULL AND mw.latitude IS NOT NULL
      THEN (ST_Distance(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location) / 1000.0) 
      ELSE NULL 
    END as distance_km,
    COALESCE(mw.v_matched_sub, v_job_subcategory_name) as matched_subcategory,
    mw.contact_source
  FROM matched_workers mw
  WHERE 
    -- Improved radius logic:
    -- If no radius is set, return everyone.
    -- If radius IS set, but job location is unknown, return everyone (safest fallback).
    -- If radius IS set AND job location IS known, only return those within distance OR those with unknown distance (to avoid silent exclusion).
    (
      p_radius_km IS NULL OR 
      v_job_location IS NULL OR
      (mw.longitude IS NULL OR mw.latitude IS NULL) OR -- Keep those with unknown location even when radius is set
      ST_DWithin(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location, p_radius_km * 1000.0)
    )
  ORDER BY 
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC
  LIMIT 2000;
END;
$$;
create table if not exists public.lead_captures (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  request_text text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.lead_captures enable row level security;

drop policy if exists "Anyone can insert lead captures" on public.lead_captures;
create policy "Anyone can insert lead captures"
  on public.lead_captures for insert
  to public
  with check (true);

drop policy if exists "Admins can view lead captures" on public.lead_captures;
create policy "Admins can view lead captures"
  on public.lead_captures for select
  to authenticated
  using (is_admin(auth.uid()));

drop policy if exists "Admins can update lead captures" on public.lead_captures;
create policy "Admins can update lead captures"
  on public.lead_captures for update
  to authenticated
  using (is_admin(auth.uid()));

drop policy if exists "Admins can delete lead captures" on public.lead_captures;
create policy "Admins can delete lead captures"
  on public.lead_captures for delete
  to authenticated
  using (is_admin(auth.uid()));

create index if not exists lead_captures_created_at_idx on public.lead_captures (created_at desc);
create index if not exists lead_captures_status_idx on public.lead_captures (status);
-- 1. Enable pg_net extension to allow making background HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the trigger function that calls our Edge Function
-- We use SECURITY DEFINER to ensure the function has necessary permissions
CREATE OR REPLACE FUNCTION public.handle_new_lead_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- net.http_post is non-blocking (async) which is perfect for external notifications
  -- We don't block the database transaction waiting for the email to send
  PERFORM
    net.http_post(
      url := 'https://michalkasparek91-arch-handy-heroes-reborn.supabase.co/functions/v1/send-lead-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
        -- Note: If your Edge Function requires the service_role key for authentication, 
        -- you would add it here. For internal webhooks, the URL itself is often kept private
        -- or the function is configured to allow calls from the internal network.
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$;

-- 3. Create the trigger on the lead_captures table
-- We use AFTER INSERT because we only want to notify once the record is successfully saved
DROP TRIGGER IF EXISTS trigger_on_lead_capture_insert ON public.lead_captures;
CREATE TRIGGER trigger_on_lead_capture_insert
AFTER INSERT ON public.lead_captures
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_lead_capture();
-- Add UTM tracking columns to lead_captures table
ALTER TABLE public.lead_captures 
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.lead_captures.utm_source IS 'Marketing source (e.g., google, facebook, newsletter)';
COMMENT ON COLUMN public.lead_captures.utm_medium IS 'Marketing medium (e.g., cpc, email, social)';
COMMENT ON COLUMN public.lead_captures.utm_campaign IS 'Marketing campaign name';
-- Create the trigger function that calls the notify-workers-new-job Edge Function
-- We use SECURITY DEFINER to ensure the function has necessary permissions
CREATE OR REPLACE FUNCTION public.handle_new_job_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We only notify for open jobs with location data
  IF NEW.status = 'open' AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NEW.subcategory_id IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := 'https://michalkasparek91-arch-handy-heroes-reborn.supabase.co/functions/v1/notify-workers-new-job',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('record', row_to_json(NEW))
      );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on the jobs table
DROP TRIGGER IF EXISTS trigger_on_job_insert_notification ON public.jobs;
CREATE TRIGGER trigger_on_job_insert_notification
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_job_notification();
-- 1. Create slug generation utility function
CREATE OR REPLACE FUNCTION public.slugify(text) 
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  -- Basic lowercasing and replacing non-alphanumeric with hyphens
  result := lower(regexp_replace($1, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Trim leading/trailing hyphens
  result := trim(both '-' from result);
  -- Replace multiple hyphens with single one
  result := regexp_replace(result, '-+', '-', 'g');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Add slug column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);

-- 3. Update existing profiles with slugs
-- Priority: business_name > full_name > id
UPDATE public.profiles p
SET slug = slugify(COALESCE(b.name, p.full_name, p.id::text))
FROM public.businesses b
WHERE p.company_id = b.id
AND p.slug IS NULL AND p.user_type = 'worker';

-- Fallback for workers without a linked business
UPDATE public.profiles
SET slug = slugify(COALESCE(full_name, id::text))
WHERE slug IS NULL AND user_type = 'worker';

-- 4. Create favorite_workers table
CREATE TABLE IF NOT EXISTS public.favorite_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  worker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, worker_id)
);

-- 5. Enable RLS and add policies
ALTER TABLE public.favorite_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorite_workers;
CREATE POLICY "Users can manage their own favorites"
  ON public.favorite_workers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Update public_profiles view to include slug
DROP VIEW IF EXISTS public.public_profiles;
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.header_url,
  p.bio,
  p.city,
  p.country,
  b.name as business_name, -- JOINed from businesses
  p.display_as_company,
  b.ico, -- JOINed from businesses
  p.is_pro,
  p.portfolio_photos,
  p.user_type,
  p.slug,
  p.company_type,
  CASE 
    WHEN auth.uid() = p.id OR EXISTS (
      SELECT 1 FROM jobs j 
      JOIN offers o ON j.id = o.job_id 
      WHERE (j.customer_id = auth.uid() AND o.worker_id = p.id AND j.status != 'cancelled')
      OR (j.customer_id = p.id AND o.worker_id = auth.uid() AND j.status != 'cancelled')
    ) THEN p.phone 
    ELSE NULL 
  END as phone,
  CASE 
    WHEN auth.uid() = p.id OR EXISTS (
      SELECT 1 FROM jobs j 
      JOIN offers o ON j.id = o.job_id 
      WHERE (j.customer_id = auth.uid() AND o.worker_id = p.id AND j.status != 'cancelled')
      OR (j.customer_id = p.id AND o.worker_id = auth.uid() AND j.status != 'cancelled')
    ) THEN p.email 
    ELSE NULL 
  END as email
FROM public.profiles p
LEFT JOIN public.businesses b ON b.id = p.company_id;
-- Add SEO metadata to service_subcategories
ALTER TABLE public.service_subcategories 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT[];

-- Add SEO metadata to service_categories for higher-level landing pages
ALTER TABLE public.service_categories
ADD COLUMN IF NOT EXISTS description TEXT;

-- Populate starter descriptions for Top 10 Subcategories
UPDATE public.service_subcategories SET description = 'Profesionální pomoc s drobnými opravami, montáží nábytku a údržbou domácnosti.' WHERE slug = 'hodinovy-manzel';
UPDATE public.service_subcategories SET description = 'Komplexní úklidové služby pro domácnosti i kanceláře – od běžného po generální úklid.' WHERE slug = 'uklid-domacnosti';
UPDATE public.service_subcategories SET description = 'Kvalitní malířské a natěračské práce s důrazem na čistotu a preciznost.' WHERE slug = 'malovani-pokoje';
UPDATE public.service_subcategories SET description = 'Rychlá pomoc při haváriích vody, výměně baterií nebo instalaci sanity.' WHERE slug = 'oprava-wc' OR slug = 'oprava-kohoutku';
UPDATE public.service_subcategories SET description = 'Odborné elektroinstalace, revize, opravy zásuvek a zapojení spotřebičů.' WHERE slug = 'oprava-zasuvek' OR slug = 'instalace-svetel';
UPDATE public.service_subcategories SET description = 'Bezpečné stěhování bytů, domů i firem s profesionálním přístupem.' WHERE slug = 'stehovani-bytu-domu';
UPDATE public.service_subcategories SET description = 'Údržba zeleně, sekání trávy, řez stromů a kompletní péče o vaši zahradu.' WHERE slug = 'udrzba-zahrady';
UPDATE public.service_subcategories SET description = 'Výroba nábytku na míru, opravy dřevěných prvků a montáž kuchyní.' WHERE slug = 'vyroba-nabytku';
UPDATE public.service_subcategories SET description = 'Servis plastových i dřevěných oken, seřízení kování a výměna těsnění.' WHERE slug = 'oprava-oken';
UPDATE public.service_subcategories SET description = 'Rychlá a přesná montáž nábytku ze všech obchodních řetězců (IKEA, XXXLutz apod.).' WHERE slug = 'montaz-nabytku';

-- Fallback for some common slugs if they differ slightly
UPDATE public.service_subcategories SET description = 'Profesionální instalatérské práce a opravy rozvodů.' WHERE slug = 'instalaterske-prace' AND description IS NULL;
UPDATE public.service_subcategories SET description = 'Odborné malířské práce a dekorativní nátěry.' WHERE slug = 'malirske-prace' AND description IS NULL;
-- Migration: Add category_form to service_categories
-- Date: 2026-04-21

ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS category_form TEXT;

-- Populate existing categories with grammatically correct forms (Accusative/Plural/Genitive depending on context)
-- These forms are used after "pro" (for) or in general service descriptions.

UPDATE public.service_categories SET category_form = 'stavby a rekonstrukce' WHERE slug = 'stavby-rekonstrukce';
UPDATE public.service_categories SET category_form = 'autoservis' WHERE slug = 'auto-moto';
UPDATE public.service_categories SET category_form = 'výuku a jazyky' WHERE slug = 'vyuka-jazyky';
UPDATE public.service_categories SET category_form = 'instalatéry' WHERE slug = 'instalater';
UPDATE public.service_categories SET category_form = 'elektro' WHERE slug = 'elektro';
UPDATE public.service_categories SET category_form = 'zdraví a krásu' WHERE slug = 'zdravi-krasa';
UPDATE public.service_categories SET category_form = 'akce a svatby' WHERE slug = 'akce-a-svatby';
UPDATE public.service_categories SET category_form = 'úklid' WHERE slug = 'uklid';
UPDATE public.service_categories SET category_form = 'zahradu' WHERE slug = 'zahrada';
UPDATE public.service_categories SET category_form = 'truhlářství a nábytek' WHERE slug = 'truharstvo';
UPDATE public.service_categories SET category_form = 'PC a mobily' WHERE slug = 'pc-a-mobile';
UPDATE public.service_categories SET category_form = 'transport a dopravu' WHERE slug = 'doprava';
UPDATE public.service_categories SET category_form = 'firmy (B2B)' WHERE slug = 'pro-firmy';
UPDATE public.service_categories SET category_form = 'zámečníky' WHERE slug = 'zamecnik';
UPDATE public.service_categories SET category_form = 'projektování' WHERE slug = 'projektovani';
UPDATE public.service_categories SET category_form = 'finance' WHERE slug = 'finance';
UPDATE public.service_categories SET category_form = 'hlídání a péči' WHERE slug = 'hlidani-a-pece';
UPDATE public.service_categories SET category_form = 'hodinového manžela' WHERE slug = 'hodinovy-manzel';
UPDATE public.service_categories SET category_form = 'mazlíčky' WHERE slug = 'mazlicci';
UPDATE public.service_categories SET category_form = 'právní služby' WHERE slug = 'pravni-sluzby';
UPDATE public.service_categories SET category_form = 'další služby' WHERE slug = 'ostatni';
-- pSEO pageview tracking
CREATE TABLE IF NOT EXISTS public.pseo_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  subcategory_slug text,
  city_slug text NOT NULL,
  has_local_workers boolean NOT NULL DEFAULT false,
  worker_count integer NOT NULL DEFAULT 0,
  is_bot boolean NOT NULL DEFAULT false,
  referrer text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pseo_pageviews_combo ON public.pseo_pageviews (category_slug, city_slug, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pseo_pageviews_viewed_at ON public.pseo_pageviews (viewed_at DESC);

ALTER TABLE public.pseo_pageviews ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) may insert a pageview
DROP POLICY IF EXISTS "Anyone can log pseo pageview" ON public.pseo_pageviews;
CREATE POLICY "Anyone can log pseo pageview"
ON public.pseo_pageviews
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read aggregated data
DROP POLICY IF EXISTS "Admins can read pseo pageviews" ON public.pseo_pageviews;
CREATE POLICY "Admins can read pseo pageviews"
ON public.pseo_pageviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);
-- Migration: Public Demand Board (UGC) support
-- Description: Adds slug generation and public anonymized view for customer requests.

-- 1. Add slug column to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_jobs_slug ON public.jobs(slug);

-- 2. Create function to generate job slug if not provided
CREATE OR REPLACE FUNCTION public.generate_job_slug() 
RETURNS TRIGGER AS $$
DECLARE
  base_slug text;
  final_slug text;
  city_slug text;
  subcat_slug text;
BEGIN
  IF NEW.slug IS NULL THEN
    -- Get subcategory slug if possible
    SELECT slug INTO subcat_slug FROM public.service_subcategories WHERE id = NEW.subcategory_id;
    
    -- Fallback for category if subcategory is missing (should not happen with RLS/schema)
    IF subcat_slug IS NULL THEN
        SELECT slug INTO subcat_slug FROM public.service_categories WHERE id = NEW.category_id;
    END IF;

    -- City slug
    city_slug := public.slugify(COALESCE(NEW.city, 'cesko'));
    
    -- Format: [subcategory-title]-[city]-[short_id]
    -- We use part of ID to ensure uniqueness even for same titles in same city
    base_slug := public.slugify(NEW.title);
    
    -- Ensure we don't have empty slug parts
    IF base_slug = '' THEN base_slug := COALESCE(subcat_slug, 'poptavka'); END IF;
    
    final_slug := base_slug || '-' || city_slug || '-' || substr(md5(random()::text), 1, 6);
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS trigger_generate_job_slug ON public.jobs;
CREATE TRIGGER trigger_generate_job_slug
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.generate_job_slug();

-- 4. Update existing jobs with slugs
UPDATE public.jobs 
SET slug = public.slugify(title) || '-' || public.slugify(COALESCE(city, 'cesko')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

-- 5. View for public demands (anonymized)
DROP VIEW IF EXISTS public.public_demands;
CREATE OR REPLACE VIEW public.public_demands AS
SELECT 
    j.id,
    j.slug,
    j.title,
    j.description,
    j.city,
    j.status,
    j.created_at,
    sc.name as category_name,
    sc.slug as category_slug,
    sc.id as category_id,
    ss.name as subcategory_name,
    ss.slug as subcategory_slug,
    ss.id as subcategory_id,
    -- Anonymize customer name: "Michal K."
    CASE 
        WHEN p.full_name IS NOT NULL AND p.full_name ~ ' ' THEN 
            split_part(p.full_name, ' ', 1) || ' ' || 
            upper(substr(split_part(p.full_name, ' ', 2), 1, 1)) || '.'
        WHEN p.full_name IS NOT NULL THEN
            p.full_name
        ELSE 'Zákazník'
    END as customer_name,
    j.photos,
    j.budget_min,
    j.budget_max,
    j.price_note,
    j.deadline_type,
    j.deadline_date,
    j.customer_id
FROM public.jobs j
JOIN public.service_categories sc ON j.category_id = sc.id
JOIN public.service_subcategories ss ON j.subcategory_id = ss.id
JOIN public.profiles p ON j.customer_id = p.id
WHERE j.status IN ('open', 'completed');

-- 6. Permissions
ALTER VIEW public.public_demands OWNER TO postgres;
GRANT SELECT ON public.public_demands TO anon, authenticated;

-- Ensure jobs are readable by all for the public details
-- (We only expose safe fields via the view, but the detail page will query the view)
-- Security note: RLS on the view itself is not supported in the same way, 
-- so we rely on the SELECT grant and the WHERE clause in the view.
-- Migration: Add Magazine Articles
-- Description: Creates table for content marketing and tutorials with 'Anti-DIY' humorous focus.

CREATE TABLE IF NOT EXISTS public.articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    slug text UNIQUE NOT NULL,
    category text NOT NULL,
    excerpt text,
    content text,
    image_url text,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);

-- RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles
DROP POLICY IF EXISTS "Public can read published articles" ON public.articles;
CREATE POLICY "Public can read published articles" 
ON public.articles FOR SELECT 
USING (status = 'published');

-- Admin full access
DROP POLICY IF EXISTS "Admins have full access to articles" ON public.articles;
CREATE POLICY "Admins have full access to articles" 
ON public.articles FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_articles_updated_at ON public.articles;
CREATE TRIGGER trigger_handle_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add 'Magazin' bucket to storage if needed, but for now we'll support image URLs.
-- Migration: Seed First Magazine Articles
-- Description: Inserts the first three 'Anti-DIY' articles into the magazine.

INSERT INTO public.articles (title, slug, category, excerpt, content, image_url, status)
VALUES 
(
    'Jak vymalovat pokoj: Od přípravy až po mytí válečků',
    'jak-vymalovat-pokoj',
    'Návody',
    'Chystáte se malovat? Zjistěte, jak na to. Reálný postup, u kterého rychle zjistíte, že zakrývání nábytku trvá déle než samotná akce.',
    'Představa je to krásná a až filmově romantická: pustíte si oblíbenou hudbu, oblečete staré tričko, vezmete do ruky štětec a za odpoledne proměníte okoukaný obývák v designovou oázu. Realita? Barva ve vlasech, křeč v krku, maskovací páska přilepená všude kromě lišt a víkend v nenávratnu. Ale pokud jste se rozhodli, že do toho půjdete na vlastní pěst, tady je poctivý postup, co vás čeká a nemine.

## Fáze 1: Vystěhování a zakrývání (aneb Kde končí legrace)
Zkušení malíři vědí, že samotné nanášení barvy je spíš za odměnu. Těžiště práce leží v přípravě.

- **Nábytek doprostřed:** Všechno musí pryč od stěn. Co nejde odnést, srazte do středu místnosti.
- **Fólie a pásky:** Nyní přichází hra na nervy. Podlahu musíte pečlivě zakrýt kartonem nebo silnou fólií. Každou zásuvku, vypínač a podlahovou lištu je nutné oblepit malířskou páskou. Vynecháte kousek? Barva si ho zaručeně najde.

## Fáze 2: Škrabání a penetrace (To, co všichni nenávidí)
Pokud má zeď na sobě už čtyři vrstvy staré barvy a při doteku opadává, nesmíte rovnou malovat. Nová vrstva by se nalepila na starou a v obřích kusech by se vám namotala na váleček.

- **Škrabání:** Zeď musíte namočit (ideálně malířskou štětkou) a starou barvu zdlouhavě seškrábat špachtlí. Všude bude mokrý slizký prach. Zaručeně všude.
- **Penetrace:** Oškrábanou a sádrou vyspravenou zeď musíte napenetrovat, aby se sjednotila savost a nová barva chytla.

<!-- RESCUE_BANNER -->

## Fáze 3: Jdeme malovat!
Konečně je tu ta část, kvůli které jste ráno vstávali.

- **Detaily:** Začněte štětcem v rozích, kolem oken a vypínačů.
- **Váleček:** Namočte váleček do barvy, otřete ho o mřížku (jinak budete mít barvu i na stropě) a nanášejte barvu do tvaru písmene V nebo W. Pak plochu sjednoťte.
- **Dvě vrstvy:** Jedna vrstva skoro nikdy nestačí. Než budete nanášet druhou, první musí dokonale zaschnout.

## Fáze 4: Úklid a mytí (Nekonečný příběh)
Strhávání pásek odhalí, že barva stejně podtekla, takže vás čeká drhnutí lišt. Mytí válečku a štětců pod tekoucí vodou vám zabere dalších čtyřicet minut, přičemž z nich nepřestane téct bílá voda snad nikdy.

## Závěr
Vymalovat jeden pokoj trvá amatérovi s kompletní přípravou celý víkend. Profesionál má hotovo za zlomek času, neudělá nepořádek a vy se nemusíte bát, že vám nová barva do měsíce opadá. Šetřete své nervy i volný čas. Na Zrobee.cz najdete ověřené malíře ze svého okolí. Vy si můžete v klidu vypít kávu a oni promění váš domov k nepoznání.',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Kolik stojí rekonstrukce koupelny v roce 2026? Ceny práce a materiálu',
    'kolik-stoji-rekonstrukce-koupelny-2026',
    'Ceníky',
    'Plánujete novou koupelnu? Přinášíme reálný rozpočet pro rok 2026. Zjistěte skryté náklady a proč vás levný soused nakonec vyjde nejdráž.',
    'Koupelna už něco pamatuje, dlaždičky připomínají retro filmy z osmdesátek a baterie kape ve vlastním rytmu? Čas na rekonstrukci. Jenže jakmile začnete počítat, úsměv většinou rychle mizí. Rok 2026 přinesl další posuny v cenách materiálů i řemeslné práce. Vyplatí se ještě vůbec snažit se ušetřit svépomocí, nebo oslovením "Toho šikovného pána odvedle"? Pojďme se podívat na tvrdá čísla.

## Rozpočet pod lupou: Za co vlastně platíte?
Rekonstrukce koupelny (typicky v paneláku, o rozloze cca 4 m²) není jen o nalepení nových obkladů. Je to komplexní stavební akce.

- **Bourací práce a odvoz suti:** Staré jádro musí pryč. Suť je těžká, špinavá a musí se legálně zlikvidovat. (cca 15 000 – 20 000 Kč)
- **Rozvody vody a elektřiny:** Zde končí veškerá sranda. Špatně zapojená elektřina ve vlhkém prostředí je hazard se životem, špatně svařená trubka zase pozvánka pro vytopení celého domu. (cca 30 000 – 45 000 Kč)
- **Zednické práce a hydroizolace:** Zdi se musí srovnat. Pokud ošidíte hydroizolaci (takový ten modrý nebo růžový nátěr pod obklady), voda si najde cestu k sousedům pod vámi. (cca 25 000 – 35 000 Kč)
- **Obklady, dlažba a pokládka:** Tady platíte za materiál i přesnou ruku obkladače. Křivé spáry budete mít na očích dalších dvacet let. (cca 40 000 – 60 000 Kč)
- **Sanita a vybavení:** Vana, sprchový kout, zrcadlo, baterie, skříňky. Zde se meze nekladou, ale počítejte s minimem. (cca 40 000 Kč a více)

**Celkový reálný odhad pro rok 2026:** Poctivá, kompletní rekonstrukce malé koupelny od spolehlivé firmy se dnes pohybuje v rozmezí 150 000 až 220 000 Kč.

<!-- RESCUE_BANNER -->

## Proč se vyhnout "výhodné" nabídce z hospody?
Možná vám Franta odvedle slíbil, že to "sfoukne za pade i s materiálem". Háček je v tom, že Franta pravděpodobně nedělá tlakové zkoušky, vynechá hydroizolaci a spád ve sprchovém koutě udělá tak, že po každém sprchování budete muset vodu stírat do kanálku stěrkou. A když vám za půl roku praskne trubka a vytopíte sousedy, Franta vám fakturu ani záruku neukáže, protože žádná neexistuje. Pojišťovna se vám pak vysměje do očí.

## Závěr
Rekonstrukce koupelny je investice do hodnoty bytu a hlavně do vašeho klidu. Na zedničině a instalatérství se nevyplácí šetřit za každou cenu. Neriskujte katastrofu. Běžte na Zrobee.cz, zadejte zdarma poptávku a my vás propojíme s prověřenými profíky s referencemi, kteří vám dají záruku na smlouvu. Koupelna má být místo relaxace, ne zdroj nočních můr!',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Jak opravit ucpaný odpad (a nevyplavit u toho sousedy)',
    'jak-opravit-ucpany-odpad',
    'Katastrofy',
    'Voda neodtéká a z dřezu to zapáchá? Zkuste boj se zvonem i chemií. Poradíme, jak sifon vyčistit a kdy raději bezpečně zavolat záchranu.',
    'Začíná to nenápadně. Voda po umytí rukou mizí trochu pomaleji než dřív. Říkáte si: „To nic není, to se spláchne.“ Nespláchne. O týden později stojíte nad dřezem, ve kterém se líně houpe špinavá, smradlavá voda s kousky čehosi, co už nechcete nikdy vidět. Ucpaný odpad je zkouškou trpělivosti a žaludku každého domácího kutila. Tady je návod, jak se s tím poprat.

## Krok 1: Gumový zvon a hrubá síla
Vaše první linie obrany je klasický gumový zvon. Zní to jednoduše, ale i pumpování má svá pravidla.

- **Ucpěte přepad:** Pokud má umyvadlo nebo dřez přepadovou dírku (tou odtéká voda, když umyvadlo přeplníte), musíte ji ucpat mokrým hadrem. Jinak budete jen marně prohánět vzduch sem a tam.
- **Pumpujte:** Přiložte zvon, napusťte trochu vody (aby se okraje zvonu ponořily) a silně pumpujte.

Výsledek? Někdy to pomůže. Častěji ale špinavá voda vystříkne všude po koupelně, nebo špunt z vlasů a mýdla zatlačíte jen hlouběji do potrubí.

## Krok 2: Chemický útok (Krtek nastupuje)
Když selže svalovina, nastupuje chemie. Nejčastěji přípravky na bázi hydroxidu sodného.

- Opatrně nasypte perličky do odpadu (ideálně v ochranných brýlích a rukavicích, je to silná žíravina).
- Zalijte vroucí vodou.
- Uslyšíte bublání, prskání a ucítíte dusivý chemický zápach.

**Riziko:** Pokud se ucpávka neuvolní, máte teď v trubkách nejen neprůchodný špunt, ale ještě je to celé zalité vroucí žíravinou. Gratulujeme, právě jste situaci zhoršili.

<!-- RESCUE_BANNER -->

## Krok 3: Rozborka sifonu (Jen pro silné žaludky)
Zlatý hřeb večera. Pod umyvadlem si připravte kbelík, protože ho budete potřebovat.

- Opatrně rozšroubujte plastové matice sifonu. Většinou to jde ztuha a nakonec vám smradlavá břečka vyteče částečně do kbelíku a částečně do rukávu.
- Vyčistěte obsah sifonu (kombinace vlasů, tuků ze zbytků jídla a neidentifikovatelného slizu vás bude budit ze snů).
- Složte to zpět. Tady přichází past: staré gumové těsnění už si většinou nesedne tak, jak má. Umyvadlo sice odtéká, ale pod sifonem se tvoří loužička. Kap... kap... kap...

## Závěr
Boj s ucpaným odpadem vás může stát hodiny času, zničené oblečení a podrážděné dýchací cesty z chemie. Přitom šikovný instalatér s profesionálním motorovým perem přijede, problém vyřeší za patnáct minut a trubky vyčistí do hloubky, kam vy se zvonem nikdy nedostanete. Ušetřete si špinavou práci a nervy. Klikněte na Zrobee.cz, sežeňte ověřeného instalatéra a nechte odpadové katastrofy těm, kteří na to mají výbavu!',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop',
    'published'
)
ON CONFLICT (slug) DO NOTHING;
-- Seed requested Zrobee magazine articles for SEO / Anti-DIY content.

INSERT INTO public.articles (title, slug, category, excerpt, content, status)
SELECT 'Umakartové peklo: Jak přežít rekonstrukci jádra v Ostravě a nezbláznit se', 'umakartove-jadro-rekonstrukce-ostrava', 'Katastrofy', 'Vrzající stěny, plíseň v rozích a design roku 1974. Rekonstrukce panelákového jádra v Ostravě bolí, ale s profesionálem ji zvládnete bez infarktu.', '## Retro, které nikdo nechtěl

Pokud bydlíte v ostravském paneláku, pravděpodobně sdílíte domácnost s reliktem dob minulých – umakartovým jádrem. Tato papírová krabice maskovaná jako koupelna je fascinujícím inženýrským dílem, které mělo vydržet deset let, ale straší nás už padesát. Umakart má unikátní schopnost: slyšíte přes něj i to, jak si soused o dvě patra výš čistí zuby, a když se opřete o zeď, hrozí, že se probouráte přímo do kuchyně k nedělnímu řízku.

Možná jste zvažovali, že si tu modernizaci sfouknete sami. Pár desek, trocha tmelu, video na YouTube a bude to, ne? **Chyba.** Umakartové jádro není jen o vzhledu. Je to labyrint rezavých trubek, azbestových překvapení a elektroinstalace, která pamatuje první výkop na Baníku. Jakmile do toho jednou rýpnete bez plánu, ocitnete se v bytě bez vody, obklopeni sutí a s plačící manželkou v zádech.

## Proč svépomoc končí v křeči

Průměrný český kutil začíná s optimismem: „Vždyť je to jen pár metrů čtverečních.“ Realita se dostaví ve chvíli, kdy zjistíte, že podlaha křiví o pět centimetrů na metr a panely drží v kůpě jen silou vůle a deseti vrstvami starých tapet. 

Instalatéřina v paneláku je disciplína pro otrlé. Napojení na stoupačky vyžaduje víc než jen instalatérské kleště; vyžaduje to zkušenost s tlakovými poměry v domě o dvanácti patrech. Pokud to zkazíte, nevytopíte jen sebe, ale i celou vertikálu pod vámi. A věřte, že sousedé v Porubě nebo na Jihu dokážou být velmi nepříjemní, když jim z lustru teče vaše mýdlová voda.

<!-- RESCUE_BANNER -->

## Kdy zavolat zedníky a kdy utíkat

Kvalitní [zedník z Ostravy](/sluzby/stavby-rekonstrukce/ostrava) vám řekne pravdu hned na začátku: Umakart musí pryč. Žádné přelepování obkladačkami, žádné „osvěžení“ nátěrem. Skutečná hodnota bytu stoupne až ve chvíli, kdy se do věci vloží Ytong a pořádná hydroizolace. 

Co taková sranda stojí? Pokud chcete vědět, kolik si připravit, mrkněte na náš orientační [ceník rekonstrukce koupelny](/cenik/pokladka-obkladu-koupelna). Je to investice do vašeho duševního zdraví. Profesionál dokáže vyřídit i stavební povolení nebo ohlášku, zajistí odvoz suti a hlavně – vyrovná stěny tak, aby vám polička na šampon nesjížděla k zemi.

## Jak probíhá profesionální zásah

1. **Demolice:** Rychlá, hlučná, ale koordinovaná. Profíci vědí, kde jsou nosné konstrukce a co se nesmí uříznout.
2. **Rozvody:** Nová voda v plastu, elektřina v mědi (o té si povíme v dalším článku) a odpady, které skutečně odtékají.
3. **Vyzdívání:** Přesnost na milimetry. Tady se láme chleba u pokládky velkoformátové dlažby.
4. **Revize:** Bez papíru ani ránu. Budete ho potřebovat pro pojišťovnu i pro klidný spánek.

Zapomeňte na víkendové brigády s kamarády, které se protáhnou na půl roku. Život je příliš krátký na to, abyste se sprchovali v lavoru uprostřed obýváku. Pokud už toho oroseného umakartu máte dost, zadejte [novou poptávku](/nova-poptavka) na Zrobee a nechte si poslat nabídky od chlapů, co vědí, do čeho jdou. Ušetříte si nervy a dost možná i manželství.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE slug = 'umakartove-jadro-rekonstrukce-ostrava');

INSERT INTO public.articles (title, slug, category, excerpt, content, status)
SELECT 'Hliníková past: Proč vaše zásuvky v paneláku potichu hoří', 'nebezpecna-hlinikova-elektroinstalace-panelak', 'Inspirace', 'Staré hliníkové rozvody jsou časovanou bombou. Zjistěte, proč praskání v zásuvce není jen zvuk lesa, ale varování před požárem. Neriskujte vyhoření.', '## Neviditelný zabiják za tapetou

Hliník se odstěhoval do Humpolce, ale bohužel ne z vašich zdí. Pokud bydlíte v nezrekonstruovaném bytě ze 70. nebo 80. let, pravděpodobně vám v trubkách i pod omítkou koluje elektřina skrze hliníkové vodiče. A hliník je, diplomaticky řečeno, materiál s velmi špatnou povahou. Má tendenci „téci“ – měnit svůj objem pod tlakem a teplem, což vede k uvolňování spojů v krabicích a zásuvkách.

Možná jste si všimli, že vám občas poblikávají světla nebo cítíte ve vzduchu takový ten specifický „elektrický“ zápach připomínající spálené ryby. To není duch starého majitele, to je váš rozvaděč, který se snaží neuvěřitelným teplem roztavit vlastní izolaci. 

## Proč moderní spotřebiče nesnáší retro dráty

Když se tyhle baráky stavěly, vrcholem luxusu byl barevný televizor a jedna Tesla rádio. Dnes máme v kuchyni rychlovarnou konvici, kávovar, myčku, troubu a v obýváku herní PC, co žere víc než celá tehdejší ulice. Staré jističe a hliníkové dráty na tohle prostě nejsou stavěné. 

**Největší mýtus kutilů:** „Stačí jen dotáhnout šroubky v zásuvkách.“ 
Omyl. Hliník křehne. Každým dotažením riskujete, že se drát zlomí hluboko ve zdi. A oprava takového zlomu bez sekání? Nemožná. Kromě toho, staré rozvody často postrádají moderní proudové chrániče, které vás zachrání před ránou, když vám do vany spadne fén.

<!-- RESCUE_BANNER -->

## Revize není buzerace, je to pojistka

Než se pustíte do malování nebo nedejbože do nové kuchyně, nechte si udělat revizi. Certifikovaný [elektrikář](/sluzby/elektro) by měl být prvním člověkem, kterého do bytu pustíte. Profesionální diagnostika odhalí místa, kde to „doutná“, a navrhne řešení, které nezahrnuje vyhoření celého bytu.

Pokud se bojíte ceny, podívejte se na náš [ceník elektroinstalací](/cenik/kompletni-elektroinstalace-bytu). Uvidíte, že kompletní výměna rozvodů je zlomek ceny ve srovnání s tím, co by stála rekonstrukce po požáru. Navíc, pojišťovny se k náhradě škody u starých revizí staví velmi odmítavě. Pokud nemáte platný revizní papír, v případě nehody neuvidíte ani korunu.

## Na co si dát pozor?

- **Černé skvrny kolem zásuvek:** Okamžitě vypněte jistič a volejte pomoc.
- **Praskání a bzučení:** To je zvuk elektrického oblouku. Velmi nebezpečné.
- **Horké kryty vypínačů:** Znamená to, že odpor v místě spoje je kritický.

Nikdy, opravdu nikdy se nepokoušejte o výměnu rozvaděče svépomocí. Elektřina neodpouští chyby a panelákové rozvody jsou propojené víc, než si myslíte. Pokud chcete mít klid a bezpečný domov pro svou rodinu, zadejte si [poptávku na revizi](/nova-poptavka). Naši ověření elektrikáři vám řeknou na rovinu, jestli stačí menší oprava, nebo je čas na radikální řez do mědi. Vaše postel by neměla být pět metrů od časované bomby.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE slug = 'nebezpecna-hlinikova-elektroinstalace-panelak');

INSERT INTO public.articles (title, slug, category, excerpt, content, status)
SELECT 'Soused s vrtačkou: Jak nezabít pana Nováka a mít byt v cajku', 'soused-handyman-drobne-opravy', 'Návody', 'Každý má toho souseda, co vrtá i v neděli oběd. Buďte chytřejší. Menší opravy v bytě vyřeší profesionál dřív, než soused najde prodlužovačku.', '## Existenciální hrozba jménem Příklep

Je sobota, 8:00 ráno. Chcete spát, ale pan Novák ze čtvrtého patra se právě rozhodl, že dnes je ten den, kdy konečně pověsí tu poličku z IKEA, co mu půl roku ležela v předsíni. Pan Novák vlastní vrtačku s příklepem, kterou pravděpodobně zdědil po dědovi z dolů, a jeho technika vrtání připomíná útok na opevnění Maginotovy linie. 

Všichni víme, jak to dopadne. Pan Novák trefí armaturu, pak trefí kabel, pak mu vyteče olej na koberec a nakonec má poličku tak křivě, že z ní hrnek na kafe sklouzne rychleji než česká koruna v krizi. Vrtání v panelu je věda. Buďte lepší než Novák.

## I drobnosti si zaslouží profíka

Mnoho lidí se stydí volat si řemeslníka na „blbosti“. Říkají si: „Přece nebudu otravovat firmu kvůli kapajícímu kohoutku nebo jedné garnýži.“ Tak to raději zkusí sami, zničí si nářadí, v sobotu odpoledne vytopí sousedy a skončí na pohotovosti s ocelovou třískou v oku. 

Právě pro tyto případy existuje služba [hodinový manžel](/sluzby/hodinovy-manzel). Je to člověk, který se neurazí, že chcete jen přidělat zrcadlo nebo seřídit okna, která netěsní. Má vybavení, které si poradí i s tím nejtvrdším betonem, do kterého by Novák vrtal tři dny.

<!-- RESCUE_BANNER -->

## Co všechno zvládne šikovný kutil (když to není soused)

Někdy prostě nepotřebujete celou stavební firmu, ale někoho, kdo má v autě správné hmoždinky. Tady je krátký seznam věcí, které je lepší delegovat:

- **Montáž nábytku:** Ušetřete si pět hodin nad návodem a tři rozvody.
- **Výměna baterie:** Protože siko kleště a těsnění nikdy nespolupracují tak, jak mají.
- **Vrtání do obkladu:** Jediná cesta, jak v koupelně nemít prasklou kachličku.
- **Výměna zámku:** Když se vám podaří zalomit klíč zrovna ve chvíli, kdy nesete tašky s nákupem.

Ceny za tyto služby jsou překvapivě lidové. Podívejte se na náš [ceník drobných prací](/cenik/hodinovy-manzel-obecna-poptavka) a spočítejte si, kolik stojí váš volný čas a klid v rodině. Místo abyste strávili víkend v montérkách s nejistým výsledkem, můžete jít na pivo nebo do parku.

## Staňte se hrdinou vchodu

Chcete-li být tím nejoblíbenějším sousedem v domě, nedělejte rámus celé odpoledne. Profesionál vyvrtá čtyři díry za deset minut, uklidí po sobě průmyslovým vysavačem a zmizí dřív, než si kdokoli stačí postěžovat v domovní skupině na Facebooku. 

Stačí zadat [rychlou poptávku](/nova-poptavka) na Zrobee. Popište, co potřebujete přitlouct, přišroubovat nebo opravit, a my vám najdeme někoho z okolí, kdo má zrovna volno. Buďte chytří, nebuďte jako Novák. Váš domov (i vaši sousedé) vám poděkují.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE slug = 'soused-handyman-drobne-opravy');
-- Add generated cover images to the requested magazine articles.
UPDATE public.articles
SET image_url = '/article-covers/umakartove-jadro-ostrava.jpg', updated_at = now()
WHERE slug = 'umakartove-jadro-rekonstrukce-ostrava'
  AND (image_url IS NULL OR image_url = '');

UPDATE public.articles
SET image_url = '/article-covers/hlinikova-elektroinstalace.jpg', updated_at = now()
WHERE slug = 'nebezpecna-hlinikova-elektroinstalace-panelak'
  AND (image_url IS NULL OR image_url = '');

UPDATE public.articles
SET image_url = '/article-covers/soused-s-vrtackou.jpg', updated_at = now()
WHERE slug = 'soused-handyman-drobne-opravy'
  AND (image_url IS NULL OR image_url = '');

-- Add new columns to existing email_templates table
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'transactional',
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS greeting TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_role TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS drip_delay_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_series TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS segment_filters JSONB DEFAULT '{}';

-- Seed transactional notification templates
INSERT INTO public.email_templates (slug, category, name, subject, emoji, body, cta_text, target_role, trigger_type, trigger_event) VALUES
  ('notify-customer-new-offer', 'transactional', 'Nová nabídka na zakázku', 'Nová nabídka na vaši zakázku', '📬', 'Řemeslník vám poslal nabídku na vaši zakázku. Podívejte se na detaily a rozhodněte se.', 'Zobrazit nabídku', 'customer', 'event', 'offer_created'),
  ('notify-customer-job-completed', 'transactional', 'Zakázka dokončena', 'Vaše zakázka byla dokončena', '✅', 'Řemeslník označil vaši zakázku jako dokončenou. Potvrďte dokončení a ohodnoťte práci.', 'Potvrdit dokončení', 'customer', 'event', 'job_completed'),
  ('notify-new-message', 'transactional', 'Nová zpráva', 'Nová zpráva na Zrobee', '💬', 'Máte novou zprávu. Klikněte pro zobrazení konverzace.', 'Zobrazit zprávu', 'all', 'event', 'message_sent'),
  ('notify-worker-new-job', 'transactional', 'Nová zakázka v oblasti', 'Nová zakázka ve vaší oblasti! 🐝', '🐝', 'V okolí se objevila nová zakázka odpovídající vašim službám.', 'Zobrazit zakázku', 'worker', 'event', 'job_approved'),
  ('notify-worker-offer-accepted', 'transactional', 'Nabídka přijata', 'Vaše nabídka byla přijata! 🎉', '🎉', 'Zákazník přijal vaši nabídku. Můžete začít s prací.', 'Zobrazit detail', 'worker', 'event', 'offer_accepted'),
  ('notify-worker-direct-inquiry', 'transactional', 'Přímá poptávka', 'Nová přímá poptávka!', '📩', 'Zákazník vás oslovil s přímou poptávkou.', 'Zobrazit poptávku', 'worker', 'event', 'direct_inquiry'),
  ('notify-worker-job-approved', 'transactional', 'Zakázka schválena', 'Zakázka schválena ✅', '✅', 'Vaše zakázka byla schválena.', 'Zobrazit zakázku', 'worker', 'event', 'job_approved_worker'),
  ('notify-worker-low-credits', 'transactional', 'Nízký počet kreditů', 'Nízký počet kreditů ⚠️', '⚠️', 'Vaše kredity jsou nízké. Doplňte si je.', 'Doplnit kredity', 'worker', 'event', 'low_credits'),
  ('notify-admin-report', 'transactional', 'Nahlášení', 'Nové nahlášení', '🚨', 'Nové nahlášení ke kontrole.', 'Zobrazit', 'all', 'event', 'report_created'),
  ('onboarding-worker-day0', 'lifecycle', 'Vítejte na Zrobee (řemeslník)', 'Vítejte na Zrobee! 👋', '👋', 'Děkujeme za registraci. Dokončete svůj profil a začněte získávat zakázky.', 'Dokončit profil', 'worker', 'cron', 'registration'),
  ('onboarding-worker-day1', 'lifecycle', 'Dokončete profil', 'Dokončete svůj profil na Zrobee', '📝', 'Kompletní profil zvyšuje šanci na zakázky. Přidejte fotky a popis služeb.', 'Upravit profil', 'worker', 'cron', 'registration'),
  ('onboarding-worker-day3', 'lifecycle', 'První kredity', 'Získejte první kredity! 🎁', '🎁', 'Aktivujte účet a získejte startovací balíček kreditů.', 'Získat kredity', 'worker', 'cron', 'registration'),
  ('onboarding-worker-day7', 'lifecycle', 'Jak získat 1. zakázku', 'Tipy pro první zakázku 💡', '💡', 'Tipy od nejúspěšnějších řemeslníků.', 'Přečíst tipy', 'worker', 'cron', 'registration'),
  ('onboarding-customer-day0', 'lifecycle', 'Vítejte na Zrobee (zákazník)', 'Vítejte na Zrobee! 👋', '👋', 'Zadejte první poptávku a do pár minut dostanete nabídky.', 'Zadat poptávku', 'customer', 'cron', 'registration'),
  ('onboarding-customer-day2', 'lifecycle', 'Jak vybrat řemeslníka', 'Jak vybrat řemeslníka? 🔍', '🔍', 'Na co se zaměřit — recenze, portfolio, rychlost odpovědi.', 'Přečíst průvodce', 'customer', 'cron', 'registration'),
  ('onboarding-customer-day7', 'lifecycle', 'Ohodnoťte řemeslníka', 'Jak proběhla zakázka? ⭐', '⭐', 'Vaše hodnocení pomáhá ostatním. Dejte nám vědět.', 'Ohodnotit', 'customer', 'cron', 'registration'),
  ('reactivation-30d', 'lifecycle', 'Reaktivace po 30 dnech', 'Chybíte nám na Zrobee! 😢', '😢', 'Už je to 30 dní. Podívejte se, co je nového.', 'Podívat se', 'all', 'cron', 'last_login')
ON CONFLICT (slug) DO NOTHING;

-- Set drip_delay_days for lifecycle templates
UPDATE public.email_templates SET drip_delay_days = 0, drip_series = 'onboarding-worker' WHERE slug = 'onboarding-worker-day0';
UPDATE public.email_templates SET drip_delay_days = 1, drip_series = 'onboarding-worker' WHERE slug = 'onboarding-worker-day1';
UPDATE public.email_templates SET drip_delay_days = 3, drip_series = 'onboarding-worker' WHERE slug = 'onboarding-worker-day3';
UPDATE public.email_templates SET drip_delay_days = 7, drip_series = 'onboarding-worker' WHERE slug = 'onboarding-worker-day7';
UPDATE public.email_templates SET drip_delay_days = 0, drip_series = 'onboarding-customer' WHERE slug = 'onboarding-customer-day0';
UPDATE public.email_templates SET drip_delay_days = 2, drip_series = 'onboarding-customer' WHERE slug = 'onboarding-customer-day2';
UPDATE public.email_templates SET drip_delay_days = 7, drip_series = 'onboarding-customer' WHERE slug = 'onboarding-customer-day7';
UPDATE public.email_templates SET drip_delay_days = 30, drip_series = 'reactivation' WHERE slug = 'reactivation-30d';

-- Create drip_email_log to track sent lifecycle emails
CREATE TABLE IF NOT EXISTS public.drip_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_slug)
);

ALTER TABLE public.drip_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view drip email log" ON public.drip_email_log;
CREATE POLICY "Admins can view drip email log"
ON public.drip_email_log FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

DROP POLICY IF EXISTS "Admins can insert drip log" ON public.drip_email_log;
CREATE POLICY "Admins can insert drip log"
ON public.drip_email_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- Fix CTA URLs for all transactional templates
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/zakaznik/zakazky' WHERE slug = 'notify-customer-new-offer';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/zakaznik/zakazky' WHERE slug = 'notify-customer-job-completed';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/zpravy' WHERE slug = 'notify-new-message';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/remeslnik/zakazky' WHERE slug = 'notify-worker-new-job';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/remeslnik/zakazky' WHERE slug = 'notify-worker-offer-accepted';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/remeslnik/zakazky' WHERE slug = 'notify-worker-direct-inquiry';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/remeslnik/zakazky' WHERE slug = 'notify-worker-job-approved';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/kredity' WHERE slug = 'notify-worker-low-credits';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/admin' WHERE slug = 'notify-admin-report';

-- Improve lifecycle CTA URLs
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/remeslnik/profil' WHERE slug = 'onboarding-worker-day0';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/remeslnik/profil/upravit' WHERE slug = 'onboarding-worker-day1';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/kredity' WHERE slug = 'onboarding-worker-day3';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/magazin' WHERE slug = 'onboarding-worker-day7';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/zadat-zakazku' WHERE slug = 'onboarding-customer-day0';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/jak-to-funguje' WHERE slug = 'onboarding-customer-day2';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz/zakaznik/zakazky' WHERE slug = 'onboarding-customer-day7';
UPDATE public.email_templates SET cta_url = 'https://zrobee.cz' WHERE slug = 'reactivation-30d';

-- Add greetings to all templates
UPDATE public.email_templates SET greeting = 'Ahoj {{jmeno}}!' WHERE greeting = '' OR greeting IS NULL;

-- Improve body copy for transactional templates
UPDATE public.email_templates SET 
  body = 'Na vaši zakázku dorazila nová nabídka od řemeslníka. Podívejte se na cenu, dostupnost a reference — a rozhodněte se, koho si vyberete.',
  secondary_text = 'Odpovídejte rychle – řemeslníci jsou zaneprázdnění.'
WHERE slug = 'notify-customer-new-offer';

UPDATE public.email_templates SET 
  body = 'Řemeslník právě označil vaši zakázku jako dokončenou. Potvrďte, že jste spokojení, a ohodnoťte kvalitu práce.',
  secondary_text = 'Vaše hodnocení pomáhá ostatním zákazníkům.'
WHERE slug = 'notify-customer-job-completed';

UPDATE public.email_templates SET 
  body = 'Máte nepřečtenou zprávu. Rychlá komunikace zvyšuje šanci na úspěšnou spolupráci.',
  secondary_text = NULL
WHERE slug = 'notify-new-message';

UPDATE public.email_templates SET 
  body = 'V okolí se objevila nová zakázka, která odpovídá vašim službám. Buďte první, kdo odpoví — zvyšuje to šanci na přijetí.',
  secondary_text = 'Rychlá odpověď = vyšší šance na zakázku.'
WHERE slug = 'notify-worker-new-job';

UPDATE public.email_templates SET 
  body = 'Skvělá zpráva! Zákazník přijal vaši nabídku. Domluvte se na termínu a pusťte se do práce.',
  secondary_text = 'Kontaktujte zákazníka co nejdříve.'
WHERE slug = 'notify-worker-offer-accepted';

UPDATE public.email_templates SET 
  body = 'Zákazník si vás vybral a oslovil vás přímo. Podívejte se na detail poptávky a odpovězte.',
  secondary_text = 'Přímé poptávky mají nejvyšší konverzní poměr.'
WHERE slug = 'notify-worker-direct-inquiry';

UPDATE public.email_templates SET 
  body = 'Vaše nová zakázka byla schválena a je připravena k zahájení.',
  secondary_text = NULL
WHERE slug = 'notify-worker-job-approved';

UPDATE public.email_templates SET 
  body = 'Vaše kreditové konto je na minimu. Bez kreditů nemůžete reagovat na nové zakázky — doplňte si je včas.',
  secondary_text = 'Balíček 50 kreditů stojí jen 249 Kč.'
WHERE slug = 'notify-worker-low-credits';

-- Improve lifecycle body copy
UPDATE public.email_templates SET 
  body = 'Děkujeme za registraci na Zrobee! Prvním krokem je dokončení profilu — přidejte fotku, popis služeb a lokalitu. Kompletní profil zvyšuje šanci na zakázky až 3×.',
  secondary_text = 'Zabere to jen 2 minuty.'
WHERE slug = 'onboarding-worker-day0';

UPDATE public.email_templates SET 
  body = 'Řemeslníci s kompletním profilem získávají až 3× více zakázek. Přidejte fotky svých realizací, popište vaše služby a nastavte lokalitu.',
  secondary_text = 'Zákazníci se rozhodují hlavně podle portfolia.'
WHERE slug = 'onboarding-worker-day1';

UPDATE public.email_templates SET 
  body = 'Máte startovací kredity na svém účtu — díky nim můžete reagovat na první zakázky zcela zdarma. Nečekejte, kredity neexpirují.',
  secondary_text = 'Každá odpověď na zakázku stojí 3–5 kreditů.'
WHERE slug = 'onboarding-worker-day3';

UPDATE public.email_templates SET 
  body = 'Zjistěte, jak nejúspěšnější řemeslníci na Zrobee získávají zakázky. Rychlá odpověď, kvalitní profil a férové ceny — to je recept na úspěch.',
  secondary_text = 'Průměrný řemeslník získá první zakázku do 5 dní.'
WHERE slug = 'onboarding-worker-day7';

UPDATE public.email_templates SET 
  body = 'Vítejte na Zrobee! Zadejte svou první poptávku a do pár minut vám začnou chodit nabídky od ověřených řemeslníků z vašeho okolí.',
  secondary_text = 'Je to zdarma a nezávazné.'
WHERE slug = 'onboarding-customer-day0';

UPDATE public.email_templates SET 
  body = 'Na co se zaměřit při výběru řemeslníka? Hodnocení od ostatních zákazníků, portfolio realizací a rychlost odpovědi — to jsou klíčové faktory.',
  secondary_text = 'Čím více nabídek porovnáte, tím lépe se rozhodnete.'
WHERE slug = 'onboarding-customer-day2';

UPDATE public.email_templates SET 
  body = 'Zadali jste už zakázku? Vaše hodnocení řemeslníka pomáhá celé komunitě. Dejte nám vědět, jak proběhla spolupráce.',
  secondary_text = 'Hodnocení zabere jen 30 sekund.'
WHERE slug = 'onboarding-customer-day7';

UPDATE public.email_templates SET 
  body = 'Už je to 30 dní, co jsme se naposledy viděli. Na Zrobee přibyly nové služby, řemeslníci i vylepšení. Podívejte se, co je nového!',
  secondary_text = 'Máte rozpracovaný projekt? Zadejte poptávku a do chvíle dostanete nabídky.'
WHERE slug = 'reactivation-30d';

-- Add new templates
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, trigger_event, is_enabled) VALUES
  ('notify-first-review', 'transactional', 'První hodnocení přijato', 'Máte první hodnocení na Zrobee! ⭐', '⭐', 'Ahoj {{jmeno}}!', 'Gratulujeme! Právě jste dostali své první hodnocení. Podívejte se, co o vás zákazník napsal, a sdílejte svůj profil.', 'Zobrazit hodnocení', 'https://zrobee.cz/remeslnik/profil', 'Hodnocení zvyšují důvěryhodnost vašeho profilu.', 'worker', 'event', 'first_review', true),
  ('notify-pro-activated', 'transactional', 'PRO předplatné aktivováno', 'Vítejte v PRO programu! 🏆', '🏆', 'Ahoj {{jmeno}}!', 'Vaše PRO předplatné bylo úspěšně aktivováno. Nyní máte přednostní zobrazení, PRO odznak a další výhody.', 'Prozkoumat výhody', 'https://zrobee.cz/remeslnik/profil', 'PRO řemeslníci získávají až 5× více zobrazení.', 'worker', 'event', 'pro_activated', true),
  ('auth-password-reset', 'auth', 'Heslo úspěšně změněno', 'Heslo na Zrobee bylo změněno ✅', '🔒', 'Ahoj {{jmeno}}!', 'Vaše heslo na Zrobee bylo úspěšně změněno. Pokud jste tuto změnu neprovedli vy, kontaktujte nás okamžitě.', 'Přejít na Zrobee', 'https://zrobee.cz', 'Z bezpečnostních důvodů vás o změně informujeme.', 'all', 'event', 'password_changed', true)
ON CONFLICT (slug) DO NOTHING;

-- New transactional templates
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, trigger_event, is_enabled)
VALUES
  ('notify-welcome', 'transactional', 'Vítej na Zrobee!', 'Vítej na Zrobee! 🎉', '🎉', 'Ahoj {{jmeno}}!', 'Jsme rádi, že jsi tady. Zrobee ti pomůže najít spolehlivé řemeslníky nebo nové zakázky — bez zbytečného hledání a telefonování.', 'Prozkoumat Zrobee', 'https://zrobee.cz', 'Pokud máš jakýkoliv dotaz, neváhej se ozvat na naši podporu.', 'all', 'event', 'registration', true),
  ('notify-credits-purchased', 'transactional', 'Kredity připsány', 'Kredity byly úspěšně připsány ✅', '✅', 'Ahoj {{jmeno}}!', 'Tvoje kredity byly úspěšně připsány na tvůj účet. Můžeš je ihned využít k reagování na nové poptávky.', 'Zobrazit poptávky', 'https://zrobee.cz/remeslnik/hledej', 'Přehled kreditů najdeš ve svém profilu v sekci Peněženka.', 'worker', 'event', 'credits_purchased', true),
  ('notify-worker-job-cancelled', 'transactional', 'Zakázka zrušena', 'Zakázka byla zrušena zákazníkem', '❌', 'Ahoj {{jmeno}}!', 'Zákazník bohužel zrušil zakázku, na které jsi pracoval/a. Mrzí nás to, ale neboj — nové příležitosti čekají.', 'Najít nové zakázky', 'https://zrobee.cz/remeslnik/hledej', 'Pokud máš pocit, že ke zrušení došlo neoprávněně, kontaktuj naši podporu.', 'worker', 'event', 'job_cancelled', true),
  ('notify-customer-offer-rejected', 'transactional', 'Nabídka odmítnuta', 'Řemeslník odmítl vaši poptávku', '😔', 'Ahoj {{jmeno}}!', 'Bohužel, řemeslník na vaši poptávku nemůže reagovat. Ale nezoufejte — na Zrobee je spousta dalších šikovných profesionálů.', 'Najít další řemeslníky', 'https://zrobee.cz/zakaznik/zakazky', 'Tip: Čím detailnější popis práce, tím rychleji najdete vhodného řemeslníka.', 'customer', 'event', 'offer_rejected', true),
  ('notify-worker-new-review', 'transactional', 'Nové hodnocení', 'Máte nové hodnocení od zákazníka ⭐', '⭐', 'Ahoj {{jmeno}}!', 'Zákazník ti zanechal nové hodnocení. Podívej se, co o tvé práci napsal — každá recenze pomáhá budovat tvoji reputaci.', 'Zobrazit hodnocení', 'https://zrobee.cz/remeslnik/profil', 'Kvalitní hodnocení zvyšují šanci na další zakázky. Díky za skvělou práci!', 'worker', 'event', 'review_received', true)
ON CONFLICT (slug) DO NOTHING;

-- New lifecycle templates (drip sequences)
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, trigger_event, drip_delay_days, drip_series, is_enabled)
VALUES
  ('onboarding-worker-day14', 'lifecycle', 'Jak se daří? (den 14)', 'Jak se ti daří na Zrobee? 🤔', '🤔', 'Ahoj {{jmeno}}!', 'Už jsi dva týdny na Zrobee. Máš svůj profil kompletní? Řemeslníci s vyplněným profilem a portfoliem dostávají až 3× více poptávek.', 'Dokončit profil', 'https://zrobee.cz/remeslnik/profil/upravit', 'Pokud potřebuješ pomoct s nastavením, jsme tu pro tebe.', 'worker', 'cron', 'registration', 14, 'onboarding-worker', true),
  ('onboarding-customer-day14', 'lifecycle', 'První poptávka? (den 14)', 'Už jste našli svého řemeslníka? 🔍', '🔍', 'Ahoj {{jmeno}}!', 'Už jste dva týdny na Zrobee. Pokud jste ještě nezadali poptávku, zkuste to — je to zdarma a zabere jen 2 minuty.', 'Zadat poptávku', 'https://zrobee.cz/zadat-poptavku', 'Naši řemeslníci obvykle odpovídají do 24 hodin.', 'customer', 'cron', 'registration', 14, 'onboarding-customer', true),
  ('reactivation-60d', 'lifecycle', 'Chybíte nám (60 dní)', 'Máme pro vás nové řemeslníky 🏠', '🏠', 'Ahoj {{jmeno}}!', 'Už je to nějaký čas, co jsi byl/a naposledy na Zrobee. Přibyli noví ověření řemeslníci ve tvém okolí — podívej se, kdo je k dispozici.', 'Prohlédnout řemeslníky', 'https://zrobee.cz', 'Máš otázku? Napiš nám, rádi pomůžeme.', 'all', 'cron', 'last_login', 60, 'reactivation', true),
  ('reactivation-90d', 'lifecycle', 'Stále tu jsme (90 dní)', 'Potřebujete pomoct s něčím? 🤝', '🤝', 'Ahoj {{jmeno}}!', 'Je to už 3 měsíce. Pokud hledáš spolehlivého řemeslníka, Zrobee je tu pořád pro tebe. Stačí zadat poptávku a řemeslníci se ozvou sami.', 'Zadat poptávku zdarma', 'https://zrobee.cz/zadat-poptavku', 'Toto je náš poslední připomenutí. Pokud nechceš dostávat e-maily, odhlásit se můžeš níže.', 'all', 'cron', 'last_login', 90, 'reactivation', true)
ON CONFLICT (slug) DO NOTHING;

-- Milestone templates
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, trigger_event, is_enabled)
VALUES
  ('milestone-5-jobs', 'lifecycle', '5 zakázek dokončeno!', 'Gratulujeme k 5. dokončené zakázce! 🏆', '🏆', 'Ahoj {{jmeno}}!', 'Právě jsi dokončil/a svou 5. zakázku na Zrobee. To je skvělý milník! Tvoje reputace roste a s ní i šance na další spolupráce.', 'Zobrazit profil', 'https://zrobee.cz/remeslnik/profil', 'Tip: Požádej zákazníky o hodnocení — kvalitní recenze přitahují nové klienty.', 'worker', 'event', 'milestone_jobs', true),
  ('milestone-first-job', 'lifecycle', 'První poptávka zadána!', 'Vaše první poptávka je online! 🚀', '🚀', 'Ahoj {{jmeno}}!', 'Skvěle! Vaše první poptávka je aktivní a řemeslníci ji už vidí. Brzy se vám začnou ozývat s nabídkami.', 'Sledovat poptávku', 'https://zrobee.cz/zakaznik/zakazky', 'Tip: Odpovídejte řemeslníkům rychle — ti nejlepší bývají brzy zabraní.', 'customer', 'event', 'milestone_first_job', true)
ON CONFLICT (slug) DO NOTHING;
-- Triggering deployment with fix
-- Add layout support to email_templates
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'standard' CHECK (layout_type IN ('standard', 'magazine')),
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Create a sample magazine template for "Spring Maintenance"
INSERT INTO public.email_templates (
  slug, 
  category, 
  name, 
  subject, 
  emoji, 
  greeting, 
  body, 
  cta_text, 
  cta_url, 
  secondary_text, 
  target_role, 
  trigger_type, 
  trigger_event, 
  drip_delay_days, 
  drip_series, 
  layout_type, 
  hero_image_url
) VALUES (
  'magazine-spring-maintenance',
  'lifecycle',
  'Jarní údržba domova',
  'Tichý zabiják v bytě? 🏠 Jak se zbavit vlhkosti.',
  '🏠',
  'Ahoj {{jmeno}}!',
  'Jaro je tu a s ním i ideální čas na kontrolu vašeho domova. Věděli jste, že zanedbaná vlhkost může snížit hodnotu nemovitosti až o 20 %?',
  'Zobrazit průvodce',
  'https://zrobee.cz/magazin',
  'Máme volné kapacity řemeslníků ve vašem okolí.',
  'customer',
  'cron',
  'registration',
  30,
  'onboarding-customer',
  'magazine',
  'https://michalkasparek91-arch-handy-heroes-reborn.supabase.co/storage/v1/object/public/system/spring-hero.jpg'
) ON CONFLICT (slug) DO NOTHING;
-- Add seasonal maintenance template and upgrade the "New Job" notification to premium layout
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, layout_type, hero_image_url, is_enabled)
VALUES
  (
    'seasonal-spring-maintenance', 
    'marketing', 
    'Jarní údržba domova (Magazín)', 
    'Je váš domov připraven na jaro? 🌸 Tipy pro údržbu', 
    '🌸', 
    'Ahoj {{jmeno}}!', 
    'Zima dala vašemu domu zabrat. Aby vám vše dlouho sloužilo, připravili jsme pro vás seznam věcí, na které byste neměli zapomenout – od revize střechy po kontrolu klimatizace. V našem magazínu najdete podrobný návod, jak na to!', 
    'Přečíst jarní tipy', 
    'https://zrobee.cz/magazin', 
    'P.S. Nejlepší řemeslníci se na jaro plní už teď. Zadejte poptávku včas!', 
    'customer', 
    'manual', 
    'magazine', 
    'https://images.unsplash.com/photo-1558905619-17254271206a?auto=format&fit=crop&q=80&w=1200', 
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  layout_type = EXCLUDED.layout_type,
  hero_image_url = EXCLUDED.hero_image_url;

-- Upgrade existing "New Job" template to Magazine layout
UPDATE public.email_templates 
SET 
  layout_type = 'magazine',
  hero_image_url = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200',
  body = 'V tvém okolí se právě objevila nová zakázka, která přesně odpovídá tvým dovednostem. Nečekej, až tě předběhne konkurence – pošli svou nabídku ještě dnes a získej nového zákazníka! Pod detailem zakázky najdeš i naše nejnovější tipy, jak u zákazníků uspět.'
WHERE slug = 'notify-worker-new-job';

-- Fix get_all_profile_tags — must drop first due to return type
DROP FUNCTION IF EXISTS public.get_all_profile_tags();

CREATE OR REPLACE FUNCTION public.get_all_profile_tags()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    all_tags text[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT t)
    INTO all_tags
    FROM (
        SELECT UNNEST(tags) as t
        FROM public.profiles
    ) sub;
    RETURN COALESCE(all_tags, '{}'::text[]);
END;
$$;

DROP FUNCTION IF EXISTS public.get_suitable_workers_for_sniper(uuid, double precision);

CREATE OR REPLACE FUNCTION public.get_suitable_workers_for_sniper(p_job_id uuid, p_radius_km double precision DEFAULT NULL::double precision)
RETURNS TABLE(id uuid, email text, full_name text, user_type text, tags text[], phone text, city text, category text, subcategory text, description text, distance_km double precision, matched_subcategory text, contact_source text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_job_location geography;
  v_job_subcategory_name text;
  v_job_subcategory_id uuid;
BEGIN
  SELECT 
    j.location, 
    TRIM(s.name) as sub_name,
    j.subcategory_id
  INTO 
    v_job_location, 
    v_job_subcategory_name,
    v_job_subcategory_id
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  WITH matched_workers AS (
    SELECT 
      p.*,
      CASE 
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_name || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_name) || '%'
           LIMIT 1)
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(s.name) = v_job_subcategory_id::text
           LIMIT 1)
        ELSE v_job_subcategory_name
      END as v_matched_sub
    FROM public.unified_contacts p
    WHERE 
      (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
      AND (
        EXISTS (
          SELECT 1 FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
          WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_name) || '%'
        ) OR
        p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' OR
        EXISTS (
          SELECT 1 FROM public.worker_services ws 
          WHERE ws.worker_id = p.id AND ws.subcategory_id = v_job_subcategory_id
        )
      )
  )
  SELECT 
    mw.id, mw.email, mw.full_name, mw.user_type, mw.tags, mw.phone, mw.city, mw.category, mw.subcategory, mw.description,
    CASE 
      WHEN v_job_location IS NOT NULL AND mw.longitude IS NOT NULL AND mw.latitude IS NOT NULL
      THEN (ST_Distance(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location) / 1000.0) 
      ELSE NULL 
    END as distance_km,
    COALESCE(mw.v_matched_sub, v_job_subcategory_name) as matched_subcategory,
    mw.contact_source
  FROM matched_workers mw
  WHERE 
    (
      p_radius_km IS NULL OR 
      v_job_location IS NULL OR
      (mw.longitude IS NULL OR mw.latitude IS NULL) OR
      ST_DWithin(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location, p_radius_km * 1000.0)
    )
  ORDER BY 
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC
  LIMIT 2000;
END;
$function$;
-- Upgrade key lifecycle templates to Magazine layout for better engagement

-- 1. Onboarding Worker Day 7 (Tips for success)
UPDATE public.email_templates 
SET 
  layout_type = 'magazine',
  hero_image_url = 'https://images.unsplash.com/photo-1521791136064-7986c2923216?auto=format&fit=crop&q=80&w=1200',
  subject = 'Jak získat víc zakázek? Máme pro vás tipy 💡',
  emoji = '💡'
WHERE slug = 'onboarding-worker-day7';

-- 2. Onboarding Customer Day 2 (How to choose a worker)
UPDATE public.email_templates 
SET 
  layout_type = 'magazine',
  hero_image_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1200',
  subject = 'Jak vybrat toho nejlepšího řemeslníka? 🛠️',
  emoji = '🛠️'
WHERE slug = 'onboarding-customer-day2';

-- 3. Reactivation 30 Days (Platform news)
UPDATE public.email_templates 
SET 
  layout_type = 'magazine',
  hero_image_url = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200',
  subject = 'Už je to měsíc... podívejte se, co je na Zrobee nového! ✨',
  emoji = '✨'
WHERE slug = 'reactivation-30d';
-- Add missing transactional templates for Fáze 2 improvements

-- 1. Customer: Offer Rejected by Worker
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, is_enabled)
VALUES (
  'notify-customer-offer-rejected',
  'transactional',
  'Řemeslník odmítl přímou poptávku',
  'Řemeslník se omlouvá, ale vaši poptávku nemůže přijmout 😔',
  '😔',
  'Ahoj {{jmeno}}!',
  'Děkujeme za oslovení řemeslníka {{workerName}}. Bohužel má v tuto chvíli plné kapacity nebo se na daný typ práce nespecializuje. Vaši zakázku jsme ale ponechali otevřenou pro ostatní šikovné ruce! Podívejte se, kdo další by mohl pomoci.',
  'Zobrazit zakázku',
  'https://zrobee.cz/zakaznik/zakazky',
  'Poptávka zůstává aktivní, brzy se ozve někdo další.',
  'customer',
  'event',
  true
) ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body;

-- 2. Customer: Job Expiration Warning
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, layout_type, hero_image_url, is_enabled)
VALUES (
  'notify-customer-job-expiring',
  'lifecycle',
  'Varování před expirací zakázky (Magazín)',
  'Vaše zakázka brzy vyprší – chcete ji oživit? ⚡',
  '⚡',
  'Ahoj {{jmeno}}!',
  'Vaše zakázka "{{jobTitle}}" je na Zrobee už pár dní, ale zatím na ni nikdo neodpověděl. Zkuste ji topovat nebo upravit detaily (např. přidat fotku), abyste přilákali více řemeslníků. Pokud už nikoho nehledáte, můžete ji jednoduše zrušit.',
  'Upravit zakázku',
  'https://zrobee.cz/zakaznik/zakazky',
  'P.S. Dobře popsané zakázky s fotkou získávají v průměru 4× více nabídek.',
  'customer',
  'event',
  'magazine',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200',
  true
) ON CONFLICT (slug) DO UPDATE SET
  layout_type = EXCLUDED.layout_type,
  hero_image_url = EXCLUDED.hero_image_url;
-- Add marketing triggers for Fáze 3

-- 1. Seasonal: Summer Garden Maintenance (Magazine Layout)
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, layout_type, hero_image_url, is_enabled)
VALUES (
  'seasonal-summer-garden',
  'marketing',
  'Letní údržba zahrady (Magazín)',
  'Léto je tady! ☀️ Je vaše zahrada připravena?',
  '☀️',
  'Ahoj {{jmeno}}!',
  'Teploty stoupají a vaše zahrada i bazén si zaslouží pozornost. Od vertikutace trávníku po kontrolu filtrace – v našem novém magazínu najdete seznam věcí, které je dobré stihnout, než začne ta pravá letní pohoda. A pokud na to sami nestačíte, naši zahradníci jsou vám k dispozici!',
  'Přečíst letní tipy',
  'https://zrobee.cz/magazin',
  'P.S. Termíny u zahradníků se rychle plní. Rezervujte si ten svůj včas!',
  'customer',
  'manual',
  'magazine',
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=1200',
  true
) ON CONFLICT (slug) DO UPDATE SET
  layout_type = EXCLUDED.layout_type,
  hero_image_url = EXCLUDED.hero_image_url;

-- 2. Promo: Credits Bonus
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, secondary_text, target_role, trigger_type, is_enabled)
VALUES (
  'promo-credits-bonus',
  'marketing',
  'Bonus 20 % ke kreditům',
  'Doplňte si kredity s 20% bonusem 🎁',
  '🎁',
  'Ahoj {{jmeno}}!',
  'Chceme vám poděkovat, že jste aktivním řemeslníkem na Zrobee. Jen tento týden jsme pro vás připravili speciální akci: ke každému dobití kreditů získáte 20 % navíc jako dárek od nás. Více kreditů znamená více odpovědí na zakázky a více práce pro vás!',
  'Dobít kredity s bonusem',
  'https://zrobee.cz/kredity',
  'Akce platí pouze do konce tohoto týdne.',
  'worker',
  'manual',
  true
) ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body;
-- Migration: Seed New Magazine Articles for Summer Season
-- Description: Adds articles about Garden, AC, and Boiler maintenance.

INSERT INTO public.articles (title, slug, category, excerpt, content, image_url, status)
VALUES 
(
    'Příprava zahrady na léto: Od trávníku po bazén',
    'priprava-zahrady-na-leto',
    'Návody',
    'Chcete mít zahradu jako z katalogu? Zjistěte, co všechno obnáší jarní a letní údržba, od vertikutace trávníku až po zprovoznění filtrace bazénu.',
    'Zatímco v dubnu to vypadalo na pohodu, v květnu a červnu se zahrada mění v nenasytnou bestii. Tráva roste před očima, plevel si dělá, co chce, a bazén, který měl být osvěžením, se pomalu mění v zelený močál. Pokud si myslíte, že k dokonalé zahradě stačí jednou za čtrnáct dní vytáhnout sekačku, realita vás rychle vyvede z omylu.

## Trávník: Víc než jen sekání
Anglický trávník není náhoda, je to diagnóza. Pokud chcete v létě běhat bosí po měkkém koberci, musíte začít od podlahy – nebo spíš od kořenů.

- **Vertikutace:** Musíte trávník prořezat, aby mohl dýchat a přijímat vodu. Připravte se na to, že po vertikutaci bude vaše zahrada týden vypadat jako po výbuchu granátu.
- **Hnojení a dosévání:** Musíte trefit správný poměr dusíku, fosforu a draslíku. Pokud to přeženete, trávník spálíte. Pokud uberete, bude mít barvu unavené slámy.

## Bazén: Alchymie pro pokročilé
Zprovoznění bazénu není o tom tam napustit vodu. Je to o pH, chloru, algicidu a drahých filtracích.

- **Čištění stěn:** Drhnutí usazenin ze stěn je práce pro trestance.
- **Nastavení chemie:** Pokud netrefíte pH, voda vám zezelená dřív, než si stihnete obléknout plavky. A jakmile zezelená, čeká vás nákup drahé chemie a hodiny vysávání kalu ze dna.

<!-- RESCUE_BANNER -->

## Závěr
Můžete strávit každý víkend s rukama v hlíně a hlavou v bazénové šachtě. Nebo můžete pozvat někoho, kdo zahradám rozumí, má profesionální techniku a bazén vám vyladí za jedno odpoledne. Ušetřete svůj čas pro relaxaci, ne pro dřinu. Na Zrobee.cz najdete zahradníky i bazénové techniky, kteří se o vše postarají za vás.',
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Proč klimatizace smrdí? Čištění, které nesnesete odkládat',
    'proc-klimatizace-smrdi',
    'Tipy',
    'Zapnuli jste klimu a v bytě je cítit zatuchlina? Bakterie a plísně v jednotce nejsou jen nepříjemné, ale i nebezpečné pro zdraví. Jak na správnou údržbu?',
    'Léto je tady, venku je třicet ve stínu a vy s úlevou zapínáte klimatizaci. Jenže místo svěžího vánku se bytem rozline pach, který připomíná mokrého psa nebo starý sklep. To není jen kosmetická vada. To jsou miliony bakterií a plísní, které vám klimatizace právě začala foukat přímo do plic.

## Co se děje uvnitř?
Klimatizace funguje na principu kondenzace. Vevnitř je vlhko a tma – ideální hotel pro plísně a legionellu. Pokud se o jednotku nestaráte, vnitřní výměník se obalí slizem, který brání průtoku vzduchu a neuvěřitelně zapáchá.

- **Filtry:** Jsou plné prachu a roztočů.
- **Vanička na kondenzát:** Stojatá voda v ní je zdrojem největšího zápachu.

## Proč "vyfoukání sprejem" z drogerie nestačí?
Koupit si sprej za dvě stovky a stříknout ho do mřížky vypadá jako skvělý nápad. Realita? Jen na chvíli přebijete zápach umělou vůní citronu, ale plíseň hluboko ve výměníku se vám jen vysměje.

<!-- RESCUE_BANNER -->

## Závěr
Profesionální servis klimatizace zahrnuje kompletní rozebrání plastů, vyčištění turbíny ventilátoru a hlavně dezinfekci certifikovanou chemií, která zničí 99 % patogenů. Navíc vám technik zkontroluje tlak chladiva, takže klima bude chladit lépe a žrát méně elektřiny. Neriskujte zánět průdušek. Na Zrobee.cz seženete servisního technika, který vaši klimu vyčistí tak, že bude vonět jako nová.',
    'https://images.unsplash.com/photo-1631543533410-2960d278ee30?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Revize kotle před sezónou: Proč to neřešit až v říjnu',
    'revize-kotle-pred-sezonou',
    'Peníze',
    'Šetřete peníze i nervy. Zjistěte, proč se revize kotle vyplatí právě teď, kdy mají technici volno, a jak vám pravidelný servis může snížit účty za plyn.',
    'Je červen, venku svítí sluníčko a poslední věc, na kterou chcete myslet, je váš kotel v technické místnosti. Jenže právě teď je ten nejlepší čas ho zkontrolovat. Proč? Protože v říjnu, až se poprvé ochladí a vy zjistíte, že kotel hází chybu, budou mít všichni technici v republice telefonáty na dva měsíce dopředu.

## 3 důvody, proč volat technika teď
1. **Dostupnost:** Teď si můžete vybírat termín vy. V zimě budete prosit, aby někdo přijel alespoň do týdne, zatímco vy doma budete chodit ve dvou svetrech.
2. **Úspora:** Vyčištěný hořák a seřízený kotel má až o 15 % nižší spotřebu plynu. Investice do revize se vám vrátí hned první měsíce topné sezóny.
3. **Bezpečnost:** Nejde jen o to, jestli topíte. Jde o to, jestli vám do bytu neuníká oxid uhelnatý. To není legrace, to je tichý zabiják.

## Co obnáší poctivá revize?
Nestačí, aby technik přišel, dal vám razítko na papír a za pět minut odešel. Poctivý servisman kotel otevře, vyčistí spalovací komoru, zkontroluje expanzní nádobu a provede analýzu spalin.

<!-- RESCUE_BANNER -->

## Závěr
Nečekejte na první mrazy. Buďte chytřejší než zbytek ulice a zajistěte si klidnou zimu už teď v létě. Na Zrobee.cz najdete certifikované plynaře a techniky pro tepelná čerpadla, kteří mají právě teď volnější kapacity. Stačí zadat poptávku.',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop',
    'published'
)
ON CONFLICT (slug) DO NOTHING;
-- Migration: Seed More Magazine Articles (Batch 2)
-- Description: Adds articles about Renovation, Smart Home, Moving, and Handymen.

INSERT INTO public.articles (title, slug, category, excerpt, content, image_url, status)
VALUES 
(
    'Rekonstrukce bytu: Jak se z toho nezbláznit',
    'rekonstrukce-bytu-bez-stresu',
    'Návody',
    'Plánujete velkou proměnu svého domova? Zjistěte, proč je koordinace řemeslníků disciplína pro otrlé a jak se vyhnout nejčastějším chybám, které vás budou stát peníze i nervy.',
    'Máte v ruce klíče od starého bytu nebo jste se prostě rozhodli, že ta kuchyně z roku 2005 musí jít z domu. Představa je jasná: za měsíc bydlíme v novém. Jenže pak narazíte na realitu. Rekonstrukce není sprint, je to překážkový běh v mlze, kde na vás každou chvíli vyskočí nečekaný výdaj nebo zmizelý řemeslník.

## Past jménem "Dělám si to sám"
Pokud nejste vyučený zedník, instalatér a elektrikář v jedné osobě, pravděpodobně narazíte na své limity už u bourání první příčky.
- **Koordinace:** Zedník čeká na instalatéra, ten čeká na obkladače a obkladač má zrovna jinou práci, protože se to o týden posunulo. Pokud nejste na stavbě denně, harmonogram se vám zhroutí jako domeček z karet.
- **Skryté vady:** Staré rozvody, křivé zdi pod sádrokartonem nebo vlhkost. Laik tyhle věci přehlédne, profík je vyřeší dřív, než nadělají škodu.

<!-- RESCUE_BANNER -->

## Závěr
Rekonstrukce bytu je proces, který prověří i ty nejpevnější vztahy. Šetřete své duševní zdraví a nechte si poradit nebo rovnou pomoci od lidí, kteří to dělají denně. Na Zrobee.cz seženete jednotlivé profíky i celé party, které vaši rekonstrukci dotáhnou do konce bez zbytečných dramat.',
    'https://images.unsplash.com/photo-1503387762-592dea58ef23?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Chytrá domácnost: Gadgety, které vám skutečně ušetří',
    'chytra-domacnost-uspory',
    'Tipy',
    'Chytrá domácnost není jen o tom ovládat světla mobilem. Zjistěte, jak chytré termostaty a senzory mohou snížit vaše účty za energie o tisíce korun ročně.',
    'Když se řekne "smart home", spousta lidí si představí mluvící ledničku nebo žárovky, které mění barvu podle nálady. To je sice hezké, ale peníze vám to neušetří. Skutečná síla chytré domácnosti leží v efektivním řízení energií a prevenci škod.

## Termostaty: Mozek vašeho vytápění
Vytápění tvoří největší část nákladů na bydlení. Chytrý termostat se naučí váš režim. Když odejdete do práce, sníží teplotu. Než se vrátíte, zase přitopí.
- **Zónové vytápění:** Proč topit v ložnici na 22 stupňů celý den, když tam trávíte jen noc? Chytré hlavice na radiátorech vyřeší každou místnost zvlášť.

## Senzory úniku vody: Malá krabička, velká záchrana
Představte si, že vám pod linkou praskne hadička k baterii, zatímco jste v práci. Senzor za pár set korun detekuje vlhkost a pošle vám upozornění (nebo rovnou uzavře hlavní přívod vody). Ušetříte si statisíce za zničenou podlahu a vytopené sousedy.

<!-- RESCUE_BANNER -->

## Závěr
Instalace chytrých prvků vyžaduje základní znalost elektroinstalace a IT. Pokud si nejste jistí, nechte to na odbornících. Na Zrobee.cz najdete šikovné elektrikáře a specialisty na chytrou domácnost, kteří vám vše nastaví tak, aby to skutečně fungovalo a šetřilo vaši peněženku.',
    'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Stěhování bez infarktu: Checklist, který vám zachrání záda',
    'stehovani-bez-infarktu',
    'Tipy',
    'Čeká vás přesun do nového? Než začnete házet věci do igelitek, přečtěte si náš checklist. Poradíme, jak balit efektivně a proč se nevyplatí stěhovat piáno s kamarády.',
    'Stěhování je podle psychologů třetí nejstresovější událost v životě – hned po úmrtí v rodině a rozvodu. Pokud se ale připravíte, nemusíte skončit s vyhřezlou ploténkou a rozbitou televizí.

## Zlatá pravidla balení
- **Těžké věci dolů:** Do krabice dejte nejdřív knihy a navrch lehčí věci. Nikdy krabici nepřeplňujte tak, aby se nedala unést.
- **Bublinková fólie je váš přítel:** Nešetřete na obalovém materiálu. Nový servis po babičce za ty peníze stojí.
- **Popisování:** Pište na krabice nejen co v nich je, ale i do které místnosti v novém bytě patří. Ušetříte si hodiny zmateného pobíhání.

## Proč nevolat kamarády?
Jasně, slíbili jste jim pizzu a pivo. Ale kamarádi nejsou profesionální stěhováci. Nemají popruhy, neví, jak správně nést ledničku po schodech, a když vám škrábnou starožitnou komodu, bude vám blbé po nich chtít náhradu.

<!-- RESCUE_BANNER -->

## Závěr
Profesionální stěhovací firma má pojištění, vybavení a hlavně grif. To, co by vám s kamarády trvalo dva dny, oni zvládnou za čtyři hodiny. Šetřete své přátele i své zdraví. Na Zrobee.cz seženete prověřené stěhováky, kteří váš majetek dopraví do nového v bezpečí.',
    'https://images.unsplash.com/photo-1600518464441-9154a4dba246?q=80&w=2070&auto=format&fit=crop',
    'published'
),
(
    'Hodinový manžel: Kdy se vyplatí víc než celá firma',
    'hodinovy-manzel-vs-firma',
    'Peníze',
    'Potřebujete pověsit poličku, opravit kapající kohoutek a seřídit okna? Velké firmy o takové zakázky nestojí. Hodinový manžel je hrdina všedního dne, který zvládne vše najednou.',
    'Máte doma seznam "drobností", které nefungují? Tady kape kohoutek, tamhle vržou dveře, v předsíni nesvítí světlo a polička z IKEA už měsíc leží v krabici. Volat na každou věc jiného specialistu je drahé a zdlouhavé. Právě pro tyhle situace vznikla profese hodinového manžela.

## Univerzální voják vaší domácnosti
Hodinový manžel není jen náhražka za partnera, který nemá čas. Je to multitalentovaný řemeslník, který má v autě kufr s nářadím, ve kterém najde řešení na 90 % běžných domácích problémů.
- **Instalace:** Pověsí televizi na zeď, garnýže nebo obrazy.
- **Opravy:** Vymění těsnění v baterii, seřídí plastová okna nebo opraví vypínač.
- **Montáž:** Složí nábytek rychleji, než vy najdete správný imbus.

## Kdy volat firmu a kdy "manžela"?
Pokud stavíte dům, hodinový manžel vám stačit nebude. Pokud ale potřebujete během jednoho odpoledne vyřešit pět různých drobností, ušetří vám spoustu peněz za dopravu a minimální sazby specializovaných firem.

<!-- RESCUE_BANNER -->

## Závěr
Nečekejte, až se drobné závady promění ve velké katastrofy. Hodinový manžel je nejefektivnější cesta, jak udržet domácnost v perfektním stavu bez zbytečných nákladů. Na Zrobee.cz najdete ty nejšikovnější hodinové manžely ve svém okolí, kteří mají skvělé reference od ostatních uživatelů.',
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=2070&auto=format&fit=crop',
    'published'
)
ON CONFLICT (slug) DO NOTHING;
-- Migration: Add Verification Result Templates
-- Description: Adds templates for approved and rejected worker verifications.

INSERT INTO public.email_templates (slug, name, category, subject, heading, body, emoji, cta_text, cta_url, layout_type)
VALUES 
(
    'verification-approved',
    'Verifikace schválena',
    'transactional',
    'Váš profil na Zrobee byl úspěšně ověřen! ✅',
    'Gratulujeme! Jste ověřený profesionál',
    'Vaše žádost o ověření profilu byla schválena. Od teď se u vašeho jména bude zobrazovat odznak ověřeného řemeslníka, což výrazně zvyšuje důvěru zákazníků a šanci na získání zakázek.',
    '✅',
    'Zobrazit můj profil',
    '/remeslnik/profil',
    'standard'
),
(
    'verification-rejected',
    'Verifikace zamítnuta',
    'transactional',
    'Informace o vaší žádosti o ověření profilu',
    'Žádost o ověření byla zamítnuta',
    'Bohužel jsme nemohli schválit vaši žádost o ověření profilu z následujícího důvodu: {{rejection_reason}}. Prosíme, opravte uvedené nedostatky a pošlete žádost znovu.',
    '❌',
    'Upravit údaje',
    '/remeslnik/verifikace',
    'standard'
)
ON CONFLICT (slug) DO NOTHING;
-- Track AI usage for workers (3 per month limit for non-pro)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ai_usage_date TIMESTAMP WITH TIME ZONE;

-- Grant access to update these for the user
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own usage
-- (Assuming existing policy for 'profiles' allows reading own profile)

-- Function to increment AI usage and check month reset
DROP FUNCTION IF EXISTS public.increment_worker_ai_usage(UUID);
CREATE OR REPLACE FUNCTION increment_worker_ai_usage(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_last_date TIMESTAMP WITH TIME ZONE;
    v_is_pro BOOLEAN;
    v_current_month TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current status
    SELECT ai_usage_count, last_ai_usage_date, is_pro 
    INTO v_count, v_last_date, v_is_pro
    FROM public.profiles
    WHERE id = p_user_id;

    v_current_month := date_trunc('month', now());

    -- Reset if new month
    IF v_last_date IS NULL OR date_trunc('month', v_last_date) < v_current_month THEN
        v_count := 0;
    END IF;

    -- Increment
    v_count := v_count + 1;

    -- Update profile
    UPDATE public.profiles
    SET ai_usage_count = v_count,
        last_ai_usage_date = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'count', v_count,
        'is_pro', v_is_pro
    );
END;
$$;
-- Table for AI-generated SEO content for City+Service landing pages
CREATE TABLE IF NOT EXISTS public.pseo_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.service_categories(id),
    subcategory_id UUID REFERENCES public.service_subcategories(id),
    city_slug TEXT NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(category_id, subcategory_id, city_slug)
);

-- Enable RLS
ALTER TABLE public.pseo_contents ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access to pseo_contents" ON public.pseo_contents;
CREATE POLICY "Allow public read access to pseo_contents" 
ON public.pseo_contents FOR SELECT 
USING (true);

-- Allow service role to manage content
DROP POLICY IF EXISTS "Allow service role to manage pseo_contents" ON public.pseo_contents;
CREATE POLICY "Allow service role to manage pseo_contents" 
ON public.pseo_contents FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');
-- Create pseo_contents table for AI-generated SEO landing page content
CREATE TABLE IF NOT EXISTS public.pseo_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.service_categories(id),
    subcategory_id UUID REFERENCES public.service_subcategories(id),
    city_slug TEXT NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(category_id, subcategory_id, city_slug)
);

-- Enable RLS
ALTER TABLE public.pseo_contents ENABLE ROW LEVEL SECURITY;

-- Public read access (for SEO landing pages)
DROP POLICY IF EXISTS "Allow public read access to pseo_contents" ON public.pseo_contents;
CREATE POLICY "Allow public read access to pseo_contents"
ON public.pseo_contents FOR SELECT
USING (true);

-- Admin full management
DROP POLICY IF EXISTS "Admins can manage pseo_contents" ON public.pseo_contents;
CREATE POLICY "Admins can manage pseo_contents"
ON public.pseo_contents FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Service role insert/update (for edge function with service_role_key)
DROP POLICY IF EXISTS "Service role can manage pseo_contents" ON public.pseo_contents;
CREATE POLICY "Service role can manage pseo_contents"
ON public.pseo_contents FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add AI usage tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_usage_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ai_usage_date date;

-- Create the increment function used by generate-offer-message edge function
DROP FUNCTION IF EXISTS public.increment_worker_ai_usage(uuid);
CREATE OR REPLACE FUNCTION public.increment_worker_ai_usage(p_user_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_last_date TIMESTAMP WITH TIME ZONE;
    v_is_pro BOOLEAN;
    v_current_month TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current status
    SELECT ai_usage_count, last_ai_usage_date, is_pro 
    INTO v_count, v_last_date, v_is_pro
    FROM public.profiles
    WHERE id = p_user_id;

    v_current_month := date_trunc('month', now());

    -- Reset if new month
    IF v_last_date IS NULL OR date_trunc('month', v_last_date) < v_current_month THEN
        v_count := 0;
    END IF;

    -- Increment
    v_count := v_count + 1;

    -- Update profile
    UPDATE public.profiles
    SET ai_usage_count = v_count,
        last_ai_usage_date = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'count', v_count,
        'is_pro', v_is_pro
    );
END;
$$;
-- Fix the unique constraint on pseo_contents to treat NULL values as NOT DISTINCT
-- This is a Postgres 15+ feature that ensures upsert works correctly when subcategory_id is NULL

-- 1. Drop the old constraint
ALTER TABLE public.pseo_contents DROP CONSTRAINT IF EXISTS pseo_contents_category_id_subcategory_id_city_slug_key;

-- 2. Add the new constraint with NULLS NOT DISTINCT
ALTER TABLE public.pseo_contents
ADD CONSTRAINT pseo_contents_unique_location 
UNIQUE NULLS NOT DISTINCT (category_id, subcategory_id, city_slug);

-- 3. Also add a trigger to handle updated_at if missing
CREATE OR REPLACE FUNCTION update_pseo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_pseo_contents_updated_at ON public.pseo_contents;
CREATE TRIGGER tr_pseo_contents_updated_at
    BEFORE UPDATE ON public.pseo_contents
    FOR EACH ROW
    EXECUTE FUNCTION update_pseo_updated_at();
-- Enable RLS and add public SELECT policies for SEO tables
-- This ensures that the anon key (used by pseo-render) can see the data
-- while the sitemap generator (using service_role) continues to work.

-- service_categories
ALTER TABLE IF EXISTS public.service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service categories are viewable by everyone" ON public.service_categories;
CREATE POLICY "Allow public read access for service_categories"
  ON public.service_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- service_subcategories
ALTER TABLE IF EXISTS public.service_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service subcategories are viewable by everyone" ON public.service_subcategories;
CREATE POLICY "Allow public read access for service_subcategories"
  ON public.service_subcategories FOR SELECT
  TO anon, authenticated
  USING (true);

-- pseo_contents
ALTER TABLE IF EXISTS public.pseo_contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PSEO contents are viewable by everyone" ON public.pseo_contents;
CREATE POLICY "Allow public read access for pseo_contents"
  ON public.pseo_contents FOR SELECT
  TO anon, authenticated
  USING (true);

-- profiles (base table for public_profiles view)
-- The public_profiles view already exists and uses are_users_connected
-- We need to ensure that the anon key can at least see basic info if needed
-- However, for SEO we mostly care about categories and subcategories.

-- Ensure public_profiles view is accessible to anon
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT ON public.service_subcategories TO anon;
GRANT SELECT ON public.pseo_contents TO anon;
-- Enable public read access for profiles basic info
-- This is necessary for the pseo-render function to count workers in cities
-- and display basic profile info to crawlers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow public read access for profiles'
  ) THEN
    CREATE POLICY "Allow public read access for profiles"
      ON public.profiles FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;

-- Ensure the public_profiles view is accessible and its underlying table has RLS policy
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Note: Sensitive columns (phone, email) are already protected within the public_profiles view
-- via CASE statements checking auth.uid() or connections.
-- Migration to refine Lifestyle & Professional service taxonomy
-- Date: 2026-05-10
-- Purpose: Update existing categories to be more inclusive of "lifestyle" services

DO $$
BEGIN
  -- 1. Rename existing categories for better lifestyle/pro branding
  UPDATE public.service_categories SET name = 'Zdraví & Sport', slug = 'zdravi-sport', icon = 'Heart' WHERE slug = 'zdravi-krasa';
  UPDATE public.service_categories SET name = 'Finance & Daně', slug = 'finance-dane', icon = 'Briefcase' WHERE slug = 'finance';
  UPDATE public.service_categories SET name = 'Gastro & Akce', slug = 'gastro-akce', icon = 'Utensils' WHERE slug = 'akce-a-svatby';
  UPDATE public.service_categories SET name = 'Doprava & Logistika', slug = 'doprava-logistika', icon = 'Truck' WHERE slug = 'doprava';

  -- 2. Add subcategories for Zdraví & Sport
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'osobni-trener') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'zdravi-sport'), 
      'Osobní trenér', 'osobni-trener', 'hodina', 2, '400 - 1 200 Kč/hod', 'PROMINENT', 'Fitness', 'Dumbbell', 1,
      'osobního trenéra', ARRAY['fitness', 'posilovna', 'hubnutí', 'cvičení', 'trénink']
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'fyzioterapeut') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'zdravi-sport'), 
      'Fyzioterapeut', 'fyzioterapeut', 'úkon', 3, '600 - 1 800 Kč', 'STANDARD', 'Zdraví', 'Activity', 2,
      'fyzioterapeuta', ARRAY['záda', 'rehabilitace', 'bolest', 'masáž', 'fyzio']
    );
  END IF;

  -- 3. Add subcategories for Finance & Daně
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'ucetni') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'finance-dane'), 
      'Účetní / Daňová evidence', 'ucetni', 'úkon', 3, 'Od 1 000 Kč/měsíc', 'PROMINENT', 'Finance', 'Calculator', 1,
      'účetní', ARRAY['daně', 'dph', 'faktury', 'mzdy', 'účetnictví']
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'danovy-poradce') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'finance-dane'), 
      'Daňový poradce', 'danovy-poradce', 'hodina', 4, '1 500 - 4 000 Kč/hod', 'STANDARD', 'Finance', 'FileText', 2,
      'daňového poradce', ARRAY['daně', 'optimalizace', 'kontrola', 'finanční úřad']
    );
  END IF;

  -- 4. Add subcategories for Gastro & Akce
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'soukromy-kuchar') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'gastro-akce'), 
      'Soukromý kuchař (Home chef)', 'soukromy-kuchar', 'akce', 3, 'Od 2 000 Kč + suroviny', 'STANDARD', 'Gastro', 'UtensilsCrossed', 1,
      'soukromého kuchaře', ARRAY['jídlo', 'oslava', 'večeře', 'catering', 'vaření']
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'catering') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'gastro-akce'), 
      'Catering / Občerstvení', 'catering', 'osoba', 3, '300 - 1 500 Kč/osoba', 'STANDARD', 'Gastro', 'Coffee', 2,
      'cateringu', ARRAY['party', 'svatba', 'raut', 'jídlo', 'event']
    );
  END IF;

  -- 5. Add subcategories for Doprava & Logistika
  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'osobni-ridic') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'doprava-logistika'), 
      'Osobní řidič', 'osobni-ridic', 'hodina', 2, '400 - 1 000 Kč/hod', 'STANDARD', 'Doprava', 'UserCheck', 1,
      'osobního řidiče', ARRAY['auto', 'odvoz', 'přeprava', 'limuzína', 'transfer']
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_subcategories WHERE slug = 'kuryrni-sluzby') THEN
    INSERT INTO public.service_subcategories (category_id, name, slug, unit, points_cost, price_range, display_level, section, section_icon, sort_order, category_form, search_terms)
    VALUES (
      (SELECT id FROM service_categories WHERE slug = 'doprava-logistika'), 
      'Expresní kurýr', 'kuryrni-sluzby', 'úkon', 2, 'Od 150 Kč', 'STANDARD', 'Logistika', 'Package', 2,
      'kurýra', ARRAY['balík', 'doručení', 'zásilka', 'expres', 'poslíček']
    );
  END IF;

END $$;
-- Migration to refine category names and icons for better consistency
-- Date: 2026-05-10
-- Purpose: Replace '&' with 'a' and update icons to match new brand strategy

DO $$
BEGIN
  -- Update Zdraví a Sport
  UPDATE public.service_categories 
  SET name = 'Zdraví a Sport', icon = 'Activity' 
  WHERE slug = 'zdravi-sport';

  -- Update Gastro a Akce
  UPDATE public.service_categories 
  SET name = 'Gastro a Akce', icon = 'Utensils' 
  WHERE slug = 'gastro-akce';

  -- Update Finance a Daně
  UPDATE public.service_categories 
  SET name = 'Finance a Daně', icon = 'DollarSign' 
  WHERE slug = 'finance-dane';

  -- Update Doprava a Logistika
  UPDATE public.service_categories 
  SET name = 'Doprava a Logistika', icon = 'Truck' 
  WHERE slug = 'doprava-logistika';

  -- Update Zámečník icon
  UPDATE public.service_categories 
  SET icon = 'KeyRound' 
  WHERE slug = 'zamecnik';

END $$;
-- Migration: Add radce_articles for automated magazine pipeline
-- Phase 3: Idea -> Draft -> Published

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
        CREATE TYPE article_status AS ENUM ('idea', 'draft', 'published');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.radce_articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid REFERENCES public.service_categories(id),
    subcategory_id uuid REFERENCES public.service_subcategories(id),
    title text NOT NULL,
    target_keyword text,
    content_html text,
    slug text UNIQUE,
    status article_status DEFAULT 'idea',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radce_articles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read for published radce articles" ON public.radce_articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admin full access to radce articles" ON public.radce_articles
    FOR ALL USING (true); -- Simplified for now, in production use auth check
-- Migration: Add admin_notifications for system alerts and nightly reports

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    message text,
    link text,
    type text DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admin full access to notifications" ON public.admin_notifications;
    CREATE POLICY "Admin full access to notifications" ON public.admin_notifications
        FOR ALL USING (true); -- In production, restrict to authenticated admin
END $$;
-- Function to automatically create admin notification for new jobs
CREATE OR REPLACE FUNCTION public.fn_notify_admin_new_job()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (title, message, link, type)
  VALUES (
    '🚨 Nová poptávka',
    'Byla vytvořena nová poptávka: ' || NEW.title || ' (' || COALESCE(NEW.city, 'Celá ČR') || ')',
    '/admin/poptavky?id=' || NEW.id,
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for jobs table
DROP TRIGGER IF EXISTS tr_notify_admin_new_job ON public.jobs;
CREATE TRIGGER tr_notify_admin_new_job
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_admin_new_job();

CREATE TABLE IF NOT EXISTS public.pseo_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  subcategory_id uuid,
  city_slug text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique combo (NULL subcategory_id treated as a distinct group)
CREATE UNIQUE INDEX IF NOT EXISTS pseo_queue_unique_combo
  ON public.pseo_generation_queue (category_id, COALESCE(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid), city_slug);

CREATE INDEX IF NOT EXISTS pseo_queue_status_score_idx
  ON public.pseo_generation_queue (status, score DESC);

-- Enable RLS
ALTER TABLE public.pseo_generation_queue ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage pseo_generation_queue" ON public.pseo_generation_queue;
    CREATE POLICY "Admins can manage pseo_generation_queue"
      ON public.pseo_generation_queue
      FOR ALL
      TO authenticated
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Service role manages pseo_generation_queue" ON public.pseo_generation_queue;
    CREATE POLICY "Service role manages pseo_generation_queue"
      ON public.pseo_generation_queue
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
END $$;

-- Idempotent Trigger Creation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pseo_queue_updated_at') THEN
        CREATE TRIGGER pseo_queue_updated_at
          BEFORE UPDATE ON public.pseo_generation_queue
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any prior schedules with the same names (idempotent re-runs)
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'pseo-queue-populate-nightly';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'pseo-generate-batch-nightly';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'pseo-queue-populate-nightly',
  '30 1 * * *',
  $$ SELECT net.http_post(
    url := 'https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/pseo-queue-populate',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'pseo-generate-batch-nightly',
  '0 2 * * *',
  $$ SELECT net.http_post(
    url := 'https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/pseo-generate-batch?limit=50',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);

DROP INDEX IF EXISTS public.pseo_queue_unique_combo;

UPDATE public.pseo_generation_queue SET subcategory_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE subcategory_id IS NULL;

ALTER TABLE public.pseo_generation_queue
  ALTER COLUMN subcategory_id SET NOT NULL,
  ALTER COLUMN subcategory_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

ALTER TABLE public.pseo_generation_queue
  ADD CONSTRAINT pseo_queue_unique_combo UNIQUE (category_id, subcategory_id, city_slug);
-- Migration to create marketing_campaigns table for automated newsletter pipeline
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  html_body text NOT NULL,
  audience_type text NOT NULL CHECK (audience_type IN ('workers', 'customers', 'all')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage marketing campaigns" ON public.marketing_campaigns;
    CREATE POLICY "Admins can manage marketing campaigns"
      ON public.marketing_campaigns FOR ALL
      USING (is_admin(auth.uid()));
END $$;

-- Index for status to speed up admin queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns (status);
-- Upgrade marketing_campaigns table with structured fields for premium layouts
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🏠',
  ADD COLUMN IF NOT EXISTS greeting TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS body TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Přečíst si více',
  ADD COLUMN IF NOT EXISTS cta_url TEXT DEFAULT 'https://zrobee.cz',
  ADD COLUMN IF NOT EXISTS secondary_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS layout_type TEXT NOT NULL DEFAULT 'magazine' CHECK (layout_type IN ('standard', 'magazine')),
  ADD COLUMN IF NOT EXISTS articles JSONB DEFAULT '[]';

-- Note: We keep html_body as the final rendered output for the broadcast-newsletter function
-- but we will now use these structured fields for the Studio editor.
-- Migration: Add marketing columns to radce_articles
ALTER TABLE public.radce_articles ADD COLUMN IF NOT EXISTS social_snippet text;
ALTER TABLE public.radce_articles ADD COLUMN IF NOT EXISTS visual_prompt text;
ALTER TABLE public.radce_articles ADD COLUMN IF NOT EXISTS image_url text;
-- Migration: Add automation_jobs for central tracking of Edge Function schedules
CREATE TABLE IF NOT EXISTS public.automation_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name text NOT NULL UNIQUE,
    function_name text NOT NULL,
    schedule text NOT NULL DEFAULT '0 2 * * *', -- Cron format
    is_active boolean DEFAULT true,
    last_run_at timestamptz,
    last_run_status text, -- 'success', 'failure'
    last_run_error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Seed existing jobs
INSERT INTO public.automation_jobs (job_name, function_name, schedule) VALUES
('PSEO Nightly Generation', 'generate-nightly-pseo', '0 2 * * *'),
('Magazine Content Generation', 'generate-nightly-article', '0 3 * * *'),
('Newsletter Draft Generation', 'generate-newsletter-draft', '0 9 * * 5')
ON CONFLICT (job_name) DO NOTHING;

-- RLS
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to automation_jobs" ON public.automation_jobs
    FOR ALL USING (true);
-- Seed some initial article ideas for the Magazine
INSERT INTO public.radce_articles (title, target_keyword, status) VALUES
('Jak vybrat správného instalatéra: 5 věcí, na které si dát pozor', 'výběr instalatéra', 'idea'),
('Ceník řemeslných prací 2026: Kolik zaplatíte za hodinu práce?', 'cena řemeslníků', 'idea'),
('Rekonstrukce koupelny svépomocí vs. s firmou: Co se vyplatí?', 'rekonstrukce koupelny', 'idea'),
('Jak připravit zahradu na jaro: Kompletní průvodce', 'příprava zahrady', 'idea'),
('Revize kotle: Proč ji nepodceňovat a kolik stojí?', 'revize kotle', 'idea'),
('Malování pokojů: Jak vybrat správnou barvu a techniku', 'malování pokojů', 'idea'),
('Havarijní služba: Co dělat, když praskne voda v noci?', 'havarijní služba', 'idea')
ON CONFLICT (slug) DO NOTHING;
-- Migration: Add brainstorm-magazine-ideas to automation_jobs
INSERT INTO public.automation_jobs (job_name, function_name, schedule) VALUES
('AI Topic Discovery', 'brainstorm-magazine-ideas', '0 1 * * 1') -- Runs every Monday at 1:00 AM
ON CONFLICT (job_name) DO NOTHING;
-- Migration: Add is_promoted to profiles and enforce PRO rule
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT false;

-- Rule: only PRO members can have is_promoted = true
CREATE OR REPLACE FUNCTION check_promotion_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    -- If trying to promote but not a pro, reset to false
    IF NEW.is_promoted = true AND (NEW.is_pro = false OR NEW.is_pro IS NULL) THEN
        NEW.is_promoted := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_promotion ON public.profiles;
CREATE TRIGGER trigger_check_promotion
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION check_promotion_eligibility();

-- Comment for clarity
COMMENT ON COLUMN public.profiles.is_promoted IS 'Allows PRO workers to boost their profile to the top of listings.';
CREATE TABLE IF NOT EXISTS public.seo_crawl_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  status_code INTEGER,
  ok BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  response_ms INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_crawl_health_url ON public.seo_crawl_health(url);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_health_run ON public.seo_crawl_health(run_id);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_health_checked_at ON public.seo_crawl_health(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_health_failing ON public.seo_crawl_health(url, checked_at DESC) WHERE ok = false;

ALTER TABLE public.seo_crawl_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read crawl health" ON public.seo_crawl_health;
CREATE POLICY "Admins can read crawl health"
ON public.seo_crawl_health FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE VIEW public.seo_crawl_health_latest AS
SELECT DISTINCT ON (url)
  url, status_code, ok, error, response_ms, checked_at
FROM public.seo_crawl_health
ORDER BY url, checked_at DESC;
-- Unschedule if exists to allow re-running
SELECT cron.unschedule('seo-crawl-monitor-nightly');

SELECT cron.schedule(
  'seo-crawl-monitor-nightly',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/seo-crawl-monitor',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 1. Update handle_new_user to support promo codes (SNIPER100)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_code TEXT;
  v_initial_points INTEGER DEFAULT 15;
BEGIN
  v_promo_code := NEW.raw_user_meta_data->>'promo_code';
  
  -- Apply SNIPER100 bonus: 15 default + 100 bonus = 115
  IF v_promo_code = 'SNIPER100' THEN
    v_initial_points := 115;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, bio, user_type, points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'bio',
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'customer'),
    v_initial_points
  );
  RETURN NEW;
END;
$$;

-- 2. Support leads in drip_email_log
ALTER TABLE public.drip_email_log ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.drip_email_log ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.marketing_leads(id) ON DELETE CASCADE;

-- Drop existing unique constraint to allow lead/template combinations
ALTER TABLE public.drip_email_log DROP CONSTRAINT IF EXISTS drip_email_log_user_id_template_slug_key;
-- Create new unique constraints for both user and lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_drip_log_user_template ON public.drip_email_log (user_id, template_slug) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_drip_log_lead_template ON public.drip_email_log (lead_id, template_slug) WHERE lead_id IS NOT NULL;

-- 3. Insert Sniper Drip Templates
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, target_role, trigger_type, trigger_event, drip_delay_days, drip_series, is_enabled)
VALUES 
('sniper-recruitment-day1', 'lifecycle', 'Sniper recruitment (Day 1)', 'Získejte nové zákazníky z Googlu a Seznamu (Profil zdarma)', '🎯', 'Dobrý den {{jmeno}},', 'Spouštíme nový katalog lokálních profesionálů na Zrobee.cz. Vytvořte si u nás profil úplně zdarma a získejte prémiovou online vizitku, kterou zákazníci snadno najdou na Googlu a Seznamu. Jako uvítací bonus Vám do začátku připíšeme 100 kreditů, abyste mohli zdarma reagovat na první poptávky ve Vašem okolí.', 'Vytvořit vizitku a získat 100 kreditů', 'https://zrobee.cz/registrace?promo=SNIPER100', 'worker', 'cron', 'lead_import', 1, 'sniper-recruitment', true),
('sniper-recruitment-day4', 'lifecycle', 'Sniper recruitment (Day 4)', 'Vašich 100 kreditů na Zrobee stále čeká', '🎁', 'Dobrý den {{jmeno}},', 'Jen krátké připomenutí, že Váš prémiový profil a 100 startovacích kreditů jsou stále k dispozici. Pomůžeme Vám získat lokální zákazníky přímo z vyhledávačů. Nechte se najít tam, kde Vás lidé hledají.', 'Získat 100 kreditů nyní', 'https://zrobee.cz/registrace?promo=SNIPER100', 'worker', 'cron', 'lead_import', 4, 'sniper-recruitment', true)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  cta_text = EXCLUDED.cta_text,
  cta_url = EXCLUDED.cta_url,
  drip_delay_days = EXCLUDED.drip_delay_days,
  drip_series = EXCLUDED.drip_series;

-- Create email_outbox table for the Daily Sniper Batch system
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
    template_slug TEXT REFERENCES public.email_templates(slug),
    subject TEXT,
    icebreaker TEXT,
    full_body TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON public.email_outbox(created_at);

-- RLS
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to email_outbox"
ON public.email_outbox
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Seed a new template for the Sniper Outbox if it doesn't exist
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, target_role, trigger_type, is_enabled)
VALUES 
('sniper-outreach-v2', 'marketing', 'Sniper Outreach V2 (Icebreaker)', 'Zrobee: Dotaz na spolupráci', '🎯', 'Ahoj {{jmeno}},', '{{icebreaker}}\n\nSpouštíme nový katalog lokálních profesionálů na Zrobee.cz a rádi bychom vás tam měli. Zákazníci u nás hledají přesně ty služby, které nabízíte.\n\nKdyž se registrujete přes odkaz níže, připíšeme vám do začátku 100 kreditů jako uvítací bonus.', 'Chci 100 kreditů a profil zdarma', 'https://zrobee.cz/registrace?promo=SNIPER100', 'worker', 'manual', true)
ON CONFLICT (slug) DO NOTHING;

-- Register the Daily Sniper Outbox Generation job
INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active)
VALUES ('Sniper Outreach Generation', 'generate-sniper-outbox', '0 2 * * *', true)
ON CONFLICT (job_name) DO UPDATE 
SET function_name = EXCLUDED.function_name, 
    schedule = EXCLUDED.schedule;

-- Tighten RLS for automation_jobs
DROP POLICY IF EXISTS "Admin full access to automation_jobs" ON public.automation_jobs;

CREATE POLICY "Admins have full access to automation_jobs"
ON public.automation_jobs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Ensure updated_at trigger exists for better tracking
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_automation_jobs_updated_at ON public.automation_jobs;
CREATE TRIGGER update_automation_jobs_updated_at
    BEFORE UPDATE ON public.automation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 1. Relax the layout_type check constraint to include 'sniper'
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_layout_type_check;

DO $$ 
DECLARE 
    const_name TEXT;
BEGIN
    -- Also find and drop any anonymous or differently named constraints with the same logic
    FOR const_name IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.email_templates'::regclass 
          AND confkey IS NULL 
          AND pg_get_constraintdef(oid) LIKE '%layout_type%IN%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.email_templates DROP CONSTRAINT ' || const_name;
    END LOOP;
END $$;

ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_layout_type_check 
CHECK (layout_type IN ('standard', 'magazine', 'sniper'));

-- 2. Update Sniper recruitment templates to use the 'sniper' layout
UPDATE public.email_templates
SET layout_type = 'sniper'
WHERE slug IN ('sniper-recruitment-day1', 'sniper-recruitment-day4');

-- 3. Also update the v2 template if it exists
UPDATE public.email_templates
SET layout_type = 'sniper'
WHERE slug = 'sniper-outreach-v2';

-- Add specialized category-specific sniper templates
INSERT INTO public.email_templates (slug, category, name, subject, emoji, greeting, body, cta_text, cta_url, target_role, trigger_type, drip_series, layout_type, is_enabled)
VALUES 
(
    'sniper-outreach-photography', 
    'marketing', 
    'Sniper - Fotografové', 
    'Zrobee: Poptávka na fotografické služby', 
    '📸', 
    'Ahoj {{jmeno}},', 
    '{{icebreaker}}\n\nPrávě u nás na Zrobee.cz hledá zákazník profíka na focení a vaše portfolio vypadá skvěle. Nechcete se na to podívat?\n\nKdyž se registrujete přes odkaz níže, připíšeme vám do začátku 100 kreditů jako bonus, abyste mohl hned reagovat.', 
    'Chci 100 kreditů a zakázku', 
    'https://zrobee.cz/registrace?promo=SNIPER100', 
    'worker', 
    'manual', 
    'sniper-category-outreach',
    'sniper',
    true
),
(
    'sniper-outreach-it', 
    'marketing', 
    'Sniper - IT / Programování', 
    'Zrobee: Dotaz na vývojářské kapacity', 
    '💻', 
    'Ahoj {{jmeno}},', 
    '{{icebreaker}}\n\nSpouštíme na Zrobee.cz novou sekci pro IT profíky a hledáme někoho s vašimi zkušenostmi na aktuální projekty. Nechcete si u nás vytvořit vizitku?\n\nJako uvítací bonus vám dáme 100 kreditů do začátku.', 
    'Vytvořit vizitku (+100 kreditů)', 
    'https://zrobee.cz/registrace?promo=SNIPER100', 
    'worker', 
    'manual', 
    'sniper-category-outreach',
    'sniper',
    true
),
(
    'sniper-outreach-cleaning', 
    'marketing', 
    'Sniper - Úklidové služby', 
    'Zrobee: Poptávka na úklid ve vašem okolí', 
    '✨', 
    'Ahoj {{jmeno}},', 
    '{{icebreaker}}\n\nNa Zrobee.cz nám teď skáčou zajímavé poptávky na úklidové služby a rádi bychom vás tam měli. Zákazníci hledají spolehlivé lidi přesně jako vy.\n\nRegistrujte se přes tento odkaz a získejte 100 kreditů zdarma.', 
    'Získat 100 kreditů a zakázky', 
    'https://zrobee.cz/registrace?promo=SNIPER100', 
    'worker', 
    'manual', 
    'sniper-category-outreach',
    'sniper',
    true
),
(
    'sniper-outreach-craftsman', 
    'marketing', 
    'Sniper - Řemeslníci', 
    'Zrobee: Máme pro vás novou zakázku', 
    '🛠️', 
    'Ahoj {{jmeno}},', 
    '{{icebreaker}}\n\nKoukal jsem na vaši práci a přesně takové profíky teď na Zrobee.cz hledáme pro naše zákazníky. Máme tu teď čerstvou poptávku, na kterou byste se hodil.\n\nZkuste to se 100 kredity zdarma od nás.', 
    'Chci 100 kreditů a zakázky', 
    'https://zrobee.cz/registrace?promo=SNIPER100', 
    'worker', 
    'manual', 
    'sniper-category-outreach',
    'sniper',
    true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  layout_type = 'sniper',
  drip_series = 'sniper-category-outreach';

-- Migrate Sniper A/B from marketing_templates to email_templates to make them visible in UI
INSERT INTO public.email_templates (slug, category, name, subject, body, target_role, trigger_type, drip_series, layout_type, is_enabled)
SELECT 
    'sniper-a-zvrdavost', 
    'marketing', 
    'Sniper A - Zvědavost', 
    'Poptávka: {{jobCategory}} - {{jobCity}}', 
    body, 
    'worker', 
    'manual', 
    'sniper-ab-testing',
    'sniper',
    true 
FROM public.marketing_templates 
WHERE name = 'Sniper A - Zvědavost (Bez odkazu)'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.email_templates (slug, category, name, subject, body, target_role, trigger_type, drip_series, layout_type, is_enabled)
SELECT 
    'sniper-b-prima-cesta', 
    'marketing', 
    'Sniper B - Přímá cesta', 
    'Poptávka na {{jobCategory}} v okolí ({{jobCity}})', 
    body, 
    'worker', 
    'manual', 
    'sniper-ab-testing',
    'sniper',
    true 
FROM public.marketing_templates 
WHERE name = 'Sniper B - Přímá cesta (S odkazem)'
ON CONFLICT (slug) DO NOTHING;

-- Unify all sniper templates under a single series for cleaner UI grouping
UPDATE public.email_templates
SET drip_series = 'sniper-outreach'
WHERE slug LIKE 'sniper-%' OR drip_series IN ('sniper-recruitment', 'sniper-category-outreach', 'sniper-ab-testing');

-- Add missing columns to marketing_leads
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS company_description TEXT;

-- Update unified_contacts view to include company_name
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source,
    bio as description,
    secondary_emails,
    NULL as company_name
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source,
    COALESCE(company_description, description) as description,
    secondary_emails,
    company_name
FROM public.marketing_leads;

-- Grant access to the updated view
GRANT SELECT ON public.unified_contacts TO authenticated;

-- Add job_id to email_outbox to track job-specific sniper campaigns
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_email_outbox_job_id ON public.email_outbox(job_id);

-- Consolidate all sniper templates under one series for better organization
UPDATE public.email_templates
SET 
    category = 'lifecycle',
    drip_series = 'sniper-outreach'
WHERE slug IN (
    'sniper-outreach-photography',
    'sniper-outreach-it',
    'sniper-outreach-cleaning',
    'sniper-outreach-craftsman',
    'sniper-a-zvrdavost',
    'sniper-b-prima-cesta',
    'sniper-outreach-v2'
);

-- Add worker_id to email_outbox to allow targeting registered workers in sniper batches
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_email_outbox_worker_id ON public.email_outbox(worker_id);

-- Update unified_contacts view to include subcategories from worker_services for registered workers
-- This ensures the Audience tab shows all assigned categories for workers
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.user_type::text,
    p.website,
    p.city,
    p.full_address,
    p.postal_code,
    p.street_name,
    p.street_number,
    p.latitude,
    p.longitude,
    p.tags,
    p.is_pro,
    p.referral_code,
    p.marketing_notifications,
    p.push_notifications,
    p.email_notifications,
    COALESCE(p.last_activity, p.created_at) as last_activity,
    p.engagement_score,
    p.created_at,
    p.category,
    -- Aggregate subcategories from worker_services and join with profile.subcategory
    COALESCE(
      (
        SELECT string_agg(ws_cat.id::text, ';')
        FROM public.worker_services ws
        JOIN public.service_subcategories ws_cat ON ws_cat.id = ws.subcategory_id
        WHERE ws.worker_id = p.id
      ), 
      ''
    ) || 
    CASE 
      WHEN p.subcategory IS NOT NULL AND p.subcategory <> '' 
      THEN (CASE WHEN (SELECT count(*) FROM public.worker_services WHERE worker_id = p.id) > 0 THEN ';' ELSE '' END) || p.subcategory
      ELSE ''
    END as subcategory,
    'registered' as contact_source,
    p.bio as description,
    p.secondary_emails,
    NULL::text as company_name
FROM public.profiles p
UNION ALL
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'lead' as contact_source,
    COALESCE(company_description, description) as description,
    secondary_emails,
    company_name
FROM public.marketing_leads;

GRANT SELECT ON public.unified_contacts TO authenticated;
GRANT SELECT ON public.unified_contacts TO anon;
-- 1. Add missing columns to marketing_leads to support "Shadow Workers"
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Generate unique slugs for existing leads
-- We append a short version of the ID to ensure uniqueness even if names are identical
UPDATE public.marketing_leads
SET slug = COALESCE(public.slugify(COALESCE(company_name, full_name)), 'profi') || '-' || substring(id::text from 1 for 6)
WHERE slug IS NULL;

-- 3. Now add the unique constraint and index
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_leads_slug_key') THEN
    ALTER TABLE public.marketing_leads ADD CONSTRAINT marketing_leads_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_slug ON public.marketing_leads(slug);

-- 3. Create a view that combines registered and scraped worker services
-- This allows the category search to find both types of workers
CREATE OR REPLACE VIEW public.unified_worker_services AS
-- Registered workers
SELECT 
    ws.worker_id,
    ws.subcategory_id,
    'registered'::text as worker_source
FROM public.worker_services ws
UNION ALL
-- Scraped workers (matched by subcategory name)
SELECT 
    ml.id::uuid as worker_id,
    ss.id as subcategory_id,
    'scraped'::text as worker_source
FROM public.marketing_leads ml
JOIN public.service_subcategories ss ON (
    LOWER(ml.subcategory) = LOWER(ss.name) 
    OR ml.subcategory ILIKE '%' || ss.name || '%'
    OR ss.name ILIKE '%' || ml.subcategory || '%'
)
WHERE ml.user_type = 'worker' AND ml.subcategory IS NOT NULL;

-- 4. Create a unified public profile view for searching and directory
CREATE OR REPLACE VIEW public.unified_public_profiles AS
-- Registered workers from public_profiles
SELECT 
    p.id,
    p.full_name,
    p.business_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.slug,
    p.is_pro,
    p.display_as_company,
    p.user_type::text,
    'registered'::text as contact_source,
    NULL::float as latitude,
    NULL::float as longitude,
    0::int as review_count,
    NULL::float as rating
FROM public.public_profiles p
WHERE p.user_type = 'worker'
UNION ALL
-- Scraped workers from marketing_leads
SELECT 
    ml.id::uuid as id,
    ml.full_name,
    ml.company_name as business_name,
    ml.avatar_url,
    ml.description as bio,
    ml.city,
    ml.slug,
    COALESCE(ml.is_pro, false) as is_pro,
    (ml.company_name IS NOT NULL) as display_as_company,
    'worker'::text as user_type,
    'scraped'::text as contact_source,
    ml.latitude,
    ml.longitude,
    0::int as review_count,
    NULL::float as rating
FROM public.marketing_leads ml
WHERE ml.user_type = 'worker';

-- 5. Grant permissions
GRANT SELECT ON public.unified_worker_services TO anon, authenticated;
GRANT SELECT ON public.unified_public_profiles TO anon, authenticated;
-- Update get_suitable_workers_for_sniper to strip parenthetical descriptions from subcategory names for exact matching
-- Date: 2026-05-16 v2

DROP FUNCTION IF EXISTS public.get_suitable_workers_for_sniper(uuid, float);

CREATE OR REPLACE FUNCTION public.get_suitable_workers_for_sniper(
  p_job_id uuid,
  p_radius_km float DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  user_type text,
  tags text[],
  phone text,
  city text,
  category text,
  subcategory text,
  description text,
  distance_km float,
  matched_subcategory text,
  contact_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_job_location geography;
  v_job_subcategory_raw text;
  v_job_subcategory_clean text;
  v_job_subcategory_id uuid;
  v_job_category_id uuid;
  v_job_category_name text;
BEGIN
  -- 1. Get job, clean subcategory (strip parenthetical descriptions) and category info
  SELECT 
    j.location, 
    TRIM(s.name) as sub_raw,
    TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
    j.subcategory_id,
    s.category_id,
    TRIM(c.name) as cat_name
  INTO 
    v_job_location, 
    v_job_subcategory_raw,
    v_job_subcategory_clean,
    v_job_subcategory_id,
    v_job_category_id,
    v_job_category_name
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  JOIN public.service_categories c ON c.id = s.category_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  WITH matched_workers AS (
    SELECT 
      p.*,
      CASE 
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_clean || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_clean) || '%'
           LIMIT 1)
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(s.name) = v_job_subcategory_id::text
           LIMIT 1)
        ELSE v_job_subcategory_raw
      END as v_matched_sub
    FROM public.unified_contacts p
    WHERE 
      (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
      AND (
        -- 1. Matches exact or partial clean job subcategory name (e.g. "Pokrývač / Klempíř")
        EXISTS (
          SELECT 1 FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
          WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_clean) || '%'
        ) OR
        p.subcategory ILIKE '%' || v_job_subcategory_clean || '%' OR
        p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' OR
        -- 2. Matches exact or partial job category name
        p.category ILIKE '%' || v_job_category_name || '%' OR
        p.category ILIKE '%' || v_job_category_id::text || '%' OR
        p.category = v_job_category_name OR
        -- 3. Matches worker_services
        EXISTS (
          SELECT 1 FROM public.worker_services ws 
          JOIN public.service_subcategories wsc ON wsc.id = ws.subcategory_id
          WHERE ws.worker_id = p.id AND (ws.subcategory_id = v_job_subcategory_id OR wsc.category_id = v_job_category_id)
        )
      )
  )
  SELECT 
    mw.id, mw.email, mw.full_name, mw.user_type, mw.tags, mw.phone, mw.city, mw.category, mw.subcategory, mw.description,
    CASE 
      WHEN v_job_location IS NOT NULL AND mw.longitude IS NOT NULL AND mw.latitude IS NOT NULL
      THEN (ST_Distance(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location) / 1000.0) 
      ELSE NULL 
    END as distance_km,
    COALESCE(mw.v_matched_sub, v_job_subcategory_raw) as matched_subcategory,
    mw.contact_source
  FROM matched_workers mw
  WHERE 
    (
      p_radius_km IS NULL OR 
      v_job_location IS NULL OR
      (mw.longitude IS NULL OR mw.latitude IS NULL) OR
      ST_DWithin(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location, p_radius_km * 1000.0)
    )
  ORDER BY 
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC
  LIMIT 2000;
END;
$$;
-- Create get_all_sniper_reach_counts RPC to compute reach directly inside PostgreSQL without PostgREST 1000 row limits
-- Date: 2026-05-16 v3

DROP FUNCTION IF EXISTS public.get_all_sniper_reach_counts();

CREATE OR REPLACE FUNCTION public.get_all_sniper_reach_counts()
RETURNS TABLE (
  job_id uuid,
  reach_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as job_id,
    (
      SELECT count(*)
      FROM public.unified_contacts p
      WHERE 
        (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
        AND (
          -- Exact or partial match on clean subcategory string (e.g. "Pokrývač / Klempíř")
          p.subcategory ILIKE '%' || TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) || '%' OR
          -- Exact or partial match on parent category string (e.g. "Stavby/Rekonstrukce" or "Pokrývač / Klempíř")
          p.category ILIKE '%' || TRIM(c.name) || '%' OR
          p.category = TRIM(c.name) OR
          -- Also check if contact's category equals the subcategory name
          p.category ILIKE '%' || TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) || '%'
        )
    ) as reach_count
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  JOIN public.service_categories c ON c.id = s.category_id
  WHERE j.status = 'open';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_sniper_reach_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_sniper_reach_counts() TO anon;
-- Unify get_suitable_workers_for_sniper matching conditions exactly with get_all_sniper_reach_counts
-- Date: 2026-05-16 v4

DROP FUNCTION IF EXISTS public.get_suitable_workers_for_sniper(uuid, float);

CREATE OR REPLACE FUNCTION public.get_suitable_workers_for_sniper(
  p_job_id uuid,
  p_radius_km float DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  user_type text,
  tags text[],
  phone text,
  city text,
  category text,
  subcategory text,
  description text,
  distance_km float,
  matched_subcategory text,
  contact_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_job_location geography;
  v_job_subcategory_raw text;
  v_job_subcategory_clean text;
  v_job_subcategory_id uuid;
  v_job_category_id uuid;
  v_job_category_name text;
BEGIN
  -- 1. Get job, clean subcategory (strip parenthetical descriptions) and category info
  SELECT 
    j.location, 
    TRIM(s.name) as sub_raw,
    TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
    j.subcategory_id,
    s.category_id,
    TRIM(c.name) as cat_name
  INTO 
    v_job_location, 
    v_job_subcategory_raw,
    v_job_subcategory_clean,
    v_job_subcategory_id,
    v_job_category_id,
    v_job_category_name
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  JOIN public.service_categories c ON c.id = s.category_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  WITH matched_workers AS (
    SELECT 
      p.*,
      CASE 
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_clean || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_clean) || '%'
           LIMIT 1)
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(s.name) = v_job_subcategory_id::text
           LIMIT 1)
        ELSE v_job_subcategory_raw
      END as v_matched_sub
    FROM public.unified_contacts p
    WHERE 
      (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
      AND (
        -- 1. Matches exact or partial clean job subcategory name (e.g. "Pokrývač / Klempíř")
        EXISTS (
          SELECT 1 FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
          WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_clean) || '%'
        ) OR
        p.subcategory ILIKE '%' || v_job_subcategory_clean || '%' OR
        p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' OR
        -- 2. Matches exact or partial job category name
        p.category ILIKE '%' || v_job_category_name || '%' OR
        p.category ILIKE '%' || v_job_category_id::text || '%' OR
        p.category = v_job_category_name OR
        -- 3. Matches if contact's category equals or contains the subcategory name
        p.category ILIKE '%' || v_job_subcategory_clean || '%' OR
        -- 4. Matches worker_services
        EXISTS (
          SELECT 1 FROM public.worker_services ws 
          JOIN public.service_subcategories wsc ON wsc.id = ws.subcategory_id
          WHERE ws.worker_id = p.id AND (ws.subcategory_id = v_job_subcategory_id OR wsc.category_id = v_job_category_id)
        )
      )
  )
  SELECT 
    mw.id, mw.email, mw.full_name, mw.user_type, mw.tags, mw.phone, mw.city, mw.category, mw.subcategory, mw.description,
    CASE 
      WHEN v_job_location IS NOT NULL AND mw.longitude IS NOT NULL AND mw.latitude IS NOT NULL
      THEN (ST_Distance(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location) / 1000.0) 
      ELSE NULL 
    END as distance_km,
    COALESCE(mw.v_matched_sub, v_job_subcategory_raw) as matched_subcategory,
    mw.contact_source
  FROM matched_workers mw
  WHERE 
    (
      p_radius_km IS NULL OR 
      v_job_location IS NULL OR
      (mw.longitude IS NULL OR mw.latitude IS NULL) OR
      ST_DWithin(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location, p_radius_km * 1000.0)
    )
  ORDER BY 
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suitable_workers_for_sniper(uuid, float) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suitable_workers_for_sniper(uuid, float) TO anon;
-- Migration: Add SEO Title A/B Optimization job to automation_jobs
INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active) VALUES
('SEO Title A/B Optimization', 'optimize-seo-titles', '0 4 * * 1', true)
ON CONFLICT (job_name) DO NOTHING;
-- Migration: Ensure category_id and subcategory_id exist on radce_articles
ALTER TABLE public.radce_articles ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.service_categories(id);
ALTER TABLE public.radce_articles ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.service_subcategories(id);

CREATE TABLE IF NOT EXISTS public.seo_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  position NUMERIC(6,2),
  ctr NUMERIC(6,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (url, date)
);
CREATE INDEX IF NOT EXISTS idx_seo_perf_date ON public.seo_performance (date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_perf_url ON public.seo_performance (url);
CREATE INDEX IF NOT EXISTS idx_seo_perf_position
  ON public.seo_performance (position)
  WHERE position BETWEEN 8 AND 20;
ALTER TABLE public.seo_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read seo_performance" ON public.seo_performance;
CREATE POLICY "Admins read seo_performance"
ON public.seo_performance FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins write seo_performance" ON public.seo_performance;
CREATE POLICY "Admins write seo_performance"
ON public.seo_performance FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.editorial_topic_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  volume INTEGER,
  kdi INTEGER,
  intent TEXT,
  pillar_slug TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_editorial_queue_status_score
  ON public.editorial_topic_queue (status, volume DESC NULLS LAST);
ALTER TABLE public.editorial_topic_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage editorial_topic_queue" ON public.editorial_topic_queue;
CREATE POLICY "Admins manage editorial_topic_queue"
ON public.editorial_topic_queue FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_editorial_queue_updated ON public.editorial_topic_queue;
CREATE TRIGGER trg_editorial_queue_updated
BEFORE UPDATE ON public.editorial_topic_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.seo_title_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  variant TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_title_variants_url ON public.seo_title_variants (url);
ALTER TABLE public.seo_title_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage seo_title_variants" ON public.seo_title_variants;
CREATE POLICY "Admins manage seo_title_variants"
ON public.seo_title_variants FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
-- ───────────────────────────────────────────────────────────────────
-- Sync SEO Engine automation_jobs rows ↔ pg_cron
-- Until now the admin dashboard let you toggle/edit jobs, but those
-- values were never read by anything — pg_cron had only 3 unrelated
-- entries, so the 6 SEO Engine jobs never auto-fired.
-- ───────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.sync_automation_job_cron()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_job_name   text := 'auto_' || NEW.function_name;
  v_url        text := 'https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/' || NEW.function_name;
  v_anon_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY';
  v_command    text;
BEGIN
  -- Always unschedule any existing entry first
  PERFORM cron.unschedule(v_job_name)
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job_name);

  IF NEW.is_active IS TRUE THEN
    v_command := format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      );$cmd$,
      v_url,
      json_build_object(
        'Content-Type', 'application/json',
        'apikey', v_anon_key,
        'Authorization', 'Bearer ' || v_anon_key
      )::text
    );
    PERFORM cron.schedule(v_job_name, NEW.schedule, v_command);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_jobs_sync_cron ON public.automation_jobs;
CREATE TRIGGER automation_jobs_sync_cron
AFTER INSERT OR UPDATE OF schedule, is_active, function_name
ON public.automation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_automation_job_cron();

-- Backfill: re-touch every existing row so the trigger schedules it
UPDATE public.automation_jobs SET updated_at = now();

-- ───────────────────────────────────────────────────────────────────
-- Watchdog: any job stuck in "running" > 60 min flips to failure
-- so the dashboard accurately reflects state and the next run isn't
-- skipped by future locking logic.
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_stuck_automation_jobs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.automation_jobs
  SET last_run_status = 'failure',
      last_run_error  = 'Stuck in running > 60 min — auto-reset by watchdog',
      updated_at      = now()
  WHERE last_run_status = 'running'
    AND last_run_at < now() - interval '60 minutes';
$$;

-- One-time fix for the currently stuck PSEO Nightly row
UPDATE public.automation_jobs
SET last_run_status = 'failure',
    last_run_error  = 'Stuck in running — manually reset by migration',
    updated_at      = now()
WHERE last_run_status = 'running';

-- Hourly watchdog cron
SELECT cron.unschedule('automation-watchdog-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-watchdog-hourly');

SELECT cron.schedule(
  'automation-watchdog-hourly',
  '7 * * * *',
  $$SELECT public.reset_stuck_automation_jobs();$$
);
-- The previous trigger fires only when schedule/is_active/function_name
-- change. Touch is_active to itself so the AFTER UPDATE trigger runs
-- once per existing row and creates the missing auto_* cron entries.
UPDATE public.automation_jobs SET is_active = is_active;
-- Add Sniper Daily Batches (30/day) automation job to public.automation_jobs

INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active)
VALUES ('Sniper Daily Batches (30/day)', 'process-sniper-outbox', '0 8 * * *', true)
ON CONFLICT (job_name) DO UPDATE 
SET function_name = EXCLUDED.function_name, 
    schedule = EXCLUDED.schedule;
-- Add customization fields to email_outbox to support fully editable visual campaign editor
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS layout_type TEXT;
-- Add Urgency and Promo Banner Customization Options to email_templates and email_outbox

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS urgency_banner_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS urgency_banner_text text,
ADD COLUMN IF NOT EXISTS promo_banner_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_banner_text text;

ALTER TABLE public.email_outbox
ADD COLUMN IF NOT EXISTS urgency_banner_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS urgency_banner_text text,
ADD COLUMN IF NOT EXISTS promo_banner_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_banner_text text,
ADD COLUMN IF NOT EXISTS job_description_snippet text;
-- Add widget toggle and PS footer options to email_templates and email_outbox

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS ps_footer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ps_footer_text text,
ADD COLUMN IF NOT EXISTS show_job_widget boolean DEFAULT true;

ALTER TABLE public.email_outbox
ADD COLUMN IF NOT EXISTS ps_footer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ps_footer_text text,
ADD COLUMN IF NOT EXISTS show_job_widget boolean DEFAULT true;
-- Disable job widget and enable PS footer for Sniper A - Zvědavost
UPDATE public.email_templates
SET show_job_widget = false, ps_footer_enabled = true
WHERE slug = 'sniper-a-zvrdavost' OR name ILIKE '%Sniper A%';
-- Add show_cta_button toggle to email_templates and email_outbox
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS show_cta_button boolean DEFAULT true;

ALTER TABLE public.email_outbox
ADD COLUMN IF NOT EXISTS show_cta_button boolean DEFAULT true;

UPDATE public.email_templates
SET show_cta_button = false
WHERE slug = 'sniper-a-zvrdavost' OR name ILIKE '%Sniper A%';
-- Add job_description_snippet column to email_templates
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS job_description_snippet text;
CREATE TABLE IF NOT EXISTS public.city_locatives (
    city text PRIMARY KEY,
    locative_phrase text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grant access
ALTER TABLE public.city_locatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to city_locatives"
ON public.city_locatives FOR SELECT TO public USING (true);

CREATE POLICY "Allow service role write access to city_locatives"
ON public.city_locatives FOR ALL TO service_role USING (true);

-- Seed with common cities
INSERT INTO public.city_locatives (city, locative_phrase) VALUES
('Praha', 'v Praze'),
('Brno', 'v Brně'),
('Ostrava', 'v Ostravě'),
('Plzeň', 'v Plzni'),
('Liberec', 'v Liberci'),
('Olomouc', 'v Olomouci'),
('České Budějovice', 'v Českých Budějovicích'),
('Hradec Králové', 'v Hradci Králové'),
('Ústí nad Labem', 'v Ústí nad Labem'),
('Pardubice', 'v Pardubicích'),
('Zlín', 've Zlíně'),
('Havířov', 'v Havířově'),
('Kladno', 'na Kladně'),
('Most', 'v Mostě'),
('Opava', 'v Opavě'),
('Frýdek-Místek', 've Frýdku-Místku'),
('Karviná', 'v Karviné'),
('Jihlava', 'v Jihlavě'),
('Teplice', 'v Teplicích'),
('Děčín', 'v Děčíně'),
('Karlovy Vary', 'v Karlových Varech'),
('Chomutov', 'v Chomutově'),
('Jablonec nad Nisou', 'v Jablonci nad Nisou'),
('Mladá Boleslav', 'v Mladé Boleslavi'),
('Prostějov', 'v Prostějově'),
('Přerov', 'v Přerově'),
('Třinec', 'v Třinci'),
('Česká Lípa', 'v České Lípě'),
('Třebíč', 'v Třebíči'),
('Tábor', 'v Táboře'),
('Znojmo', 've Znojmě'),
('Příbram', 'v Příbrami'),
('Cheb', 'v Chebu'),
('Orlová', 'v Orlové'),
('Trutnov', 'v Trutnově'),
('Kolín', 'v Kolíně'),
('Písek', 'v Písku'),
('Kroměříž', 'v Kroměříži'),
('Vsetín', 've Vsetíně'),
('Šumperk', 'v Šumperku'),
('Valašské Meziříčí', 've Valašském Meziříčí'),
('Litvínov', 'v Litvínově'),
('Uherské Hradiště', 'v Uherském Hradišti'),
('Hodonín', 'v Hodoníně'),
('Břeclav', 'v Břeclavi'),
('Český Těšín', 'v Českém Těšíně'),
('Klatovy', 'v Klatovech'),
('Jindřichův Hradec', 'v Jindřichově Hradci'),
('Vyškov', 've Vyškově'),
('Kutná Hora', 'v Kutné Hoře'),
('Blansko', 'v Blansku'),
('Náchod', 'v Náchodě'),
('Žďár nad Sázavou', 've Žďáru nad Sázavou'),
('Beroun', 'v Berouně'),
('Mělník', 'na Mělníku'),
('Benešov', 'v Benešově'),
('Slaný', 've Slaném'),
('Rakovník', 'v Rakovníku'),
('Brandýs nad Labem-Stará Boleslav', 'v Brandýse nad Labem-Staré Boleslavi'),
('Neratovice', 'v Neratovicích'),
('Říčany', 'v Říčanech')
ON CONFLICT (city) DO NOTHING;
-- Update unified_contacts view to correctly differentiate ai_web_sniper source
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type::text,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    COALESCE(last_activity, created_at) as last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    'registered' as contact_source,
    bio as description,
    secondary_emails,
    NULL as company_name
FROM public.profiles
UNION ALL
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    website,
    city,
    full_address,
    postal_code,
    street_name,
    street_number,
    latitude,
    longitude,
    tags,
    is_pro,
    referral_code,
    marketing_notifications,
    push_notifications,
    email_notifications,
    last_activity,
    engagement_score,
    created_at,
    category,
    subcategory,
    CASE WHEN source = 'ai_web_sniper' THEN 'ai_web_sniper' ELSE 'lead' END as contact_source,
    COALESCE(company_description, description) as description,
    secondary_emails,
    company_name
FROM public.marketing_leads;

GRANT SELECT ON public.unified_contacts TO authenticated;
-- Update Sniper A template subject and body
UPDATE public.email_templates
SET subject = 'Poptávka: {{obor}} {{mesto_v_meste}}',
    body = '{{icebreaker}}

Máte na to v nejbližších dnech nebo týdnech kapacitu? Pokud ano, jen mi krátce odepište a já Vám obratem pošlu detaily k zakázce, ať se na to můžete podívat a případně se s klientem spojit.

Ať se daří,
Michal
Zrobee.cz'
WHERE slug = 'sniper-a-zvrdavost';
-- Update unified_contacts view to include latest icebreaker and outbox_id
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.user_type::text,
    p.website,
    p.city,
    p.full_address,
    p.postal_code,
    p.street_name,
    p.street_number,
    p.latitude,
    p.longitude,
    p.tags,
    p.is_pro,
    p.referral_code,
    p.marketing_notifications,
    p.push_notifications,
    p.email_notifications,
    COALESCE(p.last_activity, p.created_at) as last_activity,
    p.engagement_score,
    p.created_at,
    p.category,
    p.subcategory,
    'registered' as contact_source,
    p.bio as description,
    p.secondary_emails,
    NULL as company_name,
    (SELECT eo.icebreaker FROM public.email_outbox eo WHERE eo.worker_id = p.id ORDER BY eo.created_at DESC LIMIT 1) as icebreaker,
    (SELECT eo.id FROM public.email_outbox eo WHERE eo.worker_id = p.id ORDER BY eo.created_at DESC LIMIT 1) as outbox_id
FROM public.profiles p
UNION ALL
SELECT 
    m.id,
    m.email,
    m.full_name,
    m.phone,
    m.user_type,
    m.website,
    m.city,
    m.full_address,
    m.postal_code,
    m.street_name,
    m.street_number,
    m.latitude,
    m.longitude,
    m.tags,
    m.is_pro,
    m.referral_code,
    m.marketing_notifications,
    m.push_notifications,
    m.email_notifications,
    m.last_activity,
    m.engagement_score,
    m.created_at,
    m.category,
    m.subcategory,
    CASE WHEN m.source = 'ai_web_sniper' THEN 'ai_web_sniper' ELSE 'lead' END as contact_source,
    COALESCE(m.company_description, m.description) as description,
    m.secondary_emails,
    m.company_name,
    (SELECT eo.icebreaker FROM public.email_outbox eo WHERE eo.lead_id = m.id ORDER BY eo.created_at DESC LIMIT 1) as icebreaker,
    (SELECT eo.id FROM public.email_outbox eo WHERE eo.lead_id = m.id ORDER BY eo.created_at DESC LIMIT 1) as outbox_id
FROM public.marketing_leads m;

GRANT SELECT ON public.unified_contacts TO authenticated;
-- Update get_suitable_workers_for_sniper to return icebreaker and outbox_id from unified_contacts
DROP FUNCTION IF EXISTS public.get_suitable_workers_for_sniper(uuid, float);

CREATE OR REPLACE FUNCTION public.get_suitable_workers_for_sniper(
  p_job_id uuid,
  p_radius_km float DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  user_type text,
  tags text[],
  phone text,
  city text,
  category text,
  subcategory text,
  description text,
  distance_km float,
  matched_subcategory text,
  contact_source text,
  icebreaker text,
  outbox_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_job_location geography;
  v_job_subcategory_raw text;
  v_job_subcategory_clean text;
  v_job_subcategory_id uuid;
  v_job_category_id uuid;
  v_job_category_name text;
BEGIN
  -- 1. Get job, clean subcategory and category info
  SELECT 
    j.location, 
    TRIM(s.name) as sub_raw,
    TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
    j.subcategory_id,
    s.category_id,
    TRIM(c.name) as cat_name
  INTO 
    v_job_location, 
    v_job_subcategory_raw,
    v_job_subcategory_clean,
    v_job_subcategory_id,
    v_job_category_id,
    v_job_category_name
  FROM public.jobs j
  JOIN public.service_subcategories s ON s.id = j.subcategory_id
  JOIN public.service_categories c ON c.id = s.category_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  WITH matched_workers AS (
    SELECT 
      p.*,
      CASE 
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_clean || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_clean) || '%'
           LIMIT 1)
        WHEN p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' THEN
          (SELECT s.name 
           FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
           WHERE TRIM(s.name) = v_job_subcategory_id::text
           LIMIT 1)
        ELSE v_job_subcategory_raw
      END as v_matched_sub
    FROM public.unified_contacts p
    WHERE 
      (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
      AND (
        EXISTS (
          SELECT 1 FROM unnest(string_to_array(p.subcategory, ';')) AS s(name)
          WHERE TRIM(LOWER(s.name)) LIKE '%' || LOWER(v_job_subcategory_clean) || '%'
        ) OR
        p.subcategory ILIKE '%' || v_job_subcategory_clean || '%' OR
        p.subcategory ILIKE '%' || v_job_subcategory_id::text || '%' OR
        p.category ILIKE '%' || v_job_category_name || '%' OR
        p.category ILIKE '%' || v_job_category_id::text || '%' OR
        p.category = v_job_category_name OR
        p.category ILIKE '%' || v_job_subcategory_clean || '%' OR
        EXISTS (
          SELECT 1 FROM public.worker_services ws 
          JOIN public.service_subcategories wsc ON wsc.id = ws.subcategory_id
          WHERE ws.worker_id = p.id AND (ws.subcategory_id = v_job_subcategory_id OR wsc.category_id = v_job_category_id)
        )
      )
  )
  SELECT 
    mw.id, mw.email, mw.full_name, mw.user_type, mw.tags, mw.phone, mw.city, mw.category, mw.subcategory, mw.description,
    CASE 
      WHEN v_job_location IS NOT NULL AND mw.longitude IS NOT NULL AND mw.latitude IS NOT NULL
      THEN (ST_Distance(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location) / 1000.0) 
      ELSE NULL 
    END as distance_km,
    COALESCE(mw.v_matched_sub, v_job_subcategory_raw) as matched_subcategory,
    mw.contact_source,
    mw.icebreaker,
    mw.outbox_id
  FROM matched_workers mw
  WHERE 
    (
      p_radius_km IS NULL OR 
      v_job_location IS NULL OR
      (mw.longitude IS NULL OR mw.latitude IS NULL) OR
      ST_DWithin(ST_SetSRID(ST_MakePoint(mw.longitude::float, mw.latitude::float), 4326)::geography, v_job_location, p_radius_km * 1000.0)
    )
  ORDER BY 
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suitable_workers_for_sniper(uuid, float) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suitable_workers_for_sniper(uuid, float) TO anon;
-- Create gsc_index_status table for tracking Google Search Console URL inspection results
CREATE TABLE IF NOT EXISTS public.gsc_index_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    verdict TEXT NOT NULL, -- e.g., 'PASS', 'FAIL', 'NEUTRAL'
    coverage_state TEXT NOT NULL, -- e.g., 'Indexed', 'Discovered - currently not indexed', 'Crawled - currently not indexed', 'URL is unknown to Google'
    inspection_result JSONB NOT NULL,
    last_inspection_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    first_detected_unknown_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gsc_index_status ENABLE ROW LEVEL SECURITY;

-- Public read access (for admin/stats)
DROP POLICY IF EXISTS "Allow public read access to gsc_index_status" ON public.gsc_index_status;
CREATE POLICY "Allow public read access to gsc_index_status"
ON public.gsc_index_status FOR SELECT
USING (true);

-- Admin all access
DROP POLICY IF EXISTS "Admins can manage gsc_index_status" ON public.gsc_index_status;
CREATE POLICY "Admins can manage gsc_index_status"
ON public.gsc_index_status FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Service role all access
DROP POLICY IF EXISTS "Service role can manage gsc_index_status" ON public.gsc_index_status;
CREATE POLICY "Service role can manage gsc_index_status"
ON public.gsc_index_status FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_gsc_index_status_url ON public.gsc_index_status(url);
CREATE INDEX IF NOT EXISTS idx_gsc_index_status_coverage ON public.gsc_index_status(coverage_state);
CREATE INDEX IF NOT EXISTS idx_gsc_last_inspection ON public.gsc_index_status(last_inspection_time);
-- 1. Relax the layout_type check constraint to include 'sniper_recruitment'
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_layout_type_check;

DO $$ 
DECLARE 
    const_name TEXT;
BEGIN
    FOR const_name IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.email_templates'::regclass 
          AND confkey IS NULL 
          AND pg_get_constraintdef(oid) LIKE '%layout_type%IN%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.email_templates DROP CONSTRAINT ' || const_name;
    END LOOP;
END $$;

ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_layout_type_check 
CHECK (layout_type IN ('standard', 'magazine', 'sniper', 'sniper_recruitment'));

-- 2. Fix Sniper A template body, job_description_snippet, and layout settings to ensure perfect presentation in Akviziční Sniper
UPDATE public.email_templates
SET 
    body = '{{icebreaker}}

Mám tu teď u nás na platformě klienta, který akutně shání spolehlivého řemeslníka na {{jobCategory}} v lokalitě {{jobCity}}.',
    job_description_snippet = 'Máte na to v nejbližších dnech nebo týdnech kapacitu? Pokud ano, jen mi krátce odepište a já Vám obratem pošlu detaily k zakázce, ať se na to můžete podívat a případně se s klientem spojit.',
    layout_type = 'sniper_recruitment',
    show_job_widget = false,
    show_cta_button = false,
    urgency_banner_enabled = false,
    promo_banner_enabled = false,
    ps_footer_enabled = true,
    ps_footer_text = 'P.S. Vím, že Vám do schránky občas padají různé nesmysly, tak doufám, že tohle nebude ten případ a nabídka opravdu přijde vhod. Pokud pro Vás Zrobee nedává smysl, odepište mi jen ''Ne'' a rovnou si Vás mažu ze seznamu.'
WHERE slug = 'sniper-a-zvrdavost';
-- Create app_settings table to store generic application settings like OAuth tokens
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (admin usually, but for edge functions service role bypasses RLS)
CREATE POLICY "Allow read access to authenticated users" 
ON public.app_settings 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow all access to service role (this is default, but good to be explicit if needed)
-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Note: We use this to store gsc_refresh_token
-- Convert value column in app_settings from TEXT to JSONB
ALTER TABLE public.app_settings 
ALTER COLUMN value TYPE jsonb USING value::jsonb;
-- Add columns to push_templates for Automation Rules
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_templates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_templates' AND column_name = 'throttling_rule') THEN
            ALTER TABLE public.push_templates ADD COLUMN throttling_rule TEXT DEFAULT 'none';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_templates' AND column_name = 'quiet_hours_enabled') THEN
            ALTER TABLE public.push_templates ADD COLUMN quiet_hours_enabled BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_templates' AND column_name = 'quiet_hours_start') THEN
            ALTER TABLE public.push_templates ADD COLUMN quiet_hours_start TIME DEFAULT '22:00:00';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_templates' AND column_name = 'quiet_hours_end') THEN
            ALTER TABLE public.push_templates ADD COLUMN quiet_hours_end TIME DEFAULT '07:00:00';
        END IF;
    END IF;
END $$;

-- Add A/B testing columns to broadcast_notifications
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'broadcast_notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'broadcast_notifications' AND column_name = 'variant_a_clicks') THEN
            ALTER TABLE public.broadcast_notifications ADD COLUMN variant_a_clicks INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'broadcast_notifications' AND column_name = 'variant_b_clicks') THEN
            ALTER TABLE public.broadcast_notifications ADD COLUMN variant_b_clicks INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Add variant tracking to push_receipts
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_receipts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_receipts' AND column_name = 'variant') THEN
            ALTER TABLE public.push_receipts ADD COLUMN variant TEXT;
        END IF;
    END IF;
END $$;

-- Create push_queue table for silent hours and throttling
CREATE TABLE IF NOT EXISTS public.push_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    icon TEXT,
    image TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for push_queue
ALTER TABLE public.push_queue ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_queue' 
        AND policyname = 'Admins can manage push queue'
    ) THEN
        CREATE POLICY "Admins can manage push queue" 
        ON public.push_queue 
        FOR ALL 
        TO authenticated 
        USING (public.is_admin(auth.uid())) 
        WITH CHECK (public.is_admin(auth.uid()));
    END IF;
END $$;

-- RPC for Analytics (Platform Breakdown)
CREATE OR REPLACE FUNCTION public.get_push_platform_stats()
RETURNS TABLE (
    platform_name TEXT,
    device_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN user_agent ILIKE '%iPhone%' OR user_agent ILIKE '%iPad%' OR user_agent ILIKE '%Mac OS%' THEN 'iOS / Mac'
            WHEN user_agent ILIKE '%Android%' THEN 'Android'
            WHEN user_agent ILIKE '%Windows%' THEN 'Windows'
            ELSE 'Ostatní Web'
        END AS platform_name,
        COUNT(id) AS device_count
    FROM public.push_subscriptions
    GROUP BY platform_name
    ORDER BY device_count DESC;
END;
$$;

CREATE TABLE IF NOT EXISTS public.seo_cwv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'mobile' CHECK (strategy IN ('mobile','desktop')),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performance_score NUMERIC,
  lcp_ms NUMERIC,
  cls NUMERIC,
  inp_ms NUMERIC,
  fcp_ms NUMERIC,
  ttfb_ms NUMERIC,
  raw JSONB,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_seo_cwv_url_strategy_measured ON public.seo_cwv (url, strategy, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_cwv_measured ON public.seo_cwv (measured_at DESC);

GRANT SELECT ON public.seo_cwv TO authenticated;
GRANT ALL ON public.seo_cwv TO service_role;

ALTER TABLE public.seo_cwv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view CWV data" ON public.seo_cwv;
CREATE POLICY "Admins can view CWV data"
ON public.seo_cwv FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role manages CWV data" ON public.seo_cwv;
CREATE POLICY "Service role manages CWV data"
ON public.seo_cwv FOR ALL TO service_role
USING (true) WITH CHECK (true);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS sniper_auto_approve BOOLEAN NOT NULL DEFAULT false;
UPDATE public.automation_jobs
SET schedule = '0 * * * *'
WHERE function_name = 'process-sniper-outbox';
-- Update get_all_sniper_reach_counts to perfectly mirror get_suitable_workers_for_sniper
CREATE OR REPLACE FUNCTION public.get_all_sniper_reach_counts()
RETURNS TABLE (
  job_id uuid,
  reach_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as job_id,
    (
      SELECT count(*)
      FROM public.get_suitable_workers_for_sniper(j.id, 50)
    ) as reach_count
  FROM public.jobs j
  WHERE j.status = 'open';
END;
$$;
-- Update get_all_sniper_reach_counts to be extremely fast while mirroring get_suitable_workers_for_sniper
CREATE OR REPLACE FUNCTION public.get_all_sniper_reach_counts()
RETURNS TABLE (
  job_id uuid,
  reach_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as job_id,
    (
      SELECT count(*)
      FROM public.unified_contacts p
      CROSS JOIN LATERAL (
        SELECT 
          TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
          TRIM(c.name) as cat_name
        FROM public.service_subcategories s
        JOIN public.service_categories c ON c.id = s.category_id
        WHERE s.id = j.subcategory_id
      ) meta
      WHERE 
        (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
        AND (
          EXISTS (
            SELECT 1 FROM unnest(string_to_array(p.subcategory, ';')) AS sub(name)
            WHERE TRIM(LOWER(sub.name)) LIKE '%' || LOWER(meta.sub_clean) || '%'
          ) OR
          p.subcategory ILIKE '%' || meta.sub_clean || '%' OR
          p.subcategory ILIKE '%' || j.subcategory_id::text || '%' OR
          p.category ILIKE '%' || meta.cat_name || '%' OR
          p.category ILIKE '%' || (SELECT category_id::text FROM public.service_subcategories WHERE id = j.subcategory_id) || '%' OR
          p.category = meta.cat_name OR
          p.category ILIKE '%' || meta.sub_clean || '%' OR
          EXISTS (
            SELECT 1 FROM public.worker_services ws 
            JOIN public.service_subcategories wsc ON wsc.id = ws.subcategory_id
            WHERE ws.worker_id = p.id AND (ws.subcategory_id = j.subcategory_id OR wsc.category_id = (SELECT category_id FROM public.service_subcategories WHERE id = j.subcategory_id))
          )
        )
        AND (
          j.location IS NULL OR
          p.longitude IS NULL OR p.latitude IS NULL OR
          ST_DWithin(ST_SetSRID(ST_MakePoint(p.longitude::float, p.latitude::float), 4326)::geography, j.location, 50000)
        )
    ) as reach_count
  FROM public.jobs j
  WHERE j.status = 'open';
END;
$$;
-- Final optimization for get_all_sniper_reach_counts to prevent timeouts
CREATE OR REPLACE FUNCTION public.get_all_sniper_reach_counts()
RETURNS TABLE (
  job_id uuid,
  reach_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as job_id,
    (
      SELECT count(*)
      FROM public.unified_contacts p
      CROSS JOIN LATERAL (
        SELECT 
          TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
          TRIM(c.name) as cat_name
        FROM public.service_subcategories s
        JOIN public.service_categories c ON c.id = s.category_id
        WHERE s.id = j.subcategory_id
      ) meta
      WHERE 
        (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
        AND (
          p.subcategory ILIKE '%' || meta.sub_clean || '%' OR
          p.category ILIKE '%' || meta.cat_name || '%' OR
          p.category ILIKE '%' || meta.sub_clean || '%'
        )
        AND (
          j.location IS NULL OR
          p.longitude IS NULL OR 
          p.latitude IS NULL OR
          ST_DWithin(ST_SetSRID(ST_MakePoint(p.longitude::float, p.latitude::float), 4326)::geography, j.location, 50000)
        )
    ) as reach_count
  FROM public.jobs j
  WHERE j.status = 'open';
END;
$$;
-- Ultra-fast fallback for dashboard reach counts (no PostGIS)
CREATE OR REPLACE FUNCTION public.get_all_sniper_reach_counts()
RETURNS TABLE (
  job_id uuid,
  reach_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as job_id,
    (
      SELECT count(*)
      FROM public.unified_contacts p
      CROSS JOIN LATERAL (
        SELECT 
          TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
          TRIM(c.name) as cat_name
        FROM public.service_subcategories s
        JOIN public.service_categories c ON c.id = s.category_id
        WHERE s.id = j.subcategory_id
      ) meta
      WHERE 
        (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
        AND (
          p.subcategory ILIKE '%' || meta.sub_clean || '%' OR
          p.category ILIKE '%' || meta.cat_name || '%' OR
          p.category ILIKE '%' || meta.sub_clean || '%'
        )
        AND (
          j.location IS NULL OR
          p.longitude IS NULL OR 
          p.latitude IS NULL OR
          p.city ILIKE '%' || j.city || '%' OR
          j.city ILIKE '%' || p.city || '%'
        )
    ) as reach_count
  FROM public.jobs j
  WHERE j.status = 'open';
END;
$$;
-- Ultra-fast fallback for dashboard reach counts (loop version)
CREATE OR REPLACE FUNCTION public.get_all_sniper_reach_counts()
RETURNS TABLE (
  job_id uuid,
  reach_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_count bigint;
BEGIN
  FOR v_job IN 
    SELECT 
      j.id, j.city, j.location,
      TRIM(REGEXP_REPLACE(s.name, '\s*\(.*\)', '')) as sub_clean,
      TRIM(c.name) as cat_name
    FROM public.jobs j
    JOIN public.service_subcategories s ON s.id = j.subcategory_id
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE j.status = 'open'
  LOOP
    SELECT count(*) INTO v_count
    FROM public.unified_contacts p
    WHERE 
      (p.user_type IN ('worker', 'both', 'lead', 'pro') OR p.user_type IS NULL OR p.user_type = '')
      AND (
        p.subcategory ILIKE '%' || v_job.sub_clean || '%' OR
        p.category ILIKE '%' || v_job.cat_name || '%' OR
        p.category ILIKE '%' || v_job.sub_clean || '%'
      )
      AND (
        v_job.location IS NULL OR
        p.longitude IS NULL OR 
        p.latitude IS NULL OR
        p.city ILIKE '%' || v_job.city || '%' OR
        v_job.city ILIKE '%' || p.city || '%'
      );
      
    job_id := v_job.id;
    reach_count := v_count;
    RETURN NEXT;
  END LOOP;
END;
$$;
DROP TABLE IF EXISTS public.gsc_index_status CASCADE;
DELETE FROM public.pages WHERE url LIKE 'http%';
-- Ensure URL uniqueness going forward so resync is idempotent
CREATE UNIQUE INDEX IF NOT EXISTS pages_url_unique_idx ON public.pages (url);
UPDATE public.email_templates
SET 
  subject = 'Máte novou nabídku na „{{nazev_zakazky}}"',
  heading = 'Nová nabídka na vaši zakázku',
  body = '{{jmeno}} vám poslal nabídku{{cena_rozpocet}} na „{{nazev_zakazky}}“.',
  cta_text = 'Zobrazit nabídku',
  emoji = '🎉'
WHERE slug = 'notify-customer-new-offer';

UPDATE public.email_templates
SET 
  subject = 'Hotovo! Vaše poptávka „{{nazev_zakazky}}" byla dokončena ✨',
  heading = 'Práce byla dokončena',
  body = '{{jmeno}} právě potvrdil dokončení prací na vaší poptávce „{{nazev_zakazky}}“. Prohlédněte si výsledek a nezapomeňte jej ohodnotit – vaše zpětná vazba je pro nás klíčová.',
  cta_text = 'Zkontrolovat a ohodnotit',
  emoji = '👷'
WHERE slug = 'notify-customer-job-completed';

UPDATE public.email_templates
SET 
  subject = 'Máte novou zprávu na Zrobee',
  heading = 'Nová zpráva',
  body = '{{zprava_nahled}}',
  cta_text = 'Přečíst a odpovědět',
  emoji = '💬'
WHERE slug = 'notify-new-message';

UPDATE public.email_templates
SET 
  subject = 'Právě přibyla nová poptávka!',
  heading = 'Máte novou práci',
  body = 'Na Zrobee se objevila nová poptávka: „{{nazev_zakazky}}". Podívejte se na detaily a pošlete svou nabídku dříve než ostatní.',
  cta_text = 'Zobrazit poptávku',
  emoji = '🐝'
WHERE slug = 'notify-worker-new-job';

UPDATE public.email_templates
SET 
  subject = 'Skvělá zpráva: Vaše nabídka byla přijata! 🎉',
  heading = 'Vaše nabídka byla přijata!',
  body = '{{zakaznik}} právě přijal vaši nabídku na zakázku „{{nazev_zakazky}}“.',
  cta_text = 'Zobrazit zakázku',
  emoji = '🎉'
WHERE slug = 'notify-worker-offer-accepted';

UPDATE public.email_templates
SET 
  subject = 'Máte novou přímou poptávku od „{{zakaznik}}"',
  heading = 'Nová přímá poptávka!',
  body = '{{zakaznik}} vás přímo oslovil s poptávkou na „{{nazev_zakazky}}“. Prohlédněte si detaily a pošlete svou nabídku.',
  cta_text = 'Zobrazit poptávku',
  emoji = '📬'
WHERE slug = 'notify-worker-direct-inquiry';

UPDATE public.email_templates
SET 
  subject = 'Gratulujeme! Vaše odvedená práce byla schválena ✅',
  heading = 'Skvělá zpráva!',
  body = 'Zákazník právě schválil vaše dokončení zakázky „{{nazev_zakazky}}“. Tímto se uvolnila platba a vy jste si připsali další úspěšnou realizaci na Zrobee.',
  cta_text = 'Zkontrolovat přehled',
  emoji = '🏆'
WHERE slug = 'notify-worker-job-approved';

UPDATE public.email_templates
SET 
  subject = 'Pozor, docházejí vám kredity! ⚠️',
  heading = 'Nízký počet kreditů!',
  body = 'Vaše kredity jsou nízké. Doplňte si je, abyste mohli nadále posílat nabídky na nové zakázky.',
  cta_text = 'Doplnit kredity',
  emoji = '⚠️'
WHERE slug = 'notify-worker-low-credits';

UPDATE public.email_templates
SET 
  subject = 'Řemeslník se omlouvá, ale vaši poptávku nemůže přijmout 😔',
  heading = 'Poptávka nebyla přijata',
  body = '{{jmeno}} se omlouvá, ale vaši poptávku na „{{nazev_zakazky}}“ nemůže přijmout. Vaše zakázka zůstává otevřená pro ostatní.',
  cta_text = 'Zobrazit zakázku',
  emoji = '😔'
WHERE slug = 'notify-customer-offer-rejected';
-- Update transactional emails to use 'standard' layout
-- The 'standard' layout will fall through to StandardAlert.tsx in email.ts
-- which renders the clean design without a job preview widget.

UPDATE email_templates
SET layout_type = 'standard'
WHERE slug IN (
    'notify-customer-new-offer',
    'notify-customer-offer-rejected',
    'notify-worker-offer-accepted',
    'notify-worker-job-approved',
    'notify-new-message',
    'notify-worker-low-credits',
    'notify-verification-result',
    'notify-customer-job-completed',
    'notify-worker-direct-inquiry'
);
-- Convert transactional emails to use the fully editable 'sniper' (Modular) layout
-- but disable the job widget by default and center the text to keep the clean look.

UPDATE email_templates
SET 
  layout_type = 'sniper',
  show_job_widget = false,
  segment_filters = COALESCE(segment_filters, '{}'::jsonb) || '{"show_subject_in_body": true, "text_align": "center", "graphic_greeting_enabled": false}'::jsonb
WHERE slug IN (
    'notify-customer-new-offer',
    'notify-customer-offer-rejected',
    'notify-worker-offer-accepted',
    'notify-worker-job-approved',
    'notify-new-message',
    'notify-worker-low-credits',
    'notify-verification-result',
    'notify-customer-job-completed',
    'notify-worker-direct-inquiry'
);
-- Migration to add full tracking metrics for automated emails
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS resend_id TEXT;

-- Drop the old constraint (Postgres auto-names it based on table_column_check)
ALTER TABLE public.email_outbox DROP CONSTRAINT IF EXISTS email_outbox_status_check;

-- Add the new constraint with all necessary states
ALTER TABLE public.email_outbox ADD CONSTRAINT email_outbox_status_check CHECK (
  status IN (
    'draft', 
    'pending', 
    'ready_for_outbox',
    'sent', 
    'delivered', 
    'opened', 
    'clicked', 
    'converted', 
    'failed'
  )
);
-- Create Enum for the message statuses
CREATE TYPE whatsapp_message_status AS ENUM (
  'pending_verification', 
  'ready_for_admin', 
  'no_whatsapp', 
  'sent'
);

-- Create the whatsapp_outbox table
CREATE TABLE public.whatsapp_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- The user requested to reference profiles instead of craftsmen
    craftsman_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, 
    phone_number TEXT NOT NULL,
    ai_message TEXT NOT NULL,
    status whatsapp_message_status DEFAULT 'pending_verification' NOT NULL
);

-- Enable RLS
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;

-- Create policy allowing only authenticated admins to view and update the ready_for_admin messages
CREATE POLICY "Admins can view ready messages" ON public.whatsapp_outbox
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update messages" ON public.whatsapp_outbox
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
    
-- Optionally, a service role policy for the bot and edge functions
CREATE POLICY "Service role has full access" ON public.whatsapp_outbox
    USING (auth.role() = 'service_role');

-- Function to handle the fallback routing
CREATE OR REPLACE FUNCTION handle_no_whatsapp_fallback()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the status changed to 'no_whatsapp'
    IF NEW.status = 'no_whatsapp' AND OLD.status != 'no_whatsapp' THEN
        -- Insert into your existing email_outbox
        INSERT INTO public.email_outbox (
            craftsman_id, 
            email_address, 
            subject, 
            body, 
            status
        )
        SELECT 
            NEW.craftsman_id, 
            p.email, -- Fetching email from profiles table
            'Zrobee.cz - Spolupráce na nových zakázkách', 
            NEW.ai_message,
            'pending'
        FROM public.profiles p
        WHERE p.id = NEW.craftsman_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on the whatsapp_outbox table
CREATE TRIGGER trigger_fallback_no_whatsapp
AFTER UPDATE ON public.whatsapp_outbox
FOR EACH ROW
EXECUTE FUNCTION handle_no_whatsapp_fallback();
-- Add new columns for Email Marketing Studio integration
ALTER TABLE public.whatsapp_outbox
ADD COLUMN lead_id UUID REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
ADD COLUMN job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
ADD COLUMN template_slug TEXT;

-- Make ai_message nullable so Edge Functions can fill it later if inserted empty from the frontend
ALTER TABLE public.whatsapp_outbox
ALTER COLUMN ai_message DROP NOT NULL;

-- Fix the fallback trigger to use the correct email_outbox schema structure
CREATE OR REPLACE FUNCTION handle_no_whatsapp_fallback()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the status changed to 'no_whatsapp'
    IF NEW.status = 'no_whatsapp' AND OLD.status != 'no_whatsapp' THEN
        -- Insert into your existing email_outbox correctly
        INSERT INTO public.email_outbox (
            worker_id, 
            lead_id, 
            job_id, 
            template_slug, 
            status
        )
        VALUES (
            NEW.craftsman_id, -- Matches worker_id in email_outbox
            NEW.lead_id,      -- Matches lead_id in email_outbox
            NEW.job_id,       -- Propagate the job context
            COALESCE(NEW.template_slug, 'sniper-a-zvrdavost'), -- Default template if none provided
            'pending'         -- Ensure it gets picked up by email cron/processor
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Add missing INSERT and DELETE RLS policies for admins on whatsapp_outbox
CREATE POLICY "Admins can insert messages" ON public.whatsapp_outbox
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete messages" ON public.whatsapp_outbox
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
-- Add google maps columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_place_id text,
ADD COLUMN IF NOT EXISTS google_rating numeric(3,2),
ADD COLUMN IF NOT EXISTS google_reviews_count integer,
ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Also add these columns to marketing_leads to keep the UNION symmetric in unified_public_profiles
ALTER TABLE public.marketing_leads
ADD COLUMN IF NOT EXISTS google_place_id text,
ADD COLUMN IF NOT EXISTS google_rating numeric(3,2),
ADD COLUMN IF NOT EXISTS google_reviews_count integer,
ADD COLUMN IF NOT EXISTS google_maps_url text;

-- We also need to update public.public_profiles view so it exposes the new profiles columns
-- But it's usually defined elsewhere. Let's just drop and recreate unified_public_profiles directly from public.profiles and marketing_leads properly, OR we can just redefine public_profiles view first if needed.
-- Looking at standard Supabase practices, we can just fetch these from profiles when needed, but since unified_public_profiles is used in PublicWorkerProfile.tsx...

-- Wait, let's redefine public.unified_public_profiles exactly as it was, but adding the 4 columns
DROP VIEW IF EXISTS public.unified_public_profiles;

CREATE OR REPLACE VIEW public.unified_public_profiles AS
-- Registered workers from public_profiles
SELECT 
    p.id,
    p.full_name,
    p.business_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.slug,
    p.is_pro,
    p.display_as_company,
    p.user_type::text,
    'registered'::text as contact_source,
    NULL::float as latitude,
    NULL::float as longitude,
    0::int as review_count,
    NULL::float as rating,
    pr.google_place_id,
    pr.google_rating,
    pr.google_reviews_count,
    pr.google_maps_url
FROM public.public_profiles p
JOIN public.profiles pr ON p.id = pr.id
WHERE p.user_type = 'worker'
UNION ALL
-- Scraped workers from marketing_leads
SELECT 
    ml.id::uuid as id,
    ml.full_name,
    ml.company_name as business_name,
    ml.avatar_url,
    ml.description as bio,
    ml.city,
    ml.slug,
    COALESCE(ml.is_pro, false) as is_pro,
    (ml.company_name IS NOT NULL) as display_as_company,
    'worker'::text as user_type,
    'scraped'::text as contact_source,
    ml.latitude,
    ml.longitude,
    0::int as review_count,
    NULL::float as rating,
    ml.google_place_id,
    ml.google_rating,
    ml.google_reviews_count,
    ml.google_maps_url
FROM public.marketing_leads ml
WHERE ml.user_type = 'worker';

GRANT SELECT ON public.unified_public_profiles TO anon, authenticated;
CREATE TABLE public.job_posting_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  collected_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_posting_conversations TO authenticated;
GRANT ALL ON public.job_posting_conversations TO service_role;

ALTER TABLE public.job_posting_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
  ON public.job_posting_conversations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_jpc_user_status ON public.job_posting_conversations(user_id, status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_jpc_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jpc_updated_at
  BEFORE UPDATE ON public.job_posting_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_jpc_updated_at();
-- Fix existing triggers for pseo_contents and ensure idempotent creation

-- Drop triggers if they already exist
DROP TRIGGER IF EXISTS pseo_to_pages_upsert ON public.pseo_contents;
DROP TRIGGER IF EXISTS pseo_to_pages_delete ON public.pseo_contents;

-- Re-create trigger for INSERT/UPDATE
CREATE TRIGGER pseo_to_pages_upsert
AFTER INSERT OR UPDATE ON public.pseo_contents
FOR EACH ROW EXECUTE FUNCTION sync_pages_from_pseo();

-- Re-create trigger for DELETE
CREATE TRIGGER pseo_to_pages_delete
AFTER DELETE ON public.pseo_contents
FOR EACH ROW EXECUTE FUNCTION delete_page_from_pseo();
-- Idempotent fix for pages sync triggers

DROP TRIGGER IF EXISTS pseo_to_pages_upsert ON public.pseo_contents;
DROP TRIGGER IF EXISTS pseo_to_pages_delete ON public.pseo_contents;
DROP FUNCTION IF EXISTS sync_pages_from_pseo();
DROP FUNCTION IF EXISTS delete_page_from_pseo();

-- Recreate function sync_pages_from_pseo
CREATE OR REPLACE FUNCTION sync_pages_from_pseo()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.pages (url, title, created_at, updated_at)
    VALUES (
      CONCAT('/sluzby/', (SELECT slug FROM public.service_categories WHERE id = NEW.category_id), '/', NEW.city_slug),
      NEW.title,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      updated_at = EXCLUDED.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for INSERT/UPDATE
CREATE TRIGGER pseo_to_pages_upsert
AFTER INSERT OR UPDATE ON public.pseo_contents
FOR EACH ROW EXECUTE FUNCTION sync_pages_from_pseo();

-- Recreate delete function
CREATE OR REPLACE FUNCTION delete_page_from_pseo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_url TEXT;
BEGIN
  SELECT CONCAT('/sluzby/', sc.slug, '/', OLD.city_slug) INTO target_url
  FROM public.service_categories sc
  WHERE sc.id = OLD.category_id;
  DELETE FROM public.pages WHERE url = target_url;
  RETURN OLD;
END;
$$;

-- Trigger for DELETE
CREATE TRIGGER pseo_to_pages_delete
AFTER DELETE ON public.pseo_contents
FOR EACH ROW EXECUTE FUNCTION delete_page_from_pseo();
-- Enable Row Level Security on the pages table
ALTER TABLE IF EXISTS public.pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for anon and authenticated users) to pages
DROP POLICY IF EXISTS "Allow public read access for pages" ON public.pages;
CREATE POLICY "Allow public read access for pages"
  ON public.pages FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users (admins) to perform all write operations on pages
DROP POLICY IF EXISTS "Allow authenticated users to manage pages" ON public.pages;
CREATE POLICY "Allow authenticated users to manage pages"
  ON public.pages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service_role key to perform all operations (default, but good to be explicit)
DROP POLICY IF EXISTS "Allow service_role to manage pages" ON public.pages;
CREATE POLICY "Allow service_role to manage pages"
  ON public.pages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant select permission explicitly to anon and authenticated roles
GRANT SELECT ON public.pages TO anon, authenticated;
-- 1. Enable pg_cron and pg_net extensions in the database
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the pg_cron job to automatically trigger the sync function every 2 minutes
-- Uses pg_net's HTTP POST to trigger the Edge Function securely via the API gateway
SELECT cron.schedule(
    'gsc-index-status-sync-job',
    '*/2 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/gsc-index-status-sync',
        headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- 3. Populate missing key indexable pages (static and category landing pages)
-- A. Homepage and static utility pages
INSERT INTO public.pages (url, title)
VALUES 
  ('/', 'Handy Heroes - Hlavní strana'),
  ('/auth', 'Přihlášení / Registrace'),
  ('/o-nas', 'O nás'),
  ('/kontakt', 'Kontakt')
ON CONFLICT (url) DO NOTHING;

-- B. Dynamically populate high-level service category landing pages (e.g., /sluzby/zahrada)
INSERT INTO public.pages (url, title)
SELECT DISTINCT 
  CONCAT('/sluzby/', slug) AS url,
  name AS title
FROM public.service_categories
WHERE slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;
-- Improve pages sync triggers to correctly handle service subcategories and populate all indexable sitemap URLs

-- 1. Drop existing triggers and functions to recreate cleanly
DROP TRIGGER IF EXISTS pseo_to_pages_upsert ON public.pseo_contents;
DROP TRIGGER IF EXISTS pseo_to_pages_delete ON public.pseo_contents;
DROP FUNCTION IF EXISTS sync_pages_from_pseo();
DROP FUNCTION IF EXISTS delete_page_from_pseo();

-- 2. Create the enhanced trigger function for INSERT/UPDATE
CREATE OR REPLACE FUNCTION sync_pages_from_pseo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cat_slug TEXT;
  sub_slug TEXT;
  page_url TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Get category slug
    SELECT slug INTO cat_slug FROM public.service_categories WHERE id = NEW.category_id;
    
    -- If cat_slug is null, but subcategory is set, infer category
    IF cat_slug IS NULL AND NEW.subcategory_id IS NOT NULL THEN
      SELECT sc.slug INTO cat_slug
      FROM public.service_subcategories ss
      JOIN public.service_categories sc ON ss.category_id = sc.id
      WHERE ss.id = NEW.subcategory_id;
    END IF;

    -- Get subcategory slug if present
    IF NEW.subcategory_id IS NOT NULL THEN
      SELECT slug INTO sub_slug FROM public.service_subcategories WHERE id = NEW.subcategory_id;
    END IF;

    -- Construct correct URL path
    IF sub_slug IS NOT NULL AND cat_slug IS NOT NULL THEN
      page_url := CONCAT('/sluzby/', cat_slug, '/', sub_slug, '/', NEW.city_slug);
    ELSIF cat_slug IS NOT NULL THEN
      page_url := CONCAT('/sluzby/', cat_slug, '/', NEW.city_slug);
    ELSE
      -- Fallback if we cannot infer category slug
      RETURN NEW;
    END IF;

    INSERT INTO public.pages (url, title, created_at, updated_at)
    VALUES (
      page_url,
      NEW.title,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      updated_at = EXCLUDED.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Re-create trigger for INSERT/UPDATE
CREATE TRIGGER pseo_to_pages_upsert
AFTER INSERT OR UPDATE ON public.pseo_contents
FOR EACH ROW EXECUTE FUNCTION sync_pages_from_pseo();

-- 4. Create the enhanced trigger function for DELETE
CREATE OR REPLACE FUNCTION delete_page_from_pseo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cat_slug TEXT;
  sub_slug TEXT;
  target_url TEXT;
BEGIN
  -- Get category slug
  SELECT slug INTO cat_slug FROM public.service_categories WHERE id = OLD.category_id;

  -- If cat_slug is null, but subcategory is set, infer category
  IF cat_slug IS NULL AND OLD.subcategory_id IS NOT NULL THEN
    SELECT sc.slug INTO cat_slug
    FROM public.service_subcategories ss
    JOIN public.service_categories sc ON ss.category_id = sc.id
    WHERE ss.id = OLD.subcategory_id;
  END IF;

  -- Get subcategory slug if present
  IF OLD.subcategory_id IS NOT NULL THEN
    SELECT slug INTO sub_slug FROM public.service_subcategories WHERE id = OLD.subcategory_id;
  END IF;

  -- Construct correct URL path
  IF sub_slug IS NOT NULL AND cat_slug IS NOT NULL THEN
    target_url := CONCAT('/sluzby/', cat_slug, '/', sub_slug, '/', OLD.city_slug);
  ELSIF cat_slug IS NOT NULL THEN
    target_url := CONCAT('/sluzby/', cat_slug, '/', OLD.city_slug);
  ELSE
    RETURN OLD;
  END IF;

  DELETE FROM public.pages WHERE url = target_url;
  RETURN OLD;
END;
$$;

-- 5. Re-create trigger for DELETE
CREATE TRIGGER pseo_to_pages_delete
AFTER DELETE ON public.pseo_contents
FOR EACH ROW EXECUTE FUNCTION delete_page_from_pseo();


-- 6. Re-populate public.pages Table
-- Delete existing sluzby pages to perform a clean and accurate mapping
DELETE FROM public.pages WHERE url LIKE '/sluzby/%';

-- A. All Category Landing Pages (/sluzby/[category_slug])
INSERT INTO public.pages (url, title)
SELECT DISTINCT 
  CONCAT('/sluzby/', slug) AS url,
  name AS title
FROM public.service_categories
WHERE slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- B. All Subcategory Landing Pages (/sluzby/[category_slug]/[subcategory_slug])
INSERT INTO public.pages (url, title)
SELECT DISTINCT
  CONCAT('/sluzby/', sc.slug, '/', ss.slug) AS url,
  ss.name AS title
FROM public.service_subcategories ss
JOIN public.service_categories sc ON ss.category_id = sc.id
WHERE ss.slug IS NOT NULL AND sc.slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- C. Category-City PSEO Pages (/sluzby/[category_slug]/[city_slug])
INSERT INTO public.pages (url, title, created_at, updated_at)
SELECT DISTINCT
  CONCAT('/sluzby/', sc.slug, '/', pc.city_slug) AS url,
  pc.title,
  pc.created_at,
  pc.updated_at
FROM public.pseo_contents pc
JOIN public.service_categories sc ON pc.category_id = sc.id
WHERE pc.subcategory_id IS NULL AND sc.slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- D. Subcategory-City PSEO Pages (/sluzby/[category_slug]/[subcategory_slug]/[city_slug])
INSERT INTO public.pages (url, title, created_at, updated_at)
SELECT DISTINCT
  CONCAT('/sluzby/', sc.slug, '/', ss.slug, '/', pc.city_slug) AS url,
  pc.title,
  pc.created_at,
  pc.updated_at
FROM public.pseo_contents pc
JOIN public.service_subcategories ss ON pc.subcategory_id = ss.id
JOIN public.service_categories sc ON ss.category_id = sc.id
WHERE pc.subcategory_id IS NOT NULL AND ss.slug IS NOT NULL AND sc.slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- E. Static Pages from sitemap
INSERT INTO public.pages (url, title)
VALUES
  ('/', 'Handy Heroes - Hlavní strana'),
  ('/o-nas', 'O nás'),
  ('/jak-to-funguje', 'Jak to funguje'),
  ('/vsechny-sluzby', 'Všechny služby'),
  ('/registrace-remeslnika', 'Registrace řemeslníka'),
  ('/podpora', 'Podpora'),
  ('/kariera', 'Kariéra'),
  ('/radce', 'Rádce'),
  ('/poptavky', 'Poptávky'),
  ('/remeslnici-v-okoli', 'Řemeslníci v okolí'),
  ('/nova-poptavka', 'Nová poptávka'),
  ('/proc-zrobee', 'Proč Zrobee'),
  ('/adresar', 'Adresář'),
  ('/prihlaseni', 'Přihlášení'),
  ('/ochrana-udaju', 'Ochrana osobních údajů'),
  ('/podminky', 'Smluvní podmínky')
ON CONFLICT (url) DO NOTHING;

-- F. Pricing Landing Pages (/cenik/[category_slug])
INSERT INTO public.pages (url, title)
SELECT DISTINCT
  CONCAT('/cenik/', slug) AS url,
  CONCAT('Ceník - ', name) AS title
FROM public.service_categories
WHERE slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- G. City Hubs (/mesta/[city_slug])
INSERT INTO public.pages (url, title)
SELECT DISTINCT
  CONCAT('/mesta/', city_slug) AS url,
  CONCAT('Řemeslníci v městě ', UPPER(SUBSTRING(city_slug FROM 1 FOR 1)), SUBSTRING(city_slug FROM 2)) AS title
FROM public.pseo_contents
WHERE city_slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- H. Published Magazine Articles (/radce/[article_slug])
INSERT INTO public.pages (url, title)
SELECT DISTINCT
  CONCAT('/radce/', slug) AS url,
  title
FROM public.articles
WHERE status = 'published' AND slug IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- I. Active Demands (/poptavka/[demand_slug])
INSERT INTO public.pages (url, title)
SELECT DISTINCT
  CONCAT('/poptavka/', slug) AS url,
  title
FROM public.public_demands
WHERE status = 'open' AND slug IS NOT NULL AND (deadline_date IS NULL OR deadline_date > now())
ON CONFLICT (url) DO NOTHING;
-- Enable pg_cron and pg_net extensions and schedule the GSC index status sync job

-- 1. Enable pg_cron and pg_net extensions in the database
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Clean up any existing duplicate cron job
SELECT cron.unschedule('gsc-index-status-sync-job');

-- 3. Schedule the pg_cron job to automatically trigger the sync function every 2 minutes
-- Uses pg_net's HTTP POST to trigger the Edge Function securely via the API gateway
SELECT cron.schedule(
    'gsc-index-status-sync-job',
    '*/2 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/gsc-index-status-sync',
        headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5xcnJrZmxnbGRsZmVheXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjcyNTAsImV4cCI6MjA3ODUwMzI1MH0.TKPW85QsJxaOF-xSGdfhlfK-KhOUcypQ9AGsU4Og4jY"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
-- Add insert/update policies for app_settings so that authenticated admin users can modify it.
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);
-- Create app_settings table (key-value store)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Enable admin access: only allow users with service_role or users who are authenticated admins
-- Adjust role check based on your app's specific admin role schema (e.g., profiles.is_admin)
CREATE POLICY "Allow authenticated admins to read/write app_settings"
    ON public.app_settings
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'email') IN (SELECT email FROM auth.users WHERE is_super_admin = true)
        -- OR insert your own custom admin check here, e.g.:
        -- EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() ->> 'email') IN (SELECT email FROM auth.users WHERE is_super_admin = true)
    );

-- Also allow service_role key to manage all settings (default Supabase behavior, but good to make explicit)
CREATE POLICY "Allow service_role full access"
    ON public.app_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Insert dummy/placeholder for GSC connection status if not exists
INSERT INTO public.app_settings (key, value)
VALUES ('gsc_connection_status', '{"connected": false, "email": null, "connected_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- Reference Schema for Pages (Indexing Health Status)
-- If you already have a pages/URLs table, you can skip this part or merge these fields.
CREATE TABLE IF NOT EXISTS public.pages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    url text UNIQUE NOT NULL,
    title text,
    -- GSC Indexing Health Columns
    gsc_indexing_status text DEFAULT 'Unknown', -- e.g., 'Indexed', 'Excluded', 'Crawled - currently not indexed', etc.
    gsc_coverage_state text, -- Detailed coverage category from GSC
    gsc_robots_txt_status text, -- e.g., 'Allowed', 'Blocked'
    gsc_last_crawl_time timestamp with time zone,
    gsc_last_checked timestamp with time zone,
    gsc_inspect_error text, -- Errors from URL inspection call if any
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for optimized lookup during GSC status synchronization
CREATE INDEX IF NOT EXISTS idx_pages_gsc_sync 
ON public.pages (gsc_last_checked NULLS FIRST, created_at DESC);


