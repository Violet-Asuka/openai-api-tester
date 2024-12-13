import { TestResult, TestStatus } from "@/types/apiTypes"

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
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API')
    }

    const content = data.choices[0].message.content
    
    return {
      success: true,
      status: TestStatus.SUCCESS,
      response: {
        content,
        type: 'chat',
        timestamp: new Date().toISOString(),
        model,
        raw: {
          apiResponse: data,
          metrics: {
            responseLength: content.length,
            timestamp: new Date().toISOString()
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    return {
      success: false,
      status: TestStatus.ERROR,
      error: error.message || 'Chat test failed',
      response: {
        content: '',
        type: 'chat',
        timestamp: new Date().toISOString(),
        model,
        raw: { error: error.message }
      }
    }
  }
} 