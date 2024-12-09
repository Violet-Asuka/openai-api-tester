import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WeatherResponse, AreaDimensions, AreaResponse, TestResult, Model } from '@/types/api-test';

// Keeping the same available functions and tool definitions...
const availableFunctions = {
    get_weather: ({ location, unit = 'celsius' }: { location: string; unit?: 'celsius' | 'fahrenheit' }): WeatherResponse => {
        return {
            location,
            temperature: 22,
            unit,
            condition: 'sunny',
            humidity: 65,
            wind_speed: 12
        };
    },
    calculate_area: ({ shape, dimensions }: { 
        shape: 'rectangle' | 'circle'; 
        dimensions: AreaDimensions 
    }): AreaResponse => {
        if (shape === 'rectangle' && dimensions.width && dimensions.height) {
            return { area: dimensions.width * dimensions.height };
        } else if (shape === 'circle' && dimensions.radius) {
            return { area: Math.PI * Math.pow(dimensions.radius, 2) };
        }
        throw new Error('Invalid dimensions for shape');
    }
};

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

const APITestTool: React.FC = () => {
    // State management
    const [baseUrl, setBaseUrl] = useState<string>('');
    const [apiKey, setApiKey] = useState<string>('');
    const [model, setModel] = useState<string>('');
    const [modelList, setModelList] = useState<Model[]>([]);
    const [prompt, setPrompt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [functionTestSteps, setFunctionTestSteps] = useState<string[]>([]);
    const [functionTestInProgress, setFunctionTestInProgress] = useState<boolean>(false);
    // New states for stream response
    const [streamContent, setStreamContent] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [displayedContent, setDisplayedContent] = useState<string>('');
    const [showCursor, setShowCursor] = useState<boolean>(true);

    // Validation function
    const validateConfig = () => {
        if (!baseUrl || !apiKey) {
            setError('Please enter Base URL and API Key');
            return false;
        }
        return true;
    };

    // Fetch model list implementation
    const fetchModelList = async () => {
        if (!validateConfig()) return;

        setLoading(true);
        setError('');
        setModelList([]);

        try {
            const response = await fetch(`${baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();
            const models = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
            setModelList(models);
        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    // Connection test implementation
    const testConnection = async () => {
        if (!validateConfig()) return;
        if (!model) {
            setError('Please select or enter a model name');
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
                throw new Error(errorData.error?.message || `Connection test failed: ${response.status}`);
            }

            setTestResult({
                success: true,
                response: {
                    message: 'Connection test successful!',
                    content: 'Connection established successfully',
                    rawResponse: { status: "success" }
                }
            });
        } catch (error) {
            const errorMessage = handleError(error);
            setTestResult({
                success: false,
                error: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    // Regular chat test implementation
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

            // Simplified test result with just the content
            const responseData = {
                success: true,
                response: {
                    content: data.choices[0].message.content,
                    rawResponse: data // Store full response for raw view
                }
            };
            setTestResult(responseData);
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
            // Initial request with function definitions
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

            const responseMessage = initialData.choices[0].message;

            if (!responseMessage.tool_calls) {
                throw new Error('No function calls detected in the response');
            }

            // Execute function and get final response
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            const functionResponse = availableFunctions[functionName](functionArgs);

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

            // Store both initial and final responses with organized information
            setTestResult({
                success: true,
                response: {
                    content: finalData.choices[0].message.content,
                    functionCall: {
                        name: functionName,
                        arguments: functionArgs,
                        result: functionResponse
                    },
                    initialRequest: {
                        message: responseMessage.content,
                        toolCalls: responseMessage.tool_calls.map(call => ({
                            name: call.function.name,
                            arguments: JSON.parse(call.function.arguments)
                        }))
                    },
                    rawResponse: finalData // Store full response for raw view
                }
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

    // Render test results
    const renderTestResults = () => {
        if (!testResult) return null;

        return (
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
                                {/* Main content display */}
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    {testResult.response.functionCall ? (
                                        // Function call result
                                        <div className="space-y-4">
                                            {/* Initial function call details */}
                                            <div>
                                                <h4 className="font-medium mb-2">Initial Model Response:</h4>
                                                {testResult.response.initialRequest?.message && (
                                                    <p className="text-gray-700 mb-2">{testResult.response.initialRequest.message}</p>
                                                )}
                                                <div className="bg-gray-100 p-3 rounded-md">
                                                    <p className="font-medium text-sm mb-2">Function Call Details:</p>
                                                    <div className="text-gray-700 text-sm">
                                                        <p><span className="font-medium">Name:</span> {testResult.response.functionCall.name}</p>
                                                        <p className="mt-1"><span className="font-medium">Arguments:</span></p>
                                                        <pre className="mt-1 text-xs bg-gray-50 p-2 rounded">
                                                            {JSON.stringify(testResult.response.functionCall.arguments, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Function execution result and final response */}
                                            <div>
                                                <h4 className="font-medium mb-2">Function Result:</h4>
                                                <pre className="text-sm bg-gray-100 p-3 rounded-md">
                                                    {JSON.stringify(testResult.response.functionCall.result, null, 2)}
                                                </pre>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-2">Final Response:</h4>
                                                <p className="text-gray-700">{testResult.response.content}</p>
                                            </div>
                                        </div>
                                    ) : testResult.response.isStream ? (
                                        // Stream response with typing effect
                                        <div>
                                            <h4 className="font-medium mb-2">Stream Response:</h4>
                                            <div className="font-mono text-gray-700 whitespace-pre-wrap">
                                                {displayedContent}
                                                <span
                                                    className={`inline-block w-2 h-4 ml-1 ${showCursor ? 'bg-gray-500' : 'bg-transparent'}`}
                                                    style={{ transition: 'background-color 0.1s' }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // Regular chat result
                                        <div>
                                            <h4 className="font-medium mb-2">Response:</h4>
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {testResult.response.content}
                                            </p>
                                        </div>
                                    )}
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
                                {JSON.stringify(testResult.response?.rawResponse ?? testResult.response, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>API Test Tool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Configuration inputs */}
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
                        Connection Test
                    </Button>
                    <Button
                        onClick={testChat}
                        disabled={loading}
                    >
                        Chat Test
                    </Button>
                    <Button
                        onClick={testFunctionCalling}
                        disabled={loading}
                        variant="outline"
                    >
                        Function Test
                    </Button>
                </div>

                {/* Error display */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Test results */}
                {renderTestResults()}
            </CardContent>
        </Card>
    );
};

export default APITestTool;