import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Available functions that can be called by the API
const availableFunctions = {
    get_weather: ({ location, unit = 'celsius' }) => {
        // Simulated weather data
        return {
            location,
            temperature: 22,
            unit,
            condition: 'sunny',
            humidity: 65,
            wind_speed: 12
        };
    },
    calculate_area: ({ shape, dimensions }) => {
        if (shape === 'rectangle') {
            return { area: dimensions.width * dimensions.height };
        } else if (shape === 'circle') {
            return { area: Math.PI * Math.pow(dimensions.radius, 2) };
        }
        throw new Error('Unsupported shape');
    }
};

// Function definitions that will be sent to the API
const toolDefinitions = [
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Get the current weather for a location',
            parameters: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'City name'
                    },
                    unit: {
                        type: 'string',
                        enum: ['celsius', 'fahrenheit'],
                        description: 'Temperature unit'
                    }
                },
                required: ['location']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'calculate_area',
            description: 'Calculate area of a shape',
            parameters: {
                type: 'object',
                properties: {
                    shape: {
                        type: 'string',
                        enum: ['rectangle', 'circle'],
                        description: 'Shape type'
                    },
                    dimensions: {
                        type: 'object',
                        properties: {
                            width: { type: 'number' },
                            height: { type: 'number' },
                            radius: { type: 'number' }
                        }
                    }
                },
                required: ['shape', 'dimensions']
            }
        }
    }
];

const APITestTool = () => {
    // Existing state management
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [modelList, setModelList] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [streamContent, setStreamContent] = useState('');

    // New state for function testing
    const [functionTestSteps, setFunctionTestSteps] = useState([]);
    const [functionTestInProgress, setFunctionTestInProgress] = useState(false);

    // Existing validation function
    const validateConfig = () => {
        if (!baseUrl || !apiKey) {
            setError('Please enter Base URL and API Key');
            return false;
        }
        return true;
    };

    // 获取模型列表实现
    const fetchModelList = async () => {
        if (!validateConfig()) return;

        setLoading(true);
        setError('');
        setModelList([]);

        try {
            const modelsUrl = `${baseUrl}/models`;
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `获取模型列表失败: ${response.status}`);
            }

            const data = await response.json();
            const models = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
            setModelList(models);
        } catch (err) {
            console.error('获取模型列表错误:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 连通性测试实现
    const testConnection = async () => {
        if (!validateConfig()) return;
        if (!model) {
            setError('请选择或输入模型名称');
            return;
        }

        setLoading(true);
        setError('');
        setTestResult(null);

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: "user",
                        content: "Hi"
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `连通性测试失败: ${response.status}`);
            }

            setTestResult({
                success: true,
                response: {
                    message: '连通性测试成功!'
                }
            });
        } catch (err) {
            console.error('连通性测试错误:', err);
            setError(err.message);
            setTestResult({
                success: false,
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // 流式响应测试实现
    const testStreamChat = async () => {
        if (!validateConfig()) return;
        if (!model) {
            setError('请选择或输入模型名称');
            return;
        }

        setLoading(true);
        setError('');
        setTestResult(null);
        setStreamContent('');

        const userPrompt = prompt.trim() || 'Tell me a joke';

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: "user",
                        content: userPrompt
                    }],
                    stream: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '流式对话测试失败');
            }

            // 处理流式响应
            const reader = response.body.getReader();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(5);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content || '';
                            fullContent += content;
                            // 将转义的换行符转换为实际的换行符
                            setStreamContent(fullContent.replace(/\\n/g, '\n'));
                        } catch (e) {
                            console.error('Error parsing stream data:', e);
                        }
                    }
                }
            }

            setTestResult({
                success: true,
                response: {
                    content: fullContent.replace(/\\n/g, '\n'),
                    model: model
                }
            });
        } catch (err) {
            console.error('Stream chat test error:', err);
            setError(err.message);
            setTestResult({
                success: false,
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // 常规对话测试实现
    const testChat = async () => {
        if (!validateConfig()) return;
        if (!model) {
            setError('Please select or enter a model name');
            return;
        }

        setLoading(true);
        setError('');
        setTestResult(null);

        const userPrompt = prompt.trim() || 'Tell me a joke';

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: "user",
                        content: userPrompt
                    }],
                    stream: false
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Chat test failed');
            }

            setTestResult({
                success: true,
                response: data
            });
        } catch (err) {
            console.error('Chat test error:', err);
            setError(err.message);
            setTestResult({
                success: false,
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // Function test implementation
    const testFunctionCalling = async () => {
        if (!validateConfig()) return;
        if (!model) {
            setError('Please select or enter a model name');
            return;
        }

        setLoading(true);
        setError('');
        setTestResult(null);
        setFunctionTestSteps([]);
        setFunctionTestInProgress(true);

        const userMessage = prompt.trim() || "What's the weather like in Tokyo?";

        try {
            // Step 1: Initial request with function definitions
            const initialResponse = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: "user",
                        content: userMessage
                    }],
                    tools: toolDefinitions,
                    tool_choice: "auto"
                })
            });

            const initialData = await initialResponse.json();

            if (!initialResponse.ok) {
                throw new Error(initialData.error?.message || 'Function test failed');
            }

            // Record first step
            setFunctionTestSteps(steps => [...steps, {
                type: 'initial_request',
                data: initialData
            }]);

            const responseMessage = initialData.choices[0].message;

            // Check if function call is present
            if (!responseMessage.tool_calls) {
                setTestResult({
                    success: false,
                    response: {
                        message: 'No function calls detected in the response. The API or model might not support function calling.'
                    }
                });
                return;
            }

            // Execute local function
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            let functionResponse;
            try {
                functionResponse = availableFunctions[functionName](functionArgs);
            } catch (err) {
                throw new Error(`Local function execution failed: ${err.message}`);
            }

            // Record function execution step
            setFunctionTestSteps(steps => [...steps, {
                type: 'function_execution',
                name: functionName,
                args: functionArgs,
                result: functionResponse
            }]);

            // Step 2: Second request with function result
            const finalResponse = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "user", content: userMessage },
                        { role: "assistant", content: null, tool_calls: [toolCall] },
                        { role: "tool", content: JSON.stringify(functionResponse), tool_call_id: toolCall.id }
                    ]
                })
            });

            const finalData = await finalResponse.json();

            if (!finalResponse.ok) {
                throw new Error(finalData.error?.message || 'Final response failed');
            }

            // Record final step
            setFunctionTestSteps(steps => [...steps, {
                type: 'final_response',
                data: finalData
            }]);

            // 提取函数调用信息
            const functionInfo = {
                function: {
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments
                }
            };

            setTestResult({
                success: true,
                response: functionInfo
            });

        } catch (err) {
            console.error('Function test error:', err);
            setError(err.message);
            setTestResult({
                success: false,
                error: err.message
            });
        } finally {
            setLoading(false);
            setFunctionTestInProgress(false);
        }
    };

    const renderFunctionTestResults = () => {
        if (!functionTestSteps.length) return null;

        // 获取函数调用信息
        const functionCall = functionTestSteps.find(step =>
            step.type === 'initial_request' &&
            step.data?.choices?.[0]?.message?.tool_calls?.[0]
        );

        if (!functionCall) return null;

        const toolCall = functionCall.data.choices[0].message.tool_calls[0];
        const functionInfo = {
            function: {
                name: toolCall.function.name,
                arguments: JSON.parse(toolCall.function.arguments)  // 解析参数为对象以便美化
            }
        };

        return (
            <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">函数调用信息</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-gray-100 p-4 rounded text-sm font-mono overflow-x-auto">
                        {JSON.stringify(functionInfo, null, 2)}  {/* 使用2空格缩进 */}
                    </pre>
                </CardContent>
            </Card>
        );
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>API Test Tool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Basic configuration inputs */}
                <div className="space-y-2">
                    <Input
                        placeholder="Base URL (e.g., https://api.openai.com/v1)"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="w-full"
                    />
                    <Input
                        placeholder="API Key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full"
                    />
                </div>

                {/* Model selection */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Model name"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            onClick={fetchModelList}
                            disabled={loading}
                            variant="outline"
                            className="whitespace-nowrap"
                        >
                            Get Models
                        </Button>
                    </div>

                    {modelList.length > 0 && (
                        <div className="p-2 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-500 mb-2">Available models:</p>
                            <div className="flex flex-wrap gap-2">
                                {modelList.map((m) => (
                                    <Button
                                        key={m.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setModel(m.id)}
                                        className={`text-sm ${model === m.id ? 'bg-blue-100' : ''}`}
                                    >
                                        {m.id}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Prompt input */}
                <Input
                    placeholder="Enter prompt (default: What's the weather like in Tokyo?)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full"
                />

                {/* Test buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Button
                        onClick={testConnection}
                        disabled={loading}
                        variant="secondary"
                    >
                        连通性测试
                    </Button>
                    <Button
                        onClick={testChat}
                        disabled={loading}
                    >
                        对话测试
                    </Button>
                    <Button
                        onClick={testStreamChat}
                        disabled={loading}
                        variant="outline"
                    >
                        流式对话
                    </Button>
                    <Button
                        onClick={testFunctionCalling}
                        disabled={loading}
                        variant="outline"
                    >
                        函数测试
                    </Button>
                </div>

                {/* Error display */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Function test results */}
                {functionTestInProgress && renderFunctionTestResults()}

                {/* Regular test results */}
                {testResult && !functionTestInProgress && (
                    <div className="space-y-4">
                        <Card className={`border-l-4 ${testResult.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center space-x-2">
                                    {testResult.success ? (
                                        <Check className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    <CardTitle className="text-lg">
                                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {testResult.success ? (
                                    <div className="space-y-3">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium mb-2">Response:</h4>
                                            <p className="text-gray-700">
                                                {testResult.response.choices?.[0]?.message?.content ||
                                                    testResult.response.message ||
                                                    JSON.stringify(testResult.response)}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-red-600">
                                        {testResult.error}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Raw response data */}
                        <div className="bg-gray-50 rounded-lg">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <span className="flex items-center text-sm font-medium">
                                    <ChevronDown
                                        className={`h-4 w-4 mr-2 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''
                                            }`}
                                    />
                                    View Raw Response
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-4">
                                    <pre className="p-4 bg-gray-100 rounded-md text-sm overflow-auto max-h-96">
                                        {JSON.stringify(testResult.response, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default APITestTool;