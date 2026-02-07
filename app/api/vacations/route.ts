import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('vacations')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
