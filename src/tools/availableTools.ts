import { Tool } from "@/types/apiTypes"

export const weatherTool: Tool = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather information for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location to get weather for"
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
}

export const calculatorTool: Tool = {
  type: "function",
  function: {
    name: "calculate",
    description: "Perform mathematical calculations",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The mathematical expression to evaluate"
        }
      },
      required: ["expression"]
    }
  }
}

export const availableTools: Record<string, Tool> = {
  weather: weatherTool,
  calculator: calculatorTool
} 