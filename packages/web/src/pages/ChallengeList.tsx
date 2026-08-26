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

const levelColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  advanced: 'bg-red-500/10 text-red-400 border-red-500/20',
};

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
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
          value={filter.level}
          onChange={(e) => setFilter((f) => ({ ...f, level: e.target.value }))}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
          value={filter.topic}
          onChange={(e) => setFilter((f) => ({ ...f, topic: e.target.value }))}
        >
          <option value="">All Topics</option>
          <option value="github-actions">GitHub Actions</option>
          <option value="docker">Docker</option>
          <option value="kubernetes">Kubernetes</option>
          <option value="terraform">Terraform</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="text-gray-400 py-8 text-center">No challenges found.</div>
      ) : (
        <div className="grid gap-4">
          {challenges.map((c) => (
            <Link
              key={c.id}
              to={`/challenges/${c.id}`}
              className="bg-dark-800 border border-dark-600 rounded-xl p-5 hover:border-green-500/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${levelColors[c.level] || ''}`}>
                      {c.level}
                    </span>
                    <span className="text-xs text-gray-500">{c.topic}</span>
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-green-400 transition-colors">
                    {c.title}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{c.points}</div>
                  <div className="text-xs text-gray-500">pts</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {c.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-dark-700 text-gray-400 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
                <span className="text-xs text-gray-500 ml-auto">~{c.estimatedTime}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
