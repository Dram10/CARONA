import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Se as variáveis não estiverem configuradas, o app mostra uma tela explicando o que fazer.
export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null
