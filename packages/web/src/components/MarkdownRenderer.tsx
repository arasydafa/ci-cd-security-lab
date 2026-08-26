import Markdown from 'react-markdown';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none
      prose-headings:text-gray-100 prose-headings:font-bold
      prose-p:text-gray-300 prose-p:leading-relaxed
      prose-li:text-gray-300
      prose-strong:text-white
      prose-code:text-green-400 prose-code:bg-dark-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      ${className}`}
    >
      <Markdown>{children}</Markdown>
    </div>
  );
}
