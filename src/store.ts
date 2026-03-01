import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';

export type AppNodeData = any;
export type AppNode = Node<AppNodeData>;

export type AppState = {
  nodes: AppNode[];
  edges: Edge[];
  clipboard: AppNode[];
  past: { nodes: AppNode[], edges: Edge[] }[];
  future: { nodes: AppNode[], edges: Edge[] }[];
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: AppNode) => void;
  deleteNode: (nodeId: string) => void;
  alignSelectedNodes: (direction: 'left' | 'top') => void;
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  groupSelectedNodes: () => void;
  updateNodeData: (nodeId: string, data: any) => void;
  getNodeData: (nodeId: string) => any;
  getIncomingEdges: (nodeId: string) => Edge[];
  resetStore: (nodes: AppNode[], edges: Edge[]) => void;
};

export const useStore = create<AppState>((set, get) => ({
  nodes: [],
  edges: [],
  clipboard: [],
  past: [],
  future: [],
  saveHistory: () => {
    const { nodes, edges, past } = get();
    const newPast = [...past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }].slice(-50);
    set({ past: newPast, future: [] });
  },
  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: newPast,
      future: [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...future]
    });
  },
  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }],
      future: newFuture
    });
  },
  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    const isRemove = changes.some(c => c.type === 'remove');
    if (isRemove) get().saveHistory();
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    const isRemove = changes.some(c => c.type === 'remove');
    if (isRemove) get().saveHistory();
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    get().saveHistory();
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes: AppNode[]) => {
    set({ nodes });
  },
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },
  addNode: (node: AppNode) => {
    get().saveHistory();
    set({ nodes: [...get().nodes, node] });
  },
  deleteNode: (nodeId: string) => {
    get().saveHistory();
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },
  alignSelectedNodes: (direction: 'left' | 'top') => {
    const nodes = get().nodes;
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) return;
    
    get().saveHistory();
    if (direction === 'left') {
      const minX = Math.min(...selectedNodes.map(n => n.position.x));
      set({ nodes: nodes.map(n => n.selected ? { ...n, position: { ...n.position, x: minX } } : n) });
    } else if (direction === 'top') {
      const minY = Math.min(...selectedNodes.map(n => n.position.y));
      set({ nodes: nodes.map(n => n.selected ? { ...n, position: { ...n.position, y: minY } } : n) });
    }
  },
  copySelectedNodes: () => {
    const selected = get().nodes.filter(n => n.selected);
    set({ clipboard: selected });
  },
  pasteNodes: () => {
    const clipboard = get().clipboard;
    if (!clipboard.length) return;
    
    get().saveHistory();
    const newNodes = clipboard.map(node => ({
      ...node,
      id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      selected: true,
    }));
    
    set({
      nodes: [...get().nodes.map(n => ({ ...n, selected: false })), ...newNodes]
    });
  },
  groupSelectedNodes: () => {
    const nodes = get().nodes;
    const selectedNodes = nodes.filter(n => n.selected && !n.parentId);
    if (selectedNodes.length < 1) return;

    get().saveHistory();

    const minX = Math.min(...selectedNodes.map(n => n.position.x));
    const minY = Math.min(...selectedNodes.map(n => n.position.y));
    const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.measured?.width || 250)));
    const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.measured?.height || 200)));

    const padding = 40;
    const groupX = minX - padding;
    const groupY = minY - padding - 40;
    const groupWidth = (maxX - minX) + padding * 2;
    const groupHeight = (maxY - minY) + padding * 2 + 40;

    const groupId = `groupNode-${Date.now()}`;
    const groupNode: AppNode = {
      id: groupId,
      type: 'groupNode',
      position: { x: groupX, y: groupY },
      style: { width: groupWidth, height: groupHeight },
      data: { 
        title: 'Group', 
        color: 'bg-purple-500/10',
        borderColor: 'border-purple-500'
      },
      zIndex: -1,
    };

    const updatedNodes = nodes.map(n => {
      if (selectedNodes.find(sn => sn.id === n.id)) {
        return {
          ...n,
          parentId: groupId,
          position: { x: n.position.x - groupX, y: n.position.y - groupY },
          expandParent: true,
        };
      }
      return n;
    });

    const otherNodes = updatedNodes.filter(n => !selectedNodes.find(sn => sn.id === n.id));
    const groupedChildren = updatedNodes.filter(n => selectedNodes.find(sn => sn.id === n.id));

    set({ nodes: [...otherNodes, groupNode, ...groupedChildren] });
  },
  updateNodeData: (nodeId: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  getNodeData: (nodeId: string) => {
    return get().nodes.find((n) => n.id === nodeId)?.data;
  },
  getIncomingEdges: (nodeId: string) => {
    return get().edges.filter((e) => e.target === nodeId);
  },
  resetStore: (nodes: AppNode[], edges: Edge[]) => {
    set({ nodes, edges, past: [], future: [], clipboard: [] });
  },
}));
