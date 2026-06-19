import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'YOUR_URL',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'YOUR_KEY'
);
const { data, error } = await supabase.from('email_outbox').delete().eq('status', 'draft').select('id');
console.log('Deleted drafts count:', data?.length);
console.log('Error:', error);

