import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface WaitlistInsertError {
  code?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: unknown }
    const email = body.email

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), source: 'landing' })

    if (error) {
      const insertError = error as WaitlistInsertError
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Email already on the waitlist' }, { status: 409 })
      }
      console.error('Waitlist insert error:', error)
      throw new Error('Failed to insert waitlist entry')
    }

    const { count, error: countError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Waitlist count error:', countError)
    }

    return NextResponse.json({ success: true, count: count ?? 0 })
  } catch (error) {
    console.error('Waitlist signup failed:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Waitlist count fetch error:', error)
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch (error) {
    console.error('Failed to fetch waitlist count:', error)
    return NextResponse.json({ count: 0 })
  }
}
