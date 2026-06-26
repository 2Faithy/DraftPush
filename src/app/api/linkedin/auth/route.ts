import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    scope: 'w_member_social',
  })

  const url = `https://www.linkedin.com/oauth/v2/authorization?${params}`
  return NextResponse.redirect(url)
}
