import { TestResult } from "@/types/apiTypes";
import { testMath } from "./mathTest";

interface TestCase {
  name: string;
  prompt: string;
  expectedType: string;
  expectedResult: string;
  description: string;
}

export class MathTestManager {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private signal?: AbortSignal;

  constructor(baseUrl: string, apiKey: string, model: string, signal?: AbortSignal) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.signal = signal;
  }

  private readonly testCases: TestCase[] = [
    {
      name: "基础运算",
      prompt: "Calculate 15 * 27 + 49 / 7",
      expectedType: "basic",
      expectedResult: "412",
      description: "测试基本的四则运算"
    },
    {
      name: "方程求解",
      prompt: "Solve the equation: 3x + 7 = 22",
      expectedType: "equation",
      expectedResult: "x = 5",
      description: "测试一元一次方程求解"
    },
    {
      name: "概率计算",
      prompt: "What is the probability of getting a sum of 7 when rolling two dice?",
      expectedType: "probability",
      expectedResult: "6/36",
      description: "测试概率计算场景"
    },
    {
      name: "求导运算",
      prompt: "Find the derivative of x^3 + 2*x^2 - 5*x + 3",
      expectedType: "derivative",
      expectedResult: "3x^2 + 4x - 5",
      description: "测试多项式求导"
    },
    {
      name: "复杂计算",
      prompt: "Calculate √(169) * log₁₀(100) + π^2",
      expectedType: "complex",
      expectedResult: "35.87",
      description: "测试复杂数学表达式"
    },
    {
      name: "三角函数",
      prompt: "Calculate sin(π/2) + cos(0)",
      expectedType: "complex",
      expectedResult: "2",
      description: "测试三角函数计算"
    },
    {
      name: "对数运算",
      prompt: "Calculate ln(e^2) + log₁₀(1000)",
      expectedType: "complex",
      expectedResult: "5",
      description: "测试对数运算"
    }
  ];

  private formatTestProgress(current: number, total: number): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((percentage / 100) * 40);
    const empty = 40 - filled;
    return `[${'='.repeat(filled)}${'-'.repeat(empty)}] ${percentage}%`;
  }

  private async runSingleTest(testCase: TestCase): Promise<{
    success: boolean;
    result: TestResult;
    timeTaken: number;
    functionCallDetails?: {
      expectedType: string;
      actualType: string;
      expectedResult: string;
      actualResult: string;
    };
  }> {
    const startTime = performance.now();
    const result = await testMath(
      this.baseUrl,
      this.apiKey,
      this.model,
      this.signal || new AbortController().signal
    );
    const timeTaken = performance.now() - startTime;

    const mathResult = result.response?.functionCall?.result;
    const success = result.success && 
                   mathResult?.operation_type === testCase.expectedType &&
                   mathResult?.result === testCase.expectedResult;

    return {
      success,
      result,
      timeTaken,
      functionCallDetails: mathResult ? {
        expectedType: testCase.expectedType,
        actualType: mathResult.operation_type,
        expectedResult: testCase.expectedResult,
        actualResult: mathResult.result || ''
      } : undefined
    };
  }

  public async runAllTests(
    onProgress?: (progress: number, total: number) => void
  ): Promise<{
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
  }> {
    console.log("开始数学函数调用测试...");
    
    const results = [];
    let successfulTests = 0;
    let totalTime = 0;

    for (let i = 0; i < this.testCases.length; i++) {
      const testCase = this.testCases[i];
      onProgress?.(i, this.testCases.length);

      console.log(`\n测试 ${testCase.name} (${testCase.description})`);
      console.log(this.formatTestProgress(i + 1, this.testCases.length));

      try {
        const { success, result, timeTaken, functionCallDetails } = 
          await this.runSingleTest(testCase);
        
        if (success) {
          successfulTests++;
        }

        totalTime += timeTaken;
        results.push({
          name: testCase.name,
          description: testCase.description,
          success,
          timeTaken,
          details: result,
          functionCallDetails
        });

      } catch (error) {
        results.push({
          name: testCase.name,
          description: testCase.description,
          success: false,
          timeTaken: 0,
          details: {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }
        });
      }
    }

    onProgress?.(this.testCases.length, this.testCases.length);

    const accuracy = (successfulTests / this.testCases.length) * 100;
    const averageTime = totalTime / this.testCases.length;

    return {
      totalTests: this.testCases.length,
      successfulTests,
      accuracy,
      averageTime,
      results
    };
  }
} 