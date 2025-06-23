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
    canvasScale
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

  const handleExportMd = () => {
    // Export a simple Markdown representation of the mind map
    const { nodes, rootNodeId } = useMindMapStore.getState();
    function renderNodeMd(nodeId: string, depth = 0) {
      const node = nodes[nodeId];
      if (!node) return '';
      let md = `${'  '.repeat(depth)}- ${node.title}\n`;
      node.childrenIds.forEach(childId => {
        md += renderNodeMd(childId, depth + 1);
      });
      return md;
    }
    const md = renderNodeMd(rootNodeId);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="fixed top-4 left-4 z-40 flex flex-row items-center">
        <button
          onClick={toggleToolbar}
          className={`p-2 rounded-md shadow-lg transition-all bg-white text-gray-900 hover:bg-gray-50 mt-2.5`}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Toolbar */}
      <div className={`fixed top-4 left-16 z-30 transition-all duration-300 ${
        showToolbar ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}>
        <div className={`flex items-center space-x-2 p-3 rounded-lg shadow-lg bg-white`}>
          {/* Rebalance Layout */}
          <button
            onClick={handleRebalanceAndCenter}
            className={`p-2 rounded-md transition-colors flex flex-row items-center text-gray-700 hover:bg-gray-100`}
            title="Rebalance Layout (Ctrl+R)"
          >
            <Grid size={18} /> <span className="ml-1 text-xs">Recenter</span>
          </button>

          <div className="w-px h-6 bg-gray-300" />

          {/* Export options */}
          <button
            onClick={handleExportMd}
            className={`p-2 rounded-md transition-colors flex flex-row items-center text-gray-700 hover:bg-gray-100`}
            title="Export as Markdown"
          >
            <FileText size={18} /> <span className="ml-1 text-xs">Export MD</span>
          </button>
          
          <button
            onClick={handleExportPng}
            className={`p-2 rounded-md transition-colors flex flex-row items-center text-gray-700 hover:bg-gray-100`}
            title="Export as PNG"
          >
            <Image size={18} /> <span className="ml-1 text-xs">Export PNG</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Toolbar;