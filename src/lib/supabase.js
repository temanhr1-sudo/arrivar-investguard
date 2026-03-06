import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Tambahkan log ini untuk memastikan variabel terbaca di console browser
console.log("Supabase URL:", supabaseUrl); 

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("EROR: Variabel Supabase tidak ditemukan di .env!");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "")