import React, { useState, useEffect, useRef, useContext } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      // Set initial value
      textAreaRef.current.value = value;
    }
  }, [value]); 

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <textarea
      ref={textAreaRef}
      defaultValue={value}
      onChange={handleInputChange}
      style={{ width: '100%', height: '200px', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  );
};

export default MarkdownEditor;
