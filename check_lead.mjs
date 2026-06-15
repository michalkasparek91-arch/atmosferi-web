import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://paryiowezqlnffanxtnt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnlpb3dlenFsbmZmYW54dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3MzYsImV4cCI6MjA5NjQwOTczNn0.yyd-pRRXds1o8lU9mVWk21zu-5l_dcdxiBjDSKfKw5o";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('marketing_leads')
    .select('email, company_name, company_description, ai_icebreaker, category, subcategory')
    .eq('email', 'tma@cfmoller.com');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

check();
