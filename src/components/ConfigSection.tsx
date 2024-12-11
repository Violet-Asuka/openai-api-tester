import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Model, TestType, ReasoningQuestion, LoadingState } from "@/types/apiTypes"
import {
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Trash2 } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ColorTheme, ThemeColors } from '@/types/theme'
import { Toast } from "@/components/ui/toast"

interface ConfigSectionProps {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
  modelList: Model[];
  prompt: string;
  setPrompt: (prompt: string) => void;
  loading: boolean;
  error: string;
  testType: TestType;
  handleTest: (type: TestType) => void;
  fetchModelList: () => Promise<void>;
  smartInput: string;
  handleSmartInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageFile: File | null;
  onImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultImage: string;
  selectedQuestionId: string;
  setSelectedQuestionId: (id: string) => void;
  reasoningQuestions: ReasoningQuestion[];
  isLoadingQuestions?: boolean;
  loadingState: LoadingState;
  onAbort: () => void;
  theme: ColorTheme;
  themeColors: ThemeColors;
}

// 定义凭据类型
interface Credential {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  timestamp: string
}

// Add this type for better state management
interface SelectedQuestion {
  id: string;
  title: string;
}

const prioritizeModels = (models: Model[]): Model[] => {
  // First deduplicate models based on ID
  const uniqueModels = Array.from(new Map(models.map(model => [model.id, model])).values());
  
  // Then sort the unique models
  return uniqueModels.sort((a, b) => {
    const isPriorityA = a.id.includes('gpt-4o') || a.id.includes('claude-3-5-sonnet');
    const isPriorityB = b.id.includes('gpt-4o') || b.id.includes('claude-3-5-sonnet');
    
    if (isPriorityA && !isPriorityB) return -1;
    if (!isPriorityA && isPriorityB) return 1;
    return a.id.localeCompare(b.id);
  });
};

export function ConfigSection({
  baseUrl,
  setBaseUrl,
  apiKey,
  setApiKey,
  model,
  setModel,
  modelList,
  prompt,
  setPrompt,
  loading,
  error,
  testType,
  handleTest,
  fetchModelList,
  smartInput,
  handleSmartInput,
  imageFile,
  onImageFileChange,
  defaultImage,
  setSelectedQuestionId,
  reasoningQuestions,
  isLoadingQuestions,
  loadingState,
  onAbort,
  themeColors,
}: ConfigSectionProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [showCredentials, setShowCredentials] = useState(false)
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | undefined>(undefined)
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null)
  const [showToast, setShowToast] = useState(false)

  // 加载所有保存的凭据
  useEffect(() => {
    const saved = localStorage.getItem('ai_tester_credentials')
    if (saved) {
      setCredentials(JSON.parse(saved))
      setShowCredentials(true)
    }
  }, [])

  // 自动保存凭据当 baseUrl 或 apiKey 变化时
  useEffect(() => {
    if (baseUrl && apiKey) {
      const existingCred = credentials.find(
        cred => cred.baseUrl === baseUrl && cred.apiKey === apiKey
      )
      
      if (!existingCred) {
        const newCred: Credential = {
          id: Date.now().toString(),
          name: `Config ${credentials.length + 1}`,
          baseUrl,
          apiKey,
          timestamp: new Date().toISOString()
        }
        
        const updatedCreds = [...credentials, newCred]
        setCredentials(updatedCreds)
        localStorage.setItem('ai_tester_credentials', JSON.stringify(updatedCreds))
        setShowCredentials(true)
      }
    }
  }, [baseUrl, apiKey, credentials])

  // 加载选的凭据
  const loadCredential = (cred: Credential) => {
    setBaseUrl(cred.baseUrl)
    setApiKey(cred.apiKey)
    handleSmartInput({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
  }

  // 删除凭据
  const deleteCredential = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const updatedCreds = credentials.filter(c => c.id !== id)
    setCredentials(updatedCreds)
    localStorage.setItem('ai_tester_credentials', JSON.stringify(updatedCreds))
    if (updatedCreds.length === 0) {
      setShowCredentials(false)
    }
  }

  // Improved base URL processing function
  const processBaseUrl = (url: string): string => {
    if (!url) return ""
    let processed = url.trim().replace(/\/+$/, '')
    processed = processed.replace(/\/v1$/, '')
    return `${processed}/v1`
  }

  // 移动 useEffect 到这里，组件函数内部
  useEffect(() => {
    if (!isReasoningModalOpen) {
      setExpandedQuestion(undefined);
    }
  }, [isReasoningModalOpen]);

  // Add new function to handle question selection
  const handleQuestionSelect = (questionId: string, title: string) => {
    setSelectedQuestion({ id: questionId, title });
    setExpandedQuestion(questionId);
    setSelectedQuestionId(questionId);
  };

  // Add function to handle test initiation
  const handleReasoningTest = () => {
    if (selectedQuestion) {
      setIsReasoningModalOpen(false);
      handleTest('reasoning');
    }
  };

  // 修改 handleTest 调用的方式，添加配置检查
  const handleTestWithCheck = (type: TestType) => {
    if (!baseUrl || !apiKey) {
      setShowToast(true)
      return
    }
    handleTest(type)
  }

  return (
    <>
      <Card className={`h-full flex flex-col bg-white/60 backdrop-blur-xl shadow-md rounded-2xl border ${themeColors.border}`}>
        <CardHeader className="flex-none pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800">
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-violet-200/50 scrollbar-track-transparent pr-2">
            <div className="space-y-6">
              {/* Smart Input - Refined styling */}
              <div className="space-y-2">
                <h3 className="text-base font-medium text-gray-700">Smart Input</h3>
                <Input
                  placeholder="Paste both URL and API Key here for automatic detection"
                  value={smartInput}
                  onChange={handleSmartInput}
                  className={`w-full bg-white/50 ${themeColors.border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                />
              </div>

              {/* API Configuration - Enhanced layout */}
              <div className="space-y-3">
                <h3 className="text-base font-medium text-gray-700">API Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Base URL</label>
                    <Input
                      placeholder="e.g., https://api.openai.com"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(processBaseUrl(e.target.value))}
                      className={`w-full bg-white/50 ${themeColors.border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">API Key</label>
                    <Input
                      placeholder="Enter your API key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={`w-full bg-white/50 ${themeColors.border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl`}
                    />
                  </div>
                </div>
              </div>

              {/* Saved Configurations */}
              {showCredentials && credentials.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-base font-medium">Saved Configurations</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <span>Select Configuration</span>
                        <span className="text-xs text-gray-500">({credentials.length})</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px]">
                      {credentials.map((cred) => (
                        <DropdownMenuItem
                          key={cred.id}
                          className="flex justify-between items-center py-2"
                          onSelect={() => loadCredential(cred)}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{cred.name}</span>
                            <span className="text-xs text-gray-500 truncate max-w-[200px]">
                              {cred.baseUrl}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:text-red-500"
                            onClick={(e) => deleteCredential(cred.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500"
                        onSelect={() => {
                          localStorage.removeItem('ai_tester_credentials')
                          setCredentials([])
                          setShowCredentials(false)
                        }}
                      >
                        Clear All Configurations
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Model selection */}
              <div className="space-y-2">
                <h3 className="text-base font-medium">Model Selection</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Model name"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1"
                  />
                  {loadingState.type === 'models' ? (
                    <Button
                      onClick={onAbort}
                      variant="destructive"
                      className="whitespace-nowrap"
                    >
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      onClick={fetchModelList}
                      disabled={loadingState.type === 'test'}
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      Get Models
                    </Button>
                  )}
                </div>

                {modelList.length > 0 && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="models">
                      <AccordionTrigger className="text-sm font-medium text-gray-700">
                        Available Models ({modelList.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
                          {prioritizeModels(modelList).map((m) => (
                            <Button
                              key={m.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => setModel(m.id)}
                              className={`text-sm ${
                                model === m.id ? `${themeColors.button} bg-opacity-50` : ""
                              } ${
                                (m.id.startsWith('gpt-4') || m.id.startsWith('claude-3')) 
                                  ? `border-2 ${themeColors.border}` 
                                  : ""
                              }`}
                            >
                              {m.id}
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>

              {/* Prompt input and Image upload sections - Reordered */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base font-medium">User Prompt (Optional)</h3>
                  <Input
                    placeholder="Leave empty to use default user prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-medium">Image (Optional)</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImageFileChange}
                    className={`block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:${themeColors.button}`}
                  />
                  {!imageFile && (
                    <p className="text-sm text-gray-500">
                      Using default image: {defaultImage}
                    </p>
                  )}
                </div>
              </div>

              {/* Test Features - Enhanced grid layout */}
              <div className="space-y-3">
                <h3 className="text-base font-medium text-gray-700">Test Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Basic test buttons with refined styling */}
                  <Button
                    onClick={() => handleTestWithCheck('connection')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Test Connection
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('chat')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Test Chat
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('stream')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Test Stream
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('function')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Test Function
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('image')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Image Test
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('latency')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Latency Test
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('temperature')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Temperature Test
                  </Button>

                  <Button
                    onClick={() => handleTestWithCheck('math')}
                    disabled={loading}
                    variant="outline"
                    className={`w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    Math Test
                  </Button>

                  <Button
                    onClick={() => {
                      if (!baseUrl || !apiKey) {
                        setShowToast(true)
                        return
                      }
                      setIsReasoningModalOpen(true)
                    }}
                    disabled={loading || isLoadingQuestions}
                    variant="outline"
                    className={`col-span-2 w-full bg-white/50 ${themeColors.button} rounded-xl`}
                  >
                    {loading && testType === 'reasoning' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isLoadingQuestions ? (
                      <span>Loading Questions...</span>
                    ) : (
                      'Reasoning Test'
                    )}
                  </Button>
                </div>
              </div>

              {/* Add Modal */}
              <Dialog open={isReasoningModalOpen} onOpenChange={setIsReasoningModalOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Select Reasoning Question</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    {isLoadingQuestions ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading questions...</span>
                      </div>
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
                                selectedQuestion?.id === q.id ? `${themeColors.background} bg-opacity-50` : ''
                              }`}
                              onClick={(e: React.MouseEvent) => {
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
                                  className={`w-full ${selectedQuestion?.id === q.id ? themeColors.button : ""}`}
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
