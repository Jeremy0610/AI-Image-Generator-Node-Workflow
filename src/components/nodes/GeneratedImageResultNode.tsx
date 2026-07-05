import { Handle, Position } from '@xyflow/react';
import { Download, Eye, Image as ImageIcon, MessageSquareText, X } from 'lucide-react';
import { useStore } from '../../store';

export function GeneratedImageResultNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNode = useStore((state) => state.deleteNode);
  const showPrompt = Boolean(data.showPrompt);

  const handleDownload = () => {
    if (!data.image) return;
    const link = document.createElement('a');
    link.href = data.image;
    link.download = `nodegen-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      <div className="relative flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
        <Handle type="target" position={Position.Left} id="input" style={{ left: '-6px' }} className="h-3 w-3 bg-teal-500" />
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon size={16} className="shrink-0 text-pink-500" />
          <span className="truncate">{data.title || 'Generated Image'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateNodeData(id, { showPrompt: !showPrompt })}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-pink-600"
            title={showPrompt ? 'Hide prompt' : 'Show prompt'}
          >
            <MessageSquareText size={15} />
          </button>
          {data.image && (
            <button onClick={handleDownload} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Download image">
              <Download size={15} />
            </button>
          )}
          <button onClick={() => deleteNode(id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          {data.image ? (
            <img src={data.image} alt={data.title || 'Generated image'} className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
              <Eye size={22} />
              Waiting for image
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>{data.view || 'Creative concept'}</span>
          {data.keywordInfluence && <span>Keywords: {data.keywordInfluence}</span>}
        </div>

        {showPrompt && (
          <div className="rounded-lg border border-pink-100 bg-pink-50 p-2 text-xs leading-relaxed text-gray-700">
            {data.text || 'No prompt saved for this image.'}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="image" style={{ right: '-6px', top: '42%' }} className="h-3 w-3 bg-pink-500" />
      <Handle type="source" position={Position.Right} id="prompt" style={{ right: '-6px', top: '66%' }} className="h-3 w-3 bg-indigo-500" />
    </div>
  );
}
