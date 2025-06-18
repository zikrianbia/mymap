import React, { useState } from 'react';
import { 
  Menu, 
  Download, 
  Upload, 
  Undo, 
  Redo, 
  Settings,
  FileText,
  Image,
  Share,
  Grid
} from 'lucide-react';
import { useMindMapStore } from '../stores/mindmapStore';

const Toolbar: React.FC = () => {
  const {
    showToolbar,
    toggleToolbar,
    undo,
    redo,
    history,
    exportAsJson,
    rebalanceLayout,
  } = useMindMapStore();

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

  // Center the root node in the viewport
  const handleRebalanceAndCenter = () => {
    rebalanceLayout();
    setTimeout(() => {
      const { nodes, rootNodeId, setCanvasPosition } = useMindMapStore.getState();
      const root = nodes[rootNodeId];
      if (root) {
        const nodeWidth =  root.title ? Math.max(80, 0.6 * 14 * root.title.length + 32) : 80;
        const centerX = window.innerWidth / 2 - (root.position.x + nodeWidth / 2) - 100;
        const centerY = window.innerHeight / 2 - (root.position.y + 32 / 2) - 50;
        setCanvasPosition({ x: centerX, y: centerY });
      }
    }, 0);
  };

  return (
    <>
      {/* Toolbar toggle button */}
      <button
        onClick={toggleToolbar}
        className={`fixed top-4 left-4 z-40 p-2 rounded-md shadow-lg transition-all bg-white text-gray-900 hover:bg-gray-50`}
      >
        <Menu size={20} />
      </button>

      {/* Toolbar */}
      <div className={`fixed top-4 left-16 z-30 transition-all duration-300 ${
        showToolbar ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}>
        <div className={`flex items-center space-x-2 p-3 rounded-lg shadow-lg bg-white`}>
          {/* Undo/Redo */}
          <div className="flex space-x-1">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className={`p-2 rounded-md transition-colors ${
                history.past.length === 0
                  ? 'opacity-50 cursor-not-allowed'
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
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Rebalance Layout */}
          <button
            onClick={handleRebalanceAndCenter}
            className={`p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100`}
            title="Rebalance Layout (Ctrl+R)"
          >
            <Grid size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300" />

          {/* Export options */}
          <button
            onClick={handleExportJson}
            className={`p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100`}
            title="Export as JSON"
          >
            <FileText size={18} />
          </button>
          
          <button
            onClick={handleExportPng}
            className={`p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100`}
            title="Export as PNG"
          >
            <Image size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Toolbar;