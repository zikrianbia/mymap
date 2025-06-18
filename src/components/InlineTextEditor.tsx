import React, { useState, useEffect, useRef } from 'react';
import { useMindMapStore } from '../stores/mindmapStore';

interface InlineTextEditorProps {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onSave: (text: string) => void;
  onCancel: () => void;
}

const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  nodeId,
  x,
  y,
  width,
  height,
  onSave,
  onCancel,
}) => {
  const { nodes } = useMindMapStore();
  const node = nodes[nodeId];
  const [text, setText] = useState(node?.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(text.trim() || 'Untitled');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave(text.trim() || 'Untitled');
  };

  return (
    <div
      data-inline-editor
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: node?.color || '#000',
          borderRadius: '12px',
          border: '2px solid #1e40af',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
        }}
      >
        <input
          ref={inputRef}
          data-inline-editor
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'white',
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: '24px',
          }}
          placeholder="Enter title..."
        />
      </div>
    </div>
  );
};

export default InlineTextEditor; 