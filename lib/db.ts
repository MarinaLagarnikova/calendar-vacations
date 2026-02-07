import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only create client if valid URL is provided
export const supabase = supabaseUrl && supabaseUrl.startsWith('http')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export type Vacation = {
  id: string
  employee_name: string
  employee_id: string
  start_date: string
  end_date: string
  created_at: string
  message_text?: string
}
