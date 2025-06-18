import { useEffect } from 'react';
import { useMindMapStore } from '../stores/mindmapStore';

export const useKeyboardShortcuts = (
  onEditNode: () => void,
  onShowContextMenu: (e: MouseEvent) => void
) => {
  const {
    selectedNodeId,
    editingNodeId,
    createNode,
    deleteNode,
    toggleNodeCompletion,
    toggleNodeCollapse,
    undo,
    redo,
    stopEditing,
    nodes,
    navigateToNode,
  } = useMindMapStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts while editing
      const isEditing = editingNodeId || 
                       document.activeElement?.tagName === 'INPUT' || 
                       document.activeElement?.tagName === 'TEXTAREA' ||
                       document.activeElement?.closest('[data-inline-editor]');
      
      if (isEditing) {
        // Only handle Escape to cancel editing
        if (e.key === 'Escape') {
          stopEditing();
        }
        return;
      }

      const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

      switch (e.key) {
        case 'Tab':
          // Let the global Tab handler in App.tsx manage this
          // It will prevent browser navigation and keep focus in mindmap
          // We'll handle node creation through a different approach
          break;

        case 'Enter':
          e.preventDefault();
          if (e.shiftKey && selectedNodeId) {
            // Shift + Enter = Edit node
            onEditNode();
          }
          break;

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          if (selectedNodeId) {
            navigateToNode(selectedNodeId, e.key);
          }
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedNodeId) {
            deleteNode(selectedNodeId);
          }
          break;

        case ' ': // Space
          e.preventDefault();
          if (selectedNodeId) {
            if (e.shiftKey) {
              // Shift + Space = Collapse all others (TODO: implement)
            } else {
              // Space = Toggle collapse
              toggleNodeCollapse(selectedNodeId);
            }
          }
          break;

        case 'e':
        case 'E':
          if (e.shiftKey && selectedNodeId) {
            e.preventDefault();
            onEditNode();
          }
          break;

        case 'd':
        case 'D':
          if (e.shiftKey && selectedNodeId) {
            e.preventDefault();
            toggleNodeCompletion(selectedNodeId);
          }
          break;

        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
          }
          break;

        case 'y':
        case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redo();
          }
          break;

        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // TODO: Open search
          }
          break;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onShowContextMenu(e);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    selectedNodeId,
    editingNodeId,
    nodes,
    createNode,
    deleteNode,
    toggleNodeCompletion,
    toggleNodeCollapse,
    undo,
    redo,
    stopEditing,
    onEditNode,
    onShowContextMenu,
    navigateToNode,
  ]);
};