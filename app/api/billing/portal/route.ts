import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Polar } from '@polar-sh/sdk'

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production') ?? 'production',
})

// Polar 고객 포털 세션 생성 후 URL 반환
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const host = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const returnUrl = `${protocol}://${host}/dashboard/billing`

    const session = await polar.customerSessions.create({
      externalCustomerId: user.id,
      returnUrl,
    })

    return NextResponse.json({ url: session.customerPortalUrl })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Customer portal session error:', error)
    return NextResponse.json(
      { error: 'Portal session creation failed', detail },
      { status: 500 },
    )
  }
}
