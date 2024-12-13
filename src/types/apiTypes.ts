// 测试类型枚举
export type TestType = 'connection' | 'chat' | 'stream' | 'function' | 'image' | 'latency' | 'temperature' | 'math' | 'reasoning';

// 测试状态枚举
export enum TestStatus {
  SUCCESS = 'success',  // 测试完全成功
  INFO = 'info',       // 测试通过但有提示信息
  WARNING = 'warning', // 测试部分成功或有潜在问题
  ERROR = 'error',      // 测试失败
  ABORTED = 'aborted'   // 测试被中止
}

// 核心测试结果接口
export interface TestResult {
  success: boolean;
  status: TestStatus;
  error?: string;
  response?: TestResultResponse;
}

// 统一的测试响应接口
export interface TestResponse {
  // 通用字段
  content: string;           // 格式化的展示内容
  type: TestType;           // 测试类型
  timestamp: string;        // 测试时间戳
  model: string;           // 使用的模型

  // 原始响应数据
  raw: any;               // API 原始响应

  // 统一的指标接口
  metrics?: {
    [key: string]: number | string;  // 各类指标: 延迟、成功率等
  };

  // 测试详情
  details?: {
    [key: string]: any;    // 特定测试类型的详细信息
  };

  // 警告信息
  warnings?: string[];    // 测试过程中的警告信息
}

// 模型接口
export interface Model {
  id: string;
  // 其他模型属性...
}

// 函数调用接口
export interface FunctionCall {
  name: string;           // 函数名称
  arguments: any;         // 函数参数
  result: any;           // 函数执行结果
}

// 延迟测试详情接口
export interface LatencyDetails {
  totalTests: number;         // 总测试次数
  successfulTests: number;    // 成功测试次数
  failedTests: number;        // 失败测试次数
  average: string;           // 平均延迟
  median: string;           // 中位数延迟
  min: string;             // 最小延迟
  max: string;            // 最大延迟
  samples: Array<{        // 延迟样本
    index: number;
    latency: string;
    status?: TestStatus;  // 样本状态
  }>;
  failures?: Array<{      // 失败记录
    index: number;
    error: string;
  }>;
}

// 工具接口
export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: {
        [key: string]: {
          type: string;
          description: string;
          enum?: string[];
        };
      };
      required: string[];
    };
  };
}

// 图像生成响应接口
export interface ImageGenerationResponse {
  url?: string;           // 生成图像的URL
  b64_json?: string;      // Base64编码的图像数据
  revised_prompt?: string; // 修改后的提示词
}

// 温度测试详情接口
export interface TemperatureDetails {
  temperature: number;        // 温度参数
  totalTests: number;        // 总测试次数
  uniqueResponses: number;   // 唯一响应数量
  consistencyRate: string;   // 一致比率
  averageResponseTime: string; // 平均响应时间
  responses: Array<{         // 响应记录
    index: number;
    content: string;
    time: string;
  }>;
}

// 数学测试详情接口
export interface MathDetails {
  operation_type: string;    // 运算类型
  expression: string;       // 数学表达式
  result?: string;         // 计算结果
  error?: string;         // 错误信息
}

// 推理问题接口
export interface ReasoningQuestion {
  id: string;
  title: string;
  question: string;
  referenceAnswer: string;
  category: string;
  difficulty: "basic" | "intermediate" | "advanced";
  expectedConcepts: string[];
}

// 加载状态类型
export type LoadingType = 'test' | 'models' | 'questions' | null;

// 载状态接口
export interface LoadingState {
  type: LoadingType;
  canAbort: boolean;
}

// 流式响应接口
export interface StreamResponse {
  content: string;
  chunks: string[];
  type: 'stream';
}

// 响应处理器接口
export interface TestResponseHandler {
  formatContent(response: any): string;              // 格式化展示内容
  extractMetrics(response: any): Record<string, any>;// 提取指标
  extractDetails(response: any): Record<string, any>;// 提取详情
  validateResponse(response: any): string[];         // 验证并返回警告
}

// Enhanced streaming state interface
export interface StreamingState {
  isStreaming: boolean;
  content: string;
  isTyping: boolean;
  currentContent: string;
  showCursor: boolean;
  chunks: string[];
  typingSpeed?: number;
  cursorBlinkRate?: number;
  currentModel?: string;
}

interface TestResultResponse {
  content: string;
  type: string;
  timestamp: string;
  model: string;
  metrics?: Record<string, any>;
  raw?: {
    modelAnswer?: string;
    referenceAnswer?: string;
    metadata?: {
      category: string;
      difficulty: string;
      expectedConcepts: string[];
      timestamp: string;
      model: string;
    };
    apiResponse?: any;
    metrics?: Record<string, any>;
    temperatureDetails?: {
      temperature: number;
      totalTests: number;
      successfulTests: number;
      uniqueResponses: number;
      consistencyRate: string;
      averageResponseTime: string;
      testResults: Array<{
        testNumber: string;
        response: string;
        duration: string;
      }>;
      statistics: {
        totalTests: number;
        uniqueResponses: number;
        consistencyRate: string;
        avgResponseTime: string;
      };
      responses: string[];
    };
    latencyDetails?: {
      totalTests: number;
      successfulTests: number;
      failedTests: number;
      average: string;
      median: string;
      min: string;
      max: string;
      samples: Array<{
        index: number;
        latency: string;
      }>;
      failures?: Array<{
        index: number;
        error: string;
      }>;
    };
    error?: string;
    partialContent?: string;
    chunks?: string[];
  };
  details?: {
    phases?: {
      functionCall?: FunctionCall;
      localExecution?: { result: any; timestamp: string; };
      finalResponse?: { content: string; timestamp: string; };
    };
    note?: string;
    category?: string;
    difficulty?: string;
    expectedConcepts?: string[];
    referenceAnswer?: string;
  };
  phases?: {
    functionCall?: FunctionCall;
    localExecution?: { result: any; timestamp: string; };
    finalResponse?: { content: string; timestamp: string; };
  };
  note?: string;
  totalChunks?: number;
}