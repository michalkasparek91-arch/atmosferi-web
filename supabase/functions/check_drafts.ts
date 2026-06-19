import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );
  const { data, error } = await supabase.from('email_outbox').select('status, id');
  const counts = {};
  data?.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
  return new Response(JSON.stringify({ counts }), { headers: { 'Content-Type': 'application/json' } });
});

