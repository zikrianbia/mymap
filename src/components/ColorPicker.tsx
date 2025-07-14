import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { DEFAULT_COLORS, ColorScope } from '../types/mindmap';
import { useMindMapStore } from '../stores/mindmapStore';

interface ColorPickerProps {
  nodeId: string;
  scope: ColorScope;
  position: { x: number; y: number };
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ nodeId, scope, position, onClose }) => {
  const { changeNodeColor, changeNodeColorWithChildren, isDarkMode } = useMindMapStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredColors = Object.entries(DEFAULT_COLORS).filter(([name]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleColorSelect = (color: string) => {
    if (scope === 'thisNodeOnly') {
      changeNodeColor(nodeId, color);
    } else {
      changeNodeColorWithChildren(nodeId, color);
    }
    onClose();
  };

  const getColorLabel = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getColorIcon = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={`fixed z-50 w-64 rounded-lg shadow-xl border ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}
      style={{ 
        left: Math.min(position.x, window.innerWidth - 280), 
        top: Math.min(position.y, window.innerHeight - 400) 
      }}
    >
      <div className="p-3">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search colors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Color options */}
        <div className="max-h-64 overflow-y-auto">
          {filteredColors.map(([name, color]) => (
            <button
              key={name}
              onClick={() => handleColorSelect(color)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-md transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-200' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div
                className="w-6 h-6 rounded-sm flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: color }}
              >
                {getColorIcon(name)}
              </div>
              <span className="font-medium">{getColorLabel(name)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;