import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scanDriveForDrafts } from '@/lib/scanDrive'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user?.googleAccessToken || !user?.googleRefreshToken) {
    return NextResponse.json({ error: 'Drive not connected' }, { status: 400 })
  }

  const drafts = await scanDriveForDrafts(
    user.googleAccessToken,
    user.googleRefreshToken
  )

  // Save new drafts to DB
  let saved = 0
  for (const draft of drafts) {
    if (!draft) continue
    const existing = await prisma.draft.findFirst({
      where: { driveFileId: draft.driveFileId, userId: user.id },
    })
    if (!existing) {
      await prisma.draft.create({
        data: {
          userId: user.id,
          driveFileId: draft.driveFileId,
          rawTitle: draft.rawTitle,
          postTitle: draft.postTitle,
          publishDate: draft.publishDate || new Date(),
          userCaption: draft.userCaption,
          status: 'DETECTED',
        },
      })
      saved++
    }
  }

  return NextResponse.json({ found: drafts.length, saved })
}
