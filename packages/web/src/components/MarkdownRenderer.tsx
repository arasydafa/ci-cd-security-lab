import { Markdown } from '@omega-os/ui';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

/**
 * Local children-based API over OmegaOS Markdown (GFM, theme-aware).
 * Call sites stay untouched.
 */
export function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
  return <Markdown source={children} className={className} />;
}
