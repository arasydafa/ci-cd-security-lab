import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Download, Upload } from 'lucide-react';
import { Button, Card, CodeBlock } from '@omega-os/ui';
import {
  entryChallenges,
  isCleanSolve,
  loadProgress,
  nextUp,
  saveProgress,
  staticList,
  type ProgressData,
} from '../data/staticChallenges.js';

interface Challenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setProgress(loadProgress());
    fetch('/api/v1/challenges')
      .then((r) => {
        if (!r.ok) throw new Error('api unavailable');
        return r.json();
      })
      .then((d) => { setChallenges(d.data || []); setLoading(false); })
      .catch(() => { setChallenges(staticList()); setLoading(false); });
  }, []);

  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const attemptedCount = Object.values(progress).filter((p) => p.attempts > 0).length;
  const cleanCount = Object.values(progress).filter(isCleanSolve).length;
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

  const recommended = nextUp(progress);
  const starters = entryChallenges().slice(0, 3);

  const exportProgress = (): void => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cicd-lab-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = (file: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProgressData;
        // Merge: keep best score, union attempts, preserve solutionViewed.
        const merged: ProgressData = { ...progress };
        for (const [id, entry] of Object.entries(parsed)) {
          const prev = merged[id];
          if (!prev) {
            merged[id] = entry;
            continue;
          }
          merged[id] = {
            attempts: Math.max(prev.attempts || 0, entry.attempts || 0),
            hintsUsed: Math.max(prev.hintsUsed || 0, entry.hintsUsed || 0),
            bestScore: Math.max(prev.bestScore || 0, entry.bestScore || 0),
            completed: prev.completed || entry.completed,
            completedAt: prev.completedAt || entry.completedAt,
            solutionViewed: prev.solutionViewed || entry.solutionViewed,
          };
        }
        setProgress(merged);
        saveProgress(merged);
      } catch {
        // Ignore malformed files; keep current progress.
      }
    };
    reader.readAsText(file);
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

      {/* Onboarding: new learners know where to start */}
      {attemptedCount === 0 && !loading && (
        <Card className="border-l-4 border-l-success">
          <h2 className="text-xl font-bold mb-2 text-ot-text">Where to start?</h2>
          <p className="text-sm text-ot-muted mb-4">
            No setup needed. Pick one entry-level challenge — no prerequisites —
            then follow Prerequisites → Objectives → Next up on each page.
          </p>
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <Link
                key={s.id}
                to={`/challenges/${s.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-navy-text hover:underline"
              >
                {s.title} <ArrowRight size={14} aria-hidden />
              </Link>
            ))}
          </div>
          <Button onClick={() => navigate(`/challenges/${starters[0]?.id || 'secrets-leak'}`)} className="mt-4">
            Start: {starters[0]?.title || 'Secrets Leak'}
          </Button>
        </Card>
      )}

      {/* Continue card: resume where you left off */}
      {attemptedCount > 0 && recommended && (
        <Card className="border-l-4 border-l-navy">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ot-text">Continue</h2>
              <p className="text-sm text-ot-muted">
                Next up: <span className="font-medium text-ot-text">{recommended.title}</span>
                {recommended.prerequisites.length > 0 && (
                  <span> — requires {recommended.prerequisites.join(', ')}</span>
                )}
              </p>
            </div>
            <Button onClick={() => navigate(`/challenges/${recommended.id}`)} className="shrink-0">
              Continue <ArrowRight size={14} aria-hidden />
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Completed" value={`${completedCount} / ${stats.total}`} tone="success" />
        <StatCard label="Attempted" value={`${attemptedCount} / ${stats.total}`} tone="info" />
        <StatCard label="Score Earned" value={`${earnedPoints} / ${totalPoints}`} tone="navy" />
        <StatCard label="Clean solves" value={`${cleanCount}`} tone="success" />
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
                  {isCleanSolve(progress[c.id]) && (
                    <span className="text-xs font-medium text-success border border-success rounded-full px-2 py-0.5">
                      clean-solve
                    </span>
                  )}
                  {progress[c.id]?.solutionViewed && !isCleanSolve(progress[c.id]) && (
                    <span className="text-xs text-ot-muted border border-ot-border rounded-full px-2 py-0.5">
                      solved-with-solution
                    </span>
                  )}
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
        <h2 className="text-xl font-bold mb-2 text-ot-text">Progress sync (web ↔ CLI)</h2>
        <p className="text-sm text-ot-muted mb-4">
          Same JSON file as <span className="font-mono">~/.cicd-lab-progress.json</span>.
          Export from the web and <span className="font-mono">cicd-lab progress --import</span> it,
          or vice versa.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportProgress} icon={<Download size={14} aria-hidden />}>
            Export JSON
          </Button>
          <Button onClick={() => fileRef.current?.click()} icon={<Upload size={14} aria-hidden />}>
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importProgress(f);
              e.target.value = '';
            }}
          />
        </div>
      </Card>

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
