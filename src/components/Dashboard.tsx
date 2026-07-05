import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Folder,
  HardDrive,
  HelpCircle,
  KeyRound,
  MoreVertical,
  Plus,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { defaultEdges, defaultNodes } from '../defaultWorkflow';
import {
  createProject,
  deleteProject,
  exportProject,
  getStorageEstimate,
  importProject,
  listProjects,
  migrateLegacyProjects,
  requestPersistentStorage,
  type ProjectSummary,
  type StorageEstimate,
} from '../services/localProjectDb';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function formatUpdatedAt(updatedAt: number): string {
  const now = Date.now();
  const diff = now - updatedAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Edited just now';
  if (diff < hour) return `Edited ${Math.max(1, Math.floor(diff / minute))} min ago`;
  if (diff < day) return `Edited ${Math.max(1, Math.floor(diff / hour))} hours ago`;
  if (diff < day * 7) return `Edited ${Math.max(1, Math.floor(diff / day))} days ago`;
  return `Edited ${new Date(updatedAt).toLocaleDateString()}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function Dashboard({
  hasApiKey,
  onManageApiKey,
  onOpenProject,
}: {
  hasApiKey: boolean;
  onManageApiKey: () => void;
  onOpenProject: (id: string) => void | Promise<void>;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [error, setError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = async () => {
    setProjects(await listProjects());
    setEstimate(await getStorageEstimate());
  };

  useEffect(() => {
    void (async () => {
      try {
        await migrateLegacyProjects();
        await loadLibrary();
      } catch (loadError) {
        console.error(loadError);
        setError('Could not open the local project library.');
      }
    })();
  }, []);

  const handleNew = async () => {
    try {
      const id = await createProject('Untitled Project', defaultNodes, defaultEdges);
      await onOpenProject(id);
    } catch (createError) {
      console.error(createError);
      setError('Could not create a local project.');
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this project and its saved images?')) return;
    try {
      await deleteProject(id);
      await loadLibrary();
    } catch (deleteError) {
      console.error(deleteError);
      setError('Could not delete this project.');
    }
  };

  const handleExport = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const packageFile = await exportProject(id);
      downloadBlob(packageFile.blob, packageFile.fileName);
    } catch (exportError) {
      console.error(exportError);
      setError('Could not export this project.');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const id = await importProject(file);
      await loadLibrary();
      await onOpenProject(id);
    } catch (importError) {
      console.error(importError);
      setError('Could not import this project package.');
    }
  };

  const handleRequestPersistence = async () => {
    try {
      await requestPersistentStorage();
      await loadLibrary();
    } catch (persistenceError) {
      console.error(persistenceError);
      setError('Could not request persistent browser storage.');
    }
  };

  const storageLabel = estimate
    ? `Storage ${formatBytes(estimate.usage)}${estimate.quota ? ` / ${formatBytes(estimate.quota)}` : ''}`
    : 'Storage checking';
  const storagePercentage = estimate ? Math.round(estimate.percentage * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:20px_20px]">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-5">
            <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Menu">
              <MoreVertical size={22} className="rotate-90" />
            </button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950">NodeGen</h1>
              <p className="mt-1 text-sm text-gray-500">Create, organize, and generate AI image workflows locally.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-gray-200 bg-white p-3 text-gray-600 shadow-sm hover:bg-gray-50" title="Help">
              <HelpCircle size={20} />
            </button>
            <button className="rounded-xl border border-gray-200 bg-white p-3 text-gray-600 shadow-sm hover:bg-gray-50" title="Settings">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={onManageApiKey}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium shadow-sm transition-colors ${
              hasApiKey
                ? 'border-green-200 bg-white text-gray-800 hover:border-green-300 hover:bg-green-50'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <KeyRound size={16} className={hasApiKey ? 'text-green-600' : 'text-blue-600'} />
            {hasApiKey ? 'API Key Ready · Manage' : 'Add API Key'}
            <ChevronRight size={15} />
          </button>
          <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            <Folder size={15} />
            Local Library Active
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            <CheckCircle2 size={15} className="text-green-600" />
            Autosave On
          </span>
          <button
            onClick={() => !estimate?.persisted && void handleRequestPersistence()}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm ${
              estimate && estimate.percentage >= 0.8
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-gray-200 bg-white text-gray-600'
            } ${estimate?.persisted ? 'cursor-default' : 'hover:bg-gray-50'}`}
            title={estimate?.persisted ? 'Persistent browser storage is enabled.' : 'Ask browser to keep local projects.'}
          >
            <HardDrive size={15} />
            {storageLabel}
            {estimate && estimate.quota > 0 && (
              <>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                  <span className="block h-full rounded-full bg-green-500" style={{ width: `${Math.min(storagePercentage, 100)}%` }} />
                </span>
                <span>{storagePercentage}%</span>
              </>
            )}
          </button>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Recent Projects</h2>
              <p className="mt-1 text-sm text-gray-500">Open a saved local workflow, create a new one, or import a project package.</p>
            </div>
            <div className="flex items-center gap-3">
              <input ref={importInputRef} type="file" accept=".aiworkflow,application/json" className="hidden" onChange={handleImport} />
              <button onClick={handleNew} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                <Plus size={18} /> Create New Workflow
              </button>
              <button onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
                <Upload size={17} /> Import Project
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => void onOpenProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void onOpenProject(project.id);
                }}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="relative mb-4 h-40 overflow-hidden rounded-xl bg-gray-50">
                  {project.coverImageUrl ? (
                    <img src={project.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center border border-dashed border-gray-200 text-gray-400">
                      <Folder size={34} />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 rounded-lg bg-white/95 p-1 shadow-sm">
                    <MoreVertical size={18} className="text-gray-600" />
                  </div>
                </div>
                <div className="px-1 pb-1">
                  <h3 className="truncate text-base font-semibold text-gray-950">{project.name}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                    <span>{formatUpdatedAt(project.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Saved locally
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(event) => void handleExport(project.id, event)}
                    className="rounded-md border border-gray-100 bg-white p-1 text-gray-400 shadow-sm hover:text-blue-600"
                    title="Export project package"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={(event) => void handleDelete(project.id, event)}
                    className="rounded-md border border-gray-100 bg-white p-1 text-gray-400 shadow-sm hover:text-red-500"
                    title="Delete local project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                  <Folder size={32} />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-950">No projects yet</h3>
                <p className="mb-6 text-gray-500">Create a workflow or import a local project package.</p>
                <button onClick={handleNew} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-100">
                  <Plus size={18} /> Create New Workflow
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
