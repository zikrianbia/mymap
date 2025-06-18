import React, { useState } from 'react';
import { 
  Menu, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  Undo, 
  Redo, 
  Search,
  Settings,
  FileText,
  Image,
  Share
} from 'lucide-react';
import { useMindMapStore } from '../stores/mindmapStore';

const Toolbar: React.FC = () => {
  const {
    isDarkMode,
    showToolbar,
    toggleDarkMode,
    toggleToolbar,
    undo,
    redo,
    history,
    exportAsJson,
    searchNodes,
  } = useMindMapStore();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchNodes(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleExportJson = () => {
    const data = exportAsJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPng = async () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `mindmap-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <>
      {/* Toolbar toggle button */}
      <button
        onClick={toggleToolbar}
        className={`fixed top-4 left-4 z-40 p-2 rounded-md shadow-lg transition-all ${
          isDarkMode 
            ? 'bg-gray-800 text-white hover:bg-gray-700' 
            : 'bg-white text-gray-900 hover:bg-gray-50'
        }`}
      >
        <Menu size={20} />
      </button>

      {/* Toolbar */}
      <div className={`fixed top-4 left-16 z-30 transition-all duration-300 ${
        showToolbar ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}>
        <div className={`flex items-center space-x-2 p-3 rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Undo/Redo */}
          <div className="flex space-x-1">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className={`p-2 rounded-md transition-colors ${
                history.past.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={redo}
              disabled={history.future.length === 0}
              className={`p-2 rounded-md transition-colors ${
                history.future.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={18} />
            </button>
          </div>

          <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

          {/* Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Search (Ctrl+F)"
          >
            <Search size={18} />
          </button>

          <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

          {/* Export options */}
          <button
            onClick={handleExportJson}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Export as JSON"
          >
            <FileText size={18} />
          </button>
          
          <button
            onClick={handleExportPng}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Export as PNG"
          >
            <Image size={18} />
          </button>

          <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Search overlay */}
      {showSearch && (
        <div className="fixed top-20 left-4 right-4 z-40 max-w-md">
          <div className={`p-4 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search nodes..."
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              autoFocus
            />
            
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                {searchResults.map((node) => (
                  <div
                    key={node.id}
                    className={`p-2 rounded-md cursor-pointer transition-colors ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      // TODO: Focus on node
                      setShowSearch(false);
                    }}
                  >
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {node.title}
                    </div>
                    {node.details && (
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {node.details.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowSearch(false)}
              className={`mt-2 text-sm ${
                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Press Escape to close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;