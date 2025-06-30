import React, { useEffect, useState, useRef } from 'react';
import { useMindMapStore } from './stores/mindmapStore';
import MindMapCanvas from './components/MindMapCanvas';
import Toolbar from './components/Toolbar';
import ContextMenu from './components/ContextMenu';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { isDarkMode, selectedNodeId, loadMindMap, startEditing } = useMindMapStore();
  const mindmapRef = useRef<HTMLDivElement>(null);
  
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    position: { x: number; y: number };
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load saved mindmap on mount
  useEffect(() => {
    loadMindMap();
  }, [loadMindMap]);

  // Show loading spinner until nodes are loaded
  useEffect(() => {
    // Simulate loading delay for animation (or check if nodes are loaded)
    const timer = setTimeout(() => setLoading(false), 500); // 500ms spinner
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard shortcuts
  useKeyboardShortcuts(
    () => {
      if (selectedNodeId) {
        startEditing(selectedNodeId);
      }
    },
    (e) => {
      // Context menu is handled in canvas component
    }
  );

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking on the context menu itself
      const target = e.target as Element;
      if (!target.closest('[data-context-menu]')) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Handle context menu from canvas
  const handleContextMenu = (nodeId: string, position: { x: number; y: number }) => {
    setContextMenu({ nodeId, position });
  };

  // Prevent Tab navigation outside mindmap and handle node creation
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const { selectedNodeId, editingNodeId, editingText, stopEditing, selectNode, createNode, startEditing, updateNode } = useMindMapStore.getState();
        // If currently editing a node, save and select the node (end editing)
        if (editingNodeId) {
          if (editingText !== undefined) {
            updateNode(editingNodeId, { title: editingText.trim() || 'Untitled' });
          }
          stopEditing();
          selectNode(editingNodeId);
          return;
        }
        // If a node is selected and not editing, create a child and start editing it
        if (selectedNodeId) {
          const newNodeId = createNode(selectedNodeId);
          startEditing(newNodeId);
        }
        // Never select the canvas
      }
    };

    document.addEventListener('keydown', handleTabKey, true);
    return () => {
      document.removeEventListener('keydown', handleTabKey, true);
    };
  }, []);

  // Custom zoom in/out with Ctrl + and Ctrl -
  useEffect(() => {
    const handleZoomKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const center = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        useMindMapStore.getState().zoomCanvas(0.1, center);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        const center = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        useMindMapStore.getState().zoomCanvas(-0.1, center);
      }
    };
    window.addEventListener('keydown', handleZoomKeys, { capture: true });
    return () => window.removeEventListener('keydown', handleZoomKeys, true);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-opacity-60 z-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-black border-solid mb-4"></div>
          <span className="text-lg font-semibold text-black">Just a sec...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Focus trap before */}
      <div
        tabIndex={0}
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        aria-hidden="true"
        onFocus={() => {
          mindmapRef.current?.focus();
        }}
      />
      <div 
        ref={mindmapRef}
        data-mindmap-app
        tabIndex={0}
        onKeyDown={(e) => {
          // Ensure focus stays in mindmap after any key press
          if (!document.activeElement?.closest('[data-inline-editor]')) {
            setTimeout(() => {
              mindmapRef.current?.focus();
            }, 0);
          }
        }}
        onFocus={() => {
          // Ensure mindmap has focus when clicked
          if (!document.activeElement?.closest('[data-inline-editor]')) {
            mindmapRef.current?.focus();
          }
        }}
        onClick={() => {
          // Ensure mindmap has focus when clicked
          if (!document.activeElement?.closest('[data-inline-editor]')) {
            mindmapRef.current?.focus();
          }
        }}
        className={`dotted-bg min-h-screen transition-colors ${
          isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        {/* Toolbar */}
        <Toolbar />

        {/* Main Canvas */}
        <MindMapCanvas 
          width={windowSize.width} 
          height={windowSize.height}
          onContextMenu={handleContextMenu}
        />

        {/* Context Menu */}
        {contextMenu && (
          <div data-context-menu>
            <ContextMenu
              nodeId={contextMenu.nodeId}
              position={contextMenu.position}
              onClose={() => setContextMenu(null)}
              onEdit={() => {
                startEditing(contextMenu.nodeId);
                setContextMenu(null);
              }}
            />
          </div>
        )}

        {/* Keyboard shortcuts help */}
        <div className={`fixed bottom-4 right-4 text-xs opacity-60 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <div className="space-y-1">
            <div>Tab: Add child • Shift+Enter: Edit • Delete: Remove</div>
            <div>Arrow keys: Navigate • Shift+D: Mark done • Space: Collapse</div>
            <div>Ctrl+Z: Undo • Ctrl+Y: Redo • Right-click: Menu</div>
          </div>
        </div>
      </div>
      {/* Focus trap after */}
      <div
        tabIndex={0}
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        aria-hidden="true"
        onFocus={() => {
          mindmapRef.current?.focus();
        }}
      />
    </>
  );
}

export default App;