import { google } from 'googleapis'
import { parseFilename } from './parseFilename'

export async function scanDriveForDrafts(
  accessToken: string,
  refreshToken: string
) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const drive = google.drive({ version: 'v3', auth })

  // Search for files with ✅ in the name
  const response = await drive.files.list({
    q: "name contains '✅' and mimeType = 'application/vnd.google-apps.document' and trashed = false",
    fields: 'files(id, name, modifiedTime)',
    pageSize: 50,
  })

  const files = response.data.files || []

  const drafts = files
    .map(file => {
      const parsed = parseFilename(file.name || '')
      if (!parsed.isReady) return null
      return {
        driveFileId: file.id!,
        rawTitle: file.name!,
        postTitle: parsed.title,
        publishDate: parsed.publishDate,
        userCaption: parsed.userCaption,
      }
    })
    .filter(Boolean)

  return drafts
}
