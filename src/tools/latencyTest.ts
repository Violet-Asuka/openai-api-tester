import { TestResult, TestStatus } from "@/types/apiTypes"

export async function testLatency(
  baseUrl: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal
): Promise<TestResult> {
  try {
    const iterations = 30;
    const SINGLE_REQUEST_TIMEOUT = 30000; // 30 seconds per request
    
    // Create array of test promises
    const testPromises = Array(iterations).fill(0).map(async (_, index) => {
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
            messages: [{ role: 'user', content: 'Only say hi' }],
            max_tokens: 10
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();
        const end = performance.now();
        return {
          success: true,
          latency: end - start,
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
    
    // Separate successful and failed requests
    const successfulTests = allResults.filter(r => r.success) as Array<{success: true, latency: number, index: number}>;
    const failedTests = allResults.filter(r => !r.success) as Array<{success: false, error: string, index: number}>;
    
    // Calculate statistics from successful tests
    const latencies = successfulTests.map(r => r.latency);
    const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const minLatency = latencies.length ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length ? Math.max(...latencies) : 0;
    
    // Calculate median
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const medianLatency = sortedLatencies.length ? 
      sortedLatencies.length % 2 === 0 
        ? (sortedLatencies[sortedLatencies.length/2 - 1] + sortedLatencies[sortedLatencies.length/2]) / 2
        : sortedLatencies[Math.floor(sortedLatencies.length/2)]
      : 0;

    // Format the response summary
    const summaryText = `Test Results:
Successful Requests: ${successfulTests.length}/${iterations}
Failed Requests: ${failedTests.length}/${iterations}
${successfulTests.length ? `
Average Latency: ${avgLatency.toFixed(0)}ms
Median Latency: ${medianLatency.toFixed(0)}ms
Min Latency: ${minLatency.toFixed(0)}ms
Max Latency: ${maxLatency.toFixed(0)}ms` : ''}
${failedTests.length ? `\nFailed Request Details:
${failedTests.map(f => `Request ${f.index + 1}: ${f.error}`).join('\n')}` : ''}`;

    const successRate = (successfulTests.length / iterations) * 100

    // Determine status based on success rate
    let status = TestStatus.ERROR
    if (successRate === 100) {
      status = TestStatus.SUCCESS
    } else if (successRate >= 80) {
      status = TestStatus.INFO
    } else if (successRate >= 60) {
      status = TestStatus.WARNING
    }

    return {
      success: successfulTests.length > 0,
      status,
      response: {
        content: summaryText,
        type: 'latency',
        timestamp: new Date().toISOString(),
        model,
        raw: {
          latencyDetails: {
            totalTests: iterations,
            successfulTests: successfulTests.length,
            failedTests: failedTests.length,
            average: avgLatency.toFixed(0),
            median: medianLatency.toFixed(0),
            min: minLatency.toFixed(0),
            max: maxLatency.toFixed(0),
            samples: successfulTests.map(r => ({
              index: r.index,
              latency: r.latency.toFixed(0)
            })),
            failures: failedTests.map(f => ({
              index: f.index,
              error: f.error
            }))
          }
        },
        metrics: {
          successRate: successRate.toFixed(1) + '%',
          avgLatency: avgLatency.toFixed(0) + 'ms',
          medianLatency: medianLatency.toFixed(0) + 'ms',
          minLatency: minLatency.toFixed(0) + 'ms',
          maxLatency: maxLatency.toFixed(0) + 'ms'
        }
      }
    };
  } catch (error: any) {
    if (error.name === 'AbortError' && signal?.aborted) {
      return {
        success: false,
        status: TestStatus.ERROR,
        error: 'Test aborted by user'
      };
    }
    return {
      success: false,
      status: TestStatus.ERROR,
      error: error.message || 'Latency test failed'
    };
  }
} 