import React, { useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useStore } from '../../store';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

export function ImageInputNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNode = useStore((state) => state.deleteNode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        updateNodeData(id, { image: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-64">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-xl font-medium text-sm text-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-emerald-500" /> Image Input
        </div>
        <button onClick={() => deleteNode(id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
      </div>
      <div className="p-4 flex flex-col gap-3 relative">
        {data.image ? (
          <div className="relative group rounded-md overflow-hidden border border-gray-200">
            <img src={data.image} alt="Preview" className="w-full h-auto object-cover max-h-40" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-medium"
            >
              Change Image
            </button>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <Upload size={24} className="mb-2" />
            <span className="text-xs font-medium">Upload Image</span>
          </button>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />
        <Handle type="source" position={Position.Right} id="image" style={{ right: '-6px', top: '50%' }} className="w-3 h-3 bg-emerald-500" />
      </div>
    </div>
  );
}
