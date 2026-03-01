import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export async function ensureApiKey() {
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
}

export async function generateCreativePrompts(
  images: { data: string, mimeType: string }[],
  views: string[],
  countPerView: number
): Promise<{ view: string, prompts: string[] }[]> {
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key provided. Please set it in the top bar.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = images.map(img => ({
    inlineData: {
      data: img.data,
      mimeType: img.mimeType
    }
  }));

  parts.push({
    text: `你是一个资深的建筑摄影大师和创意效果图制作，现在根据我选择的角度类型为这栋建筑进行创意摄影和图片的拍摄。
你应该考虑光影，影调，色彩氛围，摄影器材和镜头使用等等。你制作的这些摄影作品是极具创意和美感的。最终生成详细的准确的英文prompt去控制AI生成效果。
请为以下每个视角生成 ${countPerView} 个不同的英文提示词（Prompt）：
${views.join(', ')}

请以JSON格式返回，格式如下：
[
  {
    "view": "视角名称",
    "prompts": ["prompt 1", "prompt 2", ...]
  }
]`
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            view: { type: Type.STRING },
            prompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["view", "prompts"]
        }
      }
    }
  });

  const jsonStr = response.text || '[]';
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON response:", jsonStr);
    return [];
  }
}

export async function analyzeStyle(imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key provided. Please set it in the top bar.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      },
      "Analyze this image."
    ],
    config: {
      systemInstruction: "请仅仅分析这张图片的色彩氛围、光影质感、渲染方式、艺术媒介和视觉风格，输出成一段逗号分隔的英文提示词。绝对不要描述画面中的具体主体（如特定的人物、建筑、物体等）。",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text || '';
}

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  resolution: string,
  referenceImages?: { data: string, mimeType: string }[]
): Promise<string> {
  await ensureApiKey();
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key provided. Please set it in the top bar.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [];
  if (referenceImages && referenceImages.length > 0) {
    for (const img of referenceImages) {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
    }
  }
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: resolution as any,
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}
