import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Challenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
}

interface ProgressEntry {
  attempts: number;
  hintsUsed: number;
  bestScore: number;
  completed: boolean;
  completedAt?: string;
}

type ProgressData = Record<string, ProgressEntry>;

function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem('cicd-lab-progress');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function Dashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData>({});

  useEffect(() => {
    setProgress(loadProgress());
    fetch('/api/v1/challenges')
      .then((r) => r.json())
      .then((d) => { setChallenges(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const attemptedCount = Object.values(progress).filter((p) => p.attempts > 0).length;
  const totalPoints = challenges.reduce((sum, c) => sum + c.points, 0);
  const earnedPoints = challenges.reduce((sum, c) => {
    const p = progress[c.id];
    return sum + (p?.completed ? p.bestScore : 0);
  }, 0);

  const stats = {
    total: challenges.length,
    beginner: challenges.filter((c) => c.level === 'beginner').length,
    intermediate: challenges.filter((c) => c.level === 'intermediate').length,
    advanced: challenges.filter((c) => c.level === 'advanced').length,
    totalPoints,
    completedCount,
    attemptedCount,
    earnedPoints,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">CI/CD Security Lab</h1>
        <p className="text-gray-400">
          Learn CI/CD security through hands-on challenges. Fix vulnerable workflows,
          detect security issues, and master pipeline security.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Completed" value={`${completedCount} / ${stats.total}`} color="green" />
        <StatCard label="Attempted" value={`${attemptedCount} / ${stats.total}`} color="blue" />
        <StatCard label="Score Earned" value={`${earnedPoints} / ${totalPoints}`} color="purple" />
        <StatCard label="Beginner" value={stats.beginner} color="green" />
      </div>

      {completedCount > 0 && (
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h2 className="text-xl font-bold mb-4">Your Progress</h2>
          <div className="space-y-2">
            {challenges.filter((c) => progress[c.id]?.completed).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">{c.title}</span>
                </div>
                <span className="text-green-400 font-medium">{progress[c.id].bestScore} pts</span>
              </div>
            ))}
          </div>
          <Link
            to="/challenges"
            className="mt-4 inline-block text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Browse more challenges →
          </Link>
        </div>
      )}

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-4">Quick Start</h2>
        <div className="space-y-3">
          <QuickStartStep num={1} text="Pick a challenge from the list" />
          <QuickStartStep num={2} text="Read the scenario and examine the vulnerable workflow" />
          <QuickStartStep num={3} text="Fix the security issues in the workflow" />
          <QuickStartStep num={4} text="Run the simulation to validate your fix" />
        </div>
        <Link
          to="/challenges"
          className="mt-6 inline-block bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Browse Challenges
        </Link>
      </div>

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-3">CLI Usage</h2>
        <pre className="bg-dark-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`# List all challenges
cicd-lab list

# Start a challenge
cicd-lab start secrets-leak

# Run simulation on the vulnerable workflow
cicd-lab run -c secrets-leak

# Run simulation on your fixed workflow
cicd-lab run -c secrets-leak your-fix.yml

# Get a hint
cicd-lab hint secrets-leak 1

# Check your progress
cicd-lab progress`}
        </pre>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`rounded-xl p-4 border ${colors[color] || colors.blue}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

function QuickStartStep({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <span className="text-gray-300">{text}</span>
    </div>
  );
}
