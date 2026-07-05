import assert from 'node:assert/strict';
import test from 'node:test';
import { duplicateNodes, includeDescendants, removeNodesAndDetachChildren, type WorkflowNode } from '../src/workflowTransforms.ts';

test('deleting a group detaches its direct children and preserves canvas positions', () => {
  const nodes: WorkflowNode[] = [
    { id: 'group', type: 'groupNode', position: { x: 100, y: 200 } },
    { id: 'child', type: 'textInput', parentId: 'group', expandParent: true, position: { x: 20, y: 30 } },
  ];

  assert.deepEqual(removeNodesAndDetachChildren(nodes, new Set(['group'])), [
    { id: 'child', type: 'textInput', position: { x: 120, y: 230 } },
  ]);
});

test('copying a group with a child remaps the child parent without double-offsetting its position', () => {
  const group: WorkflowNode = { id: 'group', type: 'groupNode', position: { x: 100, y: 200 } };
  const child: WorkflowNode = { id: 'child', type: 'textInput', parentId: 'group', position: { x: 20, y: 30 } };

  assert.deepEqual(duplicateNodes([group, child], [group, child], (node) => `${node.id}-copy`), [
    { id: 'group-copy', type: 'groupNode', position: { x: 150, y: 250 }, selected: true },
    { id: 'child-copy', type: 'textInput', parentId: 'group-copy', position: { x: 20, y: 30 }, selected: true },
  ]);
});

test('copying only a grouped child detaches it and converts its position to canvas coordinates', () => {
  const group: WorkflowNode = { id: 'group', type: 'groupNode', position: { x: 100, y: 200 } };
  const child: WorkflowNode = { id: 'child', type: 'textInput', parentId: 'group', expandParent: true, position: { x: 20, y: 30 } };

  assert.deepEqual(duplicateNodes([group, child], [child], () => 'child-copy'), [
    { id: 'child-copy', type: 'textInput', position: { x: 170, y: 280 }, selected: true },
  ]);
});

test('copying a group includes its nested descendants', () => {
  const group: WorkflowNode = { id: 'group', type: 'groupNode', position: { x: 100, y: 200 } };
  const child: WorkflowNode = { id: 'child', type: 'textInput', parentId: 'group', position: { x: 20, y: 30 } };
  const nestedGroup: WorkflowNode = { id: 'nested-group', type: 'groupNode', parentId: 'group', position: { x: 40, y: 50 } };
  const nestedChild: WorkflowNode = { id: 'nested-child', type: 'textInput', parentId: 'nested-group', position: { x: 10, y: 20 } };

  assert.deepEqual(includeDescendants([group, child, nestedGroup, nestedChild], [group]), [
    group,
    child,
    nestedGroup,
    nestedChild,
  ]);
});
