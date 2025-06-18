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

const NODE_MIN_WIDTH = 80;
const NODE_MAX_WIDTH = 320;
const NODE_HEIGHT = 32;
const NODE_RADIUS = 6;

function getNodeWidth(node: MindMapNode) {
  const fontSize = 14;
  return Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, 0.6 * fontSize * node.title.length + 32));
}

function estimateTextWidth(text: string, fontSize = 14, fontWeight = 500) {
  // Simple estimate: 0.6 * fontSize * text.length (works for most sans-serif)
  return Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, 0.6 * fontSize * text.length + 32));
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
    toggleNodeCollapse,
    reassignParent,
    updateNode,
    stopEditing,
  } = useMindMapStore();

  // Generate curved Bezier path between two points
  const generateBezierPath = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.abs(to.x - from.x) / 2;
    const controlPoint1X = from.x + dx;
    const controlPoint2X = to.x - dx;
    
    return `M ${from.x} ${from.y} C ${controlPoint1X} ${from.y}, ${controlPoint2X} ${to.y}, ${to.x} ${to.y}`;
  }, []);

  // Calculate connections between nodes with curved paths
  const getConnections = useCallback(() => {
    const connections: Array<{ from: MindMapNode; to: MindMapNode; path: string }> = [];
    
    Object.values(nodes).forEach(node => {
      if (node.parentId && nodes[node.parentId] && !nodes[node.parentId].isCollapsed) {
        const parent = nodes[node.parentId];
        const fromPoint = {
          x: parent.position.x + getNodeWidth(parent), // Right edge of parent node
          y: parent.position.y + NODE_HEIGHT / 2
        };
        const toPoint = {
          x: node.position.x,
          y: node.position.y + NODE_HEIGHT / 2
        };
        
        connections.push({
          from: parent,
          to: node,
          path: generateBezierPath(fromPoint, toPoint)
        });
      }
    });
    
    return connections;
  }, [nodes, generateBezierPath]);

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
    let minDistance = 220; // Even larger threshold for easier targeting
    
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
      const distance = Math.sqrt(
        Math.pow(dragPosition.x - candidateCenterX, 2) + 
        Math.pow(dragPosition.y - candidateCenterY, 2)
      );
      
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
    const draggedNode = nodes[nodeId];
    if (!draggedNode) return;
    
    const dragPosition = { x: e.target.x(), y: e.target.y() };
    const nearest = findNearestParent(draggedNode, dragPosition);
    setNearestParentId(nearest);

    // Real-time parent reassignment
    if (nearest && nearest !== nodes[nodeId].parentId) {
      reassignParent(nodeId, nearest);
    }
    // Move node in real time
    moveNode(nodeId, dragPosition);
  }, [nodes, findNearestParent, reassignParent, moveNode]);

  // Handle node drag end
  const handleNodeDragEnd = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    setDraggedNodeId(null);
    setNearestParentId(null);
  }, []);

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
    stopEditing();
  }, [updateNode, stopEditing]);

  // Handle inline editor cancel
  const handleInlineCancel = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

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
              stroke="#94a3b8"
              strokeWidth={2}
              lineCap="round"
              lineJoin="round"
              opacity={0.8}
            />
          ))}
          
          {/* Nodes */}
          {visibleNodes.map((node) => {
            const nodeWidth = getNodeWidth(node);
            return (
              <Group
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                draggable
                onDragStart={(e) => handleNodeDragStart(node.id, e)}
                onDragMove={(e) => handleNodeDragMove(node.id, e)}
                onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
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
                  fill={node.color || '#000'}
                  cornerRadius={NODE_RADIUS}
                  stroke={selectedNodeId === node.id ? '#1e40af' : 'transparent'}
                  strokeWidth={selectedNodeId === node.id ? 2 : 0}
                  opacity={node.isCompleted ? 0.7 : 1}
                  shadowColor="rgba(0, 0, 0, 0.1)"
                  shadowBlur={4}
                  shadowOffset={{ x: 0, y: 2 }}
                />
                
                {/* Node text */}
                <Text
                  text={node.title}
                  fontSize={14}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontStyle="normal"
                  fontWeight={500}
                  fill="white"
                  width={nodeWidth - 16}
                  height={NODE_HEIGHT}
                  x={8}
                  y={0}
                  align="center"
                  verticalAlign="middle"
                  wrap="word"
                  ellipsis
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
                        toggleNodeCollapse(node.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </>
                )}
                
                {/* Completion indicator */}
                {node.isCompleted && (
                  <Circle
                    x={15}
                    y={15}
                    radius={8}
                    fill="#10b981"
                    stroke="white"
                    strokeWidth={2}
                  />
                )}
                
                {node.isCompleted && (
                  <Text
                    text="✓"
                    x={11}
                    y={11}
                    fontSize={12}
                    fontStyle="bold"
                    fill="white"
                  />
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