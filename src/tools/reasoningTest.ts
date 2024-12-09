import { TestResult, ReasoningQuestion } from '@/types/apiTypes';

const reasoningQuestions: ReasoningQuestion[] = [
  {
    id: "1",
    title: "汉字构造 - 笪",
    question: "竹字头下面一个旦是什么字?",
    referenceAnswer: `竹字头下面一个旦是"笪"字。
"笪"（dá）是一个汉字，主要用作姓氏。在中国古代，有一些人姓笪，现在仍有人使用这个姓氏，但比较少见。
这个字的结构是：
- 上部是"竹"部首
- 下部是"旦"`,
    category: "language",
    difficulty: "basic",
    expectedConcepts: ["汉字结构", "部首", "姓氏"]
  },
  {
    id: "2",
    title: "密码破译 - 翻转谜题",
    question: '有一天，美國中情局收到一封可疑的匿名信，打開里面有張字條:" qS lHS IN" 美國專家破譯了好久也沒成功，只能請教中國專家。中國專家看了一眼就說:"你看反了"。这个字条是什么意思？',
    referenceAnswer: `让我帮你解开这个有趣的谜题。

这是一个翻转的谜语。如果把纸条倒过来看，"qS lHS IN" 翻转后就变成:

"NI SHI sb"

这看起来像是"NI SHI SB"的变体，意思是"你是SB"（一个不太礼貌的短语）。

这个谜语的巧妙之处在于:
1. 利用了字母的翻转特性
2. 小写字母"l"翻转后看起来像大写字母"I"
3. 小写字母"b"翻转后看起来像小写字母"q"`,
    category: "puzzle",
    difficulty: "intermediate",
    expectedConcepts: ["字符翻转", "密码破译", "视觉思维"]
  },
  {
    id: "3",
    title: "字母计数 - Strawberry",
    question: "How many 'r' in \"Strawberry\"?",
    referenceAnswer: `Let me count the 'r' letters in "Strawberry" by marking each one:

Str(1)awber(2)r(3)y

There are 3 'r' letters in "Strawberry".`,
    category: "language",
    difficulty: "basic",
    expectedConcepts: ["letter counting", "pattern recognition"]
  },
  {
    id: "4",
    title: "时效新闻 - 小米汽车",
    question: "小米汽车Su7具体是什么日期发布的?有几个型号?售价是多少?",
    referenceAnswer: `根据您提供的信息，小米汽车SU7于2023年12月28日举行了技术发布会, 于2024年3月21日正式发布销售，我可以分享一些主要信息： 
此车型分为三个版本： 
1. SU7标准版 
2. SU7 Pro版 
3. SU7 Max版  
关于售价： 
• SU7标准版：215,900元 
• SU7 Pro版：249,900元 
• SU7 Max版：299,900元`,
    category: "product",
    difficulty: "basic",
    expectedConcepts: ["产品信息", "价格", "型号"]
  },
  {
    id: "5",
    title: "逻辑推理 - 家庭关系",
    question: "爱丽丝有M个姐妹,爱丽丝的兄弟有多少个姐妹?",
    referenceAnswer: `让我们一步步思考这个问题：

1. 首先，我们知道爱丽丝有M个姐妹
2. 对于爱丽丝的兄弟来说：
   - 他们的姐妹包括爱丽丝本人
   - 他们的姐妹还包括爱丽丝的所有姐妹（也就是M个）

3. 所以爱丽丝的兄弟的姐妹总数是：
   - 爱丽丝本人（1个）
   - 加上爱丽丝的姐妹（M个）
   - 总共是：M + 1 个姐妹

因此，爱丽丝的兄弟有 M + 1 个姐妹。`,
    category: "logic",
    difficulty: "intermediate",
    expectedConcepts: ["逻辑推理", "数学思维", "家庭关系"]
  }
];

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

  const question = reasoningQuestions.find(q => q.id === questionId);
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

export function getReasoningQuestions() {
  return reasoningQuestions;
} 