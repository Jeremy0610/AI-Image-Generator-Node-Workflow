import { ApiError, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type ImageInput = {
  data: string;
  mimeType: string;
};

const TEXT_MODEL = 'gemini-3.1-pro-preview';
const IMAGE_MODEL = 'gemini-3-pro-image';
const MAX_IMAGES = 8;
const MAX_TOTAL_IMAGE_DATA_LENGTH = 3_000_000;
const MAX_RESPONSE_IMAGE_DATA_LENGTH = 3_000_000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const SUPPORTED_ASPECT_RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);
const SUPPORTED_RESOLUTIONS = new Set(['1K', '2K', '4K']);
const SUPPORTED_CREATIVE_IMAGE_COUNTS = new Set([1, 2, 4, 8]);

function sanitizeGeminiMessage(message: string): string {
  return message
    .replace(/AIza[\w-]+/g, '[redacted-api-key]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 600);
}

function errorHasCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as Record<string, unknown>;
  if (record.code === code) return true;
  if (errorHasCode(record.cause, code)) return true;
  if (Array.isArray(record.errors)) return record.errors.some((nestedError) => errorHasCode(nestedError, code));

  return false;
}

function describeGeminiError(error: unknown): { status: number; message: string } {
  if (error instanceof ApiError) {
    return {
      status: error.status >= 400 && error.status < 600 ? error.status : 502,
      message: `Gemini API ${error.status}: ${sanitizeGeminiMessage(error.message)}`,
    };
  }

  console.error('Unexpected Gemini proxy error:', error);
  if (errorHasCode(error, 'EACCES')) {
    return {
      status: 502,
      message: 'Local preview cannot reach Gemini API. Restart the preview server with network access enabled, then try again.',
    };
  }

  if (error instanceof Error && error.message) {
    return {
      status: 502,
      message: `Gemini request failed before a response was returned: ${sanitizeGeminiMessage(error.message)}`,
    };
  }

  return {
    status: 502,
    message: 'Gemini request failed before a response was returned. Check the local preview terminal for details.',
  };
}

function parseBody(body: unknown): Record<string, unknown> | null {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }

  return null;
}

function getApiKey(req: RequestLike): string | null {
  const value = req.headers['x-gemini-api-key'];
  if (typeof value !== 'string') return null;

  const apiKey = value.trim();
  return apiKey.length >= 20 && apiKey.length <= 256 ? apiKey : null;
}

function readString(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
    ? value
    : null;
}

function readOptionalString(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

function readImages(value: unknown, required: boolean): ImageInput[] | null {
  if (!Array.isArray(value) || value.length > MAX_IMAGES || (required && value.length === 0)) {
    return null;
  }

  let totalLength = 0;
  const images: ImageInput[] = [];

  for (const image of value) {
    if (!image || typeof image !== 'object') return null;

    const data = readString((image as Record<string, unknown>).data, MAX_TOTAL_IMAGE_DATA_LENGTH);
    const mimeType = readString((image as Record<string, unknown>).mimeType, 32);
    if (!data || !mimeType || !SUPPORTED_IMAGE_TYPES.has(mimeType)) return null;

    totalLength += data.length;
    if (totalLength > MAX_TOTAL_IMAGE_DATA_LENGTH) return null;
    images.push({ data, mimeType });
  }

  return images;
}

async function generateCreativePrompts(ai: GoogleGenAI, payload: Record<string, unknown>) {
  const images = readImages(payload.images, true);
  const views = Array.isArray(payload.views)
    ? payload.views.filter((view): view is string => typeof view === 'string' && view.length > 0 && view.length <= 100)
    : [];
  const countPerView = payload.countPerView;

  if (!images || views.length === 0 || views.length > 8 || !Number.isInteger(countPerView) || Number(countPerView) < 1 || Number(countPerView) > 8) {
    throw new Error('INVALID_PAYLOAD');
  }

  const parts: any[] = images.map((image) => ({ inlineData: image }));
  parts.push({
    text: `你是一位资深的建筑摄影大师和创意效果图制作师。请根据选择的视角类型，为这座建筑生成具有创意和美感的摄影方案。考虑光影、影调、色彩氛围、摄影器材和镜头使用等因素。最终生成详细、准确的英文 Prompt，以控制 AI 生成效果。请为以下每个视角生成 ${countPerView} 个不同的英文提示词：
${views.join(', ')}

请仅返回符合以下格式的 JSON：[
  {
    "view": "视角名称",
    "prompts": ["prompt 1", "prompt 2"]
  }
]`,
  });

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            view: { type: Type.STRING },
            prompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['view', 'prompts'],
        },
      },
    },
  });

  try {
    return { results: JSON.parse(response.text || '[]') };
  } catch {
    throw new Error('INVALID_GEMINI_RESPONSE');
  }
}

async function generateCreativeImageConcepts(ai: GoogleGenAI, payload: Record<string, unknown>) {
  const images = readImages(payload.images, true);
  const views = Array.isArray(payload.views)
    ? payload.views.filter((view): view is string => typeof view === 'string' && view.length > 0 && view.length <= 100)
    : [];
  const keywords = readOptionalString(payload.keywords, 1_000);
  const imageCount = payload.imageCount;

  if (
    !images
    || views.length === 0
    || views.length > 8
    || keywords === null
    || !Number.isInteger(imageCount)
    || !SUPPORTED_CREATIVE_IMAGE_COUNTS.has(Number(imageCount))
  ) {
    throw new Error('INVALID_PAYLOAD');
  }

  const keywordGuidance = keywords.trim()
    ? `Optional user keywords are provided: "${keywords.trim()}". Treat them as soft creative guidance, not as a mandatory literal phrase. Apply them strongly to some concepts, lightly to others, and keep every concept visually distinct.`
    : 'No optional user keywords were provided. Create freely from the reference images and selected views.';

  const parts: any[] = images.map((image) => ({ inlineData: image }));
  parts.push({
    text: `You are a senior architect, architectural photographer, visual director, and AI image prompt designer.
You transform reference architectural images into highly specific, visually distinct image-generation concepts.

Generate exactly ${imageCount} concepts for these selected view types:
${views.join(', ')}

${keywordGuidance}

For each concept, write one complete English image-generation prompt. Each prompt must include:
- architectural intent and spatial scenario
- selected view type
- composition and camera position
- lighting condition
- material, facade, landscape, and spatial details
- mood and visual storytelling
- camera body or photography format
- lens focal length
- aperture or depth-of-field guidance
- realistic architectural photography or rendering quality

Variation rules:
- Make every concept visually distinct.
- Vary camera distance, lighting, material emphasis, composition, mood, and environmental storytelling.
- If multiple views are selected, distribute concepts across the selected views when possible.
- If keywords are provided, at least half of the concepts should have medium or strong keyword influence, while the rest may use light influence or broader creative interpretation.
- Do not mechanically repeat the same keyword phrase in every prompt.
- Do not write generic prompts or short keyword lists.
- Do not include markdown.

Return only JSON matching this structure:
[
  {
    "id": "concept-1",
    "view": "Eye-level View",
    "title": "Short concept title",
    "keywordInfluence": "none | light | medium | strong",
    "prompt": "Complete English image generation prompt with camera and lens details."
  }
]`,
  });

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            view: { type: Type.STRING },
            title: { type: Type.STRING },
            keywordInfluence: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ['id', 'view', 'title', 'keywordInfluence', 'prompt'],
        },
      },
    },
  });

  try {
    const concepts = JSON.parse(response.text || '[]');
    return { concepts: Array.isArray(concepts) ? concepts.slice(0, Number(imageCount)) : [] };
  } catch {
    throw new Error('INVALID_GEMINI_RESPONSE');
  }
}

async function testConnection(ai: GoogleGenAI) {
  await Promise.all([
    ai.models.get({ model: TEXT_MODEL }),
    ai.models.get({ model: IMAGE_MODEL }),
  ]);
  return { ok: true, models: [TEXT_MODEL, IMAGE_MODEL] };
}

async function analyzeStyle(ai: GoogleGenAI, payload: Record<string, unknown>) {
  const images = readImages([{ data: payload.imageBase64, mimeType: payload.mimeType }], true);
  if (!images) throw new Error('INVALID_PAYLOAD');

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      { inlineData: images[0] },
      'Analyze this image.',
    ],
    config: {
      systemInstruction: '请仅分析图片的色彩氛围、光影质感、渲染方式、艺术媒介和视觉风格，输出一段以逗号分隔的英文提示词。不要描述画面中的具体主体。',
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  return { stylePrompt: response.text || '' };
}

async function generateImage(ai: GoogleGenAI, payload: Record<string, unknown>) {
  const prompt = readOptionalString(payload.prompt, 20_000);
  const aspectRatio = readString(payload.aspectRatio, 16);
  const resolution = readString(payload.resolution, 8);
  const images = readImages(payload.referenceImages ?? [], false);
  if (
    prompt === null
    || (!prompt.trim() && images?.length === 0)
    || !aspectRatio
    || !SUPPORTED_ASPECT_RATIOS.has(aspectRatio)
    || !resolution
    || !SUPPORTED_RESOLUTIONS.has(resolution)
    || !images
  ) {
    throw new Error('INVALID_PAYLOAD');
  }

  const parts: any[] = images.map((image) => ({ inlineData: image }));
  if (prompt.trim()) parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: { parts },
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio,
        imageSize: resolution,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      if (part.inlineData.data.length > MAX_RESPONSE_IMAGE_DATA_LENGTH) {
        throw new Error('IMAGE_RESPONSE_TOO_LARGE');
      }
      return {
        image: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
      };
    }
  }

  throw new Error('NO_IMAGE_GENERATED');
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'A valid Gemini API key is required.' });
    return;
  }

  const body = parseBody(req.body);
  const operation = body?.operation;
  const payload = body?.payload;
  if (!body || typeof operation !== 'string' || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    res.status(400).json({ error: 'Invalid request body.' });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    let result: unknown;
    switch (operation) {
      case 'testConnection':
        result = await testConnection(ai);
        break;
      case 'generateCreativePrompts':
        result = await generateCreativePrompts(ai, payload as Record<string, unknown>);
        break;
      case 'generateCreativeImageConcepts':
        result = await generateCreativeImageConcepts(ai, payload as Record<string, unknown>);
        break;
      case 'analyzeStyle':
        result = await analyzeStyle(ai, payload as Record<string, unknown>);
        break;
      case 'generateImage':
        result = await generateImage(ai, payload as Record<string, unknown>);
        break;
      default:
        res.status(400).json({ error: 'Unsupported operation.' });
        return;
    }

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PAYLOAD') {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }

    if (error instanceof Error && error.message === 'NO_IMAGE_GENERATED') {
      res.status(502).json({ error: 'Gemini did not return an image.' });
      return;
    }

    if (error instanceof Error && error.message === 'IMAGE_RESPONSE_TOO_LARGE') {
      res.status(502).json({ error: 'Generated image is too large to return. Try a lower resolution.' });
      return;
    }

    if (error instanceof Error && error.message === 'INVALID_GEMINI_RESPONSE') {
      res.status(502).json({ error: 'Gemini returned a response that could not be parsed. Try again.' });
      return;
    }

    const geminiError = describeGeminiError(error);
    res.status(geminiError.status).json({ error: geminiError.message });
  }
}
