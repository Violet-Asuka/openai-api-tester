import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { 
  TestResult, 
  Model, 
  TestType, 
  LoadingState,
  ReasoningQuestion,
  TestStatus
} from '@/types/apiTypes'
import { ColorTheme } from '@/types/theme'
import { testConnection } from '@/tools/connectionTest'
import { testChat } from '@/tools/chatTest'
import { testStream } from '@/tools/streamTest'
import { testFunction } from '@/tools/functionTest'
import { testLatency } from '@/tools/latencyTest'
import { testTemperature } from '@/tools/temperatureTest'
import { testMath } from '@/tools/mathTest'
import { testReasoning } from '@/tools/reasoningTest'
import { testImage } from '@/tools/imageTest'
import { weatherTool } from '@/tools/availableTools'

const parseSmartInput = (input: string): { baseUrl?: string; apiKey?: string } => {
  const result: { baseUrl?: string; apiKey?: string } = {};
  
  // 处理常见分隔符，将输入分割成多个部分
  const parts = input.split(/[,;\s]+/).filter(Boolean);
  
  // 遍历所有部分查找 API key 和 URL
  parts.forEach(part => {
    // 匹配 API keys (sk-... 格式)
    if (part.startsWith('sk-') && part.length >= 34) {
      result.apiKey = part;
    }
    // 匹配 URLs
    else if (part.match(/^(https?:\/\/|[^\/]+\.[^\/]+)/i)) {
      let url = part;
      // 添加 https:// 如果缺少协议
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      // 处理 /v1 路径
      url = url.replace(/\/+$/, ''); // 移除末尾斜杠
      if (!url.endsWith('/v1')) {
        if (url.includes('/v1/')) {
          url = url.split('/v1/')[0] + '/v1';
        } else {
          url = url + '/v1';
        }
      }
      result.baseUrl = url;
    }
  });

  return result;
};

interface TestState {
  // API Configuration
  baseUrl: string
  apiKey: string
  modelList: Model[]
  selectedModels: string[]
  
  // Test Configuration
  testType: TestType
  chatPrompt: string
  imageFile: File | null
  selectedQuestionId: string
  reasoningQuestions: ReasoningQuestion[]
  
  // UI State
  loading: boolean
  error: string
  loadingState: LoadingState
  theme: ColorTheme
  smartInput: string
  
  // Test Results
  testResult: TestResult | null
  multiModelResults: Record<string, {
    result: TestResult;
    timeElapsed: number;
    status: 'pending' | 'running' | 'completed' | 'error';
  }>
  streamingState: {
    isStreaming: boolean;
    content: string;
    isTyping: boolean;
    currentContent: string;
    showCursor: boolean;
    chunks: string[];
    typingSpeed: number;
    cursorBlinkRate: number;
    currentModel: string | null;
  };
  
  // Actions
  setBaseUrl: (url: string) => void
  setApiKey: (key: string) => void
  setSelectedModels: (value: string[] | ((prev: string[]) => string[])) => void
  setTestType: (type: TestType) => void
  setChatPrompt: (prompt: string) => void
  setImageFile: (file: File | null) => void
  setError: (error: string) => void
  setLoadingState: (state: LoadingState) => void
  setTheme: (theme: ColorTheme) => void
  setSelectedQuestionId: (id: string) => void
  setModelList: (models: Model[]) => void
  setReasoningQuestions: (questions: ReasoningQuestion[]) => void
  
  // Complex Actions
  handleTest: (type: TestType) => Promise<void>
  fetchModelList: () => Promise<void>
  handleSmartInput: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  abortTest: () => void
  resetState: () => void
  
  // Abort Controller
  abortController: AbortController | null
  
  // Add new actions
  runParallelTests: (type: TestType) => Promise<void>;
  clearMultiModelResults: () => void;
  resetTestResults: () => void;
  
  // New actions
  processSmartInput: (input: string) => void;
  processModelInput: (input: string) => void;
}

const initialState = {
  baseUrl: '',
  apiKey: '',
  modelList: [],
  selectedModels: [],
  testType: 'connection' as TestType,
  chatPrompt: '你可以做什么',
  imageFile: null,
  selectedQuestionId: '',
  reasoningQuestions: [],
  loading: false,
  error: '',
  loadingState: { type: null, canAbort: false },
  theme: 'ocean' as ColorTheme,
  smartInput: '',
  testResult: null,
  multiModelResults: {},
  streamingState: {
    isStreaming: false,
    content: '',
    isTyping: false,
    currentContent: '',
    showCursor: true,
    chunks: [],
    typingSpeed: 50,
    cursorBlinkRate: 530,
    currentModel: null,
  },
  abortController: null
}

export const useTestStore = create<TestState>()(
  devtools(
    (set, get) => {
      const runModelTest = async (
        type: TestType,
        baseUrl: string,
        apiKey: string,
        modelId: string,
        signal: AbortSignal
      ): Promise<TestResult> => {
        const state = get();
        switch (type) {
          case 'connection':
            return await testConnection(baseUrl, apiKey, modelId, signal);
          case 'chat':
            return await testChat(baseUrl, apiKey, modelId, state.chatPrompt, signal);
          case 'stream':
            return await testStream(baseUrl, apiKey, modelId, "Tell me a short story about AI.", {
              onChunk: (chunk) => {
                set(state => ({
                  streamingState: {
                    ...state.streamingState,
                    content: state.streamingState.content + chunk,
                    chunks: [...state.streamingState.chunks, chunk]
                  }
                }))
              },
              onContent: (content) => {
                set(state => ({
                  streamingState: {
                    ...state.streamingState,
                    content
                  }
                }))
              },
              onHasContent: (hasContent) => {
                set(state => ({
                  streamingState: {
                    ...state.streamingState,
                    isStreaming: hasContent
                  }
                }))
              },
              onFirstChunk: () => {
                set(state => ({
                  streamingState: {
                    ...state.streamingState,
                    isTyping: true
                  }
                }))
              }
            }, signal);
          case 'function':
            return await testFunction(
              baseUrl, 
              apiKey, 
              modelId, 
              "What's the weather like in Tokyo?",
              [weatherTool],
              signal
            );
          case 'latency':
            return await testLatency(baseUrl, apiKey, modelId, signal);
          case 'temperature':
            return await testTemperature(baseUrl, apiKey, modelId, "Generate a creative story.", signal);
          case 'math':
            return await testMath(baseUrl, apiKey, modelId, signal);
          case 'reasoning':
            return await testReasoning(baseUrl, apiKey, modelId, state.selectedQuestionId, signal);
          case 'image':
            return await testImage(
              baseUrl,
              apiKey,
              modelId,
              state.chatPrompt,
              state.imageFile || undefined,
              signal
            );
          default:
            throw new Error(`Unsupported test type: ${type}`);
        }
      };

      return {
        ...initialState,

        // Simple Actions
        setBaseUrl: (url) => set({ baseUrl: url }),
        setApiKey: (key) => set({ apiKey: key }),
        setSelectedModels: (value) => 
          set((state) => ({ 
            selectedModels: typeof value === 'function' 
              ? value(state.selectedModels) 
              : value 
          })),
        setTestType: (type) => set({ testType: type }),
        setChatPrompt: (prompt) => set({ chatPrompt: prompt }),
        setImageFile: (file) => set({ imageFile: file }),
        setError: (error) => set({ error }),
        setLoadingState: (state) => set({ loadingState: state }),
        setTheme: (theme) => set({ theme }),
        setSelectedQuestionId: (id) => set({ selectedQuestionId: id }),
        setModelList: (models) => set({ modelList: models }),
        setReasoningQuestions: (questions) => set({ reasoningQuestions: questions }),

        // Complex Actions
        handleTest: async (type: TestType) => {
          const state = get()
          set({ error: '', testResult: null })
          
          if (!state.baseUrl || !state.apiKey) {
            set({ error: 'Base URL and API Key are required' })
            return
          }

          if (state.selectedModels.length === 0) {
            set({ error: 'Please select at least one model' })
            return
          }

          try {
            set({ loadingState: { type: 'test', canAbort: true } })
            const controller = new AbortController()
            const signal = controller.signal
            set({ abortController: controller })

            let result: TestResult

            switch (type) {
              case 'connection':
                result = await testConnection(state.baseUrl, state.apiKey, state.selectedModels[0], signal)
                break

              case 'chat':
                result = await testChat(state.baseUrl, state.apiKey, state.selectedModels[0], state.chatPrompt, signal)
                break

              case 'stream':
                try {
                  // 重置流状态
                  set(state => ({
                    streamingState: {
                      ...initialState.streamingState,
                      isStreaming: true,
                      currentModel: state.selectedModels[0]
                    }
                  }));

                  result = await testStream(
                    state.baseUrl, 
                    state.apiKey, 
                    state.selectedModels[0], 
                    "Tell me a short story about AI.", 
                    {
                      onChunk: (chunk) => {
                        set(state => ({
                          streamingState: {
                            ...state.streamingState,
                            chunks: [...state.streamingState.chunks, chunk]
                          }
                        }));
                      },
                      onContent: (content) => {
                        set(state => ({
                          streamingState: {
                            ...state.streamingState,
                            content,
                            isTyping: true
                          }
                        }));
                      },
                      onHasContent: (hasContent) => {
                        set(state => ({
                          streamingState: {
                            ...state.streamingState,
                            isStreaming: hasContent
                          }
                        }));
                      },
                      onFirstChunk: () => {
                        set(state => ({
                          streamingState: {
                            ...state.streamingState,
                            isTyping: true
                          }
                        }));
                      }
                    }, 
                    signal
                  );

                  // 流式传输完成后，保持显示一段时间
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // 最后更新结果
                  set(_state => ({
                    testResult: result
                  }));
                } finally {
                  // 清理流状态
                  set(_state => ({
                    streamingState: {
                      ...initialState.streamingState
                    }
                  }));
                }
                break;

              case 'function':
                result = await testFunction(
                  state.baseUrl, 
                  state.apiKey, 
                  state.selectedModels[0], 
                  "What's the weather like in Tokyo?",
                  [weatherTool],
                  signal
                )
                break

              case 'latency':
                result = await testLatency(state.baseUrl, state.apiKey, state.selectedModels[0], signal)
                break

              case 'temperature':
                result = await testTemperature(state.baseUrl, state.apiKey, state.selectedModels[0], "Generate a creative story.", signal)
                break

              case 'math':
                result = await testMath(state.baseUrl, state.apiKey, state.selectedModels[0], signal)
                break

              case 'reasoning':
                result = await testReasoning(state.baseUrl, state.apiKey, state.selectedModels[0], state.selectedQuestionId, signal)
                break

              case 'image':
                result = await testImage(
                  state.baseUrl, 
                  state.apiKey, 
                  state.selectedModels[0], 
                  state.chatPrompt, 
                  state.imageFile || undefined, 
                  signal
                )
                break

              default:
                throw new Error(`Unsupported test type: ${type}`)
            }

            set({ testResult: result })

          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              set({ 
                error: 'Test aborted by user',
                testResult: {
                  success: false,
                  status: TestStatus.ABORTED,
                  error: 'Test aborted by user'
                }
              })
              return
            }

            set({ 
              error: error instanceof Error ? error.message : 'Test failed',
              testResult: {
                success: false,
                status: TestStatus.ERROR,
                error: error instanceof Error ? error.message : 'Test failed'
              }
            })
          } finally {
            set({ 
              loadingState: { type: null, canAbort: false },
              abortController: null,
              streamingState: {
                isStreaming: false,
                content: '',
                isTyping: false,
                currentContent: '',
                showCursor: true,
                chunks: [],
                typingSpeed: 50,
                cursorBlinkRate: 530,
                currentModel: null,
              }
            })
          }
        },

        fetchModelList: async () => {
          try {
            set({ loadingState: { type: 'models', canAbort: true } })
            // Fetch models logic here...
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch models' })
          } finally {
            set({ loadingState: { type: null, canAbort: false } })
          }
        },

        handleSmartInput: (e) => {
          set({ smartInput: e.target.value })
        },

        processSmartInput: (input: string) => {
          const lines = input.split('\n').filter(Boolean);
          lines.forEach(line => {
            const { baseUrl: detectedUrl, apiKey: detectedKey } = parseSmartInput(line);
            if (detectedUrl) set({ baseUrl: detectedUrl });
            if (detectedKey) set({ apiKey: detectedKey });
          });
          set({ smartInput: '' });
        },

        processModelInput: (input: string) => {
          const newModels = input
            .split(/[,;\n]+/)
            .filter(Boolean)
            .filter(m => !get().selectedModels.includes(m));
          
          if (newModels.length > 0) {
            set(state => ({
              selectedModels: [...state.selectedModels, ...newModels],
              smartInput: ''
            }));
          }
        },

        abortTest: () => {
          const state = get()
          state.abortController?.abort()
          set({ 
            loadingState: { type: null, canAbort: false },
            abortController: null,
            testResult: {
              success: false,
              status: TestStatus.ERROR,
              error: 'Test aborted by user'
            }
          })
        },

        resetState: () => set(initialState),

        // Add new actions
        runParallelTests: async (type: TestType) => {
          const state = get();
          const { baseUrl, apiKey, selectedModels } = state;

          if (!baseUrl || !apiKey) {
            set({ error: 'Base URL and API Key are required' });
            return;
          }

          if (selectedModels.length === 0) {
            set({ error: 'Please select at least one model' });
            return;
          }

          // 初始化多模型结果
          set({
            multiModelResults: selectedModels.reduce((acc, modelId) => ({
              ...acc,
              [modelId]: {
                result: null,
                timeElapsed: 0,
                status: 'pending'
              }
            }), {}),
            // 只有在流式测试时才设置 streamingState
            ...(type === 'stream' && {
              streamingState: {
                ...initialState.streamingState,
                isStreaming: true
              }
            })
          });

          try {
            set({ loadingState: { type: 'test', canAbort: true } });
            const controller = new AbortController();
            set({ abortController: controller });

            // 并行执行测试
            await Promise.all(selectedModels.map(async (modelId) => {
              const startTime = performance.now();
              
              try {
                // 更新状态为运行中
                set(state => ({
                  multiModelResults: {
                    ...state.multiModelResults,
                    [modelId]: { ...state.multiModelResults[modelId], status: 'running' }
                  }
                }));

                // 执行测试
                const result = await runModelTest(
                  type,
                  baseUrl,
                  apiKey,
                  modelId,
                  controller.signal
                );

                const timeElapsed = performance.now() - startTime;

                // 更新测试结果
                set(state => ({
                  multiModelResults: {
                    ...state.multiModelResults,
                    [modelId]: {
                      result,
                      timeElapsed,
                      status: 'completed'
                    }
                  }
                }));
              } catch (error) {
                // 处理错误
                set(state => ({
                  multiModelResults: {
                    ...state.multiModelResults,
                    [modelId]: {
                      result: {
                        success: false,
                        status: TestStatus.ERROR,
                        error: error instanceof Error ? error.message : 'Test failed'
                      },
                      timeElapsed: performance.now() - startTime,
                      status: 'error'
                    }
                  }
                }));
              }
            }));
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Test failed' });
          } finally {
            // 清理状态
            set({ 
              loadingState: { type: null, canAbort: false },
              abortController: null,
              ...(type === 'stream' && {
                streamingState: initialState.streamingState
              })
            });
          }
        },

        clearMultiModelResults: () => set({ multiModelResults: {} }),

        resetTestResults: () => {
          set({
            testResult: null,
            multiModelResults: {},
            error: '',
            streamingState: {
              isStreaming: false,
              content: '',
              currentContent: '',
              showCursor: true,
              chunks: [],
              typingSpeed: 50,
              cursorBlinkRate: 530,
              currentModel: null,
              isTyping: false
            }
          });
        }
      }
    }
  )
) 