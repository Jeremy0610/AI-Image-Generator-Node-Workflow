import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../../store';
import { Merge, X } from 'lucide-react';
import { useEffect } from 'react';

export function PromptMergerNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const getNodeData = useStore((state) => state.getNodeData);
  const getIncomingEdges = useStore((state) => state.getIncomingEdges);
  const deleteNode = useStore((state) => state.deleteNode);

  useEffect(() => {
    const interval = setInterval(() => {
      const incomingEdges = getIncomingEdges(id);
      const contentEdge = incomingEdges.find(e => e.targetHandle === 'content');
      const styleEdge = incomingEdges.find(e => e.targetHandle === 'style');

      let contentData = '';
      if (contentEdge) {
        const sourceData = getNodeData(contentEdge.source);
        if (contentEdge.sourceHandle?.startsWith('prompt-')) {
          const promptObj = sourceData?.generatedPrompts?.find((p: any) => p.id === contentEdge.sourceHandle);
          contentData = promptObj?.text || '';
        } else {
          contentData = sourceData?.text || '';
        }
      }
      
      const styleData = styleEdge ? getNodeData(styleEdge.source)?.stylePrompt : '';

      let merged = '';
      if (contentData && styleData) {
        merged = `${contentData}, in the style of: ${styleData}`;
      } else if (contentData) {
        merged = contentData;
      } else if (styleData) {
        merged = styleData;
      }

      if (merged !== data.text) {
        updateNodeData(id, { text: merged });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [id, getIncomingEdges, getNodeData, updateNodeData, data.text]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-full h-full flex flex-col min-w-[250px] min-h-[200px]">
      <NodeResizer 
        minWidth={250} 
        minHeight={200} 
        isVisible={selected} 
        lineStyle={{ opacity: 0 }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '4px' }}
      />
      <div className="bg-orange-50 px-4 py-2 border-b border-orange-200 rounded-t-xl font-medium text-sm text-orange-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Merge size={16} className="text-orange-500" /> Prompt Merger
        </div>
        <button onClick={() => deleteNode(id)} className="text-orange-400 hover:text-orange-600"><X size={16} /></button>
      </div>

      <div className="flex flex-col py-2 shrink-0">
        <div className="relative px-4 py-1 flex items-center justify-between">
          <Handle type="target" position={Position.Left} id="content" style={{ left: '-6px' }} className="w-3 h-3 bg-indigo-500" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-xs text-gray-600 font-medium">Content</span>
          </div>
        </div>
        <div className="relative px-4 py-1 flex items-center justify-between">
          <Handle type="target" position={Position.Left} id="style" style={{ left: '-6px' }} className="w-3 h-3 bg-purple-500" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-xs text-gray-600 font-medium">Style</span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 flex-1 flex flex-col relative">
        <textarea 
          className="nodrag nowheel flex-1 w-full text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 resize-none outline-none focus:ring-1 focus:ring-orange-500"
          value={data.text || ''}
          readOnly
          placeholder="Waiting for inputs..."
        />
        <Handle type="source" position={Position.Right} id="prompt" style={{ right: '-6px', top: '50%' }} className="w-3 h-3 bg-orange-500" />
      </div>
    </div>
  );
}
