import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge, Card, EmptyState, Skeleton } from '@omega-os/ui';
import type { BadgeTone } from '@omega-os/ui';
import { staticList } from '../data/staticChallenges.js';

interface Challenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  tags: string[];
}

const levelTones: Record<string, BadgeTone> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

const topicLabels: Record<string, string> = {
  'github-actions': 'GitHub Actions',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  terraform: 'Terraform',
  monitoring: 'Monitoring',
};

const selectClassName =
  'bg-ot-surface border border-ot-border rounded-ot-sm px-3 py-2 text-sm text-ot-text focus:outline-none focus:ring-ot-ring transition-colors';

function SkeletonCard() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton width={80} height={20} className="rounded-full" />
          <Skeleton width={96} height={16} />
        </div>
        <Skeleton width="75%" height={24} />
        <div className="flex gap-2 mt-2">
          <Skeleton width={64} height={20} />
          <Skeleton width={48} height={20} />
          <Skeleton width={80} height={20} />
        </div>
      </div>
    </Card>
  );
}

export function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ level: '', topic: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.level) params.set('level', filter.level);
    if (filter.topic) params.set('topic', filter.topic);

    fetch(`/api/v1/challenges?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('api unavailable');
        return r.json();
      })
      .then((d) => { setChallenges(d.data || []); setLoading(false); })
      .catch(() => { setChallenges(staticList(filter.level, filter.topic)); setLoading(false); });
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-ot-text">Challenges</h1>
        <p className="text-ot-muted">Select a challenge to begin learning.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          className={selectClassName}
          value={filter.level}
          onChange={(e) => setFilter((f) => ({ ...f, level: e.target.value }))}
          aria-label="Filter by level"
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          className={selectClassName}
          value={filter.topic}
          onChange={(e) => setFilter((f) => ({ ...f, topic: e.target.value }))}
          aria-label="Filter by topic"
        >
          <option value="">All Topics</option>
          <option value="github-actions">GitHub Actions</option>
          <option value="docker">Docker</option>
          <option value="kubernetes">Kubernetes</option>
          <option value="terraform">Terraform</option>
          <option value="monitoring">Monitoring</option>
        </select>
        {!loading && challenges.length > 0 && (
          <span className="text-sm text-ot-muted self-center ml-1">
            {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={<Search size={32} aria-hidden />}
          title="No challenges found"
          description="No challenges match your filters."
        />
      ) : (
        <div className="grid gap-4">
          {challenges.map((c) => (
            <Link key={c.id} to={`/challenges/${c.id}`} className="group block">
              <Card className="ot-transition hover:border-navy">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge tone={levelTones[c.level] || 'grey'}>{c.level}</Badge>
                      <Badge tone="grey">{topicLabels[c.topic] || c.topic}</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-ot-text group-hover:text-navy-text transition-colors truncate">
                      {c.title}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-success">{c.points}</div>
                    <div className="text-xs text-ot-muted">pts</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {c.tags.map((tag) => (
                    <Badge key={tag} tone="grey">{tag}</Badge>
                  ))}
                  <span className="text-xs text-ot-muted ml-auto">~{c.estimatedTime}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
