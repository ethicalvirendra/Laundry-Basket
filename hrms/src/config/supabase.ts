import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pturitdwyycfibrifwgg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LGYbvZv_B0PJbQK-CkVVAw_sZ3eThC1';

export const supabase = createClient(supabaseUrl, supabaseKey);
