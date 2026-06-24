import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erreur de configuration Supabase : Les variables ne sont pas définies")
}

// C'est ce "export" qui permet à App.vue de récupérer la connexion
export const supabase = createClient(supabaseUrl, supabaseAnonKey)