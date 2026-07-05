import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const frontendFiles = [
  'src/services/ai.ts',
  'src/App.tsx',
  'vite.config.ts',
];

test('frontend does not inject API keys or access API-key process environment variables', async () => {
  const source = await Promise.all(frontendFiles.map((file) => readFile(file, 'utf8')));
  const combined = source.join('\n');

  assert.doesNotMatch(combined, /process\.env\.(?:GEMINI_API_KEY|API_KEY)/);
  assert.doesNotMatch(combined, /localStorage\.(?:getItem|setItem|removeItem)\(['"]GEMINI_API_KEY['"]/);
});
