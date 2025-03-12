// server/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#imports'

export function getSupabaseClient() {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.supabaseUrl
  const supabaseKey = config.supabaseServiceKey
  
  return createClient(supabaseUrl, supabaseKey)
}