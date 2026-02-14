// lib/supabase.ts
import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return supabaseCreateClient(url, anonKey)
}