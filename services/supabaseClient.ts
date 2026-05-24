import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' && (process.env as any)?.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && (process.env as any)?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
