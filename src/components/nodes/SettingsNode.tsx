import { Handle, Position } from '@xyflow/react';
import { useStore } from '../../store';
import { Settings, X } from 'lucide-react';

export function SettingsNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNode = useStore((state) => state.deleteNode);

  const aspectRatio = data.aspectRatio || '1:1';
  const resolution = data.resolution || '1K';

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-64">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-xl font-medium text-sm text-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-amber-500" /> Settings
        </div>
        <button onClick={() => deleteNode(id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
      </div>
      <div className="p-4 flex flex-col gap-4 relative">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aspect Ratio</label>
          <select 
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500"
            value={aspectRatio}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
          >
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Resolution</label>
          <select 
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500"
            value={resolution}
            onChange={(e) => updateNodeData(id, { resolution: e.target.value })}
          >
            <option value="1K">1K</option>
            <option value="2K">2K</option>
            <option value="4K">4K</option>
          </select>
        </div>
        <Handle type="source" position={Position.Right} id="settings" style={{ right: '-6px', top: '50%' }} className="w-3 h-3 bg-amber-500" />
      </div>
    </div>
  );
}
