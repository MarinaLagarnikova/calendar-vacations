import { NextRequest, NextResponse } from 'next/server'
import { parseVacation } from '@/lib/ai-parser'
import { supabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const body = await request.json()

    // Parse vacation from message
    const vacation = await parseVacation(body)

    // If not a vacation message, just return 200
    if (!vacation) {
      return NextResponse.json({ success: true, vacation: false })
    }

    // Check if employee already has a vacation (auto-replace)
    const { data: existing } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', body.author.id)
      .maybeSingle()

    if (existing) {
      // Delete old vacation
      await supabase
        .from('vacations')
        .delete()
        .eq('employee_id', body.author.id)
    }

    // Insert new vacation
    const { error } = await supabase
      .from('vacations')
      .insert({
        employee_name: vacation.employee_name,
        employee_id: body.author.id,
        start_date: vacation.start_date,
        end_date: vacation.end_date,
        message_text: body.message.text,
      })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      vacation: true,
      data: vacation,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
