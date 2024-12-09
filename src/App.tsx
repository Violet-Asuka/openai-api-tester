import { useState } from "react"
import { ConfigSection } from "@/components/ConfigSection"
import { ResultsSection } from "@/components/ResultsSection"
import { TestResult, Model, Tool, TestType } from "@/types/apiTypes"
import { testConnection } from "@/tools/connectionTest"
import { testChat } from "@/tools/chatTest"
import { testStream } from "@/tools/streamTest"
import { testFunction } from "@/tools/functionTest"
import { testImage } from "@/tools/imageTest"
import { testLatency } from "@/tools/latencyTest"
import { testTemperature } from "@/tools/temperatureTest"
import { testMath } from "@/tools/mathTest"
import { testReasoning, getReasoningQuestions } from "@/tools/reasoningTest"
import { ReasoningQuestion } from "@/types/apiTypes"

function App() {
  // State management
  const [baseUrl, setBaseUrl] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [model, setModel] = useState<string>("")
  const [modelList, setModelList] = useState<Model[]>([])
  const [prompt, setPrompt] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [smartInput, setSmartInput] = useState<string>("")
  const [testType, setTestType] = useState<TestType>('connection')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [streamContent, setStreamContent] = useState<string>('')
  const [_rawStreamChunks, setRawStreamChunks] = useState<string[]>([])
  const [_hasReceivedContent, setHasReceivedContent] = useState<boolean>(false)
  const [tools] = useState<Tool[]>([
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name"
            },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"],
              description: "Temperature unit"
            }
          },
          required: ["location"]
        }
      }
    },
    {
      type: "function", 
      function: {
        name: "calculate_math",
        description: "Perform various mathematical operations including basic arithmetic, equations, derivatives, probability and complex calculations",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "The mathematical expression to calculate. For equations use format like '3x + 7 = 22'; for probability describe the scenario; for complex calculations supports symbols like π, √, log₁₀"
            },
            operation_type: {
              type: "string",
              enum: ["basic", "equation", "derivative", "probability", "complex"],
              description: "Operation type: basic arithmetic, equation solving, derivative, probability calculation, or complex calculation"
            }
          },
          required: ["expression", "operation_type"]
        }
      }
    }
  ])
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const TIMEOUT_DURATION = 30
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [defaultImage] = useState<string>('/example.jpg')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("")
  const [reasoningQuestions] = useState<ReasoningQuestion[]>(getReasoningQuestions())

  // Improved base URL processing function
  const processBaseUrl = (url: string): string => {
    if (!url) return ""
    let processed = url.trim().replace(/\/+$/, '')
    processed = processed.replace(/\/v1$/, '')
    return `${processed}/v1`
  }

  // Modified smart input handler
  const handleSmartInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setSmartInput(input)

    // Try to extract API key (typical format: sk-...)
    const apiKeyMatch = input.match(/sk-[a-zA-Z0-9]{32,}/);
    if (apiKeyMatch && apiKeyMatch[0]) {
      setApiKey(apiKeyMatch[0]);
    }

    // Try to extract URL
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    if (urlMatch && urlMatch[0]) {
      setBaseUrl(processBaseUrl(urlMatch[0]));
    }
  }

  // Validation function
  const validateConfig = () => {
    if (!baseUrl || !apiKey) {
      setError("Please enter Base URL and API Key")
      return false
    }
    return true
  }

  // Modified handler for test actions
  const handleTest = async (type: TestType) => {
    if (!validateConfig()) return
    
    // 创建新的 AbortController
    const controller = new AbortController()
    setAbortController(controller)
    
    setLoading(true)
    setError("")
    setTestResult(null)
    
    try {
      let result: TestResult
      
      switch (type) {
        case 'connection':
          setTestType('connection')
          result = await testConnection(baseUrl, apiKey, model, controller.signal)
          break
          
        case 'chat':
          setTestType('chat')
          result = await testChat(baseUrl, apiKey, model, prompt, controller.signal)
          break
          
        case 'stream':
          setTestType('stream')
          setIsStreaming(true)
          setStreamContent("")
          setRawStreamChunks([])
          setHasReceivedContent(false)
          
          result = await testStream(
            baseUrl, 
            apiKey, 
            model, 
            prompt, 
            {
              onChunk: (chunk) => setRawStreamChunks(chunks => [...chunks, chunk]),
              onContent: (content) => setStreamContent(content),
              onHasContent: (hasContent) => setHasReceivedContent(hasContent)
            },
            controller.signal
          )
          break
          
        case 'function':
          setTestType('function')
          result = await testFunction(baseUrl, apiKey, model, prompt, tools, controller.signal)
          break
          
        case 'image':
          setTestType('image')
          result = await testImage(
            baseUrl, 
            apiKey, 
            model, 
            prompt,
            imageFile || undefined,
            controller.signal
          )
          break
          
        case 'latency':
          setTestType('latency')
          result = await testLatency(
            baseUrl,
            apiKey,
            model,
            controller.signal
          )
          break
          
        case 'temperature':
          setTestType('temperature')
          result = await testTemperature(
            baseUrl,
            apiKey,
            model,
            prompt,
            controller.signal
          )
          break
          
        case 'math':
          setTestType('math')
          result = await testMath(
            baseUrl,
            apiKey,
            model,
            controller.signal
          )
          break
          
        case 'reasoning':
          setTestType('reasoning')
          result = await testReasoning(
            baseUrl,
            apiKey,
            model,
            selectedQuestionId,
            controller.signal
          )
          break
          
        default:
          throw new Error("Invalid test type")
      }
      
      setTestResult(result)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setTestResult({
          success: false,
          error: timeElapsed >= TIMEOUT_DURATION 
            ? "Request timed out after 30 seconds"
            : "Test aborted by user"
        })
      } else {
        setTestResult({
          success: false,
          error: error.message || `${type} test failed`
        })
      }
    } finally {
      setLoading(false)
      setIsStreaming(false)
      setAbortController(null)
    }
  }

  // Modified fetch model list function
  const fetchModelList = async () => {
    if (!baseUrl || !apiKey) return

    setLoading(true)
    setError("")
    setModelList([])

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      const models = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      setModelList(models)
    } catch (error: any) {
      setError(error.message || "Failed to fetch models")
    } finally {
      setLoading(false)
    }
  }

  // 添加终止函数
  const handleAbort = () => {
    if (abortController) {
      abortController.abort()
      setLoading(false)
      setIsStreaming(false)
      setTestResult({
        success: false,
        error: "Test aborted by user"
      })
    }
  }

  // Add new handler for image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  return (
    <div className="min-h-screen min-w-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ConfigSection takes up 4 columns (1/3) on large screens */}
          <div className="lg:col-span-4">
            <ConfigSection
              baseUrl={baseUrl}
              setBaseUrl={setBaseUrl}
              apiKey={apiKey}
              setApiKey={setApiKey}
              model={model}
              setModel={setModel}
              modelList={modelList}
              prompt={prompt}
              setPrompt={setPrompt}
              loading={loading}
              error={error}
              testType={testType}
              handleTest={handleTest}
              fetchModelList={fetchModelList}
              smartInput={smartInput}
              handleSmartInput={handleSmartInput}
              imageFile={imageFile}
              onImageFileChange={handleImageFileChange}
              defaultImage={defaultImage}
              selectedQuestionId={selectedQuestionId}
              setSelectedQuestionId={setSelectedQuestionId}
              reasoningQuestions={reasoningQuestions}
            />
          </div>
          {/* ResultsSection takes up 8 columns (2/3) on large screens */}
          <div className="lg:col-span-8">
            <ResultsSection
              testResult={testResult}
              isStreaming={isStreaming}
              streamContent={streamContent}
              testType={testType}
              loading={loading}
              onAbort={handleAbort}
              canAbort={!!abortController}
              timeElapsed={timeElapsed}
              setTimeElapsed={setTimeElapsed}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
