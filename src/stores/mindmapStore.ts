import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { MindMapState, MindMapNode, Position, DEFAULT_COLORS } from '../types/mindmap';

// Layout constants
const VERTICAL_SPACING = 14;
const MIN_HORIZONTAL_SPACING = 50;
const NODE_HEIGHT = 32;
const NODE_PADDING = 6;

// Calculate node width based on content
const getNodeWidth = (node: MindMapNode): number => {
  const fontSize = 14;
  const textWidth = 0.6 * fontSize * node.title.length;
  const padding = 8;
  const baseWidth = textWidth + padding;
  return Math.max(32, Math.min(320, baseWidth));
};

// Calculate dynamic horizontal spacing based on parent and child node widths
const calculateHorizontalSpacing = (parentNode: MindMapNode, childNode: MindMapNode): number => {
  return MIN_HORIZONTAL_SPACING;
};

// Center-balanced vertical tree layout algorithm
const calculateBalancedLayout = (nodes: Record<string, MindMapNode>, rootId: string): Record<string, MindMapNode> => {
  const updatedNodes = { ...nodes };
  
  const calculateSubtreeHeight = (nodeId: string): number => {
    const node = updatedNodes[nodeId];
    if (!node) return 0;
    const children = node.childrenIds
      .map(childId => updatedNodes[childId])
      .filter(child => child && !child.isCollapsed);
    if (children.length === 0) {
      return NODE_HEIGHT;
    }
    const totalChildHeight = children.reduce((sum, child) => sum + calculateSubtreeHeight(child.id), 0);
    const totalSpacing = (children.length - 1) * VERTICAL_SPACING;
    return Math.max(totalChildHeight + totalSpacing, NODE_HEIGHT);
  };
  
  const layoutNode = (nodeId: string, parentX: number, parentY: number, level: number): void => {
    const node = updatedNodes[nodeId];
    if (!node) return;
    const children = node.childrenIds
      .map(childId => updatedNodes[childId])
      .filter(child => child && !child.isCollapsed);
    updatedNodes[nodeId] = {
      ...node,
      position: { x: parentX, y: parentY },
      level
    };
    if (children.length === 0) {
      return;
    }
    const totalChildHeight = children.reduce((sum, child) => sum + calculateSubtreeHeight(child.id), 0);
    const totalSpacing = (children.length - 1) * VERTICAL_SPACING;
    const totalHeight = totalChildHeight + totalSpacing;
    let currentY = parentY - totalHeight / 2;
    children.forEach((child) => {
      const childHeight = calculateSubtreeHeight(child.id);
      const childY = currentY + childHeight / 2;
      const horizontalSpacing = calculateHorizontalSpacing(node, child);
      const childX = parentX + getNodeWidth(node) + horizontalSpacing;
      layoutNode(child.id, childX, childY, level + 1);
      currentY += childHeight + VERTICAL_SPACING;
    });
  };
  
  const rootNode = updatedNodes[rootId];
  if (rootNode) {
    layoutNode(rootId, rootNode.position.x, rootNode.position.y, 0);
  }
  
  return updatedNodes;
};

const rebalanceTree = (nodes: Record<string, MindMapNode>, rootId: string): Record<string, MindMapNode> => {
  return calculateBalancedLayout(nodes, rootId);
};

interface MindMapActions {
  // Node operations
  createNode: (parentId: string | null, isSibling?: boolean) => string;
  createNodeDuringEdit: (parentId: string | null, isSibling?: boolean) => string;
  updateNode: (nodeId: string, updates: Partial<MindMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newPosition: Position) => void;
  reassignParent: (nodeId: string, newParentId: string) => void;
  
  // Layout operations
  rebalanceLayout: () => void;
  
  // Selection and editing
  selectNode: (nodeId: string | null) => void;
  startEditing: (nodeId: string) => void;
  stopEditing: () => void;
  
  // Navigation
  navigateToNode: (currentNodeId: string, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void;
  
  // Node states
  toggleNodeCollapse: (nodeId: string) => void;
  toggleNodeCompletion: (nodeId: string) => void;
  changeNodeColor: (nodeId: string, color: string) => void;
  
  // Canvas operations
  setCanvasPosition: (position: Position) => void;
  setCanvasScale: (scale: number) => void;
  zoomCanvas: (delta: number, center: Position) => void;
  
  // UI state
  toggleDarkMode: () => void;
  toggleToolbar: () => void;
  
  // History
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Data loading
  loadMindmapFromData: (nodes: Record<string, MindMapNode>, rootNodeId: string) => void;
  setCurrentPageId: (pageId: string) => void;
  
  // Persistence (legacy - now handled by service)
  saveMindMap: () => void;
  loadMindMap: () => void;
  exportAsJson: () => string;
  
  // Search
  searchNodes: (query: string) => MindMapNode[];
}

const createInitialState = (): MindMapState => {
  const rootId = nanoid();
  const rootNode: MindMapNode = {
    id: rootId,
    title: 'Main Topic',
    position: { x: 400, y: 300 },
    color: DEFAULT_COLORS.black,
    isCompleted: false,
    isCollapsed: false,
    parentId: null,
    childrenIds: [],
    level: 0,
    isSelected: true,
    isEditing: false,
  };

  return {
    nodes: { [rootId]: rootNode },
    rootNodeId: rootId,
    selectedNodeId: rootId,
    editingNodeId: null,
    isDarkMode: false,
    canvasPosition: { x: 0, y: 0 },
    canvasScale: 1.3,
    showToolbar: true,
    currentPageId: null,
    history: {
      past: [],
      present: JSON.stringify({ nodes: { [rootId]: rootNode }, rootNodeId: rootId }),
      future: [],
    },
  };
};

export const useMindMapStore = create<MindMapState & MindMapActions>((set, get) => ({
  ...createInitialState(),

  createNode: (parentId, isSibling = false) => {
    const state = get();
    const newId = nanoid();
    
    let actualParentId = parentId;
    let level = 0;
    let position = { x: 400, y: 300 };

    if (parentId) {
      const parentNode = state.nodes[parentId];
      if (isSibling && parentNode.parentId) {
        actualParentId = parentNode.parentId;
        const actualParent = state.nodes[parentNode.parentId];
        level = actualParent.level + 1;
        position = {
          x: parentNode.position.x,
          y: parentNode.position.y + 80
        };
      } else {
        level = parentNode.level + 1;
        position = {
          x: parentNode.position.x + 250,
          y: parentNode.position.y + (parentNode.childrenIds.length * 80)
        };
      }
    }

    const newNode: MindMapNode = {
      id: newId,
      title: 'New Node',
      position,
      color: DEFAULT_COLORS.black,
      isCompleted: false,
      isCollapsed: false,
      parentId: actualParentId,
      childrenIds: [],
      level,
      isSelected: false,
      isEditing: false,
    };

    set((state) => {
      const updatedNodes = { ...state.nodes, [newId]: newNode };
      
      if (actualParentId) {
        const parent = updatedNodes[actualParentId];
        updatedNodes[actualParentId] = {
          ...parent,
          childrenIds: [...parent.childrenIds, newId]
        };
      }

      const balancedNodes = rebalanceTree(updatedNodes, state.rootNodeId);

      return {
        nodes: balancedNodes,
        selectedNodeId: newId,
        editingNodeId: newId,
      };
    });

    get().saveToHistory();
    return newId;
  },

  createNodeDuringEdit: (parentId, isSibling = false) => {
    const state = get();
    const newId = nanoid();
    
    let actualParentId = parentId;
    let level = 0;
    let position = { x: 400, y: 300 };

    if (parentId) {
      const parentNode = state.nodes[parentId];
      if (isSibling && parentNode.parentId) {
        actualParentId = parentNode.parentId;
        const actualParent = state.nodes[parentNode.parentId];
        level = actualParent.level + 1;
        // Position sibling below the current node
        position = {
          x: parentNode.position.x,
          y: parentNode.position.y + 60
        };
      } else {
        level = parentNode.level + 1;
        // Position child to the right of parent
        const nodeWidth = getNodeWidth(parentNode);
        position = {
          x: parentNode.position.x + nodeWidth + MIN_HORIZONTAL_SPACING,
          y: parentNode.position.y + (parentNode.childrenIds.length * 60)
        };
      }
    }

    const newNode: MindMapNode = {
      id: newId,
      title: 'New Node',
      position,
      color: DEFAULT_COLORS.black,
      isCompleted: false,
      isCollapsed: false,
      parentId: actualParentId,
      childrenIds: [],
      level,
      isSelected: false,
      isEditing: false,
    };

    set((state) => {
      const updatedNodes = { ...state.nodes, [newId]: newNode };
      
      if (actualParentId) {
        const parent = updatedNodes[actualParentId];
        updatedNodes[actualParentId] = {
          ...parent,
          childrenIds: [...parent.childrenIds, newId]
        };
      }

      // Don't rebalance immediately during editing - just add the node
      return {
        nodes: updatedNodes,
        selectedNodeId: newId,
        editingNodeId: newId,
      };
    });

    // Rebalance after a delay to allow the inline editor to position correctly
    setTimeout(() => {
      const currentState = get();
      const balancedNodes = rebalanceTree(currentState.nodes, currentState.rootNodeId);
      set({ nodes: balancedNodes });
      get().saveToHistory();
    }, 100);

    return newId;
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: {
        ...state.nodes,
        [nodeId]: { ...state.nodes[nodeId], ...updates }
      }
    }));
  },

  deleteNode: (nodeId) => {
    const state = get();
    const node = state.nodes[nodeId];
    
    if (!node || nodeId === state.rootNodeId) return;

    set((prevState) => {
      const updatedNodes = { ...prevState.nodes };
      
      if (node.parentId) {
        const parent = updatedNodes[node.parentId];
        updatedNodes[node.parentId] = {
          ...parent,
          childrenIds: parent.childrenIds.filter(id => id !== nodeId)
        };
      }
      
      const deleteRecursively = (id: string) => {
        const nodeToDelete = updatedNodes[id];
        if (nodeToDelete) {
          nodeToDelete.childrenIds.forEach(deleteRecursively);
          delete updatedNodes[id];
        }
      };
      
      deleteRecursively(nodeId);
      
      const balancedNodes = rebalanceTree(updatedNodes, prevState.rootNodeId);
      
      return {
        nodes: balancedNodes,
        selectedNodeId: node.parentId || prevState.rootNodeId,
        editingNodeId: null,
      };
    });

    get().saveToHistory();
  },

  moveNode: (nodeId, newPosition) => {
    set((state) => ({
      nodes: {
        ...state.nodes,
        [nodeId]: { ...state.nodes[nodeId], position: newPosition }
      }
    }));
  },

  reassignParent: (nodeId, newParentId) => {
    const state = get();
    const node = state.nodes[nodeId];
    const newParent = state.nodes[newParentId];
    
    if (!node || !newParent || nodeId === newParentId) return;
    
    const isDescendant = (checkNodeId: string, ancestorId: string): boolean => {
      const checkNode = state.nodes[checkNodeId];
      if (!checkNode || !checkNode.parentId) return false;
      if (checkNode.parentId === ancestorId) return true;
      return isDescendant(checkNode.parentId, ancestorId);
    };
    
    if (isDescendant(newParentId, nodeId)) return;

    set((prevState) => {
      const updatedNodes = { ...prevState.nodes };
      
      if (node.parentId) {
        const oldParent = updatedNodes[node.parentId];
        updatedNodes[node.parentId] = {
          ...oldParent,
          childrenIds: oldParent.childrenIds.filter(id => id !== nodeId)
        };
      }
      
      updatedNodes[newParentId] = {
        ...updatedNodes[newParentId],
        childrenIds: [...updatedNodes[newParentId].childrenIds, nodeId]
      };
      
      updatedNodes[nodeId] = {
        ...updatedNodes[nodeId],
        parentId: newParentId,
        level: newParent.level + 1
      };
      
      const updateDescendantLevels = (parentNodeId: string) => {
        const parentNode = updatedNodes[parentNodeId];
        parentNode.childrenIds.forEach(childId => {
          updatedNodes[childId] = {
            ...updatedNodes[childId],
            level: parentNode.level + 1
          };
          updateDescendantLevels(childId);
        });
      };
      
      updateDescendantLevels(nodeId);
      
      const balancedNodes = rebalanceTree(updatedNodes, prevState.rootNodeId);
      
      return { nodes: balancedNodes };
    });

    get().saveToHistory();
  },

  selectNode: (nodeId) => {
    set((state) => {
      const updatedNodes = { ...state.nodes };
      Object.keys(updatedNodes).forEach(id => {
        updatedNodes[id] = { ...updatedNodes[id], isSelected: id === nodeId };
      });
      return {
        nodes: updatedNodes,
        selectedNodeId: nodeId,
        editingNodeId: null,
      };
    });
  },

  startEditing: (nodeId) => {
    set({ editingNodeId: nodeId });
  },

  stopEditing: () => {
    set({ editingNodeId: null });
  },

  toggleNodeCollapse: (nodeId) => {
    set((state) => ({
      nodes: {
        ...state.nodes,
        [nodeId]: {
          ...state.nodes[nodeId],
          isCollapsed: !state.nodes[nodeId].isCollapsed
        }
      }
    }));
  },

  toggleNodeCompletion: (nodeId) => {
    set((state) => ({
      nodes: {
        ...state.nodes,
        [nodeId]: {
          ...state.nodes[nodeId],
          isCompleted: !state.nodes[nodeId].isCompleted
        }
      }
    }));
  },

  changeNodeColor: (nodeId, color) => {
    set((state) => ({
      nodes: {
        ...state.nodes,
        [nodeId]: { ...state.nodes[nodeId], color }
      }
    }));
  },

  rebalanceLayout: () => {
    const state = get();
    console.log('Rebalancing layout...', Object.keys(state.nodes).length, 'nodes');
    
    setTimeout(() => {
      const balancedNodes = rebalanceTree(state.nodes, state.rootNodeId);
      set({ nodes: balancedNodes });
      get().saveToHistory();
    }, 50);
  },

  setCanvasPosition: (position) => {
    set({ canvasPosition: position });
  },

  setCanvasScale: (scale) => {
    set({ canvasScale: Math.max(0.1, Math.min(3, scale)) });
  },

  zoomCanvas: (delta, center) => {
    const state = get();
    const oldScale = state.canvasScale;
    const newScale = Math.max(0.1, Math.min(3, oldScale + delta));
    if (newScale === oldScale) return;
    
    const canvasPos = state.canvasPosition;
    const mousePointTo = {
      x: (center.x - canvasPos.x) / oldScale,
      y: (center.y - canvasPos.y) / oldScale,
    };
    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };
    set({ canvasScale: newScale, canvasPosition: newPos });
  },

  toggleDarkMode: () => {
    set((state) => ({ isDarkMode: !state.isDarkMode }));
  },

  toggleToolbar: () => {
    set((state) => ({ showToolbar: !state.showToolbar }));
  },

  saveToHistory: () => {
    const state = get();
    const snapshot = JSON.stringify({
      nodes: state.nodes,
      rootNodeId: state.rootNodeId
    });
    
    set((prevState) => ({
      history: {
        past: [...prevState.history.past, prevState.history.present],
        present: snapshot,
        future: []
      }
    }));
  },

  undo: () => {
    const state = get();
    if (state.history.past.length === 0) return;
    
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    
    const data = JSON.parse(previous);
    
    set({
      nodes: data.nodes,
      rootNodeId: data.rootNodeId,
      selectedNodeId: null,
      editingNodeId: null,
      history: {
        past: newPast,
        present: previous,
        future: [state.history.present, ...state.history.future]
      }
    });
  },

  redo: () => {
    const state = get();
    if (state.history.future.length === 0) return;
    
    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);
    
    const data = JSON.parse(next);
    
    set({
      nodes: data.nodes,
      rootNodeId: data.rootNodeId,
      selectedNodeId: null,
      editingNodeId: null,
      history: {
        past: [...state.history.past, state.history.present],
        present: next,
        future: newFuture
      }
    });
  },

  loadMindmapFromData: (nodes, rootNodeId) => {
    set({
      nodes,
      rootNodeId,
      selectedNodeId: rootNodeId,
      editingNodeId: null,
      canvasPosition: { x: 0, y: 0 },
      canvasScale: 1.3,
    });
  },

  setCurrentPageId: (pageId) => {
    set({ currentPageId: pageId });
  },

  // Legacy methods for backward compatibility
  saveMindMap: () => {
    // This is now handled by the service layer
  },

  loadMindMap: () => {
    // This is now handled by the service layer
  },

  exportAsJson: () => {
    const state = get();
    return JSON.stringify({
      nodes: state.nodes,
      rootNodeId: state.rootNodeId,
      timestamp: new Date().toISOString(),
    }, null, 2);
  },

  searchNodes: (query) => {
    const state = get();
    const lowerQuery = query.toLowerCase();
    return Object.values(state.nodes).filter(node =>
      node.title.toLowerCase().includes(lowerQuery) ||
      node.details?.toLowerCase().includes(lowerQuery)
    );
  },

  navigateToNode: (currentNodeId, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    const state = get();
    const currentNode = state.nodes[currentNodeId];
    if (!currentNode) return;

    const getVisibleNodes = () => {
      const visible: MindMapNode[] = [];
      const visited = new Set<string>();
      const traverse = (nodeId: string) => {
        if (visited.has(nodeId) || !state.nodes[nodeId]) return;
        visited.add(nodeId);
        const node = state.nodes[nodeId];
        visible.push(node);
        if (!node.isCollapsed) {
          node.childrenIds.forEach(traverse);
        }
      };
      traverse(state.rootNodeId);
      return visible;
    };

    const visibleNodes = getVisibleNodes();
    const current = currentNode;
    const currentCenter = {
      x: current.position.x + getNodeWidth(current) / 2,
      y: current.position.y + NODE_HEIGHT / 2,
    };

    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
      let siblings: MindMapNode[] = [];
      if (current.parentId) {
        const parent = state.nodes[current.parentId];
        if (parent) {
          siblings = parent.childrenIds
            .map(id => state.nodes[id])
            .filter(n => n && n.id !== currentNodeId && visibleNodes.some(vn => vn.id === n.id));
        }
      }
      
      let bestSibling: MindMapNode | null = null;
      let bestSiblingDist = Infinity;
      for (const sib of siblings) {
        const sibCenterY = sib.position.y + NODE_HEIGHT / 2;
        const dy = sibCenterY - currentCenter.y;
        if ((direction === 'ArrowUp' && dy < 0) || (direction === 'ArrowDown' && dy > 0)) {
          const dist = Math.abs(dy);
          if (dist < bestSiblingDist) {
            bestSiblingDist = dist;
            bestSibling = sib;
          }
        }
      }
      if (bestSibling) {
        get().selectNode(bestSibling.id);
        return;
      }
      
      let bestNode = null;
      let bestDist = Infinity;
      for (const node of visibleNodes) {
        if (node.id === currentNodeId) continue;
        const nodeCenterY = node.position.y + NODE_HEIGHT / 2;
        const dy = nodeCenterY - currentCenter.y;
        if ((direction === 'ArrowUp' && dy < 0) || (direction === 'ArrowDown' && dy > 0)) {
          const dist = Math.abs(dy);
          if (dist < bestDist) {
            bestDist = dist;
            bestNode = node;
          }
        }
      }
      if (bestNode) {
        get().selectNode(bestNode.id);
      }
      return;
    }

    if (direction === 'ArrowRight') {
      const visibleChild = current.childrenIds
        .map(id => state.nodes[id])
        .find(n => n && visibleNodes.some(vn => vn.id === n.id));
      if (visibleChild) {
        get().selectNode(visibleChild.id);
      }
      return;
    }

    if (direction === 'ArrowLeft') {
      if (current.parentId && state.nodes[current.parentId]) {
        get().selectNode(current.parentId);
      }
      return;
    }
  },
}));