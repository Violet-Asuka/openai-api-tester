import { TestResult, TestStatus, Tool, FunctionCall } from "@/types/apiTypes"

export async function testFunction(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  tools: Tool[],
  signal?: AbortSignal
): Promise<TestResult> {
  try {
    // Phase 1: Function Call Request
    // Send initial request with tools configuration
    const functionCallResponse = await fetch(`${baseUrl}/chat/completions`, {
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
          content: prompt 
        }],
        tools,
        tool_choice: 'auto',
        temperature: 0
      })
    })

    if (!functionCallResponse.ok) {
      throw new Error(`Function call request failed: ${functionCallResponse.status}`)
    }

    const functionCallData = await functionCallResponse.json()
    const toolCall = functionCallData.choices[0]?.message?.tool_calls?.[0]

    // Check if function calling is supported
    if (!toolCall) {
      const content = functionCallData.choices[0]?.message?.content?.toLowerCase() || ''
      if (content.includes('cannot') || content.includes('don\'t support') || 
          content.includes('not supported') || content.includes('unable to')) {
        throw new Error('Function calling is not supported by the current API or model')
      }

      // If no function call but normal response
      return {
        success: true,
        status: TestStatus.SUCCESS,
        response: {
          content: functionCallData.choices[0]?.message?.content || '',
          type: 'function',
          timestamp: new Date().toISOString(),
          model,
          raw: functionCallData,
          details: {
            note: 'Model chose not to use function calling'
          }
        }
      }
    }

    // Phase 2: Local Function Execution
    const functionArgs = JSON.parse(toolCall.function.arguments)
    const functionResult = {
      temperature: 20,
      conditions: "sunny",
      humidity: "65%",
      wind: "10 km/h"
    }

    // 创建 FunctionCall 对象
    const functionCallDetails: FunctionCall = {
      name: toolCall.function.name,
      arguments: functionArgs,
      result: functionResult
    }

    // Phase 3: Context Integration and Final Response
    // Send second request with function result context
    const contextResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt },
          { 
            role: 'system', 
            content: `Function ${toolCall.function.name} was called with arguments: ${JSON.stringify(functionArgs)}. 
                     Result: ${JSON.stringify(functionResult)}. 
                     Please provide a natural response based on this data.`
          }
        ],
        temperature: 0
      })
    })

    if (!contextResponse.ok) {
      throw new Error(`Context integration request failed: ${contextResponse.status}`)
    }

    const finalData = await contextResponse.json()
    
    // Return comprehensive test results
    return {
      success: true,
      status: TestStatus.SUCCESS,
      response: {
        content: finalData.choices[0]?.message?.content || '',
        type: 'function',
        timestamp: new Date().toISOString(),
        model,
        raw: {
          functionCall: functionCallData,
          contextResponse: finalData
        },
        details: {
          phases: {
            functionCall: functionCallDetails,
            localExecution: {
              result: functionResult,
              timestamp: new Date().toISOString()
            },
            finalResponse: {
              content: finalData.choices[0]?.message?.content,
              timestamp: new Date().toISOString()
            }
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
      error: error.message || 'Function test failed',
      details: {
        errorType: error.name,
        timestamp: new Date().toISOString()
      }
    }
  }
} 