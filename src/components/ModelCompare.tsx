import React, { useState } from 'react';
import {
  Columns,
  Play,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  RotateCcw
} from 'lucide-react';
import { PromptDraft } from '../types';
import { AVAILABLE_MODELS } from '../data/models';

interface ModelCompareProps {
  prompt: PromptDraft;
}

interface CompareResult {
  model: string;
  actualModel: string;
  text: string;
  latencyMs: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  error?: string;
  success: boolean;
}

export const ModelCompare: React.FC<ModelCompareProps> = ({ prompt }) => {
  const [modelA, setModelA] = useState<string>('gemini-3.7-flash');
  const [modelB, setModelB] = useState<string>('gemini-3.1-pro-preview');
  const [isRunning, setIsRunning] = useState(false);
  const [resultA, setResultA] = useState<CompareResult | null>(null);
  const [resultB, setResultB] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunComparison = async () => {
    setIsRunning(true);
    setError(null);
    setResultA(null);
    setResultB(null);

    try {
      // Pick first test case variables if available
      const sampleVariables = prompt.testCases?.[0]?.variables || {};

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelA,
          modelB,
          systemInstruction: prompt.systemInstruction,
          userPrompt: prompt.userPrompt,
          variables: sampleVariables,
          variableDefinitions: prompt.variables || [],
          config: prompt.config,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Comparison run failed');
      }

      const data = await res.json();
      setResultA(data.resultA);
      setResultB(data.resultB);
    } catch (err: any) {
      setError(err?.message || 'Error executing comparison');
    } finally {
      setIsRunning(false);
    }
  };

  const modelAInfo = AVAILABLE_MODELS.find((m) => m.id === modelA) || AVAILABLE_MODELS[0];
  const modelBInfo = AVAILABLE_MODELS.find((m) => m.id === modelB) || AVAILABLE_MODELS[1];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-y-auto p-4 md:p-6 text-slate-200">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F2228]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Columns className="w-4 h-4 text-purple-400" />
              Side-by-Side Model Arena
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Benchmark latency, token efficiency, and output quality across two models simultaneously.
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={isRunning}
            id="btn-run-model-comparison"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 self-start md:self-auto"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Evaluating Models...
              </span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Benchmark
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Model Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model A Column */}
          <div className="flex flex-col bg-[#0D0F13] rounded-xl border border-[#1F2228] overflow-hidden shadow-sm">
            {/* Column Header */}
            <div className="p-4 bg-[#16181D] border-b border-[#1F2228] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest">
                  Candidate A
                </div>
                <select
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  className="bg-[#0A0A0B] text-xs font-semibold text-white border border-[#2A2D35] rounded px-2.5 py-1 outline-none"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.speed})
                    </option>
                  ))}
                </select>
              </div>

              {resultA && resultA.success && (
                <div className="text-right space-y-0.5 text-[11px] font-mono">
                  <div className="text-blue-300 font-semibold flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {resultA.latencyMs} ms
                  </div>
                  <div className="text-emerald-400 flex items-center justify-end gap-1">
                    <Zap className="w-3 h-3" />
                    {resultA.totalTokens} toks
                  </div>
                </div>
              )}
            </div>

            {/* Model A Specs */}
            <div className="px-4 py-2 bg-[#0D0F13] border-b border-[#1F2228] flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{modelAInfo.category}</span>
              <span>Speed: {modelAInfo.speed}</span>
              <span>In: ${modelAInfo.inputPricePerMillion}/1M</span>
            </div>

            {/* Model A Output Content */}
            <div className="p-4 flex-1 min-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-200">
              {isRunning && !resultA && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <span className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></span>
                  <p className="text-xs">Generating response with {modelAInfo.name}...</p>
                </div>
              )}

              {!isRunning && !resultA && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Cpu className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs">Click "Run Benchmark" to test {modelAInfo.name}</p>
                </div>
              )}

              {resultA && (
                <div>
                  {resultA.error ? (
                    <div className="text-rose-400 p-3 bg-rose-950/20 rounded border border-rose-900">
                      {resultA.error}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-xs text-[#E2E8F0] leading-relaxed">
                      {resultA.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Model B Column */}
          <div className="flex flex-col bg-[#0D0F13] rounded-xl border border-[#1F2228] overflow-hidden shadow-sm">
            {/* Column Header */}
            <div className="p-4 bg-[#16181D] border-b border-[#1F2228] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">
                  Candidate B
                </div>
                <select
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  className="bg-[#0A0A0B] text-xs font-semibold text-white border border-[#2A2D35] rounded px-2.5 py-1 outline-none"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.speed})
                    </option>
                  ))}
                </select>
              </div>

              {resultB && resultB.success && (
                <div className="text-right space-y-0.5 text-[11px] font-mono">
                  <div className="text-blue-300 font-semibold flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {resultB.latencyMs} ms
                  </div>
                  <div className="text-emerald-400 flex items-center justify-end gap-1">
                    <Zap className="w-3 h-3" />
                    {resultB.totalTokens} toks
                  </div>
                </div>
              )}
            </div>

            {/* Model B Specs */}
            <div className="px-4 py-2 bg-[#0D0F13] border-b border-[#1F2228] flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{modelBInfo.category}</span>
              <span>Speed: {modelBInfo.speed}</span>
              <span>In: ${modelBInfo.inputPricePerMillion}/1M</span>
            </div>

            {/* Model B Output Content */}
            <div className="p-4 flex-1 min-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-200">
              {isRunning && !resultB && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <span className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></span>
                  <p className="text-xs">Generating response with {modelBInfo.name}...</p>
                </div>
              )}

              {!isRunning && !resultB && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Cpu className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs">Click "Run Benchmark" to test {modelBInfo.name}</p>
                </div>
              )}

              {resultB && (
                <div>
                  {resultB.error ? (
                    <div className="text-rose-400 p-3 bg-rose-950/20 rounded border border-rose-900">
                      {resultB.error}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-xs text-[#E2E8F0] leading-relaxed">
                      {resultB.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delta Analysis Card */}
        {resultA && resultB && resultA.success && resultB.success && (
          <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">Benchmark Analysis:</span>
              <span className="text-slate-300">
                {resultA.latencyMs < resultB.latencyMs ? (
                  <span className="text-emerald-400 font-medium">
                    {modelAInfo.name} was {Math.round(resultB.latencyMs - resultA.latencyMs)}ms (
                    {Math.round(((resultB.latencyMs - resultA.latencyMs) / resultB.latencyMs) * 100)}%) faster.
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">
                    {modelBInfo.name} was {Math.round(resultA.latencyMs - resultB.latencyMs)}ms (
                    {Math.round(((resultA.latencyMs - resultB.latencyMs) / resultA.latencyMs) * 100)}%) faster.
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>Token Delta: {Math.abs(resultA.outputTokens - resultB.outputTokens)} tokens</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
