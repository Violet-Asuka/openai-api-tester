import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Loader2, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useTestStore } from '@/store/testStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Toast } from "@/components/ui/toast"
import { Model, TestType } from "@/types/apiTypes"
import { colorThemes } from "@/types/theme"
import { getReasoningQuestions } from '@/tools/reasoningTest';
import { Textarea } from "@/components/ui/textarea"

// Keep the Credential interface
interface Credential {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  timestamp: string
}

interface SelectedQuestion {
  id: string;
  title: string;
}

const prioritizeModels = (models: Model[]): Model[] => {
  const uniqueModels = Array.from(new Map(models.map(model => [model.id, model])).values());
  return uniqueModels.sort((a, b) => {
    const isPriorityA = a.id.includes('gpt-4o') || a.id.includes('claude-3-5');
    const isPriorityB = b.id.includes('gpt-4o') || b.id.includes('claude-3-5');
    if (isPriorityA && !isPriorityB) return -1;
    if (!isPriorityA && isPriorityB) return 1;
    return a.id.localeCompare(b.id);
  });
};

// Add this helper function at the top level
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

// Add this near the top of the file, after imports
const DEFAULT_IMAGE_PATH = '/public/example.jpg';

// 修改常量名以匹配实际使用的键
const CREDENTIALS_STORAGE_KEY = 'ai_tester_credentials';

export const ConfigSection = () => {
  const {
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    modelList,
    setModelList,
    chatPrompt,
    setChatPrompt,
    smartInput,
    handleSmartInput,
    selectedModels,
    setSelectedModels,
    error,
    loadingState,
    theme,
    handleTest,
    abortTest,
    imageFile,
    setImageFile,
    selectedQuestionId,
    setSelectedQuestionId,
    reasoningQuestions,
    testType,
    setTestType,
    runParallelTests,
    setReasoningQuestions,
    processSmartInput,
    processModelInput,
  } = useTestStore()

  // Local state
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [showCredentials, setShowCredentials] = useState(false)
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | undefined>(undefined)
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelSearchInput, setModelSearchInput] = useState('')
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined)
  const [questionsLoadError, setQuestionsLoadError] = useState<string | null>(null)

  // Load saved credentials and last used config on mount
  useEffect(() => {
    // 使用正确的存储键名
    const savedCredentials = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (savedCredentials) {
      try {
        const parsedCredentials = JSON.parse(savedCredentials);
        setCredentials(parsedCredentials);
      } catch (error) {
        console.error('Error parsing saved credentials:', error);
      }
    }

    // Load last used configuration
    const lastConfig = localStorage.getItem('lastConfig');
    if (lastConfig) {
      const { baseUrl: savedBaseUrl, apiKey: savedApiKey } = JSON.parse(lastConfig);
      if (savedBaseUrl) setBaseUrl(savedBaseUrl);
      if (savedApiKey) setApiKey(savedApiKey);
    }
  }, []);

  // Save last used configuration when it changes
  useEffect(() => {
    if (baseUrl || apiKey) {
      localStorage.setItem('lastConfig', JSON.stringify({ baseUrl, apiKey }));
    }
  }, [baseUrl, apiKey]);

  // Enhanced smart input handler
  const handleSmartInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleSmartInput(e);
  };

  // Process base URL input
  const processBaseUrl = (url: string): string => {
    if (!url) return url
    url = url.trim()
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    return url.replace(/\/+$/, '')
  }

  // Handle credential selection
  const handleCredentialSelect = (cred: Credential) => {
    setBaseUrl(cred.baseUrl)
    setApiKey(cred.apiKey)
    handleSmartInput({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
  }

  // Save current credentials
  const saveCredentials = () => {
    if (!baseUrl || !apiKey) return;
    
    const newCred: Credential = {
      id: Date.now().toString(),
      name: `Config ${credentials.length + 1}`,
      baseUrl,
      apiKey,
      timestamp: new Date().toISOString()
    };

    const updatedCredentials = [...credentials, newCred];
    setCredentials(updatedCredentials);
    
    // 使用正确的存储键名保存
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(updatedCredentials));
  };

  // Delete credentials
  const deleteCredential = (id: string) => {
    const updatedCredentials = credentials.filter(c => c.id !== id);
    setCredentials(updatedCredentials);
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(updatedCredentials));
  };

  // Handle question selection
  const handleQuestionSelect = (questionId: string, title: string) => {
    setSelectedQuestion({ id: questionId, title });
    setExpandedQuestion(questionId);
    setSelectedQuestionId(questionId);
  };

  // Handle reasoning test
  const handleReasoningTest = () => {
    if (selectedQuestion) {
      if (selectedModels.length > 1) {
        runParallelTests('reasoning');
      } else {
        handleTest('reasoning');
      }
      setIsReasoningModalOpen(false);
    }
  };

  // Handle test type selection
  const handleTestTypeSelect = (type: TestType) => {
    setTestType(type);
    
    // 清除之前的测试结果
    useTestStore.getState().clearMultiModelResults();
    
    // 如果选择了多个模型，使用并行测试
    if (selectedModels.length > 1) {
      runParallelTests(type);
    } else {
      // 单个模型使用原来的测试方法
      handleTest(type);
    }
  };

  // Delete all credentials
  const deleteAllCredentials = () => {
    setCredentials([]);
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
  };

  // 添加获取模型列表函数
  const fetchModels = async () => {
    if (!baseUrl || !apiKey || isLoadingModels) return;
    
    setIsLoadingModels(true);
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      const models = data.data || data.models || [];
      // 更新 store 中的 modelList
      setModelList(models);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // 处理模型输入
  const handleModelInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModelSearchInput(e.target.value);
  };

  // 删除选中的模型
  const removeSelectedModel = (modelId: string) => {
    setSelectedModels(prev => prev.filter(id => id !== modelId));
  };

  // 在 useEffect 中添加模型列表获取
  useEffect(() => {
    if (baseUrl && apiKey) {
      fetchModels();
    }
  }, [baseUrl, apiKey]);

  // 修改打开推理测试模态框的处理函数
  const handleOpenReasoningModal = async () => {
    if (!baseUrl || !apiKey) {
      setShowToast(true);
      return;
    }
    
    setIsReasoningModalOpen(true);
    setQuestionsLoadError(null);
    
    try {
      const questions = await getReasoningQuestions();
      if (questions.length === 0) {
        setQuestionsLoadError('Failed to load reasoning questions. Please try again.');
      } else {
        setReasoningQuestions(questions);
      }
    } catch (error) {
      setQuestionsLoadError(error instanceof Error ? error.message : 'Failed to load questions');
    }
  };

  // Modify the image upload section
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    } else {
      // If no file selected, try to use default image
      try {
        const response = await fetch(DEFAULT_IMAGE_PATH);
        const blob = await response.blob();
        const defaultFile = new File([blob], 'example.jpg', { type: 'image/jpeg' });
        setImageFile(defaultFile);
      } catch (error) {
        console.error('Error loading default image:', error);
      }
    }
  };

  return (
    <>
      <Card className={`h-full flex flex-col bg-white/60 backdrop-blur-xl shadow-md rounded-2xl border ${colorThemes[theme].border}`}>
        <CardHeader className="flex-none pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800">
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/50 hover:scrollbar-thumb-gray-300/70">
          <div className="space-y-6">
            {/* Smart Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Quick Setup
                </label>
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste both URL and API Key here for automatic detection (Press Enter to process, Shift+Enter for new line)"
                  value={smartInput}
                  onChange={handleSmartInputChange}
                  className={`w-full bg-white/50 min-h-[80px] ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        return; // 允许 Shift+Enter 换行
                      }
                      e.preventDefault();
                      processSmartInput(smartInput);
                    }
                  }}
                />
              </div>
            </div>

            {/* API Configuration */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Base URL</label>
                <Input
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(processBaseUrl(e.target.value))}
                  className={`w-full bg-white/50 ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">API Key</label>
                <Input
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`w-full bg-white/50 ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                />
              </div>
            </div>

            {/* Credentials Management */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setShowCredentials(!showCredentials)}
                  className={colorThemes[theme].button}
                >
                  {showCredentials ? 'Hide' : 'Show'} Saved Credentials
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={saveCredentials}
                    disabled={!baseUrl || !apiKey}
                    className={colorThemes[theme].button}
                  >
                    Save Current
                  </Button>
                  {credentials.length > 0 && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={deleteAllCredentials}
                      title="Delete all credentials"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {showCredentials && credentials.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/50 hover:scrollbar-thumb-gray-300/70">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-2 bg-white/50 rounded-lg"
                    >
                      <div className="flex flex-col flex-grow mr-2">
                        <span className="text-sm font-medium">{cred.name}</span>
                        <span className="text-xs text-gray-500 truncate">{cred.baseUrl}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCredentialSelect(cred)}
                        >
                          Use
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCredential(cred.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Model</label>
                
                {/* Model List Accordion - 移到这里 */}
                {modelList.length > 0 && (
                  <Accordion 
                    type="single" 
                    collapsible 
                    value={accordionValue}
                    onValueChange={setAccordionValue}
                    className="w-full"
                  >
                    <AccordionItem value="models">
                      <AccordionTrigger className="text-sm">
                        Available Models ({modelList.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/50 hover:scrollbar-thumb-gray-300/70">
                          {prioritizeModels(modelList).map((model) => (
                            <div
                              key={model.id}
                              className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${
                                selectedModels.includes(model.id) ? 'bg-gray-50' : ''
                              }`}
                            >
                              <span className="text-sm">{model.id}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedModels(prev => 
                                    prev.includes(model.id) 
                                      ? prev.filter(id => id !== model.id) 
                                      : [...prev, model.id]
                                  );
                                }}
                              >
                                {selectedModels.includes(model.id) ? 'Remove' : 'Select'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Model Search Input */}
                <div className="relative">
                  <Textarea
                    placeholder="Enter model names (Press Enter to add, Shift+Enter for new line)"
                    value={modelSearchInput}
                    onChange={handleModelInput}
                    className={`w-full bg-white/50 min-h-[80px] ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.shiftKey) {
                          return; // 允许 Shift+Enter 换行
                        }
                        e.preventDefault();
                        processModelInput(modelSearchInput);
                        setModelSearchInput('');
                      }
                    }}
                  />
                </div>
              </div>

              {/* Selected Models Tags */}
              {selectedModels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map(modelId => (
                    <Badge 
                      key={modelId}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1 bg-white/50"
                    >
                      {modelId}
                      <button
                        onClick={() => removeSelectedModel(modelId)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Refresh Models Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchModels}
                disabled={isLoadingModels || !baseUrl || !apiKey}
                className={`mt-2 ${colorThemes[theme].button}`}
              >
                {isLoadingModels ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh Models'
                )}
              </Button>

              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Prompt</label>
                <Textarea
                  placeholder="Enter your prompt here (Press Enter to add, Shift+Enter for new line)"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  className={`w-full bg-white/50 min-h-[80px] ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        return; // 允许 Shift+Enter 换行
                      }
                      e.preventDefault();
                      if (selectedModels.length === 0) {
                        setShowToast(true); // 显示提示信息
                        return;
                      }
                      if (selectedModels.length > 1) {
                        runParallelTests('chat');
                      } else {
                        handleTest('chat');
                      }
                    }
                  }}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Image Upload {imageFile && `(${imageFile.name})`}
                </label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={`w-full bg-white/50 ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                  />
                  {!imageFile && (
                    <p className="text-xs text-gray-500">
                      No image selected. Default image will be used for image tests.
                    </p>
                  )}
                </div>
              </div>

              {/* Test Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleTestTypeSelect('connection')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'connection' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Connection Test'
                  )}
                </Button>

                <Button
                  onClick={() => handleTestTypeSelect('chat')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'chat' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Chat Test'
                  )}
                </Button>

                <Button
                  onClick={() => handleTestTypeSelect('stream')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'stream' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Stream Test'
                  )}
                </Button>

                <Button
                  onClick={() => handleTestTypeSelect('function')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'function' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Function Test'
                  )}
                </Button>

                <Button
                  onClick={() => handleTestTypeSelect('latency')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'latency' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Latency Test'
                  )}
                </Button>

                <Button
                  onClick={() => handleTestTypeSelect('temperature')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'temperature' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Temperature Test'
                  )}
                </Button>

                <Button
                  onClick={() => handleTestTypeSelect('math')}
                  disabled={loadingState.type === 'test' || selectedModels.length === 0}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'math' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Math Test'
                  )}
                </Button>

                <Button
                  onClick={handleOpenReasoningModal}
                  disabled={loadingState.type === 'test'}
                  variant="outline"
                  className={`w-full bg-white/50 ${colorThemes[theme].button} rounded-xl`}
                >
                  {loadingState.type === 'test' && testType === 'reasoning' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Reasoning Test'
                  )}
                </Button>

                {loadingState.canAbort && (
                  <Button
                    onClick={abortTest}
                    variant="destructive"
                    className="col-span-2"
                  >
                    Abort Test
                  </Button>
                )}
              </div>
            </div>

            {/* Reasoning Modal */}
            <Dialog open={isReasoningModalOpen} onOpenChange={setIsReasoningModalOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Select Reasoning Question</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {loadingState.type === 'questions' ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading questions...</span>
                    </div>
                  ) : questionsLoadError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{questionsLoadError}</AlertDescription>
                    </Alert>
                  ) : reasoningQuestions.length === 0 ? (
                    <div className="text-center p-4 text-gray-500">
                      No questions available
                    </div>
                  ) : (
                    <Accordion 
                      type="single" 
                      collapsible 
                      value={expandedQuestion}
                      onValueChange={setExpandedQuestion}
                      className="w-full"
                    >
                      {reasoningQuestions.map((q) => (
                        <AccordionItem key={q.id} value={q.id}>
                          <AccordionTrigger 
                            className={`hover:no-underline ${
                              selectedQuestionId === q.id ? `${colorThemes[theme].background} bg-opacity-50` : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuestionSelect(q.id, q.title);
                            }}
                          >
                            <div className="flex items-center justify-between w-full pr-4">
                              <span className="font-medium">{q.title}</span>
                              <span className="text-sm text-muted-foreground">
                                {q.category} · {q.difficulty}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <p className="text-sm">{q.question}</p>
                              <Button
                                className={`w-full ${selectedQuestion?.id === q.id ? colorThemes[theme].button : ""}`}
                                variant={selectedQuestion?.id === q.id ? "default" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuestionSelect(q.id, q.title);
                                  handleReasoningTest();
                                }}
                              >
                                {selectedQuestion?.id === q.id ? "Start Test" : "Select and Test"}
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Toast 
        message="Please enter Base URL and API Key"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}
