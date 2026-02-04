import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-initialized singleton clients
let _serverClient: SupabaseClient | null = null

export function getServerClient(): SupabaseClient {
  if (_serverClient) return _serverClient
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
  
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)')
  }
  
  _serverClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  
  return _serverClient
}

let _publicClient: SupabaseClient | null = null

export function getPublicClient(): SupabaseClient {
  if (_publicClient) return _publicClient
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)')
  }
  
  _publicClient = createClient(supabaseUrl, supabasePublishableKey)
  
  return _publicClient
}
