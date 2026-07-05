import type { Edge, Node } from '@xyflow/react';

const DB_NAME = 'ai-image-generator-local-projects';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const ASSET_STORE = 'assets';
const ASSET_PROJECT_INDEX = 'projectId';
const PACKAGE_FORMAT = 'ai-image-generator-workflow';

type StoredProject = {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
};

type StoredAsset = {
  id: string;
  projectId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
};

type ExportedAsset = {
  id: string;
  mimeType: string;
  data: string;
};

type ProjectPackage = {
  format: typeof PACKAGE_FORMAT;
  version: 1;
  project: StoredProject;
  assets: ExportedAsset[];
};

export type ProjectSummary = Pick<StoredProject, 'id' | 'name' | 'createdAt' | 'updatedAt'> & {
  coverImageUrl?: string;
};

export type StorageEstimate = {
  usage: number;
  quota: number;
  percentage: number;
  persisted: boolean;
};

const IMAGE_FIELDS = [
  ['image', 'imageAssetId'],
  ['generatedImage', 'generatedImageAssetId'],
] as const;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local project database.'));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        database.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        const assets = database.createObjectStore(ASSET_STORE, { keyPath: 'id' });
        assets.createIndex(ASSET_PROJECT_INDEX, 'projectId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, encoded] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const bytes = atob(encoded || '');
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new Blob([buffer], { type: mimeType });
}

async function imageSourceToBlob(source: string): Promise<Blob> {
  if (source.startsWith('data:')) return dataUrlToBlob(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not read an image for local storage.');
  return response.blob();
}

function sanitizeFileName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'workflow';
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function remapAssetIds(nodes: Node[], assetIdMap: Map<string, string>): Node[] {
  return nodes.map((node) => {
    const data = { ...node.data } as Record<string, unknown>;
    for (const [, assetIdField] of IMAGE_FIELDS) {
      const assetId = data[assetIdField];
      if (typeof assetId === 'string' && assetIdMap.has(assetId)) {
        data[assetIdField] = assetIdMap.get(assetId);
      }
    }
    return { ...node, data };
  });
}

async function putAsset(asset: StoredAsset): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, 'readwrite');
  transaction.objectStore(ASSET_STORE).put(asset);
  await transactionComplete(transaction);
  database.close();
}

async function getAsset(id: string): Promise<StoredAsset | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, 'readonly');
  const asset = await requestResult(transaction.objectStore(ASSET_STORE).get(id));
  await transactionComplete(transaction);
  database.close();
  return asset as StoredAsset | undefined;
}

async function getAssetsForProject(projectId: string): Promise<StoredAsset[]> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, 'readonly');
  const assets = await requestResult(transaction.objectStore(ASSET_STORE).index(ASSET_PROJECT_INDEX).getAll(projectId));
  await transactionComplete(transaction);
  database.close();
  return assets as StoredAsset[];
}

async function cleanupUnreferencedAssets(projectId: string, referencedIds: Set<string>): Promise<void> {
  const assets = await getAssetsForProject(projectId);
  const obsoleteIds = assets.filter((asset) => !referencedIds.has(asset.id)).map((asset) => asset.id);
  if (obsoleteIds.length === 0) return;

  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, 'readwrite');
  const store = transaction.objectStore(ASSET_STORE);
  obsoleteIds.forEach((id) => store.delete(id));
  await transactionComplete(transaction);
  database.close();
}

async function prepareNodesForStorage(projectId: string, nodes: Node[]): Promise<{ nodes: Node[]; assetIds: Set<string> }> {
  const assetIds = new Set<string>();
  const storedNodes = await Promise.all(nodes.map(async (node) => {
    const data = { ...node.data } as Record<string, unknown>;
    for (const [imageField, assetIdField] of IMAGE_FIELDS) {
      const source = data[imageField];
      let assetId = typeof data[assetIdField] === 'string' ? data[assetIdField] as string : '';
      if (typeof source === 'string' && source && !assetId) {
        assetId = `asset-${projectId}-${node.id}-${imageField}`;
        const blob = await imageSourceToBlob(source);
        await putAsset({
          id: assetId,
          projectId,
          blob,
          mimeType: blob.type || String(data.mimeType || 'application/octet-stream'),
          createdAt: Date.now(),
        });
      }
      if (assetId) {
        data[assetIdField] = assetId;
        assetIds.add(assetId);
      }
      delete data[imageField];
    }
    return { ...cloneSerializable(node), data };
  }));
  return { nodes: storedNodes, assetIds };
}

async function hydrateNodes(nodes: Node[]): Promise<Node[]> {
  return Promise.all(nodes.map(async (node) => {
    const data = { ...node.data } as Record<string, unknown>;
    for (const [imageField, assetIdField] of IMAGE_FIELDS) {
      const assetId = data[assetIdField];
      if (typeof assetId !== 'string') continue;
      const asset = await getAsset(assetId);
      if (asset) {
        data[imageField] = URL.createObjectURL(asset.blob);
        data.mimeType ||= asset.mimeType;
      }
    }
    return { ...cloneSerializable(node), data };
  }));
}

async function getStoredProject(id: string): Promise<StoredProject | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECT_STORE, 'readonly');
  const project = await requestResult(transaction.objectStore(PROJECT_STORE).get(id));
  await transactionComplete(transaction);
  database.close();
  return project as StoredProject | undefined;
}

function findProjectCoverAssetId(nodes: Node[]): string | undefined {
  const generatedCover = nodes
    .map((node) => (node.data as Record<string, unknown> | undefined)?.generatedImageAssetId)
    .find((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0);
  if (generatedCover) return generatedCover;

  return nodes
    .map((node) => (node.data as Record<string, unknown> | undefined)?.imageAssetId)
    .find((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0);
}

async function putStoredProject(project: StoredProject): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECT_STORE, 'readwrite');
  transaction.objectStore(PROJECT_STORE).put(project);
  await transactionComplete(transaction);
  database.close();
}

export async function saveImageAsset(projectId: string, source: Blob | string): Promise<{ assetId: string; url: string; mimeType: string }> {
  const blob = typeof source === 'string' ? await imageSourceToBlob(source) : source;
  const assetId = `asset-${crypto.randomUUID()}`;
  await putAsset({
    id: assetId,
    projectId,
    blob,
    mimeType: blob.type || 'application/octet-stream',
    createdAt: Date.now(),
  });
  return {
    assetId,
    url: URL.createObjectURL(blob),
    mimeType: blob.type || 'application/octet-stream',
  };
}

export async function createProject(name: string, nodes: Node[], edges: Edge[]): Promise<string> {
  const id = `workflow-${crypto.randomUUID()}`;
  await saveProject(id, name, nodes, edges);
  return id;
}

export async function saveProject(id: string, name: string, nodes: Node[], edges: Edge[]): Promise<void> {
  const existing = await getStoredProject(id);
  const prepared = await prepareNodesForStorage(id, nodes);
  const now = Date.now();
  await putStoredProject({
    id,
    name: name.trim() || 'Untitled Project',
    nodes: prepared.nodes,
    edges: cloneSerializable(edges),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await cleanupUnreferencedAssets(id, prepared.assetIds);
}

export async function loadProject(id: string): Promise<StoredProject | undefined> {
  const project = await getStoredProject(id);
  if (!project) return undefined;
  return { ...project, nodes: await hydrateNodes(project.nodes) };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECT_STORE, 'readonly');
  const projects = await requestResult(transaction.objectStore(PROJECT_STORE).getAll()) as StoredProject[];
  await transactionComplete(transaction);
  database.close();

  const summaries = await Promise.all(projects.map(async ({ id, name, nodes, createdAt, updatedAt }) => {
    const coverAssetId = findProjectCoverAssetId(nodes);
    const coverAsset = coverAssetId ? await getAsset(coverAssetId) : undefined;
    return {
      id,
      name,
      createdAt,
      updatedAt,
      coverImageUrl: coverAsset ? URL.createObjectURL(coverAsset.blob) : undefined,
    };
  }));

  return summaries.sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  const assets = await getAssetsForProject(id);
  const database = await openDatabase();
  const transaction = database.transaction([PROJECT_STORE, ASSET_STORE], 'readwrite');
  transaction.objectStore(PROJECT_STORE).delete(id);
  const assetStore = transaction.objectStore(ASSET_STORE);
  assets.forEach((asset) => assetStore.delete(asset.id));
  await transactionComplete(transaction);
  database.close();
}

export async function exportProject(id: string): Promise<{ blob: Blob; fileName: string }> {
  const project = await getStoredProject(id);
  if (!project) throw new Error('Project not found.');
  const assets = await getAssetsForProject(id);
  const exportedAssets = await Promise.all(assets.map(async (asset) => ({
    id: asset.id,
    mimeType: asset.mimeType,
    data: toBase64(await asset.blob.arrayBuffer()),
  })));
  const packageData: ProjectPackage = {
    format: PACKAGE_FORMAT,
    version: 1,
    project,
    assets: exportedAssets,
  };
  return {
    blob: new Blob([JSON.stringify(packageData)], { type: 'application/json' }),
    fileName: `${sanitizeFileName(project.name)}.aiworkflow`,
  };
}

export async function importProject(file: File): Promise<string> {
  const packageData = JSON.parse(await file.text()) as ProjectPackage;
  if (packageData.format !== PACKAGE_FORMAT || packageData.version !== 1 || !packageData.project || !Array.isArray(packageData.assets)) {
    throw new Error('Unsupported project package.');
  }

  const id = `workflow-${crypto.randomUUID()}`;
  const assetIdMap = new Map<string, string>();
  for (const asset of packageData.assets) {
    const assetId = `asset-${crypto.randomUUID()}`;
    assetIdMap.set(asset.id, assetId);
    await putAsset({
      id: assetId,
      projectId: id,
      blob: new Blob([fromBase64(asset.data)], { type: asset.mimeType }),
      mimeType: asset.mimeType,
      createdAt: Date.now(),
    });
  }

  const now = Date.now();
  await putStoredProject({
    ...packageData.project,
    id,
    name: packageData.project.name || file.name.replace(/\.aiworkflow$/i, ''),
    nodes: remapAssetIds(packageData.project.nodes, assetIdMap),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function migrateLegacyProjects(): Promise<void> {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith('workflow-'));
  for (const key of keys) {
    try {
      const legacy = JSON.parse(localStorage.getItem(key) || '{}');
      if (!Array.isArray(legacy.nodes) || !Array.isArray(legacy.edges)) continue;
      await saveProject(key, legacy.name || key.replace('workflow-', ''), legacy.nodes, legacy.edges);
      localStorage.removeItem(key);
    } catch {
      // Leave unreadable legacy data untouched so users can recover it manually.
    }
  }
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const estimate = await navigator.storage?.estimate?.();
  const usage = estimate?.usage ?? 0;
  const quota = estimate?.quota ?? 0;
  const persisted = await navigator.storage?.persisted?.() ?? false;
  return {
    usage,
    quota,
    percentage: quota > 0 ? usage / quota : 0,
    persisted,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  return navigator.storage?.persist?.() ?? false;
}
