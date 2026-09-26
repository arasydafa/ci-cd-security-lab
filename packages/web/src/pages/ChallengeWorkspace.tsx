import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Play, X } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Skeleton, Tabs } from '@omega-os/ui';
import type { BadgeTone } from '@omega-os/ui';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';
import { YamlEditor } from '../components/YamlEditor.js';
import { CodeBlock } from '../components/CodeBlock.js';

interface Challenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  description: string;
  scenario: string;
  vulnerableWorkflow: string;
  hintCount: number;
  tags: string[];
  scoring: {
    hints_used_penalty: number;
    time_bonus: number;
  };
}

interface Finding {
  severity: string;
  category: string;
  message: string;
  remediation?: string;
}

interface ValidationCheck {
  description: string;
  passed: boolean;
  message?: string;
}

interface ScoreResult {
  basePoints: number;
  hintsUsed: number;
  hintsPenalty: number;
  totalDeductions: number;
  finalScore: number;
  passed: boolean;
}

interface SimResult {
  result: {
    success: boolean;
    logs: string[];
    findings: Finding[];
    jobs: { name: string; status: string; steps: { name: string; status: string; output: string }[] }[];
  };
  validation: {
    passed: boolean;
    checks: ValidationCheck[];
  };
  score: ScoreResult;
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

function saveProgress(data: ProgressData): void {
  localStorage.setItem('cicd-lab-progress', JSON.stringify(data));
}

const severityTones: Record<string, { tone: BadgeTone; bg: string; border: string }> = {
  critical: { tone: 'danger', bg: 'bg-danger-bg', border: 'border-l-danger' },
  high: { tone: 'warning', bg: 'bg-warning-bg', border: 'border-l-warning' },
  medium: { tone: 'navy', bg: 'bg-navy-bg', border: 'border-l-navy' },
  low: { tone: 'info', bg: 'bg-info-bg', border: 'border-l-info' },
  info: { tone: 'grey', bg: 'bg-ot-surface', border: 'border-l-ot-border' },
};

const topicLabels: Record<string, string> = {
  'github-actions': 'GitHub Actions',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  terraform: 'Terraform',
  monitoring: 'Monitoring',
};

const levelTones: Record<string, BadgeTone> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

export function ChallengeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [workflow, setWorkflow] = useState('');
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'scenario' | 'hints' | 'logs' | 'findings'>('scenario');
  const [hints, setHints] = useState<Record<number, string>>({});
  const [showSolution, setShowSolution] = useState(false);
  const [solution, setSolution] = useState('');
  const [progress, setProgress] = useState<ProgressData>({});

  // Load challenge and progress
  useEffect(() => {
    if (!id) return;
    setProgress(loadProgress());
    fetch(`/api/v1/challenges/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setChallenge(d.data);
          setWorkflow(d.data.vulnerableWorkflow || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const hintsUsed = id ? (progress[id]?.hintsUsed || 0) : 0;

  const loadHint = useCallback(async (num: number) => {
    if (!id) return;
    if (hints[num]) return;
    const res = await fetch(`/api/v1/challenges/${id}/hint/${num}`);
    const d = await res.json();
    if (d.data) {
      setHints((h) => ({ ...h, [num]: d.data.hint }));
      // Track hint usage
      const newHintsUsed = Math.max((progress[id]?.hintsUsed || 0), num);
      const prev = progress[id];
      const updated = {
        ...progress,
        [id]: {
          attempts: prev?.attempts || 0,
          hintsUsed: newHintsUsed,
          bestScore: prev?.bestScore || 0,
          completed: prev?.completed || false,
          completedAt: prev?.completedAt,
        },
      };
      setProgress(updated);
      saveProgress(updated);
    }
  }, [id, hints, progress]);

  const loadSolution = useCallback(async () => {
    if (!id) return;
    if (solution) { setShowSolution(!showSolution); return; }
    const res = await fetch(`/api/v1/challenges/${id}/solution`);
    const d = await res.json();
    if (d.data) { setSolution(d.data.workflow); setShowSolution(true); }
  }, [id, solution, showSolution]);

  const runSimulation = useCallback(async () => {
    if (!id) return;
    setSimulating(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: id, workflowYaml: workflow }),
      });
      const d = await res.json();
      if (d.data) {
        setResult(d.data);
        // Save progress
        const prev = progress[id];
        const score = d.data.score;
        const updated = {
          ...progress,
          [id]: {
            attempts: (prev?.attempts || 0) + 1,
            hintsUsed: score.hintsUsed,
            bestScore: prev ? Math.max(prev.bestScore, score.finalScore) : score.finalScore,
            completed: score.passed ? true : (prev?.completed || false),
            completedAt: score.passed ? new Date().toISOString() : prev?.completedAt,
          },
        };
        setProgress(updated);
        saveProgress(updated);
      }
      setActiveTab('logs');
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  }, [id, workflow, progress]);

  const logLines = useMemo(() => {
    if (!result) return [];
    return result.result.logs.map((line, i) => ({
      key: i,
      text: line,
      isJob: line.startsWith('━━━'),
      isStep: line.trimStart().startsWith('[') && line.includes('] Starting...'),
      isStarting: line.includes('Starting...'),
      isComplete: line.includes('Completed successfully'),
      isFailed: line.includes('FAILED'),
      isOutput: line.trimStart().startsWith('→'),
    }));
  }, [result]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton width={256} height={32} />
        <Skeleton width={192} height={16} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Skeleton height={400} className="rounded-ot-lg" />
          <Skeleton height={400} className="rounded-ot-lg" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <EmptyState
        title="Challenge not found"
        action={
          <Link to="/challenges" className="inline-flex items-center gap-1 text-sm text-navy-text hover:underline">
            <ArrowLeft size={14} aria-hidden /> Back to Challenges
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link to="/challenges" className="text-sm text-ot-muted hover:text-ot-text mb-3 inline-flex items-center gap-1 transition-colors">
            <ArrowLeft size={14} aria-hidden /> Back to Challenges
          </Link>
          <h1 className="text-2xl font-bold text-ot-text">{challenge.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone={levelTones[challenge.level] || 'grey'}>{challenge.level}</Badge>
            <Badge tone="grey">{topicLabels[challenge.topic] || challenge.topic}</Badge>
            <span className="text-sm text-ot-muted">{challenge.points} pts</span>
            <span className="text-sm text-ot-muted">~{challenge.estimatedTime}</span>
            {hintsUsed > 0 && (
              <Badge tone="warning">{hintsUsed} hint(s) used</Badge>
            )}
          </div>
        </div>
        <Button
          onClick={runSimulation}
          loading={simulating}
          icon={<Play size={16} aria-hidden />}
          className="shrink-0"
        >
          Run Simulation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Info Panel */}
        <div className="space-y-4">
          {/* Tabs */}
          <Tabs
            tabs={[
              { id: 'scenario', label: 'Scenario' },
              { id: 'hints', label: 'Hints' },
            ]}
            value={activeTab}
            onChange={(id) => setActiveTab(id as 'scenario' | 'hints')}
          />

          {/* Content */}
          <Card padding="md" className="min-h-[300px] max-h-[500px] overflow-y-auto">
            {activeTab === 'scenario' && (
              <MarkdownRenderer>{challenge.scenario || challenge.description}</MarkdownRenderer>
            )}
            {activeTab === 'hints' && (
              <div className="space-y-3">
                {Array.from({ length: challenge.hintCount }, (_, i) => i + 1).map((num) => (
                  <div key={num}>
                    {hints[num] ? (
                      <Alert tone="warning">
                        <MarkdownRenderer>{hints[num]}</MarkdownRenderer>
                      </Alert>
                    ) : (
                      <button
                        onClick={() => loadHint(num)}
                        className="w-full text-left p-3 rounded-ot-md border border-dashed border-ot-border hover:border-warning hover:bg-warning-bg transition-all group"
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-ot-surface border border-ot-border flex items-center justify-center text-sm font-bold text-ot-muted group-hover:text-warning group-hover:border-warning transition-colors">
                            {num}
                          </span>
                          <span className="text-sm text-ot-muted group-hover:text-warning transition-colors">
                            Reveal Hint {num}
                          </span>
                          <span className="text-xs text-ot-muted ml-auto">
                            -{challenge.scoring.hints_used_penalty} pts
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                ))}

                <div className="pt-2 border-t border-ot-border mt-4">
                  <button
                    onClick={loadSolution}
                    className="text-sm text-ot-muted hover:text-ot-text transition-colors flex items-center gap-2"
                  >
                    {showSolution ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                    {showSolution ? 'Hide' : 'Show'} Solution
                  </button>
                  {showSolution && solution && (
                    <div className="mt-3">
                      <CodeBlock code={solution} language="yaml" showLineNumbers />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Editor + Results */}
        <div className="space-y-4">
          {/* Editor */}
          <Card padding="none" className="overflow-hidden">
            <div className="bg-ot-surface px-4 py-2 border-b border-ot-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm font-medium ml-2 text-ot-text">workflow.yml</span>
              </div>
              <span className="text-xs text-ot-muted">Editable</span>
            </div>
            <YamlEditor value={workflow} onChange={setWorkflow} />
          </Card>

          {/* Results */}
          {result && (
            <Card padding="none" className="overflow-hidden">
              <div className="px-2 pt-2 bg-ot-surface border-b border-ot-border">
                <Tabs
                  tabs={[
                    { id: 'logs', label: 'Logs' },
                    {
                      id: 'findings',
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          Findings
                          {result.result.findings.length > 0 && (
                            <Badge tone="warning">{result.result.findings.length}</Badge>
                          )}
                        </span>
                      ),
                    },
                  ]}
                  value={activeTab === 'logs' || activeTab === 'findings' ? activeTab : 'logs'}
                  onChange={(id) => setActiveTab(id as 'logs' | 'findings')}
                />
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {activeTab === 'logs' && (
                  <div className="p-4 font-mono text-xs space-y-0.5">
                    {logLines.map((line) => (
                      <div
                        key={line.key}
                        className={`leading-relaxed ${
                          line.isJob ? 'text-ot-text font-bold py-1' :
                          line.isStep ? 'text-success' :
                          line.isFailed ? 'text-danger font-bold' :
                          line.isComplete ? 'text-success' :
                          line.isOutput ? 'text-ot-muted pl-4' :
                          'text-ot-muted'
                        }`}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'findings' && (
                  <div className="p-4 space-y-3">
                    {result.result.findings.length === 0 ? (
                      <div className="flex items-center gap-2 text-success py-4">
                        <Check size={18} aria-hidden />
                        <span className="text-sm font-medium">No security findings</span>
                      </div>
                    ) : (
                      result.result.findings.map((f, i) => {
                        const styles = severityTones[f.severity] || severityTones.info;
                        return (
                          <div key={i} className={`rounded-ot-md p-3 border-l-2 ${styles.border} ${styles.bg}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge tone={styles.tone}>{f.severity}</Badge>
                              <span className="text-xs text-ot-muted">{f.category}</span>
                            </div>
                            <p className="text-sm text-ot-text">{f.message}</p>
                            {f.remediation && (
                              <p className="text-xs text-ot-muted mt-1.5">
                                → {f.remediation}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Validation Summary + Score */}
          {result && (
            <Alert tone={result.validation.passed ? 'success' : 'danger'}>
              <div className="flex items-center gap-2 font-bold mb-2">
                {result.validation.passed ? <Check size={18} aria-hidden /> : <X size={18} aria-hidden />}
                <span>{result.validation.passed ? 'Challenge Passed!' : 'Challenge Failed'}</span>
              </div>

              {/* Score Display */}
              {result.score && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Score</span>
                    <span className="text-2xl font-bold">
                      {result.score.finalScore}
                      <span className="text-sm font-normal opacity-60"> / {result.score.basePoints}</span>
                    </span>
                  </div>
                  {result.score.totalDeductions > 0 && (
                    <div className="text-xs opacity-80">
                      {result.score.hintsUsed} hint(s) used: -{result.score.totalDeductions} pts
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {result.validation.checks.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm opacity-90">
                    <span className="mt-0.5">{c.passed ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}</span>
                    <span>{c.description}</span>
                  </div>
                ))}
              </div>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
