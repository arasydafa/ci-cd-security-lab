import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Challenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  tags: string[];
}

const levelStyles: Record<string, { badge: string; icon: string }> = {
  beginner: { badge: 'bg-green-500/10 text-green-400 border border-green-500/20', icon: '●' },
  intermediate: { badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', icon: '●●' },
  advanced: { badge: 'bg-red-500/10 text-red-400 border border-red-500/20', icon: '●●●' },
};

const topicLabels: Record<string, string> = {
  'github-actions': 'GitHub Actions',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  terraform: 'Terraform',
  monitoring: 'Monitoring',
};

function SkeletonCard() {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-4 w-24" />
      </div>
      <div className="skeleton h-6 w-3/4" />
      <div className="flex gap-2 mt-2">
        <div className="skeleton h-5 w-16 rounded" />
        <div className="skeleton h-5 w-12 rounded" />
        <div className="skeleton h-5 w-20 rounded" />
      </div>
    </div>
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
      .then((r) => r.json())
      .then((d) => { setChallenges(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Challenges</h1>
        <p className="text-gray-400">Select a challenge to begin learning.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-green-500/50 transition-colors"
          value={filter.level}
          onChange={(e) => setFilter((f) => ({ ...f, level: e.target.value }))}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-green-500/50 transition-colors"
          value={filter.topic}
          onChange={(e) => setFilter((f) => ({ ...f, topic: e.target.value }))}
        >
          <option value="">All Topics</option>
          <option value="github-actions">GitHub Actions</option>
          <option value="docker">Docker</option>
          <option value="kubernetes">Kubernetes</option>
          <option value="terraform">Terraform</option>
          <option value="monitoring">Monitoring</option>
        </select>
        {!loading && challenges.length > 0 && (
          <span className="text-sm text-gray-500 self-center ml-1">
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
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">No challenges match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {challenges.map((c) => {
            const level = levelStyles[c.level] || levelStyles.beginner;
            return (
              <Link
                key={c.id}
                to={`/challenges/${c.id}`}
                className="bg-dark-800 border border-dark-600 rounded-xl p-5 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/5 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${level.badge}`}>
                        {level.icon} {c.level}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-400 border border-dark-600">
                        {topicLabels[c.topic] || c.topic}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-green-400 transition-colors truncate">
                      {c.title}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-green-400">{c.points}</div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {c.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-dark-700 text-gray-400 px-2 py-0.5 rounded border border-dark-600/50">
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-gray-500 ml-auto">~{c.estimatedTime}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
