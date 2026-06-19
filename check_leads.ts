import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'YOUR_URL',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'YOUR_KEY'
);
const { data, error } = await supabase.from('marketing_leads').select('category, language');
const summary = {};
data?.forEach(d => {
  const k = (d.category || 'null') + ' - ' + (d.language || 'null');
  summary[k] = (summary[k] || 0) + 1;
});
console.log('Total leads:', data?.length);
console.log('Categories:', summary);

