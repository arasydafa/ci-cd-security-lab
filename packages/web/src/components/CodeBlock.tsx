import { useMemo, useState, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import { Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ code, language = 'yaml', showLineNumbers = false, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Highlight once, then split the highlighted HTML per line so every
  // gutter number aligns with its own code row.
  const lines = useMemo(() => {
    const grammar = Prism.languages[language] ?? Prism.languages.markup;
    return Prism.highlight(code, grammar, language).split('\n');
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard unavailable — still confirm so the UI never dead-ends.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className={`relative group rounded-ot-md overflow-hidden bg-ot-bg border border-ot-border ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-ot-surface border-b border-ot-border">
        <span className="text-xs text-ot-muted uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-ot-muted hover:text-ot-text transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <><Check size={12} aria-hidden /> Copied</> : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-ot-surface">
                {showLineNumbers && (
                  <td className="select-none text-right pr-4 pl-4 py-0 text-xs text-ot-muted w-8 align-top border-r border-ot-border">
                    {i + 1}
                  </td>
                )}
                <td className="px-4 py-0">
                  <pre className="!m-0 !p-0 !bg-transparent">
                    <code
                      className={`language-${language}`}
                      dangerouslySetInnerHTML={{ __html: line || ' ' }}
                    />
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
