import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Edit3, Check, X } from 'lucide-react';
import { useMindMapStore } from '../stores/mindmapStore';
import { MindmapService } from '../services/mindmapService';
import { MindmapPage } from '../types/database';
import MindMapCanvas from '../components/MindMapCanvas';
import Toolbar from '../components/Toolbar';
import ContextMenu from '../components/ContextMenu';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const MindmapEditor: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const mindmapRef = useRef<HTMLDivElement>(null);
  
  const [page, setPage] = useState<MindmapPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  
  const { 
    isDarkMode, 
    selectedNodeId, 
    startEditing, 
    loadMindmapFromData,
    nodes,
    rootNodeId,
    setCurrentPageId
  } = useMindMapStore();
  
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    position: { x: number; y: number };
  } | null>(null);

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

  // Load mindmap page
  useEffect(() => {
    if (!pageId) {
      navigate('/');
      return;
    }

    const loadPage = async () => {
      try {
        setLoading(true);
        const pageData = await MindmapService.getPageById(pageId);
        
        if (!pageData) {
          navigate('/');
          return;
        }

        setPage(pageData);
        setCurrentPageId(pageId);
        
        // Load mindmap data into store
        if (pageData.nodes && pageData.nodes.nodes && pageData.nodes.rootNodeId) {
          loadMindmapFromData(pageData.nodes.nodes, pageData.nodes.rootNodeId);
        }
      } catch (error) {
        console.error('Failed to load page:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [pageId, navigate, loadMindmapFromData, setCurrentPageId]);

  // Auto-save functionality
  useEffect(() => {
    if (!pageId || !page || loading) return;

    const saveData = async () => {
      try {
        setSaving(true);
        await MindmapService.saveMindmapData(pageId, nodes, rootNodeId);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to auto-save:', error);
      } finally {
        setSaving(false);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(saveData, 2000);
    return () => clearTimeout(timeoutId);
  }, [nodes, rootNodeId, pageId, page, loading]);

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

  // Handle title editing
  const handleTitleEdit = async () => {
    if (!page || !tempTitle.trim()) return;
    
    try {
      const updatedPage = await MindmapService.updatePage(page.id, {
        title: tempTitle.trim()
      });
      setPage(updatedPage);
      setEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const startTitleEdit = () => {
    setTempTitle(page?.title || '');
    setEditingTitle(true);
  };

  const cancelTitleEdit = () => {
    setEditingTitle(false);
    setTempTitle('');
  };

  // Prevent Tab navigation outside mindmap
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const isInInput = document.activeElement?.tagName === 'INPUT' || 
                         document.activeElement?.tagName === 'TEXTAREA' ||
                         document.activeElement?.closest('[data-inline-editor]');
        
        const isInMindmap = document.activeElement?.closest('[data-mindmap-app]');
        
        if (isInMindmap && !isInInput) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (selectedNodeId) {
            const { createNode } = useMindMapStore.getState();
            createNode(selectedNodeId);
          }
          
          mindmapRef.current?.focus();
          return false;
        }
      }
    };

    document.addEventListener('keydown', handleTabKey, true);
    return () => document.removeEventListener('keydown', handleTabKey, true);
  }, [selectedNodeId]);

  // Custom zoom shortcuts
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mindmap...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Mindmap not found</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
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
          if (!document.activeElement?.closest('[data-inline-editor]')) {
            setTimeout(() => {
              mindmapRef.current?.focus();
            }, 0);
          }
        }}
        onFocus={() => {
          if (!document.activeElement?.closest('[data-inline-editor]')) {
            mindmapRef.current?.focus();
          }
        }}
        onClick={() => {
          if (!document.activeElement?.closest('[data-inline-editor]')) {
            mindmapRef.current?.focus();
          }
        }}
        className={`dotted-bg min-h-screen transition-colors ${
          isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <ArrowLeft size={20} />
              <span>Dashboard</span>
            </button>
            
            <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-3">
              {editingTitle ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleEdit();
                      if (e.key === 'Escape') cancelTitleEdit();
                    }}
                    className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleEdit}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={cancelTitleEdit}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-semibold text-gray-900">{page.title}</h1>
                  <button
                    onClick={startTitleEdit}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Save status */}
            <div className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check size={16} className="text-green-600" />
                  <span className="text-sm text-gray-600">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-600">Auto-save enabled</span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pt-20">
          <Toolbar />
        </div>

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
};

export default MindmapEditor;