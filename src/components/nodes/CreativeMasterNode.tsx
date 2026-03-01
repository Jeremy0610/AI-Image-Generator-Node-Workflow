import { Handle, Position } from '@xyflow/react';
import { useStore } from '../../store';
import { Lightbulb, Loader2, X, Plus, Minus } from 'lucide-react';
import { generateCreativePrompts } from '../../services/ai';

const VIEW_TYPES = [
  { id: 'aerial', label: 'Aerial View (鸟瞰图)', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'eye-level', label: 'Eye-level View (人视角图)', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  { id: 'interior', label: 'Interior View (室内图)', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  { id: 'close-up', label: 'Close-up Detail (细节特写)', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' }
];

export function CreativeMasterNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const getNodeData = useStore((state) => state.getNodeData);
  const getIncomingEdges = useStore((state) => state.getIncomingEdges);
  const deleteNode = useStore((state) => state.deleteNode);

  const imageCount = data.imageCount || 1;
  const selectedViews = data.selectedViews || [];
  const promptCount = data.promptCount || 2;
  const generatedPrompts = data.generatedPrompts || [];

  const handleGenerate = async () => {
    if (selectedViews.length === 0) {
      alert("Please select at least one view type.");
      return;
    }

    const incomingEdges = getIncomingEdges(id);
    const referenceImages: { data: string, mimeType: string }[] = [];
    
    for (let i = 0; i < imageCount; i++) {
      const edge = incomingEdges.find(e => e.targetHandle === `image-${i}`);
      if (edge) {
        const nodeData = getNodeData(edge.source);
        if (nodeData?.image) {
          const base64Data = nodeData.image.split(',')[1];
          const mimeType = nodeData.mimeType || 'image/jpeg';
          referenceImages.push({ data: base64Data, mimeType });
        }
      }
    }

    if (referenceImages.length === 0) {
      alert("Please connect at least one image.");
      return;
    }

    updateNodeData(id, { isLoading: true, error: null });

    try {
      const viewLabels = selectedViews.map((vid: string) => VIEW_TYPES.find(v => v.id === vid)?.label || vid);
      const results = await generateCreativePrompts(referenceImages, viewLabels, promptCount);
      
      const newPrompts: any[] = [];
      let promptIndex = 0;
      
      results.forEach(result => {
        const viewType = VIEW_TYPES.find(v => result.view.includes(v.id) || result.view.includes(v.label.split(' ')[0])) || VIEW_TYPES[0];
        result.prompts.forEach(promptText => {
          newPrompts.push({
            id: `prompt-${promptIndex++}`,
            text: promptText,
            viewId: viewType.id
          });
        });
      });

      updateNodeData(id, { generatedPrompts: newPrompts, isLoading: false });
    } catch (error: any) {
      console.error(error);
      updateNodeData(id, { error: error.message || "Failed to generate prompts", isLoading: false });
    }
  };

  const toggleView = (viewId: string) => {
    const newViews = selectedViews.includes(viewId) 
      ? selectedViews.filter((id: string) => id !== viewId)
      : [...selectedViews, viewId];
    updateNodeData(id, { selectedViews: newViews });
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-[400px] h-auto flex flex-col relative">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 rounded-t-xl font-medium text-sm text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-teal-100" /> Creative Master
        </div>
        <button onClick={() => deleteNode(id)} className="text-teal-100 hover:text-white"><X size={16} /></button>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-4 nodrag nowheel">
        {/* Image Inputs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Images</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => updateNodeData(id, { imageCount: Math.max(1, imageCount - 1) })}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
              >
                <Minus size={14} />
              </button>
              <button 
                onClick={() => updateNodeData(id, { imageCount: imageCount + 1 })}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-2 relative">
            {Array.from({ length: imageCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 relative">
                <Handle type="target" position={Position.Left} id={`image-${i}`} style={{ left: '-17px' }} className="w-3 h-3 bg-blue-500" />
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Image {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Views Selection */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Views</div>
          <div className="grid grid-cols-2 gap-2">
            {VIEW_TYPES.map(view => (
              <label key={view.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${selectedViews.includes(view.id) ? `${view.bg} border-${view.color.replace('bg-', '')}` : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedViews.includes(view.id)}
                  onChange={() => toggleView(view.id)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className={`text-xs font-medium ${selectedViews.includes(view.id) ? view.text : 'text-gray-600'}`}>{view.label.split(' ')[0]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Prompt Count */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prompts per View</div>
          <select 
            value={promptCount}
            onChange={(e) => updateNodeData(id, { promptCount: parseInt(e.target.value) })}
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2"
          >
            <option value={2}>2 Prompts</option>
            <option value={4}>4 Prompts</option>
            <option value={8}>8 Prompts</option>
          </select>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={data.isLoading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shrink-0"
        >
          {data.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Lightbulb size={18} />}
          {data.isLoading ? 'Generating...' : 'Generate Prompts'}
        </button>

        {data.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {data.error}
          </div>
        )}

        {/* Generated Prompts */}
        {generatedPrompts.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Generated Prompts</div>
            <div className="space-y-3 relative">
              {generatedPrompts.map((prompt: any, index: number) => {
                const viewType = VIEW_TYPES.find(v => v.id === prompt.viewId) || VIEW_TYPES[0];
                return (
                  <div key={prompt.id} className={`p-3 rounded-lg border ${viewType.bg} border-opacity-50 relative group`}>
                    <div className={`text-xs font-bold mb-1 ${viewType.text}`}>{viewType.label.split(' ')[0]} {index % promptCount + 1}</div>
                    <p className="text-xs text-gray-700 line-clamp-3 group-hover:line-clamp-none transition-all">{prompt.text}</p>
                    {/* Output Handle for this specific prompt */}
                    <Handle 
                      type="source" 
                      position={Position.Right} 
                      id={prompt.id} 
                      style={{ right: '-22px', top: '50%' }} 
                      className={`w-3 h-3 ${viewType.color}`} 
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
