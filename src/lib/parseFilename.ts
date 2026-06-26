export interface ParsedDraft {
  isReady: boolean
  title: string
  publishDate: Date | null
  userCaption: string | null
}

export function parseFilename(filename: string): ParsedDraft {
  // Remove file extension
  const name = filename.replace(/\.[^/.]+$/, '').trim()

  // Must start with ✅ to be considered ready
  if (!name.startsWith('✅')) {
    return { isReady: false, title: '', publishDate: null, userCaption: null }
  }

  // Remove the ✅ and trim
  const withoutEmoji = name.replace('✅', '').trim()

  // Split by ' — ' (em dash with spaces)
  const parts = withoutEmoji.split(' — ').map(p => p.trim())

  const title = parts[0] || ''
  const dateStr = parts[1] || null
  const userCaption = parts[2] || null

  // Parse the date
  let publishDate: Date | null = null
  if (dateStr) {
    const parsed = new Date(`${dateStr} ${new Date().getFullYear()}`)
    if (!isNaN(parsed.getTime())) {
      publishDate = parsed
    }
  }

  return {
    isReady: true,
    title,
    publishDate,
    userCaption,
  }
}
