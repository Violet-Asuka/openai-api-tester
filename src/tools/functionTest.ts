import { TestResult, Tool } from "@/types/apiTypes"

export async function testFunction(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  tools: Tool[],
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
          content: prompt || 'What\'s the weather like in London?'
        }],
        tools,
        tool_choice: 'auto'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const functionCall = data.choices[0]?.message?.tool_calls?.[0]
    
    return {
      success: true,
      response: {
        content: data.choices[0]?.message?.content || '',
        functionCall: functionCall ? {
          name: functionCall.function.name,
          arguments: JSON.parse(functionCall.function.arguments),
          result: { temperature: 20, conditions: "sunny" } // 模拟结果
        } : undefined,
        rawResponse: data
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    return {
      success: false,
      error: error.message || 'Function test failed'
    }
  }
} 