import { NodeResizer } from '@xyflow/react';
import { useStore } from '../../store';
import { X } from 'lucide-react';

export function StaticImageNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const deleteNode = useStore((state) => state.deleteNode);

  return (
    <div className="bg-white p-2 rounded-xl shadow-md border border-gray-200 group relative w-full h-full min-w-[150px] min-h-[150px] flex flex-col">
      <NodeResizer 
        minWidth={150} 
        minHeight={150} 
        isVisible={selected} 
        lineStyle={{ opacity: 0 }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '4px' }}
      />
      <button
        onClick={() => deleteNode(id)}
        className="absolute top-4 right-4 bg-black/50 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
      >
        <X size={16}/>
      </button>
      <img src={data.image} alt="Pinned" className="w-full h-full object-contain rounded-lg" />
    </div>
  );
}
