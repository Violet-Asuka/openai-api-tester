export type TestType = 'connection' | 'chat' | 'stream' | 'function' | 'image' | 'latency' | 'temperature' | 'math' | 'reasoning';

export interface Model {
  id: string;
  // Add other model properties as needed
}

export interface FunctionCall {
  name: string;
  arguments: any;
  result: any;
}

export interface TestResponse {
  content: string;
  rawResponse: any;
  functionCall?: FunctionCall;
  latencyDetails?: {
    average: string;
    min: string;
    max: string;
    samples: string[];
  };
  imageUrl?: string;
  revisedPrompt?: string;
  temperatureDetails?: TemperatureDetails;
  mathDetails?: MathDetails;
}

interface RawResponse {
  warning?: boolean;
  mathDetails?: MathDetails;
  testResults?: MathTestResults;
  chunks?: string[];
  modelAnswer?: string;
  referenceAnswer?: string;
  similarity?: number;
  metadata?: {
    category: string;
    difficulty: string;
    expectedConcepts: string[];
    timestamp: string;
    model: string;
  };
  apiResponse: any;
}

export interface TestResult {
  success: boolean;
  error?: string;
  response?: {
    content?: string;
    rawResponse?: RawResponse;
    functionCall?: {
      name: string;
      arguments: any;
      result: any;
    };
  };
}

export interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
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

export interface ImageGenerationResponse {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface TemperatureDetails {
  temperature: number;
  totalTests: number;
  uniqueResponses: number;
  consistencyRate: string;
  averageResponseTime: string;
  responses: Array<{
    index: number;
    content: string;
    time: string;
  }>;
}

export interface MathDetails {
  operation_type: string;
  expression: string;
  result?: string;
  error?: string;
}

export interface MathTestResults {
  totalTests: number;
  successfulTests: number;
  accuracy: number;
  averageTime: number;
  results: Array<{
    name: string;
    description: string;
    success: boolean;
    timeTaken: number;
    details: TestResult;
    functionCallDetails?: {
      expectedType: string;
      actualType: string;
      expectedResult: string;
      actualResult: string;
    };
  }>;
}

export interface ReasoningQuestion {
  id: string;
  title: string;
  question: string;
  referenceAnswer: string;
  category: string;
  difficulty: "basic" | "intermediate" | "advanced";
  expectedConcepts: string[];
}

export interface ReasoningTestResult extends TestResult {
  modelAnswer?: string;
  similarity?: number;
  referenceAnswer?: string;
} 