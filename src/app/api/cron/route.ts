import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Simple security check
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Find all approved drafts due today
  const drafts = await prisma.draft.findMany({
    where: {
      status: 'AI_GENERATED',
      publishDate: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    include: {
      platforms: true,
      user: true,
    },
  })

  console.log(`Cron: found ${drafts.length} drafts due today`)

  let published = 0
  let failed = 0

  for (const draft of drafts) {
    const linkedinPlatform = draft.platforms.find(p => p.name === 'linkedin')

    if (!linkedinPlatform || !draft.user.linkedinAccessToken || !draft.user.linkedinUserId) {
      continue
    }

    const text = `${draft.postTitle}\n\n${linkedinPlatform.caption}\n\n${linkedinPlatform.hashtags}`

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${draft.user.linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${draft.user.linkedinUserId}`,
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

    if (res.ok) {
      await prisma.platform.update({
        where: { id: linkedinPlatform.id },
        data: { publishedAt: new Date(), approved: true },
      })
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: 'PUBLISHED' },
      })
      published++
    } else {
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: 'FAILED' },
      })
      console.error(`Failed to post draft ${draft.id}:`, data)
      failed++
    }
  }

  return NextResponse.json({
    success: true,
    processed: drafts.length,
    published,
    failed,
  })
}
