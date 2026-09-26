import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Card } from '@omega-os/ui';

/** Back link + title + lede shared by all reference pages. */
export function RefHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <div>
      <Link
        to="/reference"
        className="text-sm text-ot-muted hover:text-ot-text transition-colors mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} aria-hidden /> Reference
      </Link>
      <h1 className="text-3xl font-bold mb-3 text-ot-text">{title}</h1>
      <p className="text-ot-muted text-lg">{lede}</p>
    </div>
  );
}

interface VulnProps {
  num: number;
  title: string;
  description: string;
  bad: string;
  good: string;
}

/** Vulnerable vs secure side-by-side panel. */
export function Vuln({ num, title, description, bad, good }: VulnProps) {
  return (
    <div className="mb-6">
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-3 border-b border-ot-border">
          <h3 className="font-bold text-ot-text">
            <span className="text-danger mr-2">{num}.</span>
            {title}
          </h3>
          <p className="text-sm text-ot-muted mt-1">{description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-4 bg-danger-bg border-r border-ot-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-danger uppercase tracking-wider mb-2">
              <X size={14} aria-hidden /> Vulnerable
            </div>
            <pre className="text-xs text-ot-text whitespace-pre-wrap leading-relaxed">{bad}</pre>
          </div>
          <div className="p-4 bg-success-bg">
            <div className="flex items-center gap-1.5 text-xs font-bold text-success uppercase tracking-wider mb-2">
              <Check size={14} aria-hidden /> Secure
            </div>
            <pre className="text-xs text-ot-text whitespace-pre-wrap leading-relaxed">{good}</pre>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Interactive hardening checklist. */
export function Checklist({ items }: { items: string[] }) {
  return (
    <Card>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <label key={i} className="flex items-start gap-3 text-sm text-ot-text cursor-default">
            <input
              type="checkbox"
              className="mt-1 rounded border-ot-border bg-ot-surface accent-success"
              readOnly
            />
            {item}
          </label>
        ))}
      </div>
    </Card>
  );
}

/** Links to related challenges. */
export function RelatedChallenges({
  items,
  columns = 1,
}: {
  items: { id: string; label: string }[];
  columns?: 1 | 2;
}) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {items.map((c) => (
        <Link
          key={c.id}
          to={`/challenges/${c.id}`}
          className="text-sm text-ot-muted hover:text-navy-text transition-colors px-3 py-2 rounded-ot-md bg-ot-surface border border-ot-border hover:border-navy"
        >
          {c.label}
        </Link>
      ))}
    </div>
  );
}
