import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { platformId } = await request.json()

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user?.linkedinAccessToken || !user?.linkedinUserId) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 })
    }

    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      include: { draft: true },
    })
    if (!platform) return NextResponse.json({ error: 'Platform not found' }, { status: 404 })

    const text = `${platform.draft.postTitle}\n\n${platform.caption}\n\n${platform.hashtags}`

    console.log('LinkedIn User ID:', user.linkedinUserId)
    console.log('Posting text:', text)

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${user.linkedinUserId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })

    const data = await res.json()
    console.log('LinkedIn response:', JSON.stringify(data))

    if (!res.ok) {
      return NextResponse.json({ error: 'LinkedIn post failed', details: data }, { status: 400 })
    }

    await prisma.platform.update({
      where: { id: platformId },
      data: { publishedAt: new Date(), approved: true },
    })

    await prisma.draft.update({
      where: { id: platform.draftId },
      data: { status: 'PUBLISHED' },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
