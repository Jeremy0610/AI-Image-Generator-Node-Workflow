type ImageInput = {
  data: string;
  mimeType: string;
};

export type CreativeImageConcept = {
  id: string;
  view: string;
  title: string;
  keywordInfluence: 'none' | 'light' | 'medium' | 'strong';
  prompt: string;
};

type GeminiOperation = 'testConnection' | 'generateCreativePrompts' | 'generateCreativeImageConcepts' | 'analyzeStyle' | 'generateImage';
const MAX_TOTAL_AI_IMAGE_BASE64_LENGTH = 2_800_000;
const MAX_AI_IMAGE_DIMENSION = 1_600;
const SUPPORTED_AI_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function imageSourceToBlob(source: string): Promise<Blob> {
  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not read the selected image.');
  return response.blob();
}

function normalizeImageMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare the selected image for AI processing.'));
    }, mimeType, quality);
  });
}

export function getAiImageBase64Limit(imageCount: number): number {
  return Math.floor(MAX_TOTAL_AI_IMAGE_BASE64_LENGTH / Math.max(1, imageCount));
}

export async function imageSourceToAiInput(
  source: string,
  fallbackMimeType = 'image/jpeg',
  maxBase64Length = MAX_TOTAL_AI_IMAGE_BASE64_LENGTH,
): Promise<ImageInput> {
  const sourceBlob = await imageSourceToBlob(source);
  const mimeType = normalizeImageMimeType(sourceBlob.type || fallbackMimeType);
  const sourceData = toBase64(await sourceBlob.arrayBuffer());
  if (SUPPORTED_AI_IMAGE_TYPES.has(mimeType) && sourceData.length <= maxBase64Length) {
    return { data: sourceData, mimeType };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(sourceBlob);
  } catch {
    throw new Error('This image is too large for AI processing and could not be compressed in the browser.');
  }

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the selected image for AI processing.');

    let scale = Math.min(1, MAX_AI_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.72, 0.58]) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        const data = toBase64(await blob.arrayBuffer());
        if (data.length <= maxBase64Length) return { data, mimeType: 'image/jpeg' };
      }
      scale *= 0.72;
    }
  } finally {
    bitmap.close();
  }

  throw new Error('This image is too large for AI processing. Please use a smaller image.');
}

export async function imageSourceToBase64(source: string): Promise<string> {
  return (await imageSourceToAiInput(source)).data;
}

function getApiKey(): string {
  const apiKey = sessionStorage.getItem('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('No API key provided. Please set it in the top bar.');
  }
  return apiKey;
}

async function callGemini<T>(operation: GeminiOperation, payload: Record<string, unknown>): Promise<T> {
  return callGeminiWithApiKey<T>(getApiKey(), operation, payload);
}

async function callGeminiWithApiKey<T>(apiKey: string, operation: GeminiOperation, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': apiKey,
    },
    body: JSON.stringify({ operation, payload }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || 'Gemini request failed.');
  }

  return result as T;
}

export async function testGeminiApiKey(apiKey: string): Promise<string[]> {
  const result = await callGeminiWithApiKey<{ ok: boolean; models: string[] }>(apiKey, 'testConnection', {});
  if (!result.ok) throw new Error('Gemini connection test failed.');
  return result.models;
}

export async function generateCreativePrompts(
  images: ImageInput[],
  views: string[],
  countPerView: number,
): Promise<{ view: string; prompts: string[] }[]> {
  const result = await callGemini<{ results: { view: string; prompts: string[] }[] }>(
    'generateCreativePrompts',
    { images, views, countPerView },
  );
  return result.results;
}

export async function generateCreativeImageConcepts(
  images: ImageInput[],
  views: string[],
  keywords: string,
  imageCount: 1 | 2 | 4 | 8,
): Promise<CreativeImageConcept[]> {
  const result = await callGemini<{ concepts: CreativeImageConcept[] }>(
    'generateCreativeImageConcepts',
    { images, views, keywords, imageCount },
  );
  return result.concepts;
}

export async function analyzeStyle(imageBase64: string, mimeType: string): Promise<string> {
  const result = await callGemini<{ stylePrompt: string }>('analyzeStyle', { imageBase64, mimeType });
  return result.stylePrompt;
}

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  resolution: string,
  referenceImages: ImageInput[] = [],
): Promise<string> {
  const result = await callGemini<{ image: string }>('generateImage', {
    prompt,
    aspectRatio,
    resolution,
    referenceImages,
  });
  return result.image;
}
