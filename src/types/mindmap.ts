export interface Position {
  x: number;
  y: number;
}

export interface MindMapNode {
  id: string;
  title: string;
  position: Position;
  color: string;
  isCompleted: boolean;
  isCollapsed: boolean;
  parentId: string | null;
  childrenIds: string[];
  details?: string;
  externalLink?: string;
  level: number;
  isSelected: boolean;
  isEditing: boolean;
}

export interface MindMapState {
  nodes: Record<string, MindMapNode>;
  rootNodeId: string;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  isDarkMode: boolean;
  canvasPosition: Position;
  canvasScale: number;
  showToolbar: boolean;
  history: {
    past: string[];
    present: string;
    future: string[];
  };
  editingText?: string;
}

export interface NodeColors {
  [key: string]: string;
}

export const DEFAULT_COLORS: NodeColors = {
  default: '#000000',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#EAB308',
  red: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  orange: '#F97316',
};

export type ColorScope = 'thisNodeOnly' | 'includingChildren';