import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, ChevronDown, Timer } from "lucide-react"
import { TestResult, TestType, LoadingState } from "@/types/apiTypes"
import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import { ColorTheme, ThemeColors } from '@/types/theme'

interface ResultsSectionProps {
  testResult: TestResult | null;
  isStreaming: boolean;
  streamContent: string;
  testType: TestType;
  loadingState: LoadingState;
  onAbort: () => void;
  timeElapsed: number;
  setTimeElapsed: (time: number | ((prev: number) => number)) => void;
  theme: ColorTheme;
  themeColors: ThemeColors;
}

// Add type for reasoning test response
interface ReasoningResponse {
  modelAnswer: string;
  referenceAnswer: string;
  metadata: {
    category: string;
    difficulty: string;
    expectedConcepts: string[];
    score?: number;
    feedback?: string;
  };
}

export function ResultsSection({
  testResult,
  isStreaming,
  streamContent,
  testType,
  loadingState,
  onAbort,
  timeElapsed,
  setTimeElapsed,
  themeColors,
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

    if (loadingState.type === 'test') {
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
  }, [loadingState.type, onAbort, setTimeElapsed, TIMEOUT_DURATION])

  const getStatusText = () => {
    if (loadingState.type === 'models') return "Loading models..."
    if (loadingState.type === 'test') return `Testing ${testType}...`
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

  // 添加进度指示器组
  const ProgressIndicator = () => (
    <div className="mb-6 space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {loadingState.type ? (
            <Timer className="h-4 w-4 animate-pulse text-blue-500" />
          ) : testResult?.success ? (
            <Check className={`h-4 w-4 ${themeColors.accent}`} />
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
            {loadingState.type === 'test' ? `${timeElapsed}s / 30s` : 
             testResult ? `Completed in ${timeElapsed}s` : ""}
          </span>
          {loadingState.canAbort && (
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
      {(loadingState.type || testResult) && (
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
            { label: '温度置', value: details.temperature },
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
    
    // 如果有批量测试结果，优先��示批量测试结果
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

  // Update the reasoning result rendering section
  function formatReasoningResponse(response: any) {
    const reasoningResponse = response?.rawResponse as ReasoningResponse;
    
    if (!reasoningResponse) {
      return response?.content;
    }

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium">Model Answer:</h3>
          <p className="mt-2">{reasoningResponse.modelAnswer}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium">Reference Answer:</h3>
          <p className="mt-2">{reasoningResponse.referenceAnswer}</p>
        </div>

        {reasoningResponse.metadata && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium">Analysis:</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">Category:</span> {reasoningResponse.metadata.category}</p>
              <p><span className="font-medium">Difficulty:</span> {reasoningResponse.metadata.difficulty}</p>
              <p><span className="font-medium">Expected Concepts:</span> {reasoningResponse.metadata.expectedConcepts.join(", ")}</p>
              {reasoningResponse.metadata.score !== undefined && (
                <p><span className="font-medium">Score:</span> {reasoningResponse.metadata.score}/100</p>
              )}
              {reasoningResponse.metadata.feedback && (
                <div>
                  <span className="font-medium">Feedback:</span>
                  <p className="mt-1 text-gray-600">{reasoningResponse.metadata.feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`h-full flex flex-col bg-white/60 backdrop-blur-xl shadow-md rounded-2xl border ${themeColors.border}`}>
      <CardHeader className="flex-none pb-4">
        <CardTitle className="text-xl font-semibold text-gray-800">
          Results
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {/* Add scrollable container with custom scrollbar */}
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-violet-200/50 scrollbar-track-transparent pr-2">
          <div className="space-y-6">
            <ProgressIndicator />
            {testResult && (
              <div className="space-y-6">
                {/* Result Card */}
                <Card className={`border-none shadow-md rounded-2xl overflow-hidden ${
                  testResult.success 
                    ? `bg-gradient-to-r ${themeColors.background} border ${themeColors.border}` 
                    : "bg-gradient-to-r from-rose-50/80 to-red-50/80 border border-rose-100/30"
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      {testResult.success ? (
                        <Check className={`h-5 w-5 ${themeColors.accent}`} />
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
                                formatReasoningResponse(testResult.response)
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
                <div className={`bg-white/60 backdrop-blur-sm rounded-2xl border ${themeColors.border}`}>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-full px-6 py-4 flex items-center justify-between ${themeColors.button} rounded-xl transition-all duration-200`}
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
                    <div className="px-6 pb-6">
                      <pre className={`p-4 bg-gradient-to-br ${themeColors.background} backdrop-blur-sm rounded-xl ring-1 ${themeColors.border} text-sm overflow-auto max-h-96`}>
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
