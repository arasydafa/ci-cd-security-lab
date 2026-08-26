import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';

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

const severityColors: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  low: 'text-blue-400 bg-blue-500/10',
  info: 'text-gray-400 bg-gray-500/10',
};

const statusIcons: Record<string, string> = {
  success: '✓',
  failure: '✗',
  skipped: '○',
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

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading challenge...</div>;
  if (!challenge) return <div className="text-gray-400 py-8 text-center">Challenge not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/challenges" className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">
            ← Back to Challenges
          </Link>
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              {challenge.level}
            </span>
            <span className="text-sm text-gray-400">{challenge.points} points</span>
            <span className="text-sm text-gray-500">~{challenge.estimatedTime}</span>
          </div>
        </div>
        <button
          onClick={runSimulation}
          disabled={simulating}
          className="bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          {simulating ? 'Simulating...' : 'Run Simulation'}
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
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab ? 'bg-dark-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 min-h-[300px] max-h-[500px] overflow-y-auto scrollbar-thin">
            {activeTab === 'scenario' && (
              <MarkdownRenderer>{challenge.scenario || challenge.description}</MarkdownRenderer>
            )}
            {activeTab === 'hints' && (
              <div className="space-y-4">
                {Array.from({ length: challenge.hintCount }, (_, i) => i + 1).map((num) => (
                  <div key={num}>
                    {hints[num] ? (
                      <div className="bg-dark-700 rounded-lg p-4">
                        <MarkdownRenderer>{hints[num]}</MarkdownRenderer>
                      </div>
                    ) : (
                      <button
                        onClick={() => loadHint(num)}
                        className="text-sm text-yellow-400 hover:text-yellow-300"
                      >
                        Reveal Hint {num} (-{challenge.points > 100 ? 50 : 25} pts)
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={loadSolution}
                  className="text-sm text-gray-500 hover:text-gray-300 mt-4"
                >
                  {showSolution ? 'Hide' : 'Show'} Solution
                </button>
                {showSolution && solution && (
                  <pre className="bg-dark-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap mt-2">
                    {solution}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Editor + Results */}
        <div className="space-y-4">
          {/* Editor */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
            <div className="bg-dark-700 px-4 py-2 border-b border-dark-600 flex items-center justify-between">
              <span className="text-sm font-medium">Workflow YAML</span>
              <span className="text-xs text-gray-500">Editable</span>
            </div>
            <textarea
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              className="w-full h-64 bg-dark-900 text-gray-300 p-4 font-mono text-xs resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>

          {/* Results */}
          {result && (
            <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
              <div className="flex gap-1 bg-dark-700 p-1 border-b border-dark-600">
                {(['logs', 'findings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
                      activeTab === tab ? 'bg-dark-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'findings' && result.result.findings.length > 0 && (
                      <span className="ml-1 text-orange-400">({result.result.findings.length})</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin p-4">
                {activeTab === 'logs' && (
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                    {result.result.logs.join('\n')}
                  </pre>
                )}
                {activeTab === 'findings' && (
                  <div className="space-y-2">
                    {result.result.findings.length === 0 ? (
                      <p className="text-sm text-green-400">No security findings!</p>
                    ) : (
                      result.result.findings.map((f, i) => (
                        <div key={i} className={`rounded-lg p-3 ${severityColors[f.severity] || severityColors.info}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase">{f.severity}</span>
                            <span className="text-xs opacity-75">{f.category}</span>
                          </div>
                          <p className="text-sm">{f.message}</p>
                          {f.remediation && (
                            <p className="text-xs mt-1 opacity-75">→ {f.remediation}</p>
                          )}
                        </div>
                      ))
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
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <div className="font-bold mb-2">
                {result.validation.passed ? '✓ Challenge Passed!' : '✗ Challenge Failed'}
              </div>
              <div className="space-y-1">
                {result.validation.checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span>{c.passed ? '✓' : '✗'}</span>
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
