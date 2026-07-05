import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('projects use IndexedDB with separate Blob assets and portable packages', () => {
  const database = readSource('src/services/localProjectDb.ts');

  assert.match(database, /indexedDB\.open/);
  assert.match(database, /createObjectStore\(ASSET_STORE/);
  assert.match(database, /blob: Blob/);
  assert.match(database, /export async function exportProject/);
  assert.match(database, /export async function importProject/);
  assert.match(database, /navigator\.storage\?\.estimate/);
  assert.match(database, /navigator\.storage\?\.persist/);
});

test('editor autosave and dashboard project actions use the IndexedDB service', () => {
  const app = readSource('src/App.tsx');
  const dashboard = readSource('src/components/Dashboard.tsx');

  assert.match(app, /saveProject\(/);
  assert.match(app, /importProject\(/);
  assert.match(app, /exportProject\(/);
  assert.doesNotMatch(app, /localStorage/);
  assert.match(dashboard, /createProject\(/);
  assert.match(dashboard, /listProjects\(/);
  assert.doesNotMatch(dashboard, /localStorage/);
});

test('dashboard is project-first and only uses real project assets for covers', () => {
  const dashboard = readSource('src/components/Dashboard.tsx');
  const database = readSource('src/services/localProjectDb.ts');

  assert.match(dashboard, /NodeGen/);
  assert.match(dashboard, /Recent Projects/);
  assert.match(dashboard, /API Key Ready · Manage/);
  assert.match(dashboard, /Add API Key/);
  assert.match(dashboard, /coverImageUrl/);
  assert.doesNotMatch(dashboard, /source\.unsplash|picsum|placehold|Modern Villa Render|Coastal Landscape/);
  assert.match(database, /findProjectCoverAssetId/);
  assert.match(database, /generatedImageAssetId/);
  assert.match(database, /imageAssetId/);
  assert.match(database, /coverImageUrl: coverAsset \? URL\.createObjectURL\(coverAsset\.blob\) : undefined/);
});

test('image nodes store Blobs and AI calls can read blob URLs', () => {
  const imageInput = readSource('src/components/nodes/ImageInputNode.tsx');
  const generator = readSource('src/components/nodes/GeneratorNode.tsx');
  const creativeMaster = readSource('src/components/nodes/CreativeMasterNode.tsx');
  const styleAnalyzer = readSource('src/components/nodes/StyleAnalyzerNode.tsx');
  const ai = readSource('src/services/ai.ts');

  assert.match(imageInput, /saveImageAsset\(currentProjectId, file\)/);
  assert.match(generator, /saveImageAsset\(currentProjectId, imageUrl\)/);
  assert.match(generator, /imageSourceToAiInput/);
  assert.match(creativeMaster, /imageSourceToAiInput/);
  assert.match(styleAnalyzer, /imageSourceToAiInput/);
  assert.match(ai, /export async function imageSourceToBase64/);
  assert.match(ai, /export async function imageSourceToAiInput/);
  assert.match(ai, /createImageBitmap/);
  assert.match(ai, /canvas\.toBlob/);
  assert.match(ai, /await fetch\(source\)/);
});
