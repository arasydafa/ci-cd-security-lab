import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Play, X } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Skeleton, Tabs } from '@omega-os/ui';
import type { BadgeTone } from '@omega-os/ui';
import {
  balanceChallenges,
  dependentsOf,
  isCleanSolve,
  loadProgress,
  relatedTo,
  saveProgress,
  solvedWithSolution,
  staticDetail,
  staticHint,
  staticSolution,
  type ProgressData,
} from '../data/staticChallenges.js';
import { availableForChallenge, canOpenHint, hintCost } from '@cicd-lab/shared';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';
import { YamlEditor } from '../components/YamlEditor.js';
import { CodeBlock } from '../components/CodeBlock.js';

interface ChallengeRef {
  page: string;
  label: string;
}

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
  prerequisites: string[];
  objectives: string[];
  references: ChallengeRef[];
  scoring: {
    hints_used_penalty: number;
    time_bonus: number;
    pass_threshold?: number;
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
  whyItMatters?: string;
  reference?: string;
}

interface ScoreResult {
  basePoints: number;
  hintsUsed: number;
  hintsPenalty: number;
  totalDeductions: number;
  finalScore: number;
  passed: boolean;
  passedChecks: number;
  totalChecks: number;
  partialRatio: number;
  timeBonusAwarded: number;
  threshold: number;
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
  // Static-hosting fallback (Pages has no API server): content from the
  // bundled challenge data, simulation disabled with an honest notice.
  const [offline, setOffline] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);
  // Shown when a hint is locked because the free balance can't cover it.
  const [hintGateMsg, setHintGateMsg] = useState<string | null>(null);

  // Load challenge and progress
  useEffect(() => {
    if (!id) return;
    setProgress(loadProgress());
    setHints({});
    setResult(null);
    setShowSolution(false);
    setSolution('');
    setLoading(true);
    fetch(`/api/v1/challenges/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('api unavailable');
        return r.json();
      })
      .then((d) => {
        if (d.data) {
          setChallenge({
            ...d.data,
            prerequisites: d.data.prerequisites || [],
            objectives: d.data.objectives || [],
            references: d.data.references || [],
          });
          setWorkflow(d.data.vulnerableWorkflow || '');
        }
        setLoading(false);
      })
      .catch(() => {
        const detail = staticDetail(id);
        if (detail) {
          setChallenge({
            ...detail,
            prerequisites: (detail as Challenge).prerequisites || [],
            objectives: (detail as Challenge).objectives || [],
            references: (detail as Challenge).references || [],
          } as Challenge);
          setWorkflow(detail.vulnerableWorkflow || '');
          setOffline(true);
        }
        setLoading(false);
      });
  }, [id]);

  const hintsUsed = id ? (progress[id]?.hintsUsed || 0) : 0;
  const entry = id ? progress[id] : undefined;
  const clean = isCleanSolve(entry);
  const withSolution = solvedWithSolution(entry);

  // Global points-as-balance: hints are locked until this challenge's budget
  // covers their cost. Same math as the CLI (see @cicd-lab/shared/balance).
  const balanceList = useMemo(() => balanceChallenges(), []);
  // Budget the gate compares against: banked points minus holds on OTHER
  // challenges (this challenge's own hold is what a new hint would add).
  const budgetForChallenge = id
    ? Math.max(0, availableForChallenge(progress, balanceList, id))
    : 0;
  const hintUnlocked = (num: number) =>
    !id || canOpenHint(progress, balanceList, id, num);

  const nextSteps = useMemo(() => (id ? dependentsOf(id) : []), [id]);
  const related = useMemo(() => (id ? relatedTo(id, 4) : []), [id]);

  const loadHint = useCallback(async (num: number) => {
    if (!id) return;
    if (hints[num]) return;

    // Gate: block the reveal when this challenge's budget can't cover the new
    // hold. The message quotes the same budget/cost the gate compares.
    if (!canOpenHint(progress, balanceList, id, num)) {
      const penalty = challenge?.scoring.hints_used_penalty ?? 0;
      const opened = Math.max(progress[id]?.hintsUsed || 0, num);
      const budget = Math.max(0, availableForChallenge(progress, balanceList, id));
      const cost = hintCost({ id, points: challenge?.points ?? 0, hintsPenalty: penalty }, opened);
      setHintGateMsg(
        `Hint ${num} is locked — opening ${opened} hint(s) here costs ${cost} pts, but only ${budget} pts are available for this challenge. Solve challenges to bank points first.`,
      );
      return;
    }
    setHintGateMsg(null);

    try {
      const res = await fetch(`/api/v1/challenges/${id}/hint/${num}`);
      if (!res.ok) throw new Error('api unavailable');
      const d = await res.json();
      if (d.data) {
        setHints((h) => ({ ...h, [num]: d.data.hint }));
        // Track hint usage — retry without hints stays distinguishable.
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
            solutionViewed: prev?.solutionViewed,
            startedAt: prev?.startedAt || new Date().toISOString(),
          },
        };
        setProgress(updated);
        saveProgress(updated);
      }
    } catch {
      const hint = staticHint(id, num);
      if (hint) {
        setHints((h) => ({ ...h, [num]: hint }));
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
            solutionViewed: prev?.solutionViewed,
            startedAt: prev?.startedAt || new Date().toISOString(),
          },
        };
        setProgress(updated);
        saveProgress(updated);
      }
    }
  }, [id, hints, progress, balanceList, challenge]);

  const markSolutionViewed = useCallback(() => {
    if (!id) return;
    const prev = progress[id];
    if (prev?.solutionViewed) return;
    const updated = {
      ...progress,
      [id]: {
        attempts: prev?.attempts || 0,
        hintsUsed: prev?.hintsUsed || 0,
        bestScore: prev?.bestScore || 0,
        completed: prev?.completed || false,
        completedAt: prev?.completedAt,
        solutionViewed: true,
        startedAt: prev?.startedAt || new Date().toISOString(),
      },
    };
    setProgress(updated);
    saveProgress(updated);
  }, [id, progress]);

  const loadSolution = useCallback(async () => {
    if (!id) return;
    if (solution) { setShowSolution(!showSolution); if (!showSolution) markSolutionViewed(); return; }
    try {
      const res = await fetch(`/api/v1/challenges/${id}/solution`);
      if (!res.ok) throw new Error('api unavailable');
      const d = await res.json();
      if (d.data) { setSolution(d.data.workflow); setShowSolution(true); markSolutionViewed(); }
    } catch {
      const s = staticSolution(id);
      if (s) { setSolution(s); setShowSolution(true); markSolutionViewed(); }
    }
  }, [id, solution, showSolution, markSolutionViewed]);

  const runSimulation = useCallback(async () => {
    if (!id) return;
    if (offline) {
      setOfflineNotice(true);
      setActiveTab('logs');
      return;
    }
    setSimulating(true);
    setResult(null);
    // startedAt anchors the time_bonus clock; first run starts it.
    const prevRun = id ? progress[id] : undefined;
    const startedAt = prevRun?.startedAt || new Date().toISOString();
    const elapsedMs = Date.now() - new Date(startedAt).getTime();
    try {
      const res = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: id,
          workflowYaml: workflow,
          hintsUsed: prevRun?.hintsUsed || 0,
          elapsedMs: Math.max(0, elapsedMs),
          solutionViewed: !!prevRun?.solutionViewed,
        }),
      });
      const d = await res.json();
      if (d.data) {
        setResult(d.data);
        // Save progress — preserve solutionViewed so clean vs solved-with-solution stays visible.
        const prev = progress[id];
        const score = d.data.score;
        const updated = {
          ...progress,
          [id]: {
            attempts: (prev?.attempts || 0) + 1,
            hintsUsed: prev?.hintsUsed || score.hintsUsed || 0,
            bestScore: prev ? Math.max(prev.bestScore, score.finalScore) : score.finalScore,
            completed: score.passed ? true : (prev?.completed || false),
            completedAt: score.passed ? new Date().toISOString() : prev?.completedAt,
            solutionViewed: prev?.solutionViewed,
            startedAt,
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
  }, [id, workflow, progress, offline]);

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
            {clean && <Badge tone="success">clean-solve</Badge>}
            {withSolution && !clean && <Badge tone="grey">solved-with-solution</Badge>}
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

      {/* Learning path: prerequisites / objectives / references */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ot-muted mb-2">Objectives</h3>
          {challenge.objectives?.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-sm text-ot-text">
              {challenge.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ot-muted">No objectives listed.</p>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ot-muted mb-2">Prerequisites</h3>
          {challenge.prerequisites?.length === 0 ? (
            <p className="text-sm text-ot-muted">Entry-level — start here.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(challenge.prerequisites || []).map((p) => {
                const done = !!progress[p]?.completed;
                return (
                  <li key={p} className="flex items-center gap-2">
                    {done ? <Check size={14} aria-hidden className="text-success" /> : null}
                    <Link to={`/challenges/${p}`} className="text-navy-text hover:underline">
                      {p}
                    </Link>
                    <span className="text-xs text-ot-muted">{done ? 'done' : 'required'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ot-muted mb-2">References</h3>
          {challenge.references?.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {challenge.references.map((r) => (
                <li key={`${r.page}-${r.label}`}>
                  <Link to={`/reference/${r.page}`} className="inline-flex items-center gap-1 text-navy-text hover:underline">
                    {r.label} <ArrowRight size={12} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ot-muted">No references listed.</p>
          )}
        </Card>
      </div>

      {offlineNotice && (
        <Alert tone="info" title="Simulation unavailable." onClose={() => setOfflineNotice(false)}>
          This static deployment has no execution backend. Clone the repo and run
          the API server locally to simulate workflows — your editor content is kept.
        </Alert>
      )}

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
                <div className="flex items-center justify-between text-xs text-ot-muted">
                  <span>Available here: <span className="font-semibold text-ot-text">{budgetForChallenge} pts</span></span>
                  <span>Each hint holds {challenge.scoring.hints_used_penalty} pts until solved</span>
                </div>

                {hintGateMsg && (
                  <Alert tone="info" title="Hint locked" onClose={() => setHintGateMsg(null)}>
                    {hintGateMsg}
                  </Alert>
                )}

                {Array.from({ length: challenge.hintCount }, (_, i) => i + 1).map((num) => {
                  const unlocked = hintUnlocked(num);
                  return (
                  <div key={num}>
                    {hints[num] ? (
                      <Alert tone="warning">
                        <MarkdownRenderer>{hints[num]}</MarkdownRenderer>
                      </Alert>
                    ) : unlocked ? (
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
                    ) : (
                      <button
                        onClick={() => loadHint(num)}
                        className="w-full text-left p-3 rounded-ot-md border border-dashed border-ot-border opacity-60 cursor-not-allowed"
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-ot-surface border border-ot-border flex items-center justify-center text-sm font-bold text-ot-muted">
                            {num}
                          </span>
                          <span className="text-sm text-ot-muted">
                            Hint {num} locked
                          </span>
                          <span className="text-xs text-ot-muted ml-auto">
                            needs {challenge.scoring.hints_used_penalty * Math.max(hintsUsed, num)} pts
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                  );
                })}

                <div className="pt-2 border-t border-ot-border mt-4">
                  <button
                    onClick={loadSolution}
                    className="text-sm text-ot-muted hover:text-ot-text transition-colors flex items-center gap-2"
                  >
                    {showSolution ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                    {showSolution ? 'Hide' : 'Show'} Solution
                  </button>
                  {showSolution && (
                    <p className="text-xs text-ot-muted mt-1">
                      Viewing the solution marks this challenge as solved-with-solution (no clean-solve badge).
                    </p>
                  )}
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
                  <div className="text-xs opacity-80">
                    {result.score.passedChecks}/{result.score.totalChecks} fixed
                    {` (${Math.round(result.score.partialRatio * 100)}% of ${result.score.basePoints} pts)`}
                  </div>
                  {result.score.totalDeductions > 0 && (
                    <div className="text-xs opacity-80">
                      {result.score.hintsUsed} hint(s) used: -{result.score.totalDeductions} pts
                    </div>
                  )}
                  {result.score.timeBonusAwarded > 0 && (
                    <div className="text-xs opacity-80">
                      Fast solve bonus: +{result.score.timeBonusAwarded} pts
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                {result.validation.checks.map((c, i) => (
                  <div key={i} className="text-sm opacity-90">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">{c.passed ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}</span>
                      <span>{c.description}</span>
                    </div>
                    {!c.passed && (c.message || c.whyItMatters || c.reference) && (
                      <div className="ml-6 mt-1 space-y-1 text-[13px] opacity-80">
                        {c.message && (
                          <pre className="whitespace-pre-wrap font-mono">{c.message}</pre>
                        )}
                        {c.whyItMatters && <p>{c.whyItMatters}</p>}
                        {c.reference && (
                          <Link to={c.reference} className="inline-flex items-center gap-1 underline underline-offset-2">
                            Learn more <ArrowRight size={12} aria-hidden />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Alert>
          )}
        </div>
      </div>

      {/* Next up + Related */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ot-muted mb-2">Next up</h3>
          {nextSteps.length === 0 ? (
            <p className="text-sm text-ot-muted">No direct follow-ups. Pick from Related.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {nextSteps.map((n) => (
                <li key={n.id}>
                  <Link to={`/challenges/${n.id}`} className="inline-flex items-center gap-1 text-navy-text hover:underline">
                    {n.title} <ArrowRight size={12} aria-hidden />
                  </Link>
                  <span className="text-xs text-ot-muted ml-2">{n.level} · ~{n.estimatedTime}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ot-muted mb-2">Related</h3>
          {related.length === 0 ? (
            <p className="text-sm text-ot-muted">No related challenges.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {related.map((r) => (
                <li key={r.id}>
                  <Link to={`/challenges/${r.id}`} className="inline-flex items-center gap-1 text-navy-text hover:underline">
                    {r.title} <ArrowRight size={12} aria-hidden />
                  </Link>
                  <span className="text-xs text-ot-muted ml-2">{r.topic} · {r.level}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
