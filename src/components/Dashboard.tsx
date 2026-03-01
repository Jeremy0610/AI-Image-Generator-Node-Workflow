import React, { useState, useEffect } from 'react';
import { Plus, Folder, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { defaultNodes, defaultEdges } from '../defaultWorkflow';

export function Dashboard({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [projects, setProjects] = useState<{id: string, name: string, updatedAt: number}[]>([]);

  useEffect(() => {
    const loaded = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('workflow-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          loaded.push({
            id: key,
            name: data.name || key.replace('workflow-', ''),
            updatedAt: data.updatedAt || Date.now()
          });
        } catch (e) {}
      }
    }
    setProjects(loaded.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const handleNew = () => {
    const id = `workflow-${Date.now()}`;
    const name = 'Untitled Project';
    localStorage.setItem(id, JSON.stringify({ name, nodes: defaultNodes, edges: defaultEdges, updatedAt: Date.now() }));
    useStore.getState().resetStore(defaultNodes, defaultEdges);
    onOpenProject(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      localStorage.removeItem(id);
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Workflows</h1>
          <button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
            <Plus size={20} /> New Project
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {projects.map(p => (
            <div key={p.id} onClick={() => onOpenProject(p.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group relative">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Folder size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{p.name}</h3>
              <p className="text-sm text-gray-500">Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
              
              <button onClick={(e) => handleDelete(p.id, e)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-md shadow-sm border border-gray-100">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Create your first workflow to get started!</p>
              <button onClick={handleNew} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2">
                <Plus size={18} /> Create Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
