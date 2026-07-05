import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('canvas supports Ctrl-drag cutting and forgiving connection targets', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');

  assert.match(app, /onEdgeMouseMove=\{onEdgeMouseMove\}/);
  assert.match(app, /\(event\.buttons & 1\) === 1/);
  assert.match(app, /defaultEdgeOptions=\{\{ interactionWidth: 40 \}\}/);
  assert.match(app, /connectionRadius=\{56\}/);
  assert.match(css, /\.react-flow__handle::after/);
  assert.match(css, /inset: -9px/);
});

test('canvas supports Shift multi-select for grouping nodes', () => {
  const app = readFileSync('src/App.tsx', 'utf8');

  assert.match(app, /selectionKeyCode="Shift"/);
  assert.match(app, /multiSelectionKeyCode="Shift"/);
  assert.match(app, /selectionMode=\{SelectionMode\.Partial\}/);
  assert.match(app, /groupSelectedNodes/);
});

test('editor keeps canvas navigation controls in their approved locations', () => {
  const app = readFileSync('src/App.tsx', 'utf8');

  assert.match(app, /<Controls \/>/);
  assert.match(app, /<MiniMap \/>/);
  assert.doesNotMatch(app, /Panel position=/);
  assert.doesNotMatch(app, /position="top-left"/);
  assert.doesNotMatch(app, /position="top-right"/);
  assert.doesNotMatch(app, /Gemini 3\.1 Pro Preview/);
});

test('editor sidebar is compact and resizable', () => {
  const app = readFileSync('src/App.tsx', 'utf8');

  assert.match(app, /MIN_SIDEBAR_WIDTH = 188/);
  assert.match(app, /DEFAULT_SIDEBAR_WIDTH = 220/);
  assert.match(app, /MAX_SIDEBAR_WIDTH = 360/);
  assert.match(app, /setSidebarWidth/);
  assert.match(app, /cursor-col-resize/);
  assert.match(app, /aria-label="Resize sidebar"/);
  assert.doesNotMatch(app, /w-72 shrink-0 flex-col/);
});

test('editor registers Creative Master Image and generated image result nodes', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const masterImageNode = readFileSync('src/components/nodes/CreativeMasterImageNode.tsx', 'utf8');
  const resultNode = readFileSync('src/components/nodes/GeneratedImageResultNode.tsx', 'utf8');
  const outputNode = readFileSync('src/components/nodes/OutputNode.tsx', 'utf8');

  assert.match(app, /CreativeMasterImageNode/);
  assert.match(app, /GeneratedImageResultNode/);
  assert.match(app, /creativeMasterImage/);
  assert.match(app, /generatedImageResult/);
  assert.match(app, /Creative Master \(Image\)/);
  assert.match(masterImageNode, /IMAGE_COUNTS = \[1, 2, 4, 8\]/);
  assert.match(masterImageNode, /Keywords/);
  assert.match(masterImageNode, /optional/);
  assert.doesNotMatch(masterImageNode, /placeholder=/);
  assert.match(masterImageNode, /generateCreativeImageConcepts/);
  assert.match(masterImageNode, /generateImage\(concept\.prompt, '1:1', '1K', referenceImages\)/);
  assert.match(masterImageNode, /type: 'generatedImageResult'/);
  assert.match(resultNode, /id="image"/);
  assert.match(resultNode, /id="prompt"/);
  assert.match(resultNode, /showPrompt/);
  assert.match(resultNode, /data\.text/);
  assert.match(outputNode, /sourceData\?\.generatedImage \|\| sourceData\?\.image/);
});

test('Vite preview serves the local Gemini proxy', () => {
  const config = readFileSync('vite.config.ts', 'utf8');

  assert.match(config, /localGeminiApi/);
  assert.match(config, /server\.middlewares\.use\('\/api\/gemini'/);
  assert.match(config, /server\.ssrLoadModule\('\/api\/gemini\.ts'\)/);
  assert.match(config, /MAX_LOCAL_API_BODY_LENGTH = 5_000_000/);
});
