import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface PlatformCaption {
  platform: string
  caption: string
  hashtags: string
}

export async function generateCaptions(
  title: string,
  content: string,
  userCaption?: string | null
): Promise<PlatformCaption[]> {
  const basePrompt = userCaption
    ? `You are a social media expert. The user has written this caption: "${userCaption}"
Adapt it for each platform below. Keep the core message exactly the same, just format it correctly per platform rules.
Title: ${title}`
    : `You are a social media expert. Write platform-specific captions for this content.
Title: ${title}
Content: ${content.slice(0, 2000)}`

  const prompt = `${basePrompt}

Rules per platform:
- linkedin: Professional tone, caption under 700 chars, 3-5 hashtags at the bottom
- twitter: Under 280 chars total including hashtags, 1-2 hashtags inline
- instagram: Conversational, caption under 400 chars, return 20 hashtags separately
- facebook: Casual, no hashtags or max 2, under 500 chars

Respond ONLY with a JSON array, no markdown, no backticks:
[
  { "platform": "linkedin", "caption": "...", "hashtags": "#tag1 #tag2" },
  { "platform": "twitter", "caption": "...", "hashtags": "#tag1" },
  { "platform": "instagram", "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  { "platform": "facebook", "caption": "...", "hashtags": "" }
]`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  })

  const text = response.choices[0].message.content || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
