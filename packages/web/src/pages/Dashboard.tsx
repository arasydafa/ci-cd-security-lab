import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Button, Card, CodeBlock } from '@omega-os/ui';

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

const CLI_SNIPPET = `# List all challenges
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
cicd-lab progress`;

export function Dashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData>({});
  const navigate = useNavigate();

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
        <h1 className="text-3xl font-bold mb-2 text-ot-text">CI/CD Security Lab</h1>
        <p className="text-ot-muted">
          Learn CI/CD security through hands-on challenges. Fix vulnerable workflows,
          detect security issues, and master pipeline security.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Completed" value={`${completedCount} / ${stats.total}`} tone="success" />
        <StatCard label="Attempted" value={`${attemptedCount} / ${stats.total}`} tone="info" />
        <StatCard label="Score Earned" value={`${earnedPoints} / ${totalPoints}`} tone="navy" />
        <StatCard label="Beginner" value={stats.beginner} tone="success" />
      </div>

      {completedCount > 0 && (
        <Card>
          <h2 className="text-xl font-bold mb-4 text-ot-text">Your Progress</h2>
          <div className="space-y-2">
            {challenges.filter((c) => progress[c.id]?.completed).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Check size={16} aria-hidden className="text-success" />
                  <span className="text-ot-text">{c.title}</span>
                </div>
                <span className="text-success font-medium">{progress[c.id].bestScore} pts</span>
              </div>
            ))}
          </div>
          <Link
            to="/challenges"
            className="mt-4 inline-flex items-center gap-1 text-sm text-navy-text hover:underline transition-colors"
          >
            Browse more challenges <ArrowRight size={14} aria-hidden />
          </Link>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-ot-text">Quick Start</h2>
        <div className="space-y-3">
          <QuickStartStep num={1} text="Pick a challenge from the list" />
          <QuickStartStep num={2} text="Read the scenario and examine the vulnerable workflow" />
          <QuickStartStep num={3} text="Fix the security issues in the workflow" />
          <QuickStartStep num={4} text="Run the simulation to validate your fix" />
        </div>
        <Button onClick={() => navigate('/challenges')} className="mt-6">
          Browse Challenges
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-3 text-ot-text">CLI Usage</h2>
        <CodeBlock language="bash" code={CLI_SNIPPET} />
      </Card>
    </div>
  );
}

const STAT_TONES = {
  success: 'bg-success-bg text-success',
  info: 'bg-info-bg text-info',
  navy: 'bg-navy-bg text-navy-text',
} as const;

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: keyof typeof STAT_TONES }) {
  return (
    <div className={`rounded-ot-md p-4 border border-transparent ${STAT_TONES[tone]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

function QuickStartStep({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-success-bg text-success flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <span className="text-ot-text">{text}</span>
    </div>
  );
}
