import { TestResult } from "@/types/apiTypes"

// Add helper function for image validation
const validateImage = async (file: File | Blob): Promise<boolean> => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  return validTypes.includes(file.type);
}

export async function testImage(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  imageFile?: File,
  signal?: AbortSignal
): Promise<TestResult> {
  try {
    // Get and encode image
    let base64Image: string;
    
    if (imageFile) {
      // Validate uploaded file
      if (!await validateImage(imageFile)) {
        throw new Error('Invalid image format. Please use JPEG, PNG, or GIF files.');
      }
      
      base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Ensure correct format prefix based on file type
          const base64Part = result.split(',')[1];
          resolve(`data:${imageFile.type};base64,${base64Part}`);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    } else {
      // Handle default image
      try {
        const response = await fetch('/example.jpg'); // Changed from vite.svg
        if (!response.ok) {
          throw new Error('Failed to load default image');
        }
        const blob = await response.blob();
        
        // Validate default image
        if (!await validateImage(blob)) {
          throw new Error('Default image format is invalid');
        }
        
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        throw new Error('Failed to load or process default image');
      }
    }

    const messages = [{
      role: 'user',
      content: [
        { 
          type: 'text', 
          text: prompt || '这张图片里有什么？请使用中文详细描述' 
        },
        { 
          type: 'image_url', 
          image_url: {
            url: base64Image  // Wrap base64Image in an object with url property
          }
        }
      ]
    }];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({ model, messages })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Check for common "no image" responses
    const noImageKeywords = [
      "no image", "cannot see", "don't see", "没有看到", "看不到",
      "无法看到", "未能看到", "not able to see", "unable to see",
      "no image provided", "未提供图片", "图片未提供"
    ];

    if (content && noImageKeywords.some(keyword => 
      content.toLowerCase().includes(keyword))) {
      return {
        success: false,
        error: 'API无法处理图片或当前模型不支持图像识别功能'
      };
    }
    
    return {
      success: true,
      response: {
        content: content || '',
        rawResponse: data
      }
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    return {
      success: false,
      error: error.message || 'Image test failed'
    };
  }
} 