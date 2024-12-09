import { TestResult } from "@/types/apiTypes"

interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onContent: (content: string) => void
  onHasContent: (hasContent: boolean) => void
}

export async function testStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  callbacks: {
    onChunk: (chunk: string) => void
    onContent: (content: string) => void
    onHasContent: (hasContent: boolean) => void
  },
  signal?: AbortSignal
): Promise<TestResult> {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [{ 
          role: 'user', 
          content: prompt || 'Say hello!'
        }],
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let content = ''
    const chunks: string[] = []

    if (!reader) {
      throw new Error('No reader available')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      chunks.push(chunk)
      callbacks.onChunk(chunk)

      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6))
            const delta = data.choices[0]?.delta?.content || ''
            content += delta
            callbacks.onContent(content)
            if (delta) callbacks.onHasContent(true)
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return {
      success: true,
      response: {
        content,
        rawResponse: { chunks }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    return {
      success: false,
      error: error.message || 'Stream test failed'
    }
  }
} 