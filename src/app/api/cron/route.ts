import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scanDriveForDrafts } from '@/lib/scanDrive'
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

async function getDocImages(
  driveFileId: string,
  accessToken: string,
  refreshToken: string
): Promise<string[]> {
  try {
    const authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    authClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const drive = google.drive({ version: 'v3', auth: authClient })

    // Export doc as HTML to extract images
    const res = await drive.files.export(
      { fileId: driveFileId, mimeType: 'text/html' },
      { responseType: 'arraybuffer' }
    )

    const html = Buffer.from(res.data as ArrayBuffer).toString('utf-8')
    const imgMatches = html.match(/src="(https:\/\/[^"]+)"/g) || []
    const urls = imgMatches.map(m => m.replace('src="', '').replace('"', ''))
    return urls.slice(0, 1) // LinkedIn supports 1 image per post for now
  } catch {
    return []
  }
}

async function postToLinkedIn(
  userId: string,
  accessToken: string,
  text: string,
  imageUrls: string[]
): Promise<boolean> {
  let body: any = {
    author: `urn:li:person:${userId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: imageUrls.length > 0 ? 'IMAGE' : 'NONE',
        media: imageUrls.length > 0 ? imageUrls.map(url => ({
          status: 'READY',
          originalUrl: url,
        })) : undefined,
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  if (imageUrls.length === 0) {
    delete body.specificContent['com.linkedin.ugc.ShareContent'].media
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  console.log('LinkedIn post result:', JSON.stringify(data))
  return res.ok
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let totalScanned = 0
  let totalGenerated = 0
  let totalPublished = 0
  let totalFailed = 0

  // Get all users with Drive connected
  const users = await prisma.user.findMany({
    where: {
      googleAccessToken: { not: null },
      googleRefreshToken: { not: null },
    },
  })

  for (const user of users) {
    try {
      // Step 1: Scan Drive for new drafts
      const drafts = await scanDriveForDrafts(
        user.googleAccessToken!,
        user.googleRefreshToken!
      )

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
          totalScanned++
        }
      }

      // Step 2: Generate captions for DETECTED drafts
      const detectedDrafts = await prisma.draft.findMany({
        where: { userId: user.id, status: 'DETECTED' },
        include: { platforms: true },
      })

      for (const draft of detectedDrafts) {
        try {
          const content = await getDocContent(
            draft.driveFileId,
            user.googleAccessToken!,
            user.googleRefreshToken!
          )

          const captions = await generateCaptions(
            draft.postTitle,
            content,
            draft.userCaption
          )

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
            data: {
              status: 'AI_GENERATED',
              aiGenerated: !draft.userCaption,
            },
          })
          totalGenerated++
        } catch (err) {
          console.error(`Failed to generate captions for draft ${draft.id}:`, err)
        }
      }

      // Step 3: Post drafts that are due now
      if (!user.linkedinAccessToken || !user.linkedinUserId) continue

      const dueDrafts = await prisma.draft.findMany({
        where: {
          userId: user.id,
          status: 'AI_GENERATED',
          publishDate: { lte: now },
        },
        include: { platforms: true },
      })

      for (const draft of dueDrafts) {
        const linkedinPlatform = draft.platforms.find(p => p.name === 'linkedin')
        if (!linkedinPlatform) continue

        try {
          const imageUrls = await getDocImages(
            draft.driveFileId,
            user.googleAccessToken!,
            user.googleRefreshToken!
          )

          const text = `${draft.postTitle}\n\n${linkedinPlatform.caption}\n\n${linkedinPlatform.hashtags}`

          const success = await postToLinkedIn(
            user.linkedinUserId!,
            user.linkedinAccessToken!,
            text,
            imageUrls
          )

          if (success) {
            await prisma.platform.update({
              where: { id: linkedinPlatform.id },
              data: { publishedAt: new Date(), approved: true },
            })
            await prisma.draft.update({
              where: { id: draft.id },
              data: { status: 'PUBLISHED' },
            })
            totalPublished++
          } else {
            await prisma.draft.update({
              where: { id: draft.id },
              data: { status: 'FAILED' },
            })
            totalFailed++
          }
        } catch (err) {
          console.error(`Failed to post draft ${draft.id}:`, err)
          totalFailed++
        }
      }
    } catch (err) {
      console.error(`Failed to process user ${user.id}:`, err)
    }
  }

  return NextResponse.json({
    success: true,
    scanned: totalScanned,
    generated: totalGenerated,
    published: totalPublished,
    failed: totalFailed,
  })
}
