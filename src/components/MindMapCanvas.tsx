import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Rect, Path } from 'react-konva';
import { useMindMapStore } from '../stores/mindmapStore';
import { MindMapNode } from '../types/mindmap';
import Konva from 'konva';
import InlineTextEditor from './InlineTextEditor';

interface MindMapCanvasProps {
  width: number;
  height: number;
  onContextMenu?: (nodeId: string, position: { x: number; y: number }) => void;
}

const NODE_HEIGHT = 32;
const NODE_RADIUS = 6;

function getNodeWidth(node: MindMapNode): number {
  const fontSize = 12;
  const fontWeight = 900;
  const fontFamily = 'Montserrat, Inter, system-ui, sans-serif';
  const padding = 24; // 12px left, 12px right
  const maxWidth = 320;
  const minWidth = 32;
  // Create a canvas context for accurate text measurement
  const canvas: HTMLCanvasElement = (getNodeWidth as any)._canvas || ((getNodeWidth as any)._canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  if (!context) return minWidth;
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(node.title);
  const textWidth = metrics.width;
  // If text + padding exceeds max, return maxWidth (padding is always preserved)
  if (textWidth + padding > maxWidth) return maxWidth;
  return Math.max(minWidth, textWidth + padding);
}

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ width, height, onContextMenu }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [nearestParentId, setNearestParentId] = useState<string | null>(null);
  
  const {
    nodes,
    rootNodeId,
    selectedNodeId,
    editingNodeId,
    canvasPosition,
    canvasScale,
    isDarkMode,
    selectNode,
    startEditing,
    moveNode,
    setCanvasPosition,
    reassignParent,
    updateNode,
    stopEditing,
  } = useMindMapStore();

  // Add these refs at the top of the component
  const initialTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const initialCanvasPosition = useRef<{ x: number; y: number } | null>(null);
  const initialDist = useRef<number | null>(null);
  const initialScale = useRef<number | null>(null);

  // Generate curved Bezier path between two points
  const generateBezierPath = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const minCurve = 20;
    const maxCurve = 80;
    const dx = Math.abs(to.x - from.x);
    const curveStrength = Math.max(minCurve, Math.min(maxCurve, dx * 0.4));
    const controlPoint1 = { x: from.x + curveStrength, y: from.y };
    const controlPoint2 = { x: to.x - curveStrength, y: to.y };
    return `M${from.x},${from.y} C${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${to.x},${to.y}`;
  }, []);

  // Calculate connections between nodes with curved paths
  const getConnections = useCallback(() => {
    const connections: Array<{ from: MindMapNode; to: MindMapNode; path: string }> = [];
    Object.values(nodes).forEach(node => {
      // If dragging this node, skip its normal connection
      if (draggedNodeId && node.id === draggedNodeId) return;
      if (node.parentId && nodes[node.parentId] && !nodes[node.parentId].isCollapsed) {
        const parent = nodes[node.parentId];
        const fromPoint = {
          x: parent.position.x + getNodeWidth(parent), // Right edge of parent node
          y: parent.position.y + NODE_HEIGHT / 2
        };
        const toPoint = {
          x: node.position.x, // Left edge of child node
          y: node.position.y + NODE_HEIGHT / 2
        };
        connections.push({
          from: parent,
          to: node,
          path: generateBezierPath(fromPoint, toPoint)
        });
      }
    });
    // If dragging, add a live connection from nearestParentId to the dragged node
    if (draggedNodeId && nearestParentId && nodes[draggedNodeId] && nodes[nearestParentId]) {
      const parent = nodes[nearestParentId];
      const child = nodes[draggedNodeId];
      const fromPoint = {
        x: parent.position.x + getNodeWidth(parent),
        y: parent.position.y + NODE_HEIGHT / 2
      };
      const toPoint = {
        x: child.position.x,
        y: child.position.y + NODE_HEIGHT / 2
      };
      connections.push({
        from: parent,
        to: child,
        path: generateBezierPath(fromPoint, toPoint)
      });
    }
    return connections;
  }, [nodes, generateBezierPath, draggedNodeId, nearestParentId]);

  // Get visible nodes (not collapsed)
  const getVisibleNodes = useCallback(() => {
    const visible: MindMapNode[] = [];
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId) || !nodes[nodeId]) return;
      
      visited.add(nodeId);
      const node = nodes[nodeId];
      visible.push(node);
      
      if (!node.isCollapsed) {
        node.childrenIds.forEach(traverse);
      }
    };
    
    traverse(rootNodeId);
    return visible;
  }, [nodes, rootNodeId]);

  // Find nearest potential parent during drag
  const findNearestParent = useCallback((draggedNode: MindMapNode, dragPosition: { x: number; y: number }) => {
    let nearestId: string | null = null;
    let minDistance = Infinity;
    const hWeight = 0.4; // horizontal weight
    const vWeight = 1;   // vertical weight
    Object.values(nodes).forEach(node => {
      if (node.id === draggedNode.id) return;
      // Prevent cycles - can't be parent if it's a descendant
      const isDescendant = (nodeId: string, ancestorId: string): boolean => {
        const currentNode = nodes[nodeId];
        if (!currentNode || !currentNode.parentId) return false;
        if (currentNode.parentId === ancestorId) return true;
        return isDescendant(currentNode.parentId, ancestorId);
      };
      if (isDescendant(node.id, draggedNode.id)) return;
      // Drop zone: allow anywhere near the candidate node's center
      const candidateCenterX = node.position.x + getNodeWidth(node) / 2;
      const candidateCenterY = node.position.y + NODE_HEIGHT / 2;
      const dx = dragPosition.x - candidateCenterX;
      const dy = dragPosition.y - candidateCenterY;
      const distance = Math.sqrt((dx * hWeight) * (dx * hWeight) + (dy * vWeight) * (dy * vWeight));
      if (distance < minDistance) {
        minDistance = distance;
        nearestId = node.id;
      }
    });
    return nearestId;
  }, [nodes]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(3, newScale));
    
    stage.scale({ x: clampedScale, y: clampedScale });
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    
    stage.position(newPos);
    setCanvasPosition(newPos);
  }, [setCanvasPosition]);

  // Handle node drag start
  const handleNodeDragStart = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    setDraggedNodeId(nodeId);
  }, []);

  // Handle node drag move
  const handleNodeDragMove = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    // Only move the dragged node, do not reassign parent or trigger layout
    moveNode(nodeId, { x: e.target.x(), y: e.target.y() });
    // Update nearestParentId in real time
    const draggedNode = nodes[nodeId];
    if (draggedNode) {
      const dragPosition = { x: e.target.x(), y: e.target.y() };
      const nearest = findNearestParent(draggedNode, dragPosition);
      setNearestParentId(nearest);
    }
  }, [moveNode, nodes, findNearestParent]);

  // Handle node drag end
  const handleNodeDragEnd = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    setDraggedNodeId(null);
    setNearestParentId(null);
    // On drag end, check for nearest parent and reassign if needed, then rebalance
    const draggedNode = nodes[nodeId];
    if (draggedNode) {
      const dragPosition = { x: e.target.x(), y: e.target.y() };
      const nearest = findNearestParent(draggedNode, dragPosition);
      if (nearest && nearest !== draggedNode.parentId) {
        reassignParent(nodeId, nearest);
      }
    }
    const { rebalanceLayout } = useMindMapStore.getState();
    rebalanceLayout();
  }, [nodes, findNearestParent, reassignParent]);

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    selectNode(nodeId);
  }, [selectNode]);

  // Handle node double click
  const handleNodeDoubleClick = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    startEditing(nodeId);
  }, [startEditing]);

  // Handle node context menu
  const handleNodeContextMenu = useCallback((nodeId: string, e: any) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    
    const stage = stageRef.current;
    if (!stage || !onContextMenu) return;
    
    const pointer = stage.getPointerPosition();
    if (pointer) {
      onContextMenu(nodeId, { x: pointer.x, y: pointer.y });
    }
  }, [onContextMenu]);

  // Handle stage click (deselect)
  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      selectNode(null);
    }
  }, [selectNode]);

  // Handle stage drag
  const handleStageDrag = useCallback((e: any) => {
    setCanvasPosition({ x: e.target.x(), y: e.target.y() });
  }, [setCanvasPosition]);

  // Handle inline editor save
  const handleInlineSave = useCallback((nodeId: string, text: string) => {
    updateNode(nodeId, { title: text });
    const { rebalanceLayout } = useMindMapStore.getState();
    rebalanceLayout();
    stopEditing();
  }, [updateNode, stopEditing]);

  // Handle inline editor cancel
  const handleInlineCancel = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

  // Add/replace these handlers inside the component
  const handleTouchStart = (e: any) => {
    if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      initialTouchCenter.current = center;
      initialCanvasPosition.current = { ...canvasPosition };
      initialDist.current = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      initialScale.current = canvasScale;
    }
  };

  const handleTouchMove = (e: any) => {
    if (e.evt.touches.length === 2) {
      e.evt.preventDefault();
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      // Pan: always relative to the initial gesture center
      if (initialTouchCenter.current && initialCanvasPosition.current) {
        const dx = center.x - initialTouchCenter.current.x;
        const dy = center.y - initialTouchCenter.current.y;
        setCanvasPosition({
          x: initialCanvasPosition.current.x + dx,
          y: initialCanvasPosition.current.y + dy,
        });
      }
      // Zoom: always relative to the initial scale and distance
      if (initialDist.current && initialScale.current) {
        const scaleBy = dist / initialDist.current;
        const newScale = Math.max(0.1, Math.min(3, initialScale.current * scaleBy));
        useMindMapStore.getState().setCanvasScale(newScale);
      }
    }
  };

  const handleTouchEnd = (e: any) => {
    if (e.evt.touches.length < 2) {
      initialTouchCenter.current = null;
      initialCanvasPosition.current = null;
      initialDist.current = null;
      initialScale.current = null;
    }
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (stage) {
      stage.position(canvasPosition);
      stage.scale({ x: canvasScale, y: canvasScale });
    }
  }, [canvasPosition, canvasScale]);

  const visibleNodes = getVisibleNodes();
  const connections = getConnections();

  return (
    <>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        onDragEnd={handleStageDrag}
        data-mindmap-canvas
      >
        <Layer>
          {/* Connection lines with curved Bezier paths */}
          {connections.map(({ from, to, path }, index) => (
            <Path
              key={`connection-${index}`}
              data={path}
              stroke="#545454"
              strokeWidth={1.5}
              lineCap="round"
              lineJoin="round"
              opacity={0.9}
            />
          ))}
          
          {/* Nodes */}
          {visibleNodes.map((node) => {
            const nodeWidth = getNodeWidth(node);
            const isRoot = node.id === rootNodeId;
            return (
              <Group
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                draggable={!isRoot}
                onDragStart={isRoot ? undefined : (e) => handleNodeDragStart(node.id, e)}
                onDragMove={isRoot ? undefined : (e) => handleNodeDragMove(node.id, e)}
                onDragEnd={isRoot ? undefined : (e) => handleNodeDragEnd(node.id, e)}
                onClick={(e) => handleNodeClick(node.id, e)}
                onDblClick={(e) => handleNodeDoubleClick(node.id, e)}
                onContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                visible={editingNodeId !== node.id}
              >
                {/* Hover highlight for potential parent */}
                {nearestParentId === node.id && (
                  <Rect
                    width={nodeWidth + 4}
                    height={NODE_HEIGHT + 4}
                    x={-2}
                    y={-2}
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    cornerRadius={NODE_RADIUS}
                    opacity={0.6}
                    dash={[5, 5]}
                  />
                )}
                
                {/* Node background */}
                <Rect
                  width={nodeWidth}
                  height={NODE_HEIGHT}
                  fill={selectedNodeId === node.id ? '#289EFD' : (node.color || '#000')}
                  cornerRadius={NODE_RADIUS}
                  stroke={'transparent'}
                  strokeWidth={0}
                  opacity={node.isCompleted ? 0.7 : 1}
                  shadowColor="rgba(0, 0, 0, 0.1)"
                  shadowBlur={4}
                  shadowOffset={{ x: 0, y: 2 }}
                />
                
                {/* Node text */}
                <Text
                  text={node.title}
                  fontSize={12}
                  fontFamily="Montserrat, Inter, system-ui, sans-serif"
                  fontStyle={node.isCompleted ? "normal" : "normal"}
                  fontWeight={600}
                  fill="#fff"
                  width={nodeWidth - 24}
                  height={NODE_HEIGHT}
                  x={12}
                  y={0}
                  align="center"
                  verticalAlign="middle"
                  wrap="none"
                  ellipsis
                  textDecoration={node.isCompleted ? "line-through" : undefined}
                />
                
                {/* Collapse indicator */}
                {node.childrenIds.length > 0 && (
                  <>
                    <Circle
                      x={nodeWidth + 8}
                      y={NODE_HEIGHT / 2}
                      radius={4}
                      fill="white"
                      stroke="black"
                      strokeWidth={1}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        // Collapse removed: no action
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
      
      {/* Inline Text Editor */}
      {editingNodeId && nodes[editingNodeId] && (
        <InlineTextEditor
          nodeId={editingNodeId}
          x={nodes[editingNodeId].position.x * canvasScale + canvasPosition.x}
          y={nodes[editingNodeId].position.y * canvasScale + canvasPosition.y}
          width={getNodeWidth(nodes[editingNodeId]) * canvasScale}
          height={NODE_HEIGHT * canvasScale}
          onSave={(text) => handleInlineSave(editingNodeId, text)}
          onCancel={handleInlineCancel}
        />
      )}
    </>
  );
};

export default MindMapCanvas;