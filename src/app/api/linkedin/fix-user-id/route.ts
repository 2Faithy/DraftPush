import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user?.linkedinAccessToken) {
    return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 })
  }

  const res = await fetch('https://api.linkedin.com/v2/me', {
    headers: { 
      Authorization: `Bearer ${user.linkedinAccessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  })
  const data = await res.json()
  console.log('LinkedIn me:', JSON.stringify(data))

  if (data.id) {
    await prisma.user.update({
      where: { clerkId: userId },
      data: { linkedinUserId: data.id },
    })
    return NextResponse.json({ success: true, linkedinUserId: data.id })
  }

  return NextResponse.json({ error: 'Could not get user ID', data })
}
