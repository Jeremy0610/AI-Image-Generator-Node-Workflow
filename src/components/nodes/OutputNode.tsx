import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../../store';
import { Image as ImageIcon, Download, Pin, X } from 'lucide-react';
import { useEffect } from 'react';

export function OutputNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const getNodeData = useStore((state) => state.getNodeData);
  const getIncomingEdges = useStore((state) => state.getIncomingEdges);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNode = useStore((state) => state.deleteNode);
  const addNode = useStore((state) => state.addNode);
  const nodes = useStore((state) => state.nodes);

  // Auto-update image when generator finishes
  useEffect(() => {
    const interval = setInterval(() => {
      const incomingEdges = getIncomingEdges(id);
      const imageEdge = incomingEdges.find(e => e.targetHandle === 'image');
      if (imageEdge) {
        const sourceData = getNodeData(imageEdge.source);
        if (sourceData?.generatedImage && sourceData.generatedImage !== data.image) {
          updateNodeData(id, { image: sourceData.generatedImage });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [id, getIncomingEdges, getNodeData, updateNodeData, data.image]);

  const handleDownload = () => {
    if (data.image) {
      const a = document.createElement('a');
      a.href = data.image;
      a.download = `generated-image-${Date.now()}.png`;
      a.click();
    }
  };

  const handlePin = () => {
    if (data.image) {
      const currentNode = nodes.find(n => n.id === id);
      const posX = currentNode ? currentNode.position.x + 350 : Math.random() * 200;
      const posY = currentNode ? currentNode.position.y : Math.random() * 200;

      addNode({
        id: `staticImage-${Date.now()}`,
        type: 'staticImage',
        position: { x: posX, y: posY },
        style: { width: 250, height: 200 },
        data: { image: data.image }
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 w-full h-full flex flex-col min-w-[250px] min-h-[200px]">
      <NodeResizer 
        minWidth={250} 
        minHeight={200} 
        isVisible={selected} 
        lineStyle={{ opacity: 0 }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '4px' }}
      />
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-xl font-medium text-sm text-gray-700 flex items-center justify-between shrink-0 relative">
        <Handle type="target" position={Position.Left} id="image" style={{ left: '-6px' }} className="w-3 h-3 bg-blue-500" />
        <Handle type="source" position={Position.Right} id="image-out" style={{ right: '-6px' }} className="w-3 h-3 bg-pink-500" />
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-pink-500" /> Output
        </div>
        <div className="flex items-center gap-1">
          {data.image && (
            <>
              <button onClick={handlePin} className="text-gray-500 hover:text-pink-600 p-1" title="Pin to Canvas">
                <Pin size={16} />
              </button>
              <button onClick={handleDownload} className="text-gray-500 hover:text-gray-900 p-1" title="Download Image">
                <Download size={16} />
              </button>
            </>
          )}
          <button onClick={() => deleteNode(id)} className="text-gray-400 hover:text-red-500 p-1 ml-1"><X size={16} /></button>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-3">
        {data.image ? (
          <div className="rounded-md overflow-hidden border border-gray-200 bg-gray-100 flex-1 flex items-center justify-center">
            <img src={data.image} alt="Generated Output" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400">
            <ImageIcon size={24} className="mb-2 opacity-50" />
            <span className="text-xs font-medium">Waiting for generation...</span>
          </div>
        )}
      </div>
    </div>
  );
}
