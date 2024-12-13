import { TestResult, TestStatus } from "@/types/apiTypes"

export async function testTemperature(
  baseUrl: string,
  apiKey: string,
  model: string,
  _prompt: string,
  signal?: AbortSignal
): Promise<TestResult> {
  try {
    const SINGLE_REQUEST_TIMEOUT = 30000;
    const FIXED_TEMPERATURE = 0.01;
    const ITERATIONS = 10;
    const SYSTEM_PROMPT = "You're an associative thinker. The user gives you a sequence of 6 numbers. Your task is to figure out and provide the 7th number directly, without explaining how you got there.";
    const USER_INPUT = "5, 15, 77, 19, 53, 54,";

    // Create array of test promises
    const testPromises = Array(ITERATIONS).fill(0).map(async (_, index) => {
      const start = performance.now();
      const requestController = new AbortController();
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
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: USER_INPUT }
            ],
            temperature: FIXED_TEMPERATURE
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim() || '';
        
        // Validate response format - should be a single number
        if (!content.match(/^-?\d+(\.\d+)?$/)) {
          throw new Error(`Invalid response format: ${content}`);
        }

        const end = performance.now();
        
        return {
          success: true,
          content,
          duration: (end - start) / 1000,
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

    const allResults = await Promise.all(testPromises);
    
    // Count failed requests
    const failedTests = allResults.filter(r => !r.success);
    if (failedTests.length > ITERATIONS * 0.2) { // If more than 20% failed
      return {
        success: false,
        status: TestStatus.ERROR,
        error: `Too many failed requests (${failedTests.length}/${ITERATIONS})`
      };
    }

    const successfulTests = allResults.filter(r => r.success) as Array<{
      success: true, 
      content: string, 
      duration: number, 
      index: number
    }>;

    // Calculate metrics
    const responses = successfulTests.map(r => r.content);
    const uniqueResponses = new Set(responses);
    const totalTime = successfulTests.reduce((sum, r) => sum + r.duration, 0);
    const avgTime = totalTime / successfulTests.length;
    const consistency = ((ITERATIONS - uniqueResponses.size + 1) / ITERATIONS) * 100;

    // Determine test status based on consistency and response validity
    let status = TestStatus.ERROR;
    let statusMessage = '';

    if (consistency === 100) {
      status = TestStatus.SUCCESS;
      statusMessage = 'Perfect consistency achieved';
    } else if (consistency >= 80) {
      status = TestStatus.INFO;
      statusMessage = 'Good consistency, but some variation present';
    } else if (consistency >= 60) {
      status = TestStatus.WARNING;
      statusMessage = 'Moderate consistency, significant variation detected';
    } else {
      status = TestStatus.ERROR;
      statusMessage = 'Poor consistency, test failed';
    }

    // Add error details for failed requests
    const errorDetails = failedTests.length > 0 ? {
      failedTests: failedTests.map(test => ({
        index: test.index,
        error: test.error
      }))
    } : {};

    return {
      success: true,
      status,
      response: {
        content: `Temperature Test Results (${FIXED_TEMPERATURE}):
• ${statusMessage}
• Consistency Rate: ${consistency.toFixed(1)}%
• Unique Responses: ${uniqueResponses.size}/${ITERATIONS}
• Average Response Time: ${avgTime.toFixed(3)}s
${failedTests.length > 0 ? `• Failed Requests: ${failedTests.length}/${ITERATIONS}` : ''}`,
        type: 'temperature',
        timestamp: new Date().toISOString(),
        model,
        raw: {
          temperatureDetails: {
            temperature: FIXED_TEMPERATURE,
            totalTests: ITERATIONS,
            successfulTests: successfulTests.length,
            uniqueResponses: uniqueResponses.size,
            consistencyRate: `${consistency.toFixed(1)}%`,
            averageResponseTime: `${avgTime.toFixed(3)}s`,
            testResults: successfulTests.map(r => ({
              testNumber: `Test ${r.index + 1}`,
              response: r.content,
              duration: `${r.duration.toFixed(3)}s`
            })),
            statistics: {
              totalTests: ITERATIONS,
              uniqueResponses: uniqueResponses.size,
              consistencyRate: `${consistency.toFixed(1)}%`,
              avgResponseTime: `${avgTime.toFixed(3)}s`
            },
            responses,
            ...errorDetails
          }
        }
      }
    };

  } catch (error: any) {
    if (error.name === 'AbortError' && signal?.aborted) {
      return {
        success: false,
        status: TestStatus.ABORTED,
        error: 'Test aborted by user'
      };
    }
    return {
      success: false,
      status: TestStatus.ERROR,
      error: error.message || 'Temperature consistency test failed'
    };
  }
} 