import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Gemini proxy keeps payloads below the Vercel function body limit', async () => {
  const source = await readFile('api/gemini.ts', 'utf8');

  assert.match(source, /MAX_TOTAL_IMAGE_DATA_LENGTH = 3_000_000/);
  assert.match(source, /MAX_RESPONSE_IMAGE_DATA_LENGTH = 3_000_000/);
  assert.match(source, /IMAGE_RESPONSE_TOO_LARGE/);
});

test('Gemini proxy allows image-only generation and validates image settings', async () => {
  const source = await readFile('api/gemini.ts', 'utf8');

  assert.match(source, /\(!prompt\.trim\(\) && images\?\.length === 0\)/);
  assert.match(source, /SUPPORTED_ASPECT_RATIOS/);
  assert.match(source, /SUPPORTED_RESOLUTIONS/);
});

test('Gemini proxy supports a minimal key test and returns sanitized upstream errors', async () => {
  const source = await readFile('api/gemini.ts', 'utf8');

  assert.match(source, /case 'testConnection'/);
  assert.match(source, /instanceof ApiError/);
  assert.match(source, /errorHasCode/);
  assert.match(source, /Local preview cannot reach Gemini API/);
  assert.match(source, /INVALID_GEMINI_RESPONSE/);
  assert.match(source, /redacted-api-key/);
  assert.match(source, /sanitizeGeminiMessage/);
  assert.match(source, /TEXT_MODEL = 'gemini-3\.1-pro-preview'/);
  assert.match(source, /IMAGE_MODEL = 'gemini-3-pro-image'/);
  assert.match(source, /ai\.models\.get\(\{ model: IMAGE_MODEL \}\)/);
  assert.doesNotMatch(source, /gemini-3-pro-image-preview/);
});

test('Gemini proxy requests image output through the SDK-compatible format', async () => {
  const source = await readFile('api/gemini.ts', 'utf8');

  assert.match(source, /responseModalities: \['TEXT', 'IMAGE'\]/);
  assert.match(source, /imageConfig:/);
  assert.doesNotMatch(source, /generativelanguage\.googleapis\.com\/v1\/models/);
});

test('Gemini proxy generates structured creative image concepts before image generation', async () => {
  const source = await readFile('api/gemini.ts', 'utf8');

  assert.match(source, /generateCreativeImageConcepts/);
  assert.match(source, /SUPPORTED_CREATIVE_IMAGE_COUNTS = new Set\(\[1, 2, 4, 8\]\)/);
  assert.match(source, /senior architect, architectural photographer, visual director/);
  assert.match(source, /camera body or photography format/);
  assert.match(source, /lens focal length/);
  assert.match(source, /aperture or depth-of-field guidance/);
  assert.match(source, /soft creative guidance/);
  assert.match(source, /keywordInfluence/);
  assert.match(source, /case 'generateCreativeImageConcepts'/);
});
