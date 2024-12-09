import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, ChevronDown, Timer } from "lucide-react"
import { TestResult, TestType, ReasoningTestResult } from "@/types/apiTypes"
import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"

interface ResultsSectionProps {
  testResult: TestResult | null;
  isStreaming: boolean;
  streamContent: string;
  testType: TestType;
  loading: boolean;
  onAbort: () => void;
  canAbort: boolean;
  timeElapsed: number;
  setTimeElapsed: (time: number | ((prev: number) => number)) => void;
}

export function ResultsSection({
  testResult,
  isStreaming,
  streamContent,
  testType,
  loading,
  onAbort,
  canAbort,
  timeElapsed,
  setTimeElapsed
}: ResultsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [progress, setProgress] = useState(0)
  const TIMEOUT_DURATION = 30
  const hasReset = useRef(false)
  
  // 计算超时状态
  const isTimeout = timeElapsed >= TIMEOUT_DURATION

  useEffect(() => {
    let progressInterval: NodeJS.Timeout
    let timeoutInterval: NodeJS.Timeout

    if (loading) {
      if (!hasReset.current) {
        setProgress(0)
        setTimeElapsed(0)
        hasReset.current = true
      }

      progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 15
          return Math.min(prev + increment, 90)
        })
      }, 1000)

      timeoutInterval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1
          if (newTime >= TIMEOUT_DURATION) {
            clearInterval(progressInterval)
            clearInterval(timeoutInterval)
            onAbort()
          }
          return newTime
        })
      }, 1000)
    } else {
      setProgress(100)
      hasReset.current = false
    }

    return () => {
      clearInterval(progressInterval)
      clearInterval(timeoutInterval)
    }
  }, [loading, onAbort, setTimeElapsed, TIMEOUT_DURATION])

  const getStatusText = () => {
    if (loading) return `Testing ${testType}...`
    if (!testResult) return "Ready"
    if (isTimeout) return "Test Timed Out"
    if (testResult.error?.includes('aborted by user')) return "Test Aborted"
    return testResult.success ? "Test Complete" : "Test Failed"
  }

  const getErrorText = () => {
    if (!testResult?.error) return null
    if (isTimeout) {
      return "Request timed out after 30 seconds"
    }
    if (testResult.error?.includes('aborted by user')) {
      return "Test aborted by user"
    }
    return testResult.error
  }

  // 添加进度指示器组件
  const ProgressIndicator = () => (
    <div className="mb-6 space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {loading ? (
            <Timer className="h-4 w-4 animate-pulse text-blue-500" />
          ) : testResult?.success ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : testResult ? (
            <AlertCircle className={`h-4 w-4 ${
              isTimeout ? 'text-orange-500' : 'text-red-500'
            }`} />
          ) : null}
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {loading ? `${timeElapsed}s / 30s` : 
             testResult ? `Completed in ${timeElapsed}s` : ""}
          </span>
          {canAbort && (
            <Button
              onClick={onAbort}
              variant="destructive"
              size="sm"
              className="h-7 px-3"
            >
              Abort
            </Button>
          )}
        </div>
      </div>
      {(loading || testResult) && (
        <Progress 
          value={progress} 
          className={`h-2 ${isTimeout ? 'bg-orange-100' : ''}`} 
        />
      )}
      {testResult?.error && (
        <div className={`text-sm ${
          isTimeout ? 'text-orange-500' : 'text-red-500'
        }`}>
          {getErrorText()}
        </div>
      )}
    </div>
  )

  // Add this helper function at the top of the component
  const formatLatencyResponse = (response: any) => {
    if (!response?.rawResponse?.latencyDetails) return response?.content;
    
    const details = response.rawResponse.latencyDetails;
    const successRate = ((details.successfulTests / details.totalTests) * 100).toFixed(1);
    
    return (
      <div className="space-y-4">
        {/* Summary Section */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-medium">Success Rate: {successRate}%</div>
            <div className="text-sm text-gray-500">
              ({details.successfulTests}/{details.totalTests} requests successful)
            </div>
          </div>
          {details.failedTests > 0 && (
            <div className="text-red-500">
              {details.failedTests} Failed Requests
            </div>
          )}
        </div>

        {/* Latency Statistics */}
        {details.successfulTests > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Average', value: details.average },
              { label: 'Median', value: details.median },
              { label: 'Min', value: details.min },
              { label: 'Max', value: details.max }
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">{stat.label}</div>
                <div className="text-lg font-medium">{stat.value}ms</div>
              </div>
            ))}
          </div>
        )}

        {/* Failed Requests Details */}
        {details.failedTests > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Failed Requests:</div>
            <div className="space-y-2">
              {details.failures.map((failure: any) => (
                <div key={failure.index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  Request {failure.index + 1}: {failure.error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Successful Requests Details */}
        {details.successfulTests > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Successful Requests:</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {details.samples.map((sample: any) => (
                <div key={sample.index} className="text-sm bg-green-50 p-2 rounded">
                  Request {sample.index + 1}: {sample.latency}ms
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  function formatTemperatureResponse(response: any) {
    if (!response?.rawResponse?.temperatureDetails) {
      return response?.content;
    }

    const details = response.rawResponse.temperatureDetails;

    return {
      title: '温度一致性测试结果',
      sections: [
        {
          title: '测试概况',
          items: [
            { label: '温度设置', value: details.temperature },
            { label: '总测试次数', value: details.totalTests },
            { label: '成功测试', value: details.successfulTests },
            { label: '失败测试', value: details.failedTests },
            { label: '独特响应数', value: details.uniqueResponses },
            { label: '一致性比率', value: details.consistencyRate },
            { label: '平均响应时间', value: details.averageResponseTime }
          ]
        },
        details.samples?.length > 0 ? {
          title: '测试样本',
          items: details.samples.map((sample: any) => ({
            label: `测试 ${sample.index}`,
            value: `${sample.content} (${sample.time})`
          }))
        } : null,
        details.failures?.length > 0 ? {
          title: '失败记录',
          items: details.failures.map((failure: any) => ({
            label: `测试 ${failure.index}`,
            value: failure.error
          }))
        } : null
      ].filter(Boolean)
    };
  }

  // Add this helper function near the top of the component
  function renderTemperatureResponse(response: any) {
    if (!response?.title || !response?.sections) {
      return JSON.stringify(response);
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{response.title}</h3>
        {response.sections.map((section: any, index: number) => (
          section && (
            <div key={index} className="space-y-2">
              <h4 className="font-medium">{section.title}</h4>
              <div className="space-y-1">
                {section.items.map((item: any, itemIndex: number) => (
                  <div key={itemIndex} className="flex justify-between">
                    <span className="text-gray-600">{item.label}:</span>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    );
  }

  function formatMathResponse(response: any) {
    const details = response?.rawResponse?.mathDetails;
    const testResults = response?.rawResponse?.testResults;
    
    // 如果有批量测试结果，优先显示批量测试结果
    if (testResults) {
      return (
        <div className="space-y-6">
          {/* 总体统计 */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Tests', value: testResults.totalTests },
              { label: 'Successful', value: testResults.successfulTests },
              { label: 'Accuracy', value: `${testResults.accuracy.toFixed(1)}%` },
              { label: 'Avg Time', value: `${(testResults.averageTime / 1000).toFixed(2)}s` }
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">{stat.label}</div>
                <div className="text-lg font-medium">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* 详细测试结果 */}
          <div className="space-y-4">
            {testResults.results.map((result: any, index: number) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                result.success ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{result.name}</h4>
                    <p className="text-sm text-gray-600">{result.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Pass' : 'Fail'}
                  </span>
                </div>
                
                {result.functionCallDetails && (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">Expected Type:</span>
                        <span className="ml-2">{result.functionCallDetails.expectedType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Actual Type:</span>
                        <span className="ml-2">{result.functionCallDetails.actualType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Expected Result:</span>
                        <span className="ml-2">{result.functionCallDetails.expectedResult}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Actual Result:</span>
                        <span className="ml-2">{result.functionCallDetails.actualResult}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-sm text-gray-500">
                  Time: {(result.timeTaken / 1000).toFixed(2)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 如果只有单次测试结果，显示单次测试结果
    if (details) {
      return (
        <div className="space-y-4">
          {/* 原有的单次测试结果展示逻辑 */}
        </div>
      );
    }

    return response?.content;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <ProgressIndicator />
        {testResult && (
          <div className="space-y-4">
            {/* Result Card */}
            <Card className={`border-l-4 ${
              testResult.success ? "border-l-green-500" : 
              isTimeout ? "border-l-orange-500" :
              testResult.response?.rawResponse?.warning ? "border-l-yellow-500" : 
              "border-l-red-500"
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className={`h-5 w-5 ${
                      isTimeout ? 'text-orange-500' : 'text-red-500'
                    }`} />
                  )}
                  <CardTitle className="text-lg">
                    {testResult.success ? "Test Successful" : 
                     isTimeout ? "Test Timed Out" :
                     testResult.response?.rawResponse?.warning ? "Test Warning" : 
                     "Test Failed"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {testResult.success || testResult.response?.rawResponse?.warning ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Response:</h4>
                      {isStreaming ? (
                        <div className="relative">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {streamContent}
                            <span className="animate-pulse">▋</span>
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {testType === 'latency' ? (
                            formatLatencyResponse(testResult.response)
                          ) : testType === 'temperature' ? (
                            renderTemperatureResponse(formatTemperatureResponse(testResult.response))
                          ) : testType === 'math' ? (
                            formatMathResponse(testResult.response)
                          ) : testType === 'reasoning' ? (
                            <div className="space-y-4">
                              {/* Cast testResult and access the correct data structure */}
                              {(() => {
                                const modelAnswer = testResult.response?.rawResponse?.modelAnswer;
                                const referenceAnswer = testResult.response?.rawResponse?.referenceAnswer;
                                const metadata = testResult.response?.rawResponse?.metadata;
                                
                                return (
                                  <>
                                    <div className="bg-white p-4 rounded-lg shadow">
                                      <h3 className="font-medium">Model Answer:</h3>
                                      <p className="mt-2">{modelAnswer}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow">
                                      <h3 className="font-medium">Reference Answer:</h3>
                                      <p className="mt-2">{referenceAnswer}</p>
                                    </div>
                                    {metadata && (
                                      <div className="bg-white p-4 rounded-lg shadow">
                                        <h3 className="font-medium">Metadata:</h3>
                                        <div className="mt-2 space-y-1">
                                          <p><span className="font-medium">Category:</span> {metadata.category}</p>
                                          <p><span className="font-medium">Difficulty:</span> {metadata.difficulty}</p>
                                          <p><span className="font-medium">Expected Concepts:</span> {metadata.expectedConcepts.join(", ")}</p>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <p>{testResult.response?.content}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Function Call Details */}
                    {testResult.success && testResult.response?.functionCall && (
                      <div className="mt-4 space-y-3">
                        <div className="p-4 bg-gray-100 rounded-lg">
                          <h4 className="font-medium mb-2">Function Call Details:</h4>
                          <div className="space-y-2">
                            <p>
                              <span className="font-medium">Function:</span> {testResult.response.functionCall.name}
                            </p>
                            <div>
                              <p className="font-medium">Arguments:</p>
                              <pre className="mt-1 p-2 bg-gray-50 rounded text-sm">
                                {JSON.stringify(testResult.response.functionCall.arguments, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="font-medium">Result:</p>
                              <pre className="mt-1 p-2 bg-gray-50 rounded text-sm">
                                {JSON.stringify(testResult.response.functionCall.result, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-red-600">{testResult.error}</p>
                )}
              </CardContent>
            </Card>

            {/* Raw Response Section */}
            <div className="bg-gray-50 rounded-lg">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="flex items-center text-sm font-medium">
                  <ChevronDown
                    className={`h-4 w-4 mr-2 transition-transform duration-200 ${
                      isExpanded ? "transform rotate-180" : ""
                    }`}
                  />
                  View Raw Response
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <pre className="p-4 bg-gray-100 rounded-md text-sm overflow-auto max-h-96">
                    {testType === 'stream' 
                      ? testResult.response?.rawResponse?.chunks?.join('\n')
                      : JSON.stringify(testResult.response?.rawResponse ?? testResult.response, null, 2)
                    }
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
