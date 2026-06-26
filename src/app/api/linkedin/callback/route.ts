import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect('/sign-in')

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.json({ error, description: request.nextUrl.searchParams.get('error_description') }, { status: 400 })
  }

  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.access_token) {
    return NextResponse.json({ error: 'Failed to get token', details: tokens }, { status: 400 })
  }

  // Get LinkedIn member ID using the token introspection
  const introspectRes = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      token: tokens.access_token,
    }),
  })

  const introspect = await introspectRes.json()
  const linkedinUserId = introspect.sub || introspect.authorized_party

  await prisma.user.update({
    where: { clerkId: userId },
    data: {
      linkedinAccessToken: tokens.access_token,
      linkedinUserId: linkedinUserId || 'pending',
    },
  })

  return NextResponse.redirect('https://48drdq-3000.csb.app/dashboard')
}
