import { Handle, Position } from '@xyflow/react';
import { useStore } from '../../store';
import { Wand2, Loader2, X } from 'lucide-react';
import { generateImage } from '../../services/ai';

export function GeneratorNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const getNodeData = useStore((state) => state.getNodeData);
  const getIncomingEdges = useStore((state) => state.getIncomingEdges);
  const deleteNode = useStore((state) => state.deleteNode);

  const imageCount = data.imageCount || 1;

  const handleGenerate = async () => {
    const incomingEdges = getIncomingEdges(id);
    
    const promptEdge = incomingEdges.find(e => e.targetHandle === 'prompt');
    const styleEdge = incomingEdges.find(e => e.targetHandle === 'style');
    const settingsEdge = incomingEdges.find(e => e.targetHandle === 'settings');
    
    const promptData = promptEdge ? getNodeData(promptEdge.source) : null;
    const styleData = styleEdge ? getNodeData(styleEdge.source) : null;
    const settingsData = settingsEdge ? getNodeData(settingsEdge.source) : null;

    let basePrompt = '';
    if (promptEdge && promptData) {
      if (promptEdge.sourceHandle?.startsWith('prompt-')) {
        const promptObj = promptData.generatedPrompts?.find((p: any) => p.id === promptEdge.sourceHandle);
        basePrompt = promptObj?.text || '';
      } else {
        basePrompt = promptData.text || '';
      }
    }
    
    const stylePrompt = styleData?.stylePrompt || '';
    
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

    if (!basePrompt && !stylePrompt && referenceImages.length === 0) {
      alert("Please connect a text prompt, style, or image.");
      return;
    }

    const finalPrompt = [basePrompt, stylePrompt].filter(Boolean).join(', ');
    const aspectRatio = settingsData?.aspectRatio || '1:1';
    const resolution = settingsData?.resolution || '1K';

    updateNodeData(id, { isLoading: true, error: null });
    try {
      const imageUrl = await generateImage(finalPrompt, aspectRatio, resolution, referenceImages);
      updateNodeData(id, { isLoading: false, generatedImage: imageUrl });
    } catch (error: any) {
      console.error(error);
      updateNodeData(id, { isLoading: false, error: error.message });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 min-w-[250px]">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 rounded-t-xl font-medium text-sm text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-blue-400" /> Generator
        </div>
        <button onClick={() => deleteNode(id)} className="text-gray-400 hover:text-red-400"><X size={16} /></button>
      </div>
      
      <div className="flex flex-col py-2">
        {Array.from({ length: imageCount }).map((_, i) => (
          <div key={i} className="relative px-4 py-2 flex items-center justify-between">
            <Handle type="target" position={Position.Left} id={`image-${i}`} style={{ left: '-6px' }} className="w-3 h-3 bg-emerald-500" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-600 font-medium">Image {i === 0 ? '(Ref)' : i + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              {i === 0 && (
                <button onClick={() => updateNodeData(id, { imageCount: imageCount + 1 })} className="text-emerald-600 hover:text-emerald-800 font-bold text-lg leading-none">+</button>
              )}
              {i > 0 && i === imageCount - 1 && (
                <button onClick={() => updateNodeData(id, { imageCount: imageCount - 1 })} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">-</button>
              )}
            </div>
          </div>
        ))}

        <div className="relative px-4 py-2 flex items-center justify-between">
          <Handle type="target" position={Position.Left} id="prompt" style={{ left: '-6px' }} className="w-3 h-3 bg-indigo-500" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-xs text-gray-600 font-medium">Prompt</span>
          </div>
        </div>
        <div className="relative px-4 py-2 flex items-center justify-between">
          <Handle type="target" position={Position.Left} id="style" style={{ left: '-6px' }} className="w-3 h-3 bg-purple-500" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-xs text-gray-600 font-medium">Style</span>
          </div>
        </div>
        <div className="relative px-4 py-2 flex items-center justify-between">
          <Handle type="target" position={Position.Left} id="settings" style={{ left: '-6px' }} className="w-3 h-3 bg-amber-500" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs text-gray-600 font-medium">Settings</span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-2 border-t border-gray-100 relative">
        <button 
          onClick={handleGenerate}
          disabled={data.isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {data.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {data.isLoading ? 'Generating...' : 'Generate Image'}
        </button>
        <Handle type="source" position={Position.Right} id="image" style={{ right: '-6px', top: '50%' }} className="w-3 h-3 bg-blue-500" />
      </div>

      {data.error && (
        <div className="p-2 m-2 mt-0 text-xs text-red-500 bg-red-50 rounded border border-red-100">
          {data.error}
        </div>
      )}
    </div>
  );
}
