import { TestResult, TestStatus } from "@/types/apiTypes"

export interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onContent: (content: string) => void
  onHasContent: (hasContent: boolean) => void
  onFirstChunk: () => void
  onRawChunk?: (chunk: string) => void
}

export interface StreamResponse {
  content: string;
  rawResponse: {
    chunks: string[];
  };
}

export async function testStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<TestResult> {
  const chunks: string[] = [];
  let fullContent = '';
  let startTime = Date.now();

  try {
    callbacks.onHasContent(true);
    callbacks.onContent('');
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [{ 
          role: 'user', 
          content: prompt || 'Tell me a story about a brave knight!'
        }],
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const decoder = new TextDecoder()
    let isFirstChunk = true

    while (true) {
      const { done, value } = await reader.read()
      if (done) break;

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          if (line === 'data: [DONE]') continue;
          
          try {
            const data = JSON.parse(line.slice(6))
            const content = data.choices?.[0]?.delta?.content || ''
            
            if (content) {
              if (isFirstChunk) {
                isFirstChunk = false;
                callbacks.onFirstChunk();
              }

              chunks.push(content);
              fullContent += content;
              
              callbacks.onChunk(content);
              callbacks.onContent(fullContent);
              if (callbacks.onRawChunk) {
                callbacks.onRawChunk(line);
              }
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    }

    const endTime = Date.now();
    
    return { 
      success: true,
      status: TestStatus.SUCCESS,
      response: {
        content: fullContent,
        type: 'stream',
        timestamp: new Date().toISOString(),
        model,
        raw: {
          apiResponse: {
            chunks,
            totalChunks: chunks.length,
            streamDuration: endTime - startTime
          },
          metrics: {
            chunkCount: chunks.length,
            totalLength: fullContent.length,
            streamDuration: `${((endTime - startTime) / 1000).toFixed(2)}s`
          }
        }
      }
    }
  } catch (error: any) {
    callbacks.onHasContent(false);
    if (error.name === 'AbortError') {
      throw error;
    }
    return {
      success: false,
      status: TestStatus.ERROR,
      error: error.message || 'Stream test failed',
      response: {
        content: fullContent,
        type: 'stream',
        timestamp: new Date().toISOString(),
        model,
        raw: { 
          error: error.message,
          partialContent: fullContent,
          chunks 
        }
      }
    }
  }
} 