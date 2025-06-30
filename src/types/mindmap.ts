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
  black: '#000000',
  blue: '#3B82F6',
  emerald: '#10B981',
  purple: '#8B5CF6',
  orange: '#F97316',
  rose: '#F43F5E',
  yellow: '#EAB308',
  gray: '#6B7280',
};