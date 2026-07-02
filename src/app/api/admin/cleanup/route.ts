import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Delete duplicate drafts keeping only the latest per driveFileId
  const drafts = await prisma.draft.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const seen = new Set<string>()
  const toDelete: string[] = []

  for (const draft of drafts) {
    const key = `${draft.userId}-${draft.driveFileId}`
    if (seen.has(key)) {
      toDelete.push(draft.id)
    } else {
      seen.add(key)
    }
  }

  if (toDelete.length > 0) {
    await prisma.platform.deleteMany({ where: { draftId: { in: toDelete } } })
    await prisma.draft.deleteMany({ where: { id: { in: toDelete } } })
  }

  return NextResponse.json({ deleted: toDelete.length })
}
