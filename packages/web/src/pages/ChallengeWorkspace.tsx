import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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
}

const severityStyles: Record<string, { badge: string; border: string; bg: string }> = {
  critical: { badge: 'bg-red-500/20 text-red-400 border border-red-500/30', border: 'border-l-red-400', bg: 'bg-red-500/5' },
  high: { badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', border: 'border-l-orange-400', bg: 'bg-orange-500/5' },
  medium: { badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', border: 'border-l-yellow-400', bg: 'bg-yellow-500/5' },
  low: { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', border: 'border-l-blue-400', bg: 'bg-blue-500/5' },
  info: { badge: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', border: 'border-l-gray-400', bg: 'bg-gray-500/5' },
};

const topicLabels: Record<string, string> = {
  'github-actions': 'GitHub Actions',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  terraform: 'Terraform',
  monitoring: 'Monitoring',
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

  useEffect(() => {
    if (!id) return;
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

  const loadHint = useCallback(async (num: number) => {
    if (!id) return;
    if (hints[num]) return;
    const res = await fetch(`/api/v1/challenges/${id}/hint/${num}`);
    const d = await res.json();
    if (d.data) setHints((h) => ({ ...h, [num]: d.data.hint }));
  }, [id, hints]);

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
      if (d.data) setResult(d.data);
      setActiveTab('logs');
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  }, [id, workflow]);

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
      <div className="space-y-6 animate-pulse">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="skeleton h-[400px] rounded-xl" />
          <div className="skeleton h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg mb-4">Challenge not found</p>
        <Link to="/challenges" className="text-green-400 hover:text-green-300 text-sm">
          ← Back to Challenges
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link to="/challenges" className="text-sm text-gray-500 hover:text-gray-300 mb-3 inline-flex items-center gap-1 transition-colors">
            <span>←</span> Back to Challenges
          </Link>
          <h1 className="text-2xl font-bold text-white">{challenge.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              challenge.level === 'beginner' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              challenge.level === 'intermediate' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {challenge.level}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-400 border border-dark-600">
              {topicLabels[challenge.topic] || challenge.topic}
            </span>
            <span className="text-sm text-gray-400">{challenge.points} pts</span>
            <span className="text-sm text-gray-500">~{challenge.estimatedTime}</span>
          </div>
        </div>
        <button
          onClick={runSimulation}
          disabled={simulating}
          className="bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/20 shrink-0"
        >
          {simulating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Simulating...
            </span>
          ) : 'Run Simulation'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Info Panel */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-dark-800 rounded-lg p-1 border border-dark-600">
            {(['scenario', 'hints'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-dark-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-green-400 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 min-h-[300px] max-h-[500px] overflow-y-auto scrollbar-thin">
            {activeTab === 'scenario' && (
              <MarkdownRenderer>{challenge.scenario || challenge.description}</MarkdownRenderer>
            )}
            {activeTab === 'hints' && (
              <div className="space-y-3">
                {Array.from({ length: challenge.hintCount }, (_, i) => i + 1).map((num) => (
                  <div key={num}>
                    {hints[num] ? (
                      <div className="hint-card hint-card-enter">
                        <MarkdownRenderer>{hints[num]}</MarkdownRenderer>
                      </div>
                    ) : (
                      <button
                        onClick={() => loadHint(num)}
                        className="w-full text-left p-3 rounded-lg border border-dashed border-dark-600 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all group"
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-sm font-bold text-gray-500 group-hover:text-yellow-400 group-hover:border-yellow-500/30 transition-colors">
                            {num}
                          </span>
                          <span className="text-sm text-gray-500 group-hover:text-yellow-400 transition-colors">
                            Reveal Hint {num}
                          </span>
                          <span className="text-xs text-gray-600 ml-auto">
                            -{challenge.points > 100 ? 50 : 25} pts
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                ))}

                <div className="pt-2 border-t border-dark-600 mt-4">
                  <button
                    onClick={loadSolution}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2"
                  >
                    <span>{showSolution ? '▾' : '▸'}</span>
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
          </div>
        </div>

        {/* Right: Editor + Results */}
        <div className="space-y-4">
          {/* Editor */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
            <div className="bg-dark-700 px-4 py-2 border-b border-dark-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-sm font-medium ml-2">workflow.yml</span>
              </div>
              <span className="text-xs text-gray-500">Editable</span>
            </div>
            <YamlEditor value={workflow} onChange={setWorkflow} />
          </div>

          {/* Results */}
          {result && (
            <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
              <div className="flex gap-1 bg-dark-700 p-1 border-b border-dark-600">
                {(['logs', 'findings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                      activeTab === tab
                        ? 'bg-dark-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-dark-600/50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'findings' && result.result.findings.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-orange-500/20 text-orange-400">
                        {result.result.findings.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
                {activeTab === 'logs' && (
                  <div className="p-4 font-mono text-xs space-y-0.5">
                    {logLines.map((line) => (
                      <div
                        key={line.key}
                        className={`leading-relaxed ${
                          line.isJob ? 'text-gray-300 font-bold py-1' :
                          line.isStep ? 'text-green-400' :
                          line.isFailed ? 'text-red-400 font-bold' :
                          line.isComplete ? 'text-green-400' :
                          line.isOutput ? 'text-gray-500 pl-4' :
                          'text-gray-500'
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
                      <div className="flex items-center gap-2 text-green-400 py-4">
                        <span className="text-lg">✓</span>
                        <span className="text-sm font-medium">No security findings</span>
                      </div>
                    ) : (
                      result.result.findings.map((f, i) => {
                        const styles = severityStyles[f.severity] || severityStyles.info;
                        return (
                          <div key={i} className={`rounded-lg p-3 border-l-2 ${styles.border} ${styles.bg}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${styles.badge}`}>
                                {f.severity}
                              </span>
                              <span className="text-xs text-gray-500">{f.category}</span>
                            </div>
                            <p className="text-sm text-gray-300">{f.message}</p>
                            {f.remediation && (
                              <p className="text-xs text-gray-500 mt-1.5 pl-0 border-l-0">
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
            </div>
          )}

          {/* Validation Summary */}
          {result && (
            <div className={`rounded-xl p-4 border ${
              result.validation.passed
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className={`flex items-center gap-2 font-bold mb-3 ${
                result.validation.passed ? 'text-green-400' : 'text-red-400'
              }`}>
                <span className="text-lg">{result.validation.passed ? '✓' : '✗'}</span>
                <span>{result.validation.passed ? 'Challenge Passed!' : 'Challenge Failed'}</span>
              </div>
              <div className="space-y-1.5">
                {result.validation.checks.map((c, i) => (
                  <div key={i} className={`flex items-start gap-2 text-sm ${
                    c.passed ? 'text-green-400/80' : 'text-red-400/80'
                  }`}>
                    <span className="mt-0.5">{c.passed ? '✓' : '✗'}</span>
                    <span>{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
