import { NodeResizer } from '@xyflow/react';
import { useStore } from '../../store';
import { X } from 'lucide-react';

export function GroupNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const deleteNode = useStore((state) => state.deleteNode);
  const updateNodeData = useStore((state) => state.updateNodeData);

  const colors = [
    { bg: 'bg-purple-500/10', border: 'border-purple-500', btn: 'bg-purple-400' },
    { bg: 'bg-blue-500/10', border: 'border-blue-500', btn: 'bg-blue-400' },
    { bg: 'bg-green-500/10', border: 'border-green-500', btn: 'bg-green-400' },
    { bg: 'bg-yellow-500/10', border: 'border-yellow-500', btn: 'bg-yellow-400' },
    { bg: 'bg-red-500/10', border: 'border-red-500', btn: 'bg-red-400' },
    { bg: 'bg-gray-500/10', border: 'border-gray-500', btn: 'bg-gray-400' },
  ];

  const currentBg = data.color || 'bg-purple-500/10';
  const currentBorder = data.borderColor || 'border-purple-500';

  return (
    <div className={`w-full h-full border-2 border-dashed ${currentBorder} rounded-xl ${currentBg} relative group`}>
      <NodeResizer 
        minWidth={200} 
        minHeight={200} 
        isVisible={selected} 
        lineStyle={{ opacity: 0 }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '4px' }}
      />
      
      <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <input 
          className="bg-transparent font-bold text-gray-700 outline-none w-1/2 px-2" 
          value={data.title || 'Group'} 
          onChange={(e) => updateNodeData(id, { title: e.target.value })}
        />
        <div className="flex gap-1 items-center pr-2">
          {colors.map(c => (
            <button 
              key={c.bg} 
              className={`w-4 h-4 rounded-full ${c.btn} hover:scale-110 transition-transform shadow-sm`} 
              onClick={() => updateNodeData(id, { color: c.bg, borderColor: c.border })} 
              title="Change Color"
            />
          ))}
          <button onClick={() => deleteNode(id)} className="text-gray-500 hover:text-red-500 ml-2"><X size={16}/></button>
        </div>
      </div>
    </div>
  );
}
