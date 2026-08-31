import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  Layers,
  Braces
} from 'lucide-react';
import { TestCase, PromptVariable, PromptDraft, GenerationMetrics } from '../types';
import { AVAILABLE_MODELS } from '../data/models';
import { substituteTemplate } from '../utils/variableParser';

interface SampleRunsPanelProps {
  prompt: PromptDraft;
  variables: PromptVariable[];
  onUpdatePrompt: (partial: Partial<PromptDraft>) => void;
  isRunning: boolean;
  activeModel: string;
  onChangeModel: (modelId: string) => void;
  onRunSample: (vars: Record<string, string>, modelId?: string) => Promise<void>;
  onAddAsFewShot: (input: string, output: string) => void;
}

export const SampleRunsPanel: React.FC<SampleRunsPanelProps> = ({
  prompt,
  variables,
  onUpdatePrompt,
  isRunning,
  activeModel,
  onChangeModel,
  onRunSample,
  onAddAsFewShot,
}) => {
  const testCases = prompt.testCases || [];
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const activeSample: TestCase | undefined = testCases[activeSampleIndex] || testCases[0];

  const handleAddSample = () => {
    const initialVars: Record<string, string> = {};
    variables.forEach((v) => {
      initialVars[v.name] = v.defaultValue || '';
    });

    const newSample: TestCase = {
      id: `tc-${Date.now()}`,
      name: `Sample Run #${testCases.length + 1}`,
      variables: initialVars,
      status: 'idle',
    };

    const updated = [...testCases, newSample];
    onUpdatePrompt({ testCases: updated });
    setActiveSampleIndex(updated.length - 1);
  };

  const handleUpdateActiveSampleVars = (name: string, value: string) => {
    if (!activeSample) return;
    const newVars = { ...(activeSample.variables || {}), [name]: value };
    const updated = testCases.map((tc, idx) =>
      idx === activeSampleIndex ? { ...tc, variables: newVars } : tc
    );
    onUpdatePrompt({ testCases: updated });
  };

  const handleDeleteSample = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (testCases.length <= 1) return; // Keep at least one
    const updated = testCases.filter((_, idx) => idx !== index);
    onUpdatePrompt({ testCases: updated });
    setActiveSampleIndex(Math.max(0, index - 1));
  };

  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Substituted preview for active sample
  const sampleValues = activeSample?.variables || {};
  const { rendered: substitutedPrompt, missingMandatory } = substituteTemplate(
    prompt.userPrompt,
    sampleValues,
    variables
  );

  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === (activeSample?.modelOverride || activeModel)) || AVAILABLE_MODELS[0];

  const handleExecute = () => {
    if (!activeSample) return;
    onRunSample(activeSample.variables, activeSample.modelOverride || activeModel);
  };

  return (
    <div className="bg-[#0D0F13] border border-[#1F2228] rounded-xl overflow-hidden flex flex-col space-y-0">
      {/* Top Sample Runs Selector Bar */}
      <div className="p-3 bg-[#16181D] border-b border-[#1F2228] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-blue-400" />
            Sample Runs:
          </span>

          {testCases.map((tc, idx) => {
            const isActive = idx === activeSampleIndex;
            return (
              <button
                key={tc.id}
                onClick={() => setActiveSampleIndex(idx)}
                className={`group flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-xs'
                    : 'bg-[#0D0F13] text-slate-400 hover:text-white border-[#2A2D35] hover:bg-[#1F2228]'
                }`}
              >
                <span>{tc.name}</span>
                {tc.lastRun && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
                {testCases.length > 1 && (
                  <span
                    onClick={(e) => handleDeleteSample(idx, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                    title="Delete sample"
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={handleAddSample}
            id="btn-add-sample-run"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#0D0F13] hover:bg-[#1F2228] text-slate-300 hover:text-white border border-dashed border-[#2A2D35] transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            New Sample
          </button>
        </div>

        {/* Model Switcher for Sample */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#0D0F13] hover:bg-[#1F2228] text-slate-200 border border-[#2A2D35] rounded-md transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span className="text-[11px]">{currentModelInfo.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isModelMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-60 bg-[#0D0F13] border border-[#2A2D35] rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-[#1F2228]">
                    Change LLM Model
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onChangeModel(m.id);
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#1F2228] ${
                          activeModel === m.id ? 'text-blue-400 bg-blue-900/20' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.category} • {m.speed}</div>
                        </div>
                        {activeModel === m.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleExecute}
            disabled={isRunning}
            id="btn-run-sample"
            className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md transition-colors shadow-xs"
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Running...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                Run Sample
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Sample Run Detail Area */}
      {activeSample ? (
        <div className="p-4 space-y-4">
          {/* Missing mandatory notice if any */}
          {missingMandatory.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Mandatory variable(s) empty: <strong>{missingMandatory.map((m) => `{{${m}}}`).join(', ')}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  missingMandatory.forEach((m) => {
                    handleUpdateActiveSampleVars(m, `Sample ${m}`);
                  });
                }}
                className="text-[11px] font-semibold text-rose-200 underline hover:text-white"
              >
                Auto-fill values
              </button>
            </div>
          )}

          {/* Variables Inputs Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Braces className="w-3.5 h-3.5 text-amber-400" />
                Variable Values for this Sample Run
              </span>
              <span className="text-[11px] text-slate-500">
                {variables.length} variable slots
              </span>
            </div>

            {variables.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#16181D] text-xs text-slate-400 text-center">
                No variables defined in prompt template. Add <code className="text-amber-400">{`{{variable_name}}`}</code> to your prompt.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {variables.map((v) => {
                  const currentValue = sampleValues[v.name] || '';
                  const isMissing = v.required && !currentValue.trim();

                  return (
                    <div
                      key={v.name}
                      className={`p-3 rounded-lg bg-[#16181D] border transition-colors ${
                        isMissing
                          ? 'border-rose-500/40 focus-within:border-rose-500'
                          : 'border-[#2A2D35] focus-within:border-blue-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                          <span>{`{{${v.name}}}`}</span>
                        </label>

                        {v.required ? (
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            * Mandatory
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            ? Optional {v.defaultValue ? `(Default: ${v.defaultValue})` : ''}
                          </span>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        placeholder={
                          v.required
                            ? `Required value for ${v.name}...`
                            : v.defaultValue
                            ? `Default: "${v.defaultValue}" (leave blank to use default)`
                            : `Optional value for ${v.name}...`
                        }
                        value={currentValue}
                        onChange={(e) => handleUpdateActiveSampleVars(v.name, e.target.value)}
                        className="w-full bg-[#0D0F13] text-xs font-mono text-slate-200 p-2 rounded border border-[#1F2228] focus:border-amber-500/40 outline-none resize-y placeholder:text-slate-600 leading-relaxed"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Substituted Prompt Live Preview */}
          <div className="space-y-1.5 pt-2 border-t border-[#1F2228]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Resolved Prompt Preview (Live Substitution)
            </span>
            <div className="p-3 bg-[#0A0A0B] rounded-lg border border-[#1F2228] text-xs font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {substitutedPrompt || <span className="text-slate-600 italic">Empty prompt template</span>}
            </div>
          </div>

          {/* Sample Run Output */}
          {activeSample.lastRun && (
            <div className="space-y-2 pt-2 border-t border-[#1F2228]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Execution Result
                </span>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-blue-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {activeSample.lastRun.latencyMs} ms
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    {activeSample.lastRun.outputTokens} tokens
                  </span>
                  {activeSample.lastRun.modelUsed && (
                    <span className="text-slate-400 text-[10px] bg-[#16181D] px-2 py-0.5 rounded border border-[#2A2D35]">
                      {activeSample.lastRun.modelUsed}
                    </span>
                  )}
                  <button
                    onClick={() => handleCopyOutput(activeSample.lastRun?.output || '')}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {activeSample.lastRun.output ? (
                <div className="p-3.5 rounded-lg bg-[#16181D] border border-[#2A2D35] text-xs font-mono text-slate-100 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {activeSample.lastRun.output}
                </div>
              ) : activeSample.lastRun.error ? (
                <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                  {activeSample.lastRun.error}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
