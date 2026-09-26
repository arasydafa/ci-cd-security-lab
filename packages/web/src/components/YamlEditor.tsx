import { useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function YamlEditor({ value, onChange, className = '' }: YamlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const highlight = useCallback(() => {
    if (highlightRef.current) {
      const highlighted = Prism.highlight(value, Prism.languages.yaml, 'yaml');
      highlightRef.current.innerHTML = highlighted;
    }
  }, [value]);

  useEffect(() => {
    highlight();
  }, [highlight]);

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (!textarea || !highlight || !lineNumbers) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
    lineNumbers.scrollTop = textarea.scrollTop;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [value, onChange]);

  const lineCount = value.split('\n').length;

  return (
    <div className={`relative flex bg-ot-bg rounded-b-ot-md overflow-hidden ${className}`}>
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="select-none text-right pr-3 pl-4 py-3 text-xs text-ot-muted bg-ot-bg border-r border-ot-border overflow-hidden leading-relaxed"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Editor area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Highlighted layer (behind) */}
        <pre
          ref={highlightRef}
          className="absolute inset-0 m-0 p-3 font-mono text-xs leading-relaxed text-ot-text whitespace-pre overflow-auto pointer-events-none !bg-transparent"
          aria-hidden="true"
        />

        {/* Textarea layer (on top, transparent text) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className="relative w-full h-full min-h-[256px] bg-transparent text-transparent caret-success p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none z-10 selection:bg-success-bg"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          data-gramm="false"
        />
      </div>
    </div>
  );
}
