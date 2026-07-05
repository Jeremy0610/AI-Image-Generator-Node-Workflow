import { Handle, Position } from '@xyflow/react';
import { Image as ImageIcon, Lightbulb, Loader2, Minus, Plus, X } from 'lucide-react';
import { useStore } from '../../store';
import {
  generateCreativeImageConcepts,
  generateImage,
  getAiImageBase64Limit,
  imageSourceToAiInput,
  type CreativeImageConcept,
} from '../../services/ai';
import { saveImageAsset } from '../../services/localProjectDb';

const VIEW_TYPES = [
  { id: 'aerial', label: 'Aerial', promptLabel: 'Aerial View', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'eye-level', label: 'Eye-level', promptLabel: 'Eye-level View', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  { id: 'interior', label: 'Interior', promptLabel: 'Interior View', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  { id: 'close-up', label: 'Close-up', promptLabel: 'Close-up Detail', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
];

const IMAGE_COUNTS = [1, 2, 4, 8] as const;
type ImageCount = typeof IMAGE_COUNTS[number];

function resultPosition(index: number) {
  const column = index >= 4 ? 1 : 0;
  const row = index % 4;
  return {
    x: 470 + column * 330,
    y: row * 270,
  };
}

export function CreativeMasterImageNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const getNodeData = useStore((state) => state.getNodeData);
  const getIncomingEdges = useStore((state) => state.getIncomingEdges);
  const deleteNode = useStore((state) => state.deleteNode);
  const currentProjectId = useStore((state) => state.currentProjectId);

  const imageCount = data.imageCount || 1;
  const selectedViews = data.selectedViews || [];
  const keywords = typeof data.keywords === 'string' ? data.keywords : '';
  const outputCount: ImageCount = IMAGE_COUNTS.includes(data.outputCount) ? data.outputCount : 1;
  const progress = data.progress || '';

  const toggleView = (viewId: string) => {
    const newViews = selectedViews.includes(viewId)
      ? selectedViews.filter((selectedView: string) => selectedView !== viewId)
      : [...selectedViews, viewId];
    updateNodeData(id, { selectedViews: newViews });
  };

  const handleGenerate = async () => {
    if (selectedViews.length === 0) {
      alert('Please select at least one view type.');
      return;
    }

    const incomingEdges = getIncomingEdges(id);
    const imageSources: { source: string; mimeType: string }[] = [];

    for (let index = 0; index < imageCount; index += 1) {
      const edge = incomingEdges.find((candidate) => candidate.targetHandle === `image-${index}`);
      if (!edge) continue;
      const sourceData = getNodeData(edge.source);
      if (sourceData?.image) {
        imageSources.push({ source: sourceData.image, mimeType: sourceData.mimeType || 'image/jpeg' });
      }
    }

    if (imageSources.length === 0) {
      alert('Please connect at least one image.');
      return;
    }

    updateNodeData(id, { isLoading: true, error: null, progress: 'Preparing reference images...' });

    try {
      const maxBase64Length = getAiImageBase64Limit(imageSources.length);
      const referenceImages = await Promise.all(
        imageSources.map(({ source, mimeType }) => imageSourceToAiInput(source, mimeType, maxBase64Length)),
      );
      const viewLabels = selectedViews.map((viewId: string) => VIEW_TYPES.find((view) => view.id === viewId)?.promptLabel || viewId);

      updateNodeData(id, { progress: 'Writing creative prompts...' });
      const concepts = await generateCreativeImageConcepts(referenceImages, viewLabels, keywords.trim(), outputCount);
      if (concepts.length === 0) throw new Error('No creative concepts were returned.');

      const state = useStore.getState();
      const sourceNode = state.nodes.find((node) => node.id === id);
      const basePosition = sourceNode?.position || { x: 0, y: 0 };
      const generatedNodes: typeof state.nodes = [];
      const generatedEdges: typeof state.edges = [];
      const generatedResults: Array<CreativeImageConcept & { imageAssetId?: string; mimeType?: string; resultNodeId: string }> = [];

      for (let index = 0; index < concepts.length; index += 1) {
        const concept = concepts[index];
        updateNodeData(id, { progress: `Generating image ${index + 1} / ${concepts.length}...` });

        const imageUrl = await generateImage(concept.prompt, '1:1', '1K', referenceImages);
        const asset = currentProjectId ? await saveImageAsset(currentProjectId, imageUrl) : null;
        const layout = resultPosition(index);
        const resultNodeId = `generatedImageResult-${Date.now()}-${index}`;
        const resultImage = asset?.url || imageUrl;
        const resultMimeType = asset?.mimeType || 'image/png';

        generatedNodes.push({
          id: resultNodeId,
          type: 'generatedImageResult',
          position: {
            x: basePosition.x + layout.x,
            y: basePosition.y + layout.y,
          },
          data: {
            image: resultImage,
            imageAssetId: asset?.assetId,
            mimeType: resultMimeType,
            text: concept.prompt,
            title: concept.title || `Concept ${index + 1}`,
            view: concept.view,
            keywordInfluence: concept.keywordInfluence,
            conceptId: concept.id,
            showPrompt: false,
          },
        });
        generatedEdges.push({
          id: `edge-${id}-${resultNodeId}`,
          source: id,
          sourceHandle: 'results',
          target: resultNodeId,
          targetHandle: 'input',
        });
        generatedResults.push({
          ...concept,
          imageAssetId: asset?.assetId,
          mimeType: resultMimeType,
          resultNodeId,
        });
      }

      state.saveHistory();
      state.setNodes([...state.nodes, ...generatedNodes]);
      state.setEdges([...state.edges, ...generatedEdges]);
      updateNodeData(id, {
        isLoading: false,
        progress: '',
        generatedResults,
      });
    } catch (error: any) {
      console.error(error);
      updateNodeData(id, { isLoading: false, progress: '', error: error.message || 'Failed to generate images.' });
    }
  };

  return (
    <div className="relative flex h-auto w-[420px] flex-col rounded-xl border border-gray-200 bg-white shadow-md">
      <div className="flex shrink-0 items-center justify-between rounded-t-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-medium text-white">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-teal-100" /> Creative Master (Image)
        </div>
        <button onClick={() => deleteNode(id)} className="text-teal-100 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="nodrag nowheel flex flex-1 flex-col gap-4 p-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>Images</span>
            <div className="flex items-center gap-1">
              <button onClick={() => updateNodeData(id, { imageCount: Math.max(1, imageCount - 1) })} className="rounded p-1 text-gray-600 hover:bg-gray-100">
                <Minus size={14} />
              </button>
              <button onClick={() => updateNodeData(id, { imageCount: imageCount + 1 })} className="rounded p-1 text-gray-600 hover:bg-gray-100">
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="relative space-y-2">
            {Array.from({ length: imageCount }).map((_, index) => (
              <div key={index} className="relative flex items-center gap-2 rounded border border-gray-100 bg-gray-50 p-2 text-sm text-gray-600">
                <Handle type="target" position={Position.Left} id={`image-${index}`} style={{ left: '-17px' }} className="h-3 w-3 bg-blue-500" />
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Image {index + 1}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Views</div>
          <div className="grid grid-cols-2 gap-2">
            {VIEW_TYPES.map((view) => (
              <label key={view.id} className={`flex cursor-pointer items-center gap-2 rounded border p-2 transition-colors ${selectedViews.includes(view.id) ? `${view.bg} border-${view.color.replace('bg-', '')}` : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={selectedViews.includes(view.id)}
                  onChange={() => toggleView(view.id)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className={`text-xs font-medium ${selectedViews.includes(view.id) ? view.text : 'text-gray-600'}`}>{view.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>Keywords</span>
            <span className="font-medium normal-case tracking-normal text-gray-400">optional</span>
          </div>
          <textarea
            value={keywords}
            onChange={(event) => updateNodeData(id, { keywords: event.target.value })}
            className="h-20 w-full resize-none rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <p className="text-[11px] leading-relaxed text-gray-400">Use only when you want to guide part of the creative direction.</p>
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Images Number</div>
          <div className="grid grid-cols-4 gap-2">
            {IMAGE_COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => updateNodeData(id, { outputCount: count })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${outputCount === count ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {count}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => void handleGenerate()}
          disabled={data.isLoading}
          className="mt-1 flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {data.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Lightbulb size={18} />}
          {data.isLoading ? 'Generating...' : 'Generate Images'}
        </button>

        {progress && <div className="rounded border border-teal-100 bg-teal-50 p-2 text-xs text-teal-700">{progress}</div>}
        {data.error && <div className="rounded border border-red-100 bg-red-50 p-2 text-xs text-red-600">{data.error}</div>}
      </div>

      <Handle type="source" position={Position.Right} id="results" style={{ right: '-6px', top: '50%' }} className="h-3 w-3 bg-teal-500" />
    </div>
  );
}
