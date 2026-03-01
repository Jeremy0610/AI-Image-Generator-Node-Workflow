import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../../store';
import { Type, X } from 'lucide-react';

export function TextInputNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNode = useStore((state) => state.deleteNode);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-full h-full flex flex-col min-w-[250px] min-h-[150px]">
      <NodeResizer 
        minWidth={250} 
        minHeight={150} 
        isVisible={selected} 
        lineStyle={{ opacity: 0 }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '4px' }}
      />
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-xl font-medium text-sm text-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Type size={16} className="text-indigo-500" /> Text Prompt
        </div>
        <button onClick={() => deleteNode(id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
      </div>
      <div className="p-4 flex-1 flex flex-col relative">
        <textarea 
          className="nodrag nowheel flex-1 w-full text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 resize-none" 
          value={data.text || ''} 
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          placeholder="Enter prompt here..."
        />
        <Handle type="source" position={Position.Right} id="prompt" style={{ right: '-6px', top: '50%' }} className="w-3 h-3 bg-indigo-500" />
      </div>
    </div>
  );
}
