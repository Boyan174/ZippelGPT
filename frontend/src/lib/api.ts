const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type MessageHistory = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Send a message to the AI service and stream the response.
 *
 * @param message - The user's message
 * @param history - Previous messages in the conversation (from Supabase)
 * @param onChunk - Callback for each chunk of the response
 */
export async function sendMessageToAI(
  message: string,
  history: MessageHistory[],
  onChunk: (text: string) => void
): Promise<string> {
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to send message')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No reader available')
  }

  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          return fullResponse
        }
        try {
          const parsed = JSON.parse(data)
          if (parsed.text) {
            fullResponse += parsed.text
            onChunk(parsed.text)
          }
          if (parsed.error) {
            throw new Error(parsed.error)
          }
        } catch {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }
  }

  return fullResponse
}
