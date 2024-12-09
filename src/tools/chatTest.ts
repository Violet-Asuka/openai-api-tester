import { TestResult } from "@/types/apiTypes"

export async function testChat(
  baseUrl: string, 
  apiKey: string, 
  model: string, 
  prompt: string,
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
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      response: {
        content: data.choices[0]?.message?.content || '',
        rawResponse: data
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    return {
      success: false,
      error: error.message || 'Chat test failed'
    }
  }
} 