import React, { useState } from 'react';
import {
  Activity,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RotateCcw,
  Sparkles,
  Search,
  Eye,
  Braces,
  ChevronDown,
  Check
} from 'lucide-react';
import { PromptDraft, TestCase, PromptVariable } from '../types';
import { AVAILABLE_MODELS } from '../data/models';
import { extractVariablesFromTemplate, substituteTemplate } from '../utils/variableParser';

interface TestMatrixProps {
  prompt: PromptDraft;
  onUpdatePrompt: (partial: Partial<PromptDraft>) => void;
}

export const TestMatrix: React.FC<TestMatrixProps> = ({ prompt, onUpdatePrompt }) => {
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [newTestName, setNewTestName] = useState('');
  const [matrixModel, setMatrixModel] = useState(prompt.model || 'gemini-2.5-flash');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Extract variables with mandatory/optional metadata
  const detectedVariables: PromptVariable[] = React.useMemo(() => {
    const combined = (prompt.userPrompt || '') + ' ' + (prompt.systemInstruction || '');
    return extractVariablesFromTemplate(combined, prompt.variables);
  }, [prompt.userPrompt, prompt.systemInstruction, prompt.variables]);

  const testCases = prompt.testCases || [];

  const handleAddTestCase = () => {
    const name = newTestName.trim() || `Test Case #${testCases.length + 1}`;
    const initialVars: Record<string, string> = {};
    detectedVariables.forEach((v) => (initialVars[v.name] = v.defaultValue || ''));

    const newTC: TestCase = {
      id: `tc-${Date.now()}`,
      name,
      variables: initialVars,
      status: 'idle',
    };

    onUpdatePrompt({ testCases: [...testCases, newTC] });
    setNewTestName('');
    setSelectedTestCase(newTC);
  };

  const handleUpdateTestCase = (id: string, partial: Partial<TestCase>) => {
    const updated = testCases.map((tc) => (tc.id === id ? { ...tc, ...partial } : tc));
    onUpdatePrompt({ testCases: updated });
    if (selectedTestCase?.id === id) {
      setSelectedTestCase((prev) => (prev ? { ...prev, ...partial } : null));
    }
  };

  const handleDeleteTestCase = (id: string) => {
    const updated = testCases.filter((tc) => tc.id !== id);
    onUpdatePrompt({ testCases: updated });
    if (selectedTestCase?.id === id) {
      setSelectedTestCase(null);
    }
  };

  const handleRunAllTests = async () => {
    if (testCases.length === 0) return;
    setIsRunningBatch(true);

    // Mark all as running
    const runningList = testCases.map((tc) => ({ ...tc, status: 'running' as const }));
    onUpdatePrompt({ testCases: runningList });

    try {
      const res = await fetch('/api/batch-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          promptTitle: prompt.title,
          model: matrixModel,
          systemInstruction: prompt.systemInstruction,
          userPrompt: prompt.userPrompt,
          variableDefinitions: detectedVariables,
          testCases,
          config: prompt.config,
        }),
      });

      if (!res.ok) throw new Error('Batch test failed');
      const data = await res.json();

      // Merge results
      const merged = testCases.map((tc) => {
        const result = data.testCases?.find((r: any) => r.id === tc.id);
        if (result) {
          return {
            ...tc,
            status: result.status,
            lastRun: {
              ...result.lastRun,
              modelUsed: matrixModel,
            },
          };
        }
        return tc;
      });

      onUpdatePrompt({ testCases: merged });
      if (selectedTestCase) {
        const found = merged.find((m) => m.id === selectedTestCase.id);
        if (found) setSelectedTestCase(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningBatch(false);
    }
  };

  const completedCount = testCases.filter((tc) => tc.status === 'success').length;
  const avgLatency =
    testCases.filter((tc) => tc.lastRun?.latencyMs).length > 0
      ? Math.round(
          testCases.reduce((acc, tc) => acc + (tc.lastRun?.latencyMs || 0), 0) /
            testCases.filter((tc) => tc.lastRun?.latencyMs).length
        )
      : 0;

  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === matrixModel) || AVAILABLE_MODELS[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 md:px-6 md:py-3.5 border-b border-[#1F2228] bg-[#0D0F13] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Sample Runs & Test Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate prompt behavior across multiple mandatory & optional variable test combinations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Model Switcher for Test Matrix */}
          <div className="relative">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#16181D] hover:bg-[#1F2228] text-slate-200 border border-[#2A2D35] rounded-md transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Model: <strong>{currentModelInfo.name}</strong></span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isModelMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-64 bg-[#0D0F13] border border-[#2A2D35] rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-[#1F2228]">
                    Select Evaluation Model
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMatrixModel(m.id);
                          onUpdatePrompt({ model: m.id });
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1F2228] transition-colors ${
                          matrixModel === m.id ? 'bg-blue-900/20 text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.category} • {m.speed}</div>
                        </div>
                        {matrixModel === m.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Add Test Case */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Test case name..."
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTestCase()}
              className="bg-[#16181D] text-xs text-white border border-[#2A2D35] rounded px-2.5 py-1.5 outline-none w-40"
            />
            <button
              onClick={handleAddTestCase}
              id="btn-add-test-case"
              className="flex items-center gap-1 text-xs font-semibold bg-[#1F2228] hover:bg-[#2A2D35] text-white px-3 py-1.5 rounded border border-[#2A2D35] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Test
            </button>
          </div>

          <button
            onClick={handleRunAllTests}
            disabled={isRunningBatch || testCases.length === 0}
            id="btn-run-all-tests"
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            {isRunningBatch ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Evaluating Matrix...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run All ({testCases.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="px-6 py-2.5 bg-[#0A0A0B] border-b border-[#1F2228] flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-6">
          <span>Total Runs: <strong className="text-white">{testCases.length}</strong></span>
          <span>Completed: <strong className="text-emerald-400">{completedCount}</strong></span>
          {avgLatency > 0 && (
            <span>Avg Latency: <strong className="text-blue-300">{avgLatency} ms</strong></span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-rose-300">
            * {detectedVariables.filter((v) => v.required).length} Mandatory
          </span>
          <span className="text-teal-300">
            ? {detectedVariables.filter((v) => !v.required).length} Optional
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Test Cases Table / List */}
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[#1F2228] overflow-y-auto p-4 space-y-3 bg-[#0D0F13]">
          {testCases.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#2A2D35] text-center bg-[#0A0A0B]/50 space-y-3">
              <Activity className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-xs font-semibold text-slate-300">No sample runs created</h3>
              <p className="text-[11px] text-slate-500">
                Add test cases to evaluate your prompt variables with different values.
              </p>
            </div>
          ) : (
            testCases.map((tc, idx) => {
              const isSelected = selectedTestCase?.id === tc.id;
              return (
                <div
                  key={tc.id}
                  onClick={() => setSelectedTestCase(tc)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-[#16181D] hover:bg-[#1F2228] border-[#1F2228] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">#{idx + 1} {tc.name}</span>
                      {tc.status === 'success' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          {tc.lastRun?.latencyMs}ms
                        </span>
                      )}
                      {tc.status === 'failed' && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                      {tc.status === 'running' && (
                        <span className="text-[10px] text-amber-400 font-mono animate-pulse">Running...</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTestCase(tc.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete test case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Variable previews */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-[#0A0A0B] p-2 rounded-md border border-[#1F2228]">
                    {Object.entries(tc.variables || {}).slice(0, 2).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-amber-400">{k}:</span> {v || '<empty>'}
                      </div>
                    ))}
                    {Object.keys(tc.variables || {}).length > 2 && (
                      <div className="text-slate-500">+ {Object.keys(tc.variables).length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Test Case Detail & Output Inspector */}
        <div className="flex-1 bg-[#0A0A0B] overflow-y-auto p-4 md:p-6 space-y-4">
          {selectedTestCase ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2228]">
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedTestCase.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {selectedTestCase.id}</span>
                </div>

                {selectedTestCase.lastRun && (
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-blue-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedTestCase.lastRun.latencyMs} ms
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      {selectedTestCase.lastRun.outputTokens} tokens
                    </span>
                  </div>
                )}
              </div>

              {/* Variable Input Editors */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Variables for this run
                </label>
                {detectedVariables.length === 0 ? (
                  <p className="text-xs text-slate-500">No template variables defined in prompt.</p>
                ) : (
                  detectedVariables.map((v) => (
                    <div key={v.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-amber-300">{`{{${v.name}}}`}</span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            v.required
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                          }`}
                        >
                          {v.required ? '* Mandatory' : `? Optional ${v.defaultValue ? `(${v.defaultValue})` : ''}`}
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder={v.defaultValue ? `Default: "${v.defaultValue}"` : `Enter value for ${v.name}...`}
                        value={selectedTestCase.variables?.[v.name] || ''}
                        onChange={(e) => {
                          const newVars = { ...selectedTestCase.variables, [v.name]: e.target.value };
                          handleUpdateTestCase(selectedTestCase.id, { variables: newVars });
                        }}
                        className="w-full bg-[#16181D] text-xs font-mono text-slate-200 p-2 rounded-lg border border-[#2A2D35] focus:border-amber-500/50 outline-none"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Output Result */}
              <div className="space-y-2 pt-2 border-t border-[#1F2228]">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Execution Result
                </label>

                {selectedTestCase.lastRun?.output ? (
                  <div className="bg-[#16181D] text-xs font-mono p-3.5 rounded-lg border border-[#2A2D35] text-[#E2E8F0] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto select-text">
                    {selectedTestCase.lastRun.output}
                  </div>
                ) : selectedTestCase.lastRun?.error ? (
                  <div className="bg-rose-950/30 text-rose-300 text-xs p-3 rounded-lg border border-rose-900">
                    {selectedTestCase.lastRun.error}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-[#16181D] rounded-lg border border-[#2A2D35]">
                    No execution recorded yet. Run the test matrix to evaluate.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Eye className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs">Select a test case on the left to inspect variables and output</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
