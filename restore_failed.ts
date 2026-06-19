import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'YOUR_URL',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'YOUR_KEY'
);
const { error, data } = await supabase.from('email_outbox').update({ status: 'draft', error_message: null }).eq('status', 'failed').select('id');
console.log('Restored count:', data?.length);
console.log('Error:', error);

