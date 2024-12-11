import { TestResult, ReasoningQuestion } from '@/types/apiTypes';
import JSON5 from 'json5';

interface ReasoningData {
  questions: ReasoningQuestion[];
}

// 使用 Promise 来管理加载状态
let loadingPromise: Promise<ReasoningQuestion[]> | null = null;
let reasoningQuestions: ReasoningQuestion[] = [];

// 加载函数
async function loadReasoningQuestions(): Promise<ReasoningQuestion[]> {
  try {
    const response = await fetch('/reasonTest.JSON5');
    if (!response.ok) {
      throw new Error(`Failed to load questions: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const data = JSON5.parse(text) as ReasoningData;
    
    if (!Array.isArray(data.questions)) {
      throw new Error('Invalid data format: questions array not found');
    }
    
    reasoningQuestions = data.questions;
    return reasoningQuestions;
  } catch (error) {
    console.error('Failed to load reasoning questions:', error);
    return [];
  }
}

// 导出的获取问题函数
export async function getReasoningQuestions(): Promise<ReasoningQuestion[]> {
  if (reasoningQuestions.length > 0) {
    return reasoningQuestions;
  }

  if (!loadingPromise) {
    loadingPromise = loadReasoningQuestions();
  }

  return loadingPromise;
}

// 测试函数
export async function testReasoning(
  baseUrl: string,
  apiKey: string,
  model: string,
  questionId: string,
  signal?: AbortSignal
): Promise<TestResult> {
  if (!questionId) {
    throw new Error("Please select a question to test");
  }

  // 确保问题已加载
  const questions = await getReasoningQuestions();
  const question = questions.find(q => q.id === questionId);
  
  if (!question) {
    throw new Error("Question not found");
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable AI assistant. Please provide a clear, accurate, and concise answer to the following ${question.category} question. Focus on the key concepts: ${question.expectedConcepts.join(", ")}.`
          },
          {
            role: "user",
            content: question.question
          }
        ],
        temperature: 1
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const modelAnswer = data.choices[0].message.content;

    return {
      success: true,
      response: {
        content: modelAnswer,
        rawResponse: {
          modelAnswer,
          referenceAnswer: question.referenceAnswer,
          metadata: {
            category: question.category,
            difficulty: question.difficulty,
            expectedConcepts: question.expectedConcepts,
            timestamp: new Date().toISOString(),
            model: model
          },
          apiResponse: data
        }
      }
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Reasoning test failed: ${error.message}`);
    }
    throw error;
  }
} 