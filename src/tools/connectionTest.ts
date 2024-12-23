import { TestResult, TestStatus } from "@/types/apiTypes"

export async function testConnection(
  baseUrl: string, 
  apiKey: string, 
  model: string,
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
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      status: TestStatus.SUCCESS,
      response: {
        content: 'Connection successful',
        type: 'connection',
        timestamp: new Date().toISOString(),
        model,
        raw: data
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    return {
      success: false,
      status: TestStatus.ERROR,
      error: error.message || 'Connection test failed'
    }
  }
} 