export type WorkflowNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  parentId?: string;
  expandParent?: boolean;
  [key: string]: unknown;
};

function getAbsolutePosition(node: WorkflowNode, nodeById: Map<string, WorkflowNode>) {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = nodeById.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }

  return { x, y };
}

function withoutParent(node: WorkflowNode, position: { x: number; y: number }): WorkflowNode {
  const { parentId: _parentId, expandParent: _expandParent, ...rest } = node;
  return { ...rest, position };
}

export function removeNodesAndDetachChildren(nodes: WorkflowNode[], removedIds: Set<string>): WorkflowNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return nodes
    .filter((node) => !removedIds.has(node.id))
    .map((node) => {
      if (!node.parentId || !removedIds.has(node.parentId)) return node;
      return withoutParent(node, getAbsolutePosition(node, nodeById));
    });
}

export function includeDescendants(nodes: WorkflowNode[], selectedNodes: WorkflowNode[]): WorkflowNode[] {
  const includedIds = new Set(selectedNodes.map((node) => node.id));
  let changed = true;

  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && includedIds.has(node.parentId) && !includedIds.has(node.id)) {
        includedIds.add(node.id);
        changed = true;
      }
    }
  }

  return nodes.filter((node) => includedIds.has(node.id));
}

export function duplicateNodes(
  nodes: WorkflowNode[],
  clipboard: WorkflowNode[],
  createId: (node: WorkflowNode) => string,
  offset = 50,
): WorkflowNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const copiedIds = new Set(clipboard.map((node) => node.id));
  const newIdByOldId = new Map(clipboard.map((node) => [node.id, createId(node)]));

  return clipboard.map((node) => {
    const newId = newIdByOldId.get(node.id)!;

    if (node.parentId && copiedIds.has(node.parentId)) {
      return {
        ...node,
        id: newId,
        parentId: newIdByOldId.get(node.parentId),
        position: { ...node.position },
        selected: true,
      };
    }

    const absolutePosition = getAbsolutePosition(node, nodeById);
    return {
      ...withoutParent(node, {
        x: absolutePosition.x + offset,
        y: absolutePosition.y + offset,
      }),
      id: newId,
      selected: true,
    };
  });
}
