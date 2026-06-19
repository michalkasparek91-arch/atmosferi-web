import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const { data, error } = await supabase.from('marketing_leads').select('category, language');
const summary = {};
data?.forEach(d => {
  const k = (d.category || 'null') + ' - ' + (d.language || 'null');
  summary[k] = (summary[k] || 0) + 1;
});
console.log('Total leads:', data?.length);
console.log('Categories:', summary);

