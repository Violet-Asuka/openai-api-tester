import { TestResult, TestStatus } from "@/types/apiTypes"

const TEST_EXPRESSIONS = [
  { expression: "2 + 2", type: "basic" },
  { expression: "3x + 5 = 11", type: "equation" },
  { expression: "d/dx(x^2)", type: "derivative" },
  { expression: "P(A∩B) given P(A)=0.5, P(B)=0.3", type: "probability" },
  { expression: "√(16) + π", type: "complex" }
]

async function singleMathTest(
  baseUrl: string,
  apiKey: string,
  model: string,
  expression: string,
  operationType: string,
  signal: AbortSignal
): Promise<any> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ 
        role: 'user', 
        content: `Solve this ${operationType} math problem: ${expression}` 
      }],
      tools: [{
        type: "function",
        function: {
          name: "calculate_math",
          description: "Perform mathematical calculations",
          parameters: {
            type: "object",
            properties: {
              expression: { type: "string" },
              operation_type: {
                type: "string",
                enum: ["basic", "equation", "derivative", "probability", "complex"]
              }
            },
            required: ["expression", "operation_type"]
          }
        }
      }],
      tool_choice: "auto"
    }),
    signal
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function testMath(
  baseUrl: string,
  apiKey: string,
  model: string,
  signal: AbortSignal
): Promise<TestResult> {
  try {
    // Run concurrent tests
    const testPromises = TEST_EXPRESSIONS.map(({ expression, type }) => 
      singleMathTest(baseUrl, apiKey, model, expression, type, signal)
    )

    const results = await Promise.all(testPromises)

    // Analyze results
    const toolUsageResults = results.map((result, index) => {
      const toolCall = result.choices[0]?.message?.tool_calls?.[0]
      if (!toolCall) return { success: false, error: "No tool call made" }

      try {
        const args = JSON.parse(toolCall.function.arguments)
        return {
          expression: TEST_EXPRESSIONS[index].expression,
          type: TEST_EXPRESSIONS[index].type,
          toolUsed: true,
          args
        }
      } catch (e) {
        return { success: false, error: "Invalid tool call arguments" }
      }
    })

    const successRate = toolUsageResults.filter(r => r.toolUsed).length / TEST_EXPRESSIONS.length * 100

    // Create a properly formatted TestResult
    return {
      success: true,
      status: TestStatus.SUCCESS,
      response: {
        content: `Math test completed with ${successRate}% tool usage success rate`,
        type: 'math',
        timestamp: new Date().toISOString(),
        model: model,
        raw: {
          results: results,  // Store all raw results
          toolUsageResults: toolUsageResults
        },
        metrics: {
          successRate: `${successRate}%`,
          totalTests: TEST_EXPRESSIONS.length,
          successfulTests: toolUsageResults.filter(r => r.toolUsed).length
        },
        details: {
          expressions: toolUsageResults
        }
      }
    }
  } catch (error: any) {
    return {
      success: false,
      status: TestStatus.ERROR,
      error: error.message
    }
  }
} 