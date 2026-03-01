/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Key } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
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
import { Save, FolderOpen, Undo2, Redo2, ChevronLeft } from 'lucide-react';
import { Dashboard } from './components/Dashboard';

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

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges, addNode, alignSelectedNodes } = useStore();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [showSaved, setShowSaved] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedWorkflows, setSavedWorkflows] = useState<string[]>(() => {
    return Object.keys(localStorage).filter(k => k.startsWith('workflow-'));
  });

  // Auto-save
  useEffect(() => {
    if (!currentProject) return;
    const timer = setTimeout(() => {
      const data = { name: projectName, nodes, edges, updatedAt: Date.now() };
      localStorage.setItem(currentProject, JSON.stringify(data));
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges, currentProject, projectName]);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKeyInput(savedKey);
    }
  }, []);

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

  const handleAddNode = (type: string) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {},
    };
    addNode(newNode as any);
  };

  const onEdgeClick = (e: React.MouseEvent, edge: any) => {
    if (e.ctrlKey || e.metaKey) {
      useStore.getState().saveHistory();
      setEdges(edges.filter(ed => ed.id !== edge.id));
    }
  };

  const onNodeDragStart = () => {
    useStore.getState().saveHistory();
  };

  const saveWorkflow = () => {
    if (!currentProject) return;
    const data = { name: projectName, nodes, edges, updatedAt: Date.now() };
    localStorage.setItem(currentProject, JSON.stringify(data));
    setSavedWorkflows(Object.keys(localStorage).filter(k => k.startsWith('workflow-')));
    alert('Saved successfully!');
  };

  const loadWorkflow = (key: string) => {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      useStore.getState().saveHistory();
      setNodes(parsed.nodes || []);
      setEdges(parsed.edges || []);
      setProjectName(parsed.name || key.replace('workflow-', ''));
      setCurrentProject(key);
    }
    setShowSaved(false);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKeyInput.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }
    setShowApiKeyModal(false);
  };

  if (!currentProject) {
    return <Dashboard onOpenProject={loadWorkflow} />;
  }

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentProject(null)} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="font-semibold text-gray-900 bg-transparent border-none outline-none hover:bg-gray-50 px-2 py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Untitled Project"
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Auto-saving...</span>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors border border-gray-200"
            title="Set API Key"
          >
            <Key size={16} className={localStorage.getItem('GEMINI_API_KEY') ? 'text-green-600' : 'text-gray-400'} />
            API Key
          </button>
        </div>
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Key size={20} className="text-blue-500" />
              Set Gemini API Key
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your Google Gemini API Key to use the generation features. This key is saved locally in your browser and is never sent to our servers.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-6 font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDragStart={onNodeDragStart}
          nodeTypes={nodeTypes}
          connectionRadius={40}
          deleteKeyCode={['Backspace', 'Delete']}
          snapToGrid={true}
          snapGrid={[20, 20]}
          fitView
        >
          <Background color="#ccc" gap={20} size={2} />
          <Controls />
          <MiniMap />

          <Panel position="top-right" className="flex gap-2">
            <button onClick={() => useStore.getState().undo()} className="p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50" title="Undo (Ctrl+Z)">
              <Undo2 size={18} />
            </button>
            <button onClick={() => useStore.getState().redo()} className="p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50" title="Redo (Ctrl+Y)">
              <Redo2 size={18} />
            </button>
            <div className="relative">
              <button onClick={() => setShowSaved(!showSaved)} className="p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                <FolderOpen size={18} /> <span className="text-sm font-medium">Load</span>
              </button>
              {showSaved && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  {savedWorkflows.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No saved workflows</div>
                  ) : (
                    savedWorkflows.map(key => (
                      <button key={key} onClick={() => loadWorkflow(key)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        {key.replace('workflow-', '')}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button onClick={saveWorkflow} className="p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
              <Save size={18} /> <span className="text-sm font-medium">Save</span>
            </button>
          </Panel>

          <Panel position="top-left" className="bg-white p-2 rounded-lg shadow-md border border-gray-200 flex flex-wrap gap-2 max-w-4xl">
            <button onClick={() => handleAddNode('textInput')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded text-gray-700">Add Text</button>
            <button onClick={() => handleAddNode('imageInput')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded text-gray-700">Add Image</button>
            <button onClick={() => handleAddNode('settings')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded text-gray-700">Add Settings</button>
            <button onClick={() => handleAddNode('styleAnalyzer')} className="px-3 py-1.5 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200">Add Style Analyzer</button>
            <button onClick={() => handleAddNode('creativeMaster')} className="px-3 py-1.5 text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-700 rounded border border-teal-200">Add Creative Master</button>
            <button onClick={() => handleAddNode('promptMerger')} className="px-3 py-1.5 text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 rounded border border-orange-200">Add Prompt Merger</button>
            <button onClick={() => handleAddNode('generator')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200">Add Generator</button>
            <button onClick={() => handleAddNode('output')} className="px-3 py-1.5 text-xs font-medium bg-pink-50 hover:bg-pink-100 text-pink-700 rounded border border-pink-200">Add Output</button>
            <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
            <button onClick={() => handleAddNode('stickyNote')} className="px-3 py-1.5 text-xs font-medium bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded border border-yellow-300">Add Sticky Note</button>
            <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
            <button onClick={() => alignSelectedNodes('left')} className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-900 text-white rounded shadow-sm">Align Left</button>
            <button onClick={() => alignSelectedNodes('top')} className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-900 text-white rounded shadow-sm">Align Top</button>
            <button onClick={() => useStore.getState().groupSelectedNodes()} className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm">Group (Ctrl+G)</button>
          </Panel>
        </ReactFlow>
      </div>
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
