import { TestResult } from "@/types/apiTypes"

export async function testTemperature(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<TestResult> {
  try {
    const FIXED_TEMPERATURE = 0.01;
    const ITERATIONS = 10;
    const SINGLE_REQUEST_TIMEOUT = 30000;

    // Create array of test promises
    const testPromises = Array(ITERATIONS).fill(0).map(async (_, index) => {
      const start = performance.now();
      
      // Create an AbortController for this specific request
      const requestController = new AbortController();
      
      // Setup timeout for this specific request
      const timeoutId = setTimeout(() => {
        requestController.abort();
      }, SINGLE_REQUEST_TIMEOUT);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: signal ? signal : requestController.signal,
          body: JSON.stringify({
            model,
            messages: [{ 
              role: 'system',
              content: "You're an associative thinker. The user gives you a sequence of 6 numbers. Your task is to figure out and provide the 7th number directly, without explaining how you got there."
            }, {
              role: 'user', 
              content: prompt || '5, 15, 77, 19, 53, 54,'
            }],
            temperature: FIXED_TEMPERATURE
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        const end = performance.now();
        
        return {
          success: true,
          content,
          duration: end - start,
          index
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          index
        };
      } finally {
        clearTimeout(timeoutId);
      }
    });

    // Run all tests concurrently and collect results
    const allResults = await Promise.all(testPromises);
    
    // Ensure allResults is not undefined and has items
    if (!allResults?.length) {
      return {
        success: false,
        error: '没有收到任何测试结果'
      };
    }

    // Separate successful and failed requests with null checks
    const successfulTests = (allResults.filter(r => r && r.success) || []) as Array<{
      success: true, 
      content: string, 
      duration: number, 
      index: number
    }>;
    const failedTests = (allResults.filter(r => r && !r.success) || []) as Array<{
      success: false, 
      error: string, 
      index: number
    }>;

    // Ensure we have successful tests before calculating metrics
    if (!successfulTests.length) {
      return {
        success: false,
        error: '所有测试都失败了',
        response: {
          content: '一致性测试失败 - 没有成功的测试',
          rawResponse: {
            temperatureDetails: {
              temperature: FIXED_TEMPERATURE,
              totalTests: ITERATIONS,
              successfulTests: 0,
              failedTests: failedTests.length,
              uniqueResponses: 0,
              consistencyRate: "0%",
              averageResponseTime: "0ms",
              samples: [],
              failures: failedTests.map(f => ({
                index: f.index + 1,
                error: f.error
              }))
            }
          }
        }
      };
    }

    // Calculate consistency metrics with null checks
    const responses = successfulTests.map(r => r.content || '');
    const timings = successfulTests.map(r => r.duration || 0);
    const uniqueResponses = new Set(responses.filter(r => r));
    const totalTime = timings.reduce((a, b) => a + b, 0);
    
    const consistency = ((ITERATIONS - uniqueResponses.size + 1) / ITERATIONS) * 100;
    const avgTime = totalTime / successfulTests.length;

    // Evaluate consistency
    let consistencyRating;
    if (consistency === 100) {
      consistencyRating = "完全一致！在低温度设置下输出保持稳定。";
    } else if (consistency >= 80) {
      consistencyRating = "较高一致性。输出基本稳定，有少量变化。";
    } else {
      consistencyRating = "一致性较低。输出不稳定，可能需要检查模型或提示词。";
    }

    return {
      success: successfulTests.length > 0,
      response: {
        content: consistencyRating,
        rawResponse: {
          temperatureDetails: {
            temperature: FIXED_TEMPERATURE,
            totalTests: ITERATIONS,
            successfulTests: successfulTests.length,
            failedTests: failedTests.length,
            uniqueResponses: uniqueResponses.size,
            consistencyRate: consistency.toFixed(1) + "%",
            averageResponseTime: avgTime.toFixed(0) + "ms",
            samples: successfulTests.map(r => ({
              index: r.index + 1,
              content: r.content,
              time: r.duration.toFixed(0) + "ms"
            })),
            failures: failedTests.map(f => ({
              index: f.index + 1,
              error: f.error
            }))
          }
        }
      }
    };
  } catch (error: any) {
    if (error.name === 'AbortError' && signal?.aborted) {
      return {
        success: false,
        error: 'Test aborted by user'
      };
    }
    return {
      success: false,
      error: error.message || '温度一致性测试失败'
    };
  }
} 