/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  FolderOpen,
  Group,
  HardDrive,
  Image as ImageIcon,
  Key,
  Lightbulb,
  Merge,
  Plus,
  Redo2,
  Save,
  Settings,
  Sparkles,
  StickyNote,
  Type,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from './store';
import { TextInputNode } from './components/nodes/TextInputNode';
import { ImageInputNode } from './components/nodes/ImageInputNode';
import { SettingsNode } from './components/nodes/SettingsNode';
import { StyleAnalyzerNode } from './components/nodes/StyleAnalyzerNode';
import { GeneratorNode } from './components/nodes/GeneratorNode';
import { OutputNode } from './components/nodes/OutputNode';
import { PromptMergerNode } from './components/nodes/PromptMergerNode';
import { StickyNoteNode } from './components/nodes/StickyNoteNode';
import { StaticImageNode } from './components/nodes/StaticImageNode';
import { GroupNode } from './components/nodes/GroupNode';
import { CreativeMasterNode } from './components/nodes/CreativeMasterNode';
import { CreativeMasterImageNode } from './components/nodes/CreativeMasterImageNode';
import { GeneratedImageResultNode } from './components/nodes/GeneratedImageResultNode';
import { Dashboard } from './components/Dashboard';
import { defaultEdges, defaultNodes } from './defaultWorkflow';
import {
  createProject,
  exportProject,
  getStorageEstimate,
  importProject,
  listProjects,
  loadProject,
  migrateLegacyProjects,
  requestPersistentStorage,
  saveProject,
  type ProjectSummary,
  type StorageEstimate,
} from './services/localProjectDb';
import { testGeminiApiKey } from './services/ai';

const nodeTypes = {
  textInput: TextInputNode,
  imageInput: ImageInputNode,
  settings: SettingsNode,
  styleAnalyzer: StyleAnalyzerNode,
  generator: GeneratorNode,
  output: OutputNode,
  promptMerger: PromptMergerNode,
  stickyNote: StickyNoteNode,
  staticImage: StaticImageNode,
  groupNode: GroupNode,
  creativeMaster: CreativeMasterNode,
  creativeMasterImage: CreativeMasterImageNode,
  generatedImageResult: GeneratedImageResultNode,
};

const initialNodes = [
  { id: 'text-1', type: 'textInput', position: { x: 100, y: 100 }, data: { text: 'A futuristic city with flying cars' } },
  { id: 'settings-1', type: 'settings', position: { x: 100, y: 350 }, data: { aspectRatio: '16:9', resolution: '1K' } },
  { id: 'gen-1', type: 'generator', position: { x: 500, y: 200 }, data: {} },
  { id: 'out-1', type: 'output', position: { x: 900, y: 200 }, data: {} },
];

const initialEdges = [
  { id: 'e1', source: 'text-1', target: 'gen-1', sourceHandle: 'prompt', targetHandle: 'prompt' },
  { id: 'e2', source: 'settings-1', target: 'gen-1', sourceHandle: 'settings', targetHandle: 'settings' },
  { id: 'e3', source: 'gen-1', target: 'out-1', sourceHandle: 'image', targetHandle: 'image' },
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const sidebarNodeTools = [
  { type: 'textInput', label: 'Text Prompt', icon: Type, className: 'text-indigo-600' },
  { type: 'imageInput', label: 'Image Input', icon: ImageIcon, className: 'text-emerald-600' },
  { type: 'settings', label: 'Settings', icon: Settings, className: 'text-orange-500' },
  { type: 'styleAnalyzer', label: 'Style Analyzer', icon: Sparkles, className: 'text-purple-600' },
  { type: 'creativeMaster', label: 'Creative Master', icon: Lightbulb, className: 'text-teal-600' },
  { type: 'creativeMasterImage', label: 'Creative Master (Image)', icon: ImageIcon, className: 'text-teal-600' },
  { type: 'promptMerger', label: 'Prompt Merger', icon: Merge, className: 'text-orange-600' },
  { type: 'generator', label: 'Generator', icon: Wand2, className: 'text-blue-600' },
  { type: 'output', label: 'Output', icon: ImageIcon, className: 'text-pink-600' },
  { type: 'stickyNote', label: 'Sticky Note', icon: StickyNote, className: 'text-yellow-600' },
] as const;

const MIN_SIDEBAR_WIDTH = 188;
const DEFAULT_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 360;

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setEdges, addNode, alignSelectedNodes, setCurrentProjectId } = useStore();
  const { screenToFlowPosition } = useReactFlow();
  const lastPanePosition = useRef<{ x: number; y: number } | null>(null);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [showSaved, setShowSaved] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(sessionStorage.getItem('GEMINI_API_KEY')));
  const [apiKeyTestStatus, setApiKeyTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiKeyTestMessage, setApiKeyTestMessage] = useState('');
  const [savedWorkflows, setSavedWorkflows] = useState<ProjectSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refreshLocalLibrary = useCallback(async () => {
    setSavedWorkflows(await listProjects());
    setStorageEstimate(await getStorageEstimate());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await migrateLegacyProjects();
        await refreshLocalLibrary();
      } catch (error) {
        console.error(error);
      }
    })();
  }, [refreshLocalLibrary]);

  const persistWorkflow = useCallback(async () => {
    if (!currentProject) return;
    setSaveStatus('saving');
    try {
      await saveProject(currentProject, projectName, nodes, edges);
      await refreshLocalLibrary();
      setSaveStatus('saved');
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
    }
  }, [currentProject, edges, nodes, projectName, refreshLocalLibrary]);

  // Auto-save after canvas edits settle.
  useEffect(() => {
    if (!currentProject) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      void persistWorkflow();
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges, currentProject, projectName, persistWorkflow]);

  useEffect(() => {
    if (!currentProject) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        useStore.getState().copySelectedNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        useStore.getState().pasteNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        useStore.getState().groupSelectedNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useStore.getState().redo();
        } else {
          useStore.getState().undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (event: PointerEvent) => {
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX)));
    };
    const handlePointerUp = () => setIsResizingSidebar(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizingSidebar]);

  const handleAddNode = (type: string) => {
    const position = lastPanePosition.current ?? screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {},
    };
    addNode(newNode as any);
  };

  const handleOpenApiKeyModal = () => {
    setApiKeyInput('');
    setApiKeyTestStatus('idle');
    setApiKeyTestMessage('');
    setShowApiKeyModal(true);
  };

  const handlePaneMouseMove = (event: React.MouseEvent) => {
    lastPanePosition.current = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const removeEdge = useCallback((edgeId: string) => {
    const currentEdges = useStore.getState().edges;
    if (!currentEdges.some((edge) => edge.id === edgeId)) return;
    useStore.getState().saveHistory();
    setEdges(currentEdges.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  const onEdgeClick = (event: React.MouseEvent, edge: any) => {
    if (event.ctrlKey || event.metaKey) removeEdge(edge.id);
  };

  const onEdgeMouseMove = (event: React.MouseEvent, edge: any) => {
    if ((event.ctrlKey || event.metaKey) && (event.buttons & 1) === 1) {
      removeEdge(edge.id);
    }
  };

  const onNodeDragStart = () => {
    useStore.getState().saveHistory();
  };

  const saveWorkflow = async () => {
    await persistWorkflow();
  };

  const loadWorkflow = async (id: string) => {
    const project = await loadProject(id);
    if (project) {
      useStore.getState().resetStore(project.nodes || [], project.edges || []);
      setProjectName(project.name || 'Untitled Project');
      setCurrentProjectId(id);
      setCurrentProject(id);
      setSaveStatus('saved');
    }
    setShowSaved(false);
  };

  const handleBack = async () => {
    await persistWorkflow();
    setCurrentProject(null);
    setCurrentProjectId(null);
  };

  const handleNewProject = async () => {
    await persistWorkflow();
    const id = await createProject('Untitled Project', defaultNodes, defaultEdges);
    await refreshLocalLibrary();
    await loadWorkflow(id);
  };

  const handleExport = async () => {
    if (!currentProject) return;
    await persistWorkflow();
    const packageFile = await exportProject(currentProject);
    downloadBlob(packageFile.blob, packageFile.fileName);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const id = await importProject(file);
      await refreshLocalLibrary();
      await loadWorkflow(id);
    } catch (error) {
      console.error(error);
      alert('Could not import this project package.');
    }
  };

  const handleRequestPersistence = async () => {
    await requestPersistentStorage();
    await refreshLocalLibrary();
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      sessionStorage.setItem('GEMINI_API_KEY', apiKeyInput.trim());
      setHasApiKey(true);
    }
    setApiKeyInput('');
    setShowApiKeyModal(false);
  };

  const handleTestApiKey = async () => {
    const apiKey = apiKeyInput.trim();
    if (!apiKey) return;
    setApiKeyTestStatus('testing');
    setApiKeyTestMessage('');
    try {
      const models = await testGeminiApiKey(apiKey);
      setApiKeyTestStatus('success');
      setApiKeyTestMessage(`API key accepted. Available models: ${models.join(', ')}`);
    } catch (error) {
      setApiKeyTestStatus('error');
      setApiKeyTestMessage(error instanceof Error ? error.message : 'Gemini connection test failed.');
    }
  };

  const handleClearApiKey = () => {
    sessionStorage.removeItem('GEMINI_API_KEY');
    setApiKeyInput('');
    setHasApiKey(false);
    setShowApiKeyModal(false);
  };

  const apiKeyModal = showApiKeyModal && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Key size={20} className="text-blue-500" />
          Set Gemini API Key
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your own Google Gemini API Key. It is kept only for this browser tab and is sent through the server proxy only when you request Gemini generation. Closing the tab clears it.
        </p>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-6 font-mono text-sm"
        />
        {apiKeyTestMessage && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${apiKeyTestStatus === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {apiKeyTestMessage}
          </div>
        )}
        <div className="flex justify-end gap-3">
          {hasApiKey && (
            <button
              onClick={handleClearApiKey}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Clear Key
            </button>
          )}
          <button
            onClick={() => setShowApiKeyModal(false)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleTestApiKey()}
            disabled={!apiKeyInput.trim() || apiKeyTestStatus === 'testing'}
            className="px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {apiKeyTestStatus === 'testing' ? 'Testing...' : 'Test Access'}
          </button>
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKeyInput.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );

  if (!currentProject) {
    return (
      <>
        <Dashboard hasApiKey={hasApiKey} onManageApiKey={handleOpenApiKeyModal} onOpenProject={loadWorkflow} />
        {apiKeyModal}
      </>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => void handleBack()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <ChevronLeft size={16} /> Projects
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="min-w-0 max-w-80 rounded-lg border-none bg-transparent px-2 py-1 text-base font-semibold text-gray-950 outline-none transition-all hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            placeholder="Untitled Workflow"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
            saveStatus === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-600'
          }`}>
            <CheckCircle2 size={15} className={saveStatus === 'error' ? 'text-red-600' : 'text-green-600'} />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed' : 'Saved locally'}
          </span>
          {storageEstimate && (
            <button
              onClick={() => !storageEstimate.persisted && void handleRequestPersistence()}
              className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 md:inline-flex ${
                storageEstimate.percentage >= 0.8 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600'
              } ${storageEstimate.persisted ? 'cursor-default' : 'hover:bg-gray-50'}`}
              title={storageEstimate.persisted ? 'Persistent browser storage is enabled.' : 'Ask browser to keep local projects.'}
            >
              <HardDrive size={15} />
              {formatBytes(storageEstimate.usage)}{storageEstimate.quota ? ` / ${formatBytes(storageEstimate.quota)}` : ''}
            </button>
          )}
          <button
            onClick={handleOpenApiKeyModal}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-colors ${
              hasApiKey
                ? 'border-green-200 bg-white text-gray-700 hover:bg-green-50'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            title="Manage API Key"
          >
            <Key size={15} className={hasApiKey ? 'text-green-600' : 'text-blue-600'} />
            {hasApiKey ? 'API Key Ready · Manage' : 'Add API Key'}
            <ChevronRight size={14} />
          </button>
          <div className="ml-2 hidden items-center gap-1 border-l border-gray-200 pl-3 sm:flex">
            <button onClick={() => useStore.getState().undo()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Undo (Ctrl+Z)">
              <Undo2 size={17} />
            </button>
            <button onClick={() => useStore.getState().redo()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Redo (Ctrl+Y)">
              <Redo2 size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="relative z-10 flex shrink-0 flex-col border-r border-gray-200 bg-white"
          style={{ width: sidebarWidth }}
        >
          <div className="flex-1 overflow-y-auto p-3">
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Nodes</h2>
              <div className="space-y-2">
                {sidebarNodeTools.map(({ type, label, icon: Icon, className }) => (
                  <button
                    key={type}
                    onClick={() => handleAddNode(type)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    <Icon size={18} className={className} />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6 border-t border-gray-200 pt-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Arrange</h2>
              <div className="space-y-2">
                <button onClick={() => alignSelectedNodes('left')} className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <AlignHorizontalJustifyStart size={18} className="text-gray-500" /> Align Left
                </button>
                <button onClick={() => alignSelectedNodes('top')} className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <AlignVerticalJustifyStart size={18} className="text-gray-500" /> Align Top
                </button>
                <button onClick={() => useStore.getState().groupSelectedNodes()} className="flex w-full items-center gap-2.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-2 text-sm font-medium text-purple-700 shadow-sm hover:bg-purple-100">
                  <Group size={18} /> Group (Ctrl+G)
                </button>
              </div>
            </section>

            <section className="mt-6 border-t border-gray-200 pt-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Project</h2>
              <input ref={importInputRef} type="file" accept=".aiworkflow,application/json" className="hidden" onChange={handleImport} />
              <div className="space-y-2">
                <button onClick={() => void handleNewProject()} className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <FilePlus2 size={18} className="text-gray-500" /> New
                </button>
                <div className="relative">
                  <button onClick={() => setShowSaved(!showSaved)} className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                    <FolderOpen size={18} className="text-gray-500" /> Open
                  </button>
                  {showSaved && (
                    <div className="absolute left-full top-0 z-50 ml-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                      {savedWorkflows.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500">No saved workflows</div>
                      ) : (
                        savedWorkflows.map(workflow => (
                          <button key={workflow.id} onClick={() => void loadWorkflow(workflow.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                            {workflow.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => importInputRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <Upload size={18} className="text-gray-500" /> Import
                </button>
                <button onClick={() => void handleExport()} className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <Download size={18} className="text-gray-500" /> Export
                </button>
                <button onClick={() => void saveWorkflow()} className="flex w-full items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100">
                  <Save size={18} /> Save
                </button>
              </div>
            </section>
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            title="Drag to resize sidebar"
            onPointerDown={(event) => {
              event.preventDefault();
              setIsResizingSidebar(true);
            }}
            className={`absolute right-[-4px] top-0 h-full w-2 cursor-col-resize transition-colors hover:bg-blue-500/20 ${isResizingSidebar ? 'bg-blue-500/20' : ''}`}
          />
        </aside>

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneMouseMove={handlePaneMouseMove}
            onEdgeClick={onEdgeClick}
            onEdgeMouseMove={onEdgeMouseMove}
            onNodeDragStart={onNodeDragStart}
            nodeTypes={nodeTypes}
            connectOnClick
            connectionLineType={ConnectionLineType.Bezier}
            connectionRadius={56}
            connectionDragThreshold={2}
            defaultEdgeOptions={{ interactionWidth: 40 }}
            deleteKeyCode={['Backspace', 'Delete']}
            selectionKeyCode="Shift"
            multiSelectionKeyCode="Shift"
            selectionMode={SelectionMode.Partial}
            snapToGrid={true}
            snapGrid={[20, 20]}
            fitView
          >
            <Background color="#ccc" gap={20} size={2} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
      {apiKeyModal}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
