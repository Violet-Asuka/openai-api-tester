import { TestResult, TestStatus, ReasoningQuestion } from '@/types/apiTypes';
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
    console.log('Fetching questions...');
    const response = await fetch('/reasonTest.JSON5', {
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to load questions: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const text = await response.text();
    console.log('Received text:', text.substring(0, 100) + '...');
    
    const data = JSON5.parse(text) as ReasoningData;
    console.log('Parsed questions count:', data.questions?.length);
    
    if (!Array.isArray(data.questions)) {
      console.error('Invalid data format: questions array not found');
      return [];
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
  try {
    if (reasoningQuestions.length > 0) {
      return reasoningQuestions;
    }

    if (!loadingPromise) {
      loadingPromise = loadReasoningQuestions();
    }

    const questions = await loadingPromise;
    
    // 重置 loadingPromise 如果加载失败
    if (questions.length === 0) {
      loadingPromise = null;
    }
    
    return questions;
  } catch (error) {
    console.error('Error getting reasoning questions:', error);
    loadingPromise = null;
    return [];
  }
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
      status: TestStatus.SUCCESS,
      response: {
        content: modelAnswer,
        type: 'reasoning',
        timestamp: new Date().toISOString(),
        model,
        raw: {
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
        },
        details: {
          category: question.category,
          difficulty: question.difficulty,
          expectedConcepts: question.expectedConcepts,
          referenceAnswer: question.referenceAnswer
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