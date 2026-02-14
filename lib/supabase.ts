// lib/supabase.ts
import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

// 「createClient」という名前で外から使えるように書き出す（export）
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return supabaseCreateClient(url, anonKey)
}