import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon-key'),
)

// Graceful fallback dummy client if environment variables are not yet provided
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }))

export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null, error: new Error('Supabase credentials are not configured in .env.') }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data.user, session: data.session, error: error ? new Error(error.message) : null }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null, error: new Error('Supabase credentials are not configured in .env.') }
  }
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { user: data.user, session: data.session, error: error ? new Error(error.message) : null }
}

export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: null }
  }
  const { error } = await supabase.auth.signOut()
  return { error: error ? new Error(error.message) : null }
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const session = await getSession()
  return session?.access_token ?? null
}

export function onAuthStateChange(callback: (session: Session | null, user: User | null) => void): () => void {
  if (!isSupabaseConfigured) {
    return () => {}
  }
  void getSession().then((session) => {
    if (session) {
      callback(session, session.user)
    }
  }).catch(() => {})

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session, session?.user ?? null)
  })
  return () => {
    subscription.unsubscribe()
  }
}
