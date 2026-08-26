import { useEffect, useRef, useState, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ code, language = 'yaml', showLineNumbers = false, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split('\n');

  return (
    <div className={`relative group rounded-lg overflow-hidden bg-dark-900 border border-dark-600 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-dark-700 border-b border-dark-600">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {showLineNumbers ? (
              lines.map((_, i) => (
                <tr key={i} className="hover:bg-dark-800/50">
                  <td className="select-none text-right pr-4 pl-4 py-0 text-xs text-dark-500 w-8 align-top border-r border-dark-600/50">
                    {i + 1}
                  </td>
                  <td className="px-4 py-0">
                    {i === 0 ? (
                      <pre className="!m-0 !p-0 !bg-transparent">
                        <code ref={codeRef} className={`language-${language}`}>
                          {code}
                        </code>
                      </pre>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3">
                  <pre className="!m-0 !p-0 !bg-transparent">
                    <code ref={codeRef} className={`language-${language} text-xs leading-relaxed`}>
                      {code}
                    </code>
                  </pre>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
