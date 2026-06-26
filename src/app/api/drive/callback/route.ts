import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect('/sign-in')

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const { tokens } = await oauth2Client.getToken(code)

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (existingUser) {
    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
      },
    })
  } else {
    await prisma.user.create({
      data: {
        clerkId: userId,
        email: `${userId}@placeholder.com`,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
      },
    })
  }

  return NextResponse.redirect('https://48drdq-3000.csb.app/dashboard')
}
