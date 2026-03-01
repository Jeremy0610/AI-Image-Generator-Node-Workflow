import { Handle, Position } from '@xyflow/react';
import { useStore } from '../../store';
import { Sparkles, Loader2, X } from 'lucide-react';
import { analyzeStyle } from '../../services/ai';

export function StyleAnalyzerNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const getNodeData = useStore((state) => state.getNodeData);
  const getIncomingEdges = useStore((state) => state.getIncomingEdges);
  const deleteNode = useStore((state) => state.deleteNode);

  const handleAnalyze = async () => {
    const incomingEdges = getIncomingEdges(id);
    const imageEdge = incomingEdges.find(e => e.targetHandle === 'image');
    
    if (!imageEdge) {
      alert("Please connect an image input first.");
      return;
    }

    const sourceNodeData = getNodeData(imageEdge.source);
    if (!sourceNodeData?.image) {
      alert("The connected image node has no image.");
      return;
    }

    updateNodeData(id, { isLoading: true, error: null });
    try {
      // Extract base64 part
      const base64Data = sourceNodeData.image.split(',')[1];
      const mimeType = sourceNodeData.mimeType || 'image/jpeg';
      
      const stylePrompt = await analyzeStyle(base64Data, mimeType);
      updateNodeData(id, { stylePrompt, isLoading: false });
    } catch (error: any) {
      console.error(error);
      updateNodeData(id, { isLoading: false, error: error.message });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-72">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-xl font-medium text-sm text-gray-700 flex items-center justify-between relative">
        <Handle type="target" position={Position.Left} id="image" style={{ left: '-6px' }} className="w-3 h-3 bg-emerald-500" />
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" /> Style Analyzer
        </div>
        <button onClick={() => deleteNode(id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
      </div>
      
      <div className="p-4 flex flex-col gap-3 relative">
        <button 
          onClick={handleAnalyze}
          disabled={data.isLoading}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium text-sm py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {data.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {data.isLoading ? 'Analyzing...' : 'Analyze Style'}
        </button>

        {data.error && (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
            {data.error}
          </div>
        )}

        {data.stylePrompt && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Extracted Style</label>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
              {data.stylePrompt}
            </div>
          </div>
        )}
        <Handle type="source" position={Position.Right} id="style" style={{ right: '-6px', top: '50%' }} className="w-3 h-3 bg-purple-500" />
      </div>
    </div>
  );
}
