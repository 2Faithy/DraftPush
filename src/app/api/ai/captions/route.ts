import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCaptions } from '@/lib/generateCaptions'
import { google } from 'googleapis'

async function getDocContent(
  driveFileId: string,
  accessToken: string,
  refreshToken: string
): Promise<string> {
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  authClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const docs = google.docs({ version: 'v1', auth: authClient })
  const doc = await docs.documents.get({ documentId: driveFileId })

  const content = doc.data.body?.content || []
  let text = ''
  for (const block of content) {
    for (const elem of block.paragraph?.elements || []) {
      text += elem.textRun?.content || ''
    }
  }
  return text.trim()
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { draftId } = await request.json()

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const draft = await prisma.draft.findFirst({
      where: { id: draftId, userId: user.id },
    })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const content = await getDocContent(
      draft.driveFileId,
      user.googleAccessToken!,
      user.googleRefreshToken!
    )

    const captions = await generateCaptions(draft.postTitle, content, draft.userCaption)

    await prisma.platform.deleteMany({ where: { draftId: draft.id } })
    for (const cap of captions) {
      await prisma.platform.create({
        data: {
          draftId: draft.id,
          name: cap.platform,
          caption: cap.caption,
          hashtags: cap.hashtags,
        },
      })
    }

    await prisma.draft.update({
      where: { id: draft.id },
      data: { status: 'AI_GENERATED', aiGenerated: !draft.userCaption },
    })

    return NextResponse.json({ success: true, captions })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
