import { FC, useEffect, useState } from 'react';
import { useTestStore } from '@/store/testStore'
import { FunctionCall, TestResult, TestStatus } from '@/types/apiTypes'
import { colorThemes } from '@/types/theme'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface RawResponseProps {
  response: {
    content: string;
    type: string;
    timestamp: string;
    model: string;
    raw?: any;
    details?: {
      phases?: {
        functionCall?: FunctionCall;
        localExecution?: {
          result: any;
          timestamp: string;
        };
        finalResponse?: {
          content: string;
          timestamp: string;
        };
      };
      note?: string;
    };
  };
}

export const RawResponse: FC<RawResponseProps> = ({ response }) => {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <pre className="text-sm text-gray-800 whitespace-pre-wrap">
        {JSON.stringify(response.raw, null, 2)}
      </pre>
    </div>
  );
};

interface ModelStreamProps {
  modelId: string;
  content: string;
  isTyping: boolean;
  chunksCount: number;
}

const ModelStreamSection: FC<ModelStreamProps> = ({ modelId, content, isTyping, chunksCount }) => {
  const { theme } = useTestStore();
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorBlinkRate = 530;

  // Handle cursor blinking
  useEffect(() => {
    if (!isTyping) return;

    const intervalId = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, cursorBlinkRate);

    return () => clearInterval(intervalId);
  }, [isTyping]);

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${colorThemes[theme].border}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-900">
            Streaming Response
          </h3>
          <Badge variant="outline" className="text-xs">
            {modelId}
          </Badge>
        </div>
        <Badge variant="secondary" className="text-xs">
          {chunksCount} chunks
        </Badge>
      </div>
      <div className="prose max-w-none">
        <div className="font-mono whitespace-pre-wrap relative">
          {content}
          {isTyping && (
            <span 
              className={`absolute inline-block w-2 h-4 ml-0.5 -mb-0.5 bg-gray-800 ${
                cursorVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transition: 'opacity 0.2s' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const StreamSection: FC = () => {
  const { streamingState, selectedModels } = useTestStore();
  const [modelStreams, setModelStreams] = useState<Record<string, {
    content: string;
    isTyping: boolean;
    chunksCount: number;
  }>>({});

  // Initialize model streams
  useEffect(() => {
    if (streamingState.isStreaming) {
      const initialStreams = selectedModels.reduce((acc, modelId) => ({
        ...acc,
        [modelId]: {
          content: '',
          isTyping: true,
          chunksCount: 0
        }
      }), {});
      setModelStreams(initialStreams);
    }
  }, [streamingState.isStreaming, selectedModels]);

  // Update content for current model
  useEffect(() => {
    if (streamingState.content && streamingState.currentModel) {
      setModelStreams(prev => ({
        ...prev,
        [streamingState.currentModel as string]: {
          content: streamingState.content,
          isTyping: streamingState.isTyping,
          chunksCount: streamingState.chunks.length
        }
      }));
    }
  }, [streamingState.content, streamingState.currentModel, streamingState.isTyping, streamingState.chunks]);

  if (!streamingState.isStreaming) return null;

  return (
    <div className="space-y-4">
      {Object.entries(modelStreams).map(([modelId, stream]) => (
        <ModelStreamSection
          key={modelId}
          modelId={modelId}
          content={stream.content}
          isTyping={stream.isTyping}
          chunksCount={stream.chunksCount}
        />
      ))}
    </div>
  );
};

const MultiModelResults: FC = () => {
  const { multiModelResults, theme } = useTestStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  if (Object.keys(multiModelResults).length === 0) return null;

  const handleAccordionChange = (value: string[]) => {
    setExpandedItems(value);
  };

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${colorThemes[theme].border}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Multi-Model Test Results
      </h3>
      <Accordion 
        type="multiple" 
        className="space-y-2"
        value={expandedItems}
        onValueChange={handleAccordionChange}
      >
        {Object.entries(multiModelResults).map(([modelId, { result, timeElapsed, status }]) => (
          <AccordionItem key={modelId} value={modelId}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex justify-between items-center w-full pr-4">
                <h4 className="font-medium">{modelId}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={status === 'completed' ? 'secondary' : 'outline'}>
                    {status}
                  </Badge>
                  {timeElapsed && (
                    <span className="text-sm text-gray-600">
                      {(timeElapsed / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {result && <TestResultContent result={result} />}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

const LoadingSpinner: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-gray-600 font-medium">Running test...</p>
    </div>
  );
};

// Add new status display components
interface StatusDisplayProps {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string | React.ReactNode;
}

const StatusDisplay: FC<StatusDisplayProps> = ({ type, title, message }) => {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-400',
      title: 'text-green-800',
      message: 'text-green-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      message: 'text-blue-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      message: 'text-red-700'
    }
  }[type];

  const icons = {
    success: (
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    ),
    warning: (
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    ),
    info: (
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    ),
    error: (
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    )
  }[type];

  return (
    <div className={`p-4 ${styles.bg} border ${styles.border} rounded-lg`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            {icons}
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {title}
          </h3>
          <div className={`mt-1 text-sm ${styles.message}`}>
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};

// Replace the existing ErrorDisplay with StatusDisplay
const ErrorDisplay: FC<{ error: string }> = ({ error }) => (
  <StatusDisplay type="error" title="Test Error" message={error} />
);

// Add a helper function to format content
const formatContent = (content: string): React.ReactNode => {
  // Split by numbered list items (1. 2. 3. etc)
  const sections = content.split(/(\d+\.\s)/);
  
  return (
    <div className="space-y-2">
      {sections.map((section, index) => {
        // If it's a number prefix (1. 2. 3. etc)
        if (/^\d+\.\s$/.test(section)) {
          return (
            <div key={index} className="flex items-baseline">
              <span className="font-medium mr-2">{section}</span>
              {/* The next item in sections array is the content */}
              <span className="flex-1">{sections[index + 1]}</span>
            </div>
          );
        }
        // Skip the content sections as they're handled above
        return null;
      }).filter(Boolean)}
    </div>
  );
};

// 添加一个新的组件来展示延迟测试详情
const LatencyTestDetails: FC<{ details: any }> = ({ details }) => {
  return (
    <div className="space-y-4">
      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Total Tests</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{details.totalTests}</dd>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Successful</dt>
          <dd className="mt-1 text-lg font-semibold text-green-600">{details.successfulTests}</dd>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Failed</dt>
          <dd className="mt-1 text-lg font-semibold text-red-600">{details.failedTests}</dd>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
          <dd className="mt-1 text-lg font-semibold text-blue-600">
            {((details.successfulTests / details.totalTests) * 100).toFixed(1)}%
          </dd>
        </div>
      </div>

      {/* 延迟统计 */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Latency Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Average</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{details.average}ms</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Median</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{details.median}ms</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Min</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{details.min}ms</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Max</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{details.max}ms</dd>
          </div>
        </div>
      </div>

      {/* 样本详情 - 使用手风组件 */}
      <Accordion type="single" collapsible>
        <AccordionItem value="sample-details">
          <AccordionTrigger>
            <div className="flex justify-between items-center w-full">
              <span>Sample Details</span>
              <span className="text-sm text-gray-500">
                {details.samples.length} samples, {details.failures?.length || 0} failures
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {details.samples.map((sample: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sample.index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sample.latency}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                  {details.failures?.map((failure: any) => (
                    <tr key={`failure-${failure.index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {failure.index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500" colSpan={2}>
                        Failed: {failure.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// 添加温度测试详情组件
const TemperatureTestDetails: FC<{ details: any }> = ({ details }) => {
  return (
    <div className="space-y-4">
      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Temperature</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{details.temperature}</dd>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Total Tests</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{details.totalTests}</dd>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Successful Tests</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{details.successfulTests}</dd>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500">Consistency Rate</dt>
          <dd className="mt-1 text-lg font-semibold text-blue-600">{details.consistencyRate}</dd>
        </div>
      </div>

      {/* 响应详情 */}
      <Accordion type="single" collapsible>
        <AccordionItem value="response-details">
          <AccordionTrigger>
            <div className="flex justify-between items-center w-full">
              <span>Response Details</span>
              <span className="text-sm text-gray-500">
                {details.testResults.length} responses
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {details.testResults.map((result: { 
                    testNumber: string;
                    response: string;
                    duration: string;
                  }, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.testNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {result.response}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.duration}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 统计信息 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Statistics</h4>
        <dl className="grid grid-cols-2 gap-4">
          {Object.entries(details.statistics).map(([key, value]) => (
            <div key={key}>
              <dt className="text-sm font-medium text-gray-500">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

// 在 MultiModelResults 组件中修改结果展示部分
const TestResultContent: FC<{ result: TestResult }> = ({ result }) => {
  if (!result.response) return null;

  return (
    <div className="space-y-4">
      {/* 状态显示 - 使用 formatContent */}
      <StatusDisplay
        type={result.status === TestStatus.SUCCESS ? 'success' : 
              result.status === TestStatus.WARNING ? 'warning' : 
              result.status === TestStatus.INFO ? 'info' : 'error'}
        title={`Test ${result.status}`}
        message={formatContent(result.response.content)}
      />

      {/* 延迟测试详情 */}
      {result.response?.raw?.latencyDetails && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Latency Test Details</h4>
          <LatencyTestDetails details={result.response.raw.latencyDetails} />
        </div>
      )}

      {/* 指标数据 */}
      {result.response?.raw?.metrics && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Metrics</h4>
          <dl className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            {Object.entries(result.response.raw.metrics).map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm font-medium text-gray-500">{key}</dt>
                <dd className="mt-1 text-lg text-gray-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Raw Response Accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="raw-response">
          <AccordionTrigger>Raw Response</AccordionTrigger>
          <AccordionContent>
            <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(result.response.raw, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 温度测试详情 */}
      {result.response?.type === 'temperature' && result.response.raw?.temperatureDetails && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Temperature Test Details</h4>
          <TemperatureTestDetails details={result.response.raw.temperatureDetails} />
        </div>
      )}
    </div>
  );
};

export const ResultsSection = () => {
  const {
    testResult,
    loadingState,
    theme,
    multiModelResults,
    streamingState,
    resetTestResults,
    error
  } = useTestStore()

  // Helper function to check if we have any final results to display
  const hasResults = () => {
    return testResult?.response || Object.keys(multiModelResults).length > 0;
  }

  // Helper function to check if we have any errors to display
  const hasErrors = () => {
    return error || testResult?.error || Object.values(multiModelResults).some(result => result.status === 'error');
  }

  return (
    <div className={`h-full flex flex-col bg-white/60 backdrop-blur-xl shadow-md rounded-2xl border ${colorThemes[theme].border}`}>
      <div className="flex-none p-4 border-b flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">
          Results
        </h3>
        {(hasResults() || hasErrors()) && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => resetTestResults()}
          >
            Clear Results
          </Button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/50 hover:scrollbar-thumb-gray-300/70">
        {/* Always render StreamSection if streaming */}
        {streamingState.isStreaming && (
          <div className="mb-4">
            <StreamSection />
          </div>
        )}

        {/* Show loading, errors, or results */}
        {loadingState.type === 'test' && !streamingState.isStreaming ? (
          <div className={`p-4 bg-gray-50 rounded-lg ${colorThemes[theme].border}`}>
            <LoadingSpinner />
          </div>
        ) : hasErrors() ? (
          <div className="space-y-4">
            {/* Show global error if exists */}
            {error && <ErrorDisplay error={error} />}
            
            {/* Show test result error if exists */}
            {testResult?.error && <ErrorDisplay error={testResult.error} />}
            
            {/* Show multi-model errors if exist */}
            {Object.entries(multiModelResults)
              .filter(([_, result]) => result.status === 'error')
              .map(([modelId, result]) => (
                <div key={modelId} className="space-y-2">
                  <h4 className="font-medium text-red-800">{modelId}</h4>
                  <ErrorDisplay error={result.result.error || 'Unknown error'} />
                </div>
              ))}
          </div>
        ) : hasResults() ? (
          <div className="space-y-4">
            {/* Show multi-model results if available */}
            {Object.keys(multiModelResults).length > 0 && <MultiModelResults />}
            
            {/* Show single test result if available */}
            {testResult?.response && (
              <div className={`p-4 bg-white rounded-lg shadow ${colorThemes[theme].border}`}>
                {/* 状态显示 - 使用 formatContent */}
                <StatusDisplay
                  type={testResult.status === TestStatus.SUCCESS ? 'success' : 
                        testResult.status === TestStatus.WARNING ? 'warning' : 
                        testResult.status === TestStatus.INFO ? 'info' : 'error'}
                  title={`Test ${testResult.status}`}
                  message={formatContent(testResult.response.content)}
                />

                {/* 测试详情 - 根据测试类型显示不同内容 */}
                {testResult.response.type === 'latency' && testResult.response.raw?.latencyDetails && (
                  <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Latency Test Details</h4>
                    <LatencyTestDetails details={testResult.response.raw.latencyDetails} />
                  </div>
                )}

                {/* 通用指标数据 */}
                {testResult.response.raw?.metrics && (
                  <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Metrics</h4>
                    <dl className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      {Object.entries(testResult.response.raw.metrics).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-sm font-medium text-gray-500">{key}</dt>
                          <dd className="mt-1 text-lg text-gray-900">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Raw Response */}
                <Accordion type="single" collapsible className="mt-4">
                  <AccordionItem value="raw-response">
                    <AccordionTrigger>Raw Response</AccordionTrigger>
                    <AccordionContent>
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(testResult.response.raw, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        ) : !streamingState.isStreaming && (
          <div className={`p-4 bg-gray-50 rounded-lg ${colorThemes[theme].border}`}>
            <p className="text-gray-600 text-center">No test results yet. Run a test to see results here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
