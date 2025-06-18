import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Link, 
  CheckCircle, 
  Circle,
  Minimize2,
  Maximize2,
  Palette
} from 'lucide-react';
import { useMindMapStore } from '../stores/mindmapStore';
import { DEFAULT_COLORS } from '../types/mindmap';

interface ContextMenuProps {
  nodeId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ nodeId, position, onClose, onEdit }) => {
  const {
    nodes,
    createNode,
    deleteNode,
    toggleNodeCompletion,
    toggleNodeCollapse,
    isDarkMode,
    changeNodeColor,
  } = useMindMapStore();

  const [showColorPicker, setShowColorPicker] = useState(false);

  const node = nodes[nodeId];
  if (!node) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const menuItems = [
    {
      icon: Plus,
      label: 'Add Child',
      shortcut: 'Tab',
      action: () => createNode(nodeId),
    },
    {
      icon: Plus,
      label: 'Add Sibling',
      shortcut: 'Enter',
      action: () => createNode(node.parentId, true),
      disabled: !node.parentId,
    },
    { divider: true },
    {
      icon: Edit,
      label: 'Edit Title',
      shortcut: 'Shift + Enter',
      action: onEdit,
    },
    {
      icon: Edit,
      label: 'Add Details',
      shortcut: 'Shift + E',
      action: onEdit,
    },
    { divider: true },
    {
      icon: node.isCollapsed ? Maximize2 : Minimize2,
      label: node.isCollapsed ? 'Expand' : 'Collapse',
      shortcut: 'Space',
      action: () => toggleNodeCollapse(nodeId),
      disabled: node.childrenIds.length === 0,
    },
    {
      icon: Minimize2,
      label: 'Collapse Others',
      shortcut: 'Shift + Space',
      action: () => {
        // TODO: Implement collapse others
      },
    },
    { divider: true },
    {
      icon: Palette,
      label: 'Change Color',
      shortcut: '',
      action: () => setShowColorPicker((v) => !v),
    },
    {
      icon: node.isCompleted ? CheckCircle : Circle,
      label: node.isCompleted ? 'Mark as Undone' : 'Mark as Done',
      shortcut: 'Shift + D',
      action: () => toggleNodeCompletion(nodeId),
    },
    { divider: true },
    {
      icon: Trash2,
      label: 'Delete Node',
      shortcut: 'Delete',
      action: () => deleteNode(nodeId),
      danger: true,
      disabled: nodeId === nodes[Object.keys(nodes)[0]]?.id, // Can't delete root
    },
  ];

  return (
    <div
      className={`fixed z-50 min-w-64 rounded-lg shadow-xl border ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}
      style={{ 
        left: Math.min(position.x, window.innerWidth - 280), 
        top: Math.min(position.y, window.innerHeight - 400) 
      }}
    >
      <div className="py-2">
        {menuItems.map((item, index) => {
          if ('divider' in item) {
            return (
              <div 
                key={index} 
                className={`my-1 h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} 
              />
            );
          }

          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => handleAction(item.action)}
              disabled={item.disabled}
              className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                item.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : item.danger
                    ? 'hover:bg-red-50 hover:text-red-700 text-red-600'
                    : isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-200' 
                      : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon size={16} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.shortcut && (
                <span className={`text-xs px-2 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
        {showColorPicker && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-t mt-2">
            {Object.entries(DEFAULT_COLORS).map(([name, color]) => (
              <button
                key={name}
                onClick={() => {
                  changeNodeColor(nodeId, color);
                  setShowColorPicker(false);
                  onClose();
                }}
                style={{ background: color, border: node.color === color ? '2px solid #fff' : '2px solid transparent' }}
                className="w-7 h-7 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border-2 transition-all"
                title={name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextMenu;