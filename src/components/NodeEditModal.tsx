import React, { useState, useEffect, useRef } from 'react';
import { X, Link, FileText, Palette, Check } from 'lucide-react';
import { useMindMapStore } from '../stores/mindmapStore';
import { DEFAULT_COLORS } from '../types/mindmap';

interface NodeEditModalProps {
  nodeId: string;
  onClose: () => void;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({ nodeId, onClose }) => {
  const { nodes, updateNode, isDarkMode } = useMindMapStore();
  const node = nodes[nodeId];
  
  const [title, setTitle] = useState(node?.title || '');
  const [details, setDetails] = useState(node?.details || '');
  const [externalLink, setExternalLink] = useState(node?.externalLink || '');
  const [selectedColor, setSelectedColor] = useState(node?.color || DEFAULT_COLORS.blue);
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    if (!node) return;
    
    updateNode(nodeId, {
      title: title.trim() || 'Untitled',
      details: details.trim(),
      externalLink: externalLink.trim(),
      color: selectedColor,
    });
    
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-96 max-w-full mx-4`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Edit Node
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
          >
            <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Title
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Node title"
            />
          </div>

          {/* Color selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Palette size={16} className="inline mr-1" />
              Color
            </label>
            <div className="flex space-x-2">
              {Object.entries(DEFAULT_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Check size={16} className="text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* External link */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Link size={16} className="inline mr-1" />
              External Link
            </label>
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="https://example.com"
            />
          </div>

          {/* Details */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FileText size={16} className="inline mr-1" />
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Additional notes and details..."
            />
          </div>
        </div>

        <div className={`flex justify-end space-x-2 p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md transition-colors ${
              isDarkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal;