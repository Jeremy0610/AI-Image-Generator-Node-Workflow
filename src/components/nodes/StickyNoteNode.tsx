import { NodeResizer } from '@xyflow/react';
import { useStore } from '../../store';
import { X } from 'lucide-react';

export function StickyNoteNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNode = useStore((state) => state.deleteNode);

  return (
    <div className="bg-yellow-200 rounded-md shadow-md w-full h-full flex flex-col border border-yellow-300 min-w-[150px] min-h-[150px]">
      <NodeResizer 
        minWidth={150} 
        minHeight={150} 
        isVisible={selected} 
        lineStyle={{ opacity: 0 }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '4px' }}
      />
      <div className="bg-yellow-300/50 p-1 flex justify-end cursor-grab rounded-t-md shrink-0">
        <button onClick={() => deleteNode(id)} className="text-yellow-700 hover:text-red-600"><X size={14}/></button>
      </div>
      <textarea
        className="nodrag nowheel flex-1 bg-transparent p-3 outline-none resize-none text-gray-800 font-medium text-sm placeholder-yellow-600/50"
        value={data.text || ''}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Type a note..."
      />
    </div>
  );
}
