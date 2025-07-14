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
  Palette,
  ChevronRight
} from 'lucide-react';
import { useMindMapStore } from '../stores/mindmapStore';
import { DEFAULT_COLORS, ColorScope } from '../types/mindmap';
import ColorPicker from './ColorPicker';

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
    isDarkMode,
  } = useMindMapStore();

  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<{
    show: boolean;
    scope: ColorScope;
  }>({ show: false, scope: 'thisNodeOnly' });

  const node = nodes[nodeId];
  if (!node) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleColorScopeSelect = (scope: ColorScope) => {
    setShowColorPicker({ show: true, scope });
    setShowColorSubmenu(false);
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
      action: () => setShowColorSubmenu((v) => !v),
      hasSubmenu: true,
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
    <>
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
                onClick={() => item.hasSubmenu ? item.action() : handleAction(item.action)}
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
                <div className="flex items-center space-x-2">
                  {item.shortcut && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.shortcut}
                    </span>
                  )}
                  {item.hasSubmenu && (
                    <ChevronRight size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color scope submenu */}
      {showColorSubmenu && (
        <div
          className={`fixed z-50 w-56 rounded-lg shadow-xl border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
          style={{ 
            left: Math.min(position.x + 260, window.innerWidth - 240), 
            top: Math.min(position.y + 200, window.innerHeight - 200) 
          }}
        >
          <div className="py-2">
            <button
              onClick={() => handleColorScopeSelect('thisNodeOnly')}
              className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-200' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="font-medium">This Node Only</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>
                Mod + Shift + C
              </span>
            </button>
            <button
              onClick={() => handleColorScopeSelect('includingChildren')}
              className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-200' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="font-medium">Including Children</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>
                Shift + C
              </span>
            </button>
          </div>
        </div>
      )}
  );
};

      {/* Color picker */}
      {showColorPicker.show && (
        <ColorPicker
          nodeId={nodeId}
          scope={showColorPicker.scope}
          position={{
            x: position.x + 320,
            y: position.y + 200
          }}
          onClose={() => {
            setShowColorPicker({ show: false, scope: 'thisNodeOnly' });
            onClose();
          }}
        />
      )}
    </>
export default ContextMenu;