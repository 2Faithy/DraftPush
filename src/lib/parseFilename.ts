export interface ParsedDraft {
  isReady: boolean
  title: string
  publishDate: Date | null
  userCaption: string | null
}

export function parseFilename(filename: string): ParsedDraft {
  const name = filename.replace(/\.[^/.]+$/, '').trim()

  if (!name.startsWith('✅')) {
    return { isReady: false, title: '', publishDate: null, userCaption: null }
  }

  const withoutEmoji = name.replace('✅', '').trim()
  const parts = withoutEmoji.split(' — ').map(p => p.trim())

  const title = parts[0] || ''
  const dateStr = parts[1] || null
  const userCaption = parts[2] || null

  let publishDate: Date | null = null

  if (dateStr) {
    const timeMatch = dateStr.match(/(\d+):?(\d*)\s*(am|pm)/i)
    const dateOnly = dateStr.replace(/\d+:\d+\s*[ap]m|\d+\s*[ap]m/i, '').trim()

    let hours = 9
    let minutes = 0

    if (timeMatch) {
      hours = parseInt(timeMatch[1])
      minutes = parseInt(timeMatch[2] || '0')
      const meridiem = timeMatch[3].toLowerCase()
      if (meridiem === 'pm' && hours !== 12) hours += 12
      if (meridiem === 'am' && hours === 12) hours = 0
    }

    // Parse as Lagos time (Africa/Lagos = UTC+1)
    const year = new Date().getFullYear()
    const lagosDateStr = `${dateOnly} ${year} ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00 GMT+0100`
    const parsed = new Date(lagosDateStr)

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
