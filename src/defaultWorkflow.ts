import { Edge, Node } from '@xyflow/react';

export const defaultNodes: Node[] = [
  {
    id: 'imageInput-1',
    type: 'imageInput',
    position: { x: 50, y: 50 },
    data: {},
  },
  {
    id: 'styleAnalyzer-1',
    type: 'styleAnalyzer',
    position: { x: 350, y: 50 },
    data: {},
  },
  {
    id: 'textPrompt-1',
    type: 'textInput',
    position: { x: 350, y: 250 },
    data: {},
  },
  {
    id: 'settings-1',
    type: 'settings',
    position: { x: 350, y: 450 },
    data: {},
  },
  {
    id: 'generator-1',
    type: 'generator',
    position: { x: 700, y: 150 },
    data: {},
  },
  {
    id: 'output-1',
    type: 'output',
    position: { x: 1050, y: 150 },
    data: {},
  },
];

export const defaultEdges: Edge[] = [
  {
    id: 'e-image-style',
    source: 'imageInput-1',
    target: 'styleAnalyzer-1',
    sourceHandle: 'image',
    targetHandle: 'image',
  },
  {
    id: 'e-image-gen',
    source: 'imageInput-1',
    target: 'generator-1',
    sourceHandle: 'image',
    targetHandle: 'image-0',
  },
  {
    id: 'e-style-gen',
    source: 'styleAnalyzer-1',
    target: 'generator-1',
    sourceHandle: 'style',
    targetHandle: 'style',
  },
  {
    id: 'e-prompt-gen',
    source: 'textPrompt-1',
    target: 'generator-1',
    sourceHandle: 'prompt',
    targetHandle: 'prompt',
  },
  {
    id: 'e-settings-gen',
    source: 'settings-1',
    target: 'generator-1',
    sourceHandle: 'settings',
    targetHandle: 'settings',
  },
  {
    id: 'e-gen-output',
    source: 'generator-1',
    target: 'output-1',
    sourceHandle: 'image',
    targetHandle: 'image',
  },
];
