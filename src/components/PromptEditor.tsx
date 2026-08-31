import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Zap,
  Clock,
  AlertCircle,
  Play,
  History,
  GitCommit,
  Lock,
  ShieldCheck,
  Rocket,
  Code2,
  Bot,
  Plus,
  Trash2,
  DollarSign,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  PromptDraft,
  GenerationMetrics,
  PromptVariable,
  ModelInfo,
  UserRole,
  PromptVersion,
  TestCase,
} from '../types';
import {
  extractVariablesFromTemplate,
  substituteTemplate,
  tokenizePrompt,
} from '../utils/variableParser';

interface PromptEditorProps {
  prompt: PromptDraft;
  models: ModelInfo[];
  userRole: UserRole;
  onToggleRole: () => void;
  onUpdatePrompt: (partial: Partial<PromptDraft>) => void;
  output: string;
  metrics: GenerationMetrics | null;
  isRunning: boolean;
  error: string | null;
  onRun: (customVariables?: Record<string, string>, modelOverride?: string, promptOverride?: string) => void;
  onAddAsTestCase: (vars: Record<string, string>, output: string) => void;
  onAddAsFewShot: (input: string, output: string) => void;
  onOpenGetCode?: () => void;
  onOpenDetailsModal?: () => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  models,
  userRole,
  onToggleRole,
  onUpdatePrompt,
  output,
  metrics,
  isRunning,
  error,
  onRun,
  onOpenGetCode,
  onOpenDetailsModal,
}) => {
  const [copied, setCopied] = useState(false);

  // Versions history
  const versions: PromptVersion[] = useMemo(() => {
    if (prompt.versions && prompt.versions.length > 0) {
      return prompt.versions;
    }
    return [
      {
        versionNumber: 1,
        prompt: prompt.userPrompt || '',
        model: prompt.model || 'gemini-2.5-flash',
        variables: prompt.variables || [],
        createdAt: prompt.createdAt || Date.now(),
        author: prompt.collaborators?.[0] || 'rahul.forms@gmail.com',
        note: 'Initial prompt version',
      },
    ];
  }, [prompt.versions, prompt.userPrompt, prompt.model, prompt.variables, prompt.createdAt, prompt.collaborators]);

  // Selected prompt version to run samples against
  const currentActiveVersionNum = prompt.currentVersion || versions[versions.length - 1]?.versionNumber || 1;
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number>(currentActiveVersionNum);

  // Sync selected version when prompt changes
  useEffect(() => {
    const validVer = prompt.currentVersion || versions[versions.length - 1]?.versionNumber || 1;
    setSelectedVersionNumber(validVer);
  }, [prompt.id, prompt.currentVersion, versions]);

  const selectedVersion = useMemo(() => {
    return versions.find((v) => v.versionNumber === selectedVersionNumber) || versions[versions.length - 1] || versions[0];
  }, [versions, selectedVersionNumber]);

  // Prompt text and model for the selected version
  const activePromptText = selectedVersion?.prompt || prompt.userPrompt || '';
  const activeVersionModel = selectedVersion?.model || prompt.model;

  // Active sample run test cases
  const testCases: TestCase[] = useMemo(() => {
    if (prompt.testCases && prompt.testCases.length > 0) {
      return prompt.testCases;
    }
    return [
      {
        id: 'tc-1',
        name: 'Sample Run #1',
        variables: {},
        status: 'idle',
      },
    ];
  }, [prompt.testCases]);

  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const activeTestCase = testCases[activeSampleIndex] || testCases[0];
  const [sampleModelOverride, setSampleModelOverride] = useState<string>(activeVersionModel);

  useEffect(() => {
    setSampleModelOverride(activeVersionModel);
  }, [activeVersionModel, selectedVersionNumber]);

  // Synchronize detected variables from the active prompt version
  const detectedVariables: PromptVariable[] = useMemo(() => {
    return extractVariablesFromTemplate(activePromptText, selectedVersion?.variables || prompt.variables);
  }, [activePromptText, selectedVersion?.variables, prompt.variables]);

  // Tokenized prompt for clean inline visual rendering with colored tokens
  const promptTokens = useMemo(() => {
    return tokenizePrompt(activePromptText, detectedVariables);
  }, [activePromptText, detectedVariables]);

  const handleCopyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateSampleVar = (name: string, value: string) => {
    const currentVars = activeTestCase?.variables || {};
    const newVars = { ...currentVars, [name]: value };

    const updatedTCs = testCases.map((tc, idx) =>
      idx === activeSampleIndex ? { ...tc, variables: newVars } : tc
    );

    onUpdatePrompt({ testCases: updatedTCs });
  };

  const handleAddSampleRun = () => {
    const initialVars: Record<string, string> = {};
    detectedVariables.forEach((v) => {
      initialVars[v.name] = v.exampleValue || v.defaultValue || '';
    });

    const newTC: TestCase = {
      id: `tc-${Date.now()}`,
      name: `Sample Run #${testCases.length + 1}`,
      variables: initialVars,
      modelOverride: sampleModelOverride || activeVersionModel,
      status: 'idle',
    };

    const updated = [...testCases, newTC];
    onUpdatePrompt({ testCases: updated });
    setActiveSampleIndex(updated.length - 1);
  };

  const handleDeleteSampleRun = (index: number) => {
    if (testCases.length <= 1) return;
    const updated = testCases.filter((_, idx) => idx !== index);
    onUpdatePrompt({ testCases: updated });
    setActiveSampleIndex(Math.max(0, index - 1));
  };

  // Rollback or activate a specific version
  const handleRestoreVersion = (ver: PromptVersion) => {
    onUpdatePrompt({
      userPrompt: ver.prompt,
      model: ver.model,
      variables: ver.variables,
      currentVersion: ver.versionNumber,
      updatedAt: Date.now(),
    });
    setSelectedVersionNumber(ver.versionNumber);
  };

  // Check admin sample runs permission
  const canRun = prompt.sampleRunsEnabled || userRole === 'admin';

  // Execute sample run against selected prompt version
  const handleExecuteActiveSample = () => {
    if (!canRun) return;
    const varsToRun = activeTestCase?.variables || {};
    const promptToRun = activePromptText;
    const modelToRun = sampleModelOverride || activeVersionModel;
    onRun(varsToRun, modelToRun, promptToRun);
  };

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to trigger sample run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && canRun) {
          handleExecuteActiveSample();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, canRun, activeTestCase, activePromptText, sampleModelOverride, activeVersionModel]);

  // Substituted prompt preview
  const { rendered: resolvedPromptText, missingMandatory } = substituteTemplate(
    activePromptText,
    activeTestCase?.variables || {},
    detectedVariables
  );

  const mandatoryCount = detectedVariables.filter((v) => v.required).length;
  const optionalCount = detectedVariables.length - mandatoryCount;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0C] text-[#E2E8F0] overflow-hidden">
      {/* 1. TOP TOOLBAR: Prompt Version Selector + Model & Details Navigation */}
      <div className="h-14 border-b border-[#1F2228] bg-[#111317] px-4 md:px-6 flex items-center justify-between shrink-0 select-none">
        {/* Left Side: Select Version & Associated Model */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#181A20] border border-[#2B2E38] rounded-lg px-3 py-1.5 shadow-sm">
            <GitCommit className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Prompt Version:
            </span>
            <select
              value={selectedVersionNumber}
              onChange={(e) => setSelectedVersionNumber(Number(e.target.value))}
              id="select-prompt-version"
              className="bg-transparent text-xs font-mono text-indigo-300 font-bold outline-none cursor-pointer pr-1"
              title="Select prompt version for read-only view and sample runs"
            >
              {versions.map((ver) => (
                <option key={ver.versionNumber} value={ver.versionNumber} className="bg-[#14161C] text-white">
                  v{ver.versionNumber} {ver.versionNumber === currentActiveVersionNum ? '(Active)' : ''} — {ver.model} {ver.note ? `• ${ver.note}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Active Badge or Set Active Button */}
          {selectedVersionNumber === currentActiveVersionNum ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Active Version
            </span>
          ) : (
            <button
              onClick={() => handleRestoreVersion(selectedVersion)}
              className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
              title="Promote this historical version to active version"
            >
              Set v{selectedVersionNumber} as Active
            </button>
          )}

          {/* Associated Model Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#181A20] border border-[#2B2E38] rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px]">Model:</span>
            <span className="font-semibold text-slate-200">{activeVersionModel}</span>
          </div>

          {/* Open Details Modal for Full Version Management */}
          {onOpenDetailsModal && (
            <button
              onClick={onOpenDetailsModal}
              id="btn-edit-in-details"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1E26] hover:bg-[#252833] text-slate-300 hover:text-white rounded-lg border border-[#2B2E38] text-xs font-medium transition-colors cursor-pointer shadow-sm"
              title="Edit prompt template, draft new versions, and manage collaborators in Details Modal"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Maintain Details & Versions</span>
              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
          )}
        </div>

        {/* Right Side: Admin Approval + Deploy & Run Buttons */}
        <div className="flex items-center gap-3">
          {/* Admin Sample Runs Approval Toggle */}
          {userRole === 'admin' ? (
            <button
              onClick={() => onUpdatePrompt({ sampleRunsEnabled: !prompt.sampleRunsEnabled })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                prompt.sampleRunsEnabled
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Admin Toggle: Enable or disable sample runs for this use case"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{prompt.sampleRunsEnabled ? 'Runs: Enabled' : '⚡ Enable Sample Runs'}</span>
            </button>
          ) : (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                prompt.sampleRunsEnabled
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {prompt.sampleRunsEnabled ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Runs Active</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pending Admin Activation</span>
                </>
              )}
            </div>
          )}

          {/* Deploy & Usage Code */}
          {onOpenGetCode && (
            <button
              onClick={onOpenGetCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1E26] hover:bg-[#252833] text-slate-300 hover:text-white rounded-lg border border-[#2B2E38] text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Get API endpoints & SDK code snippets"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Deploy & API</span>
            </button>
          )}

          {/* Run Sample Button */}
          <button
            onClick={handleExecuteActiveSample}
            disabled={isRunning || !canRun}
            id="btn-run-sample-top"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer ${
              isRunning
                ? 'bg-indigo-700/50 text-indigo-200 cursor-not-allowed'
                : !canRun
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
            title={!canRun ? 'Sample runs must be approved by Admin' : 'Run sample test (Cmd+Enter)'}
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Sample</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin Approval Notice if disabled */}
      {!canRun && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Sample Runs Pending Admin Approval:</strong> An Administrator must enable sample runs for this use case before test executions can be started.
            </span>
          </div>
          <button
            onClick={onToggleRole}
            className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer shrink-0 ml-4"
          >
            Switch to Admin Role
          </button>
        </div>
      )}

      {/* 2. MAIN BODY: VERTICAL FLOW (Read-only Prompt & Variables on Top, Sample Runs Below) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        
        {/* ========================================================================= */}
        {/* UPPER CARD: READ-ONLY PROMPT TEMPLATE & VARIABLES (Version: vX)           */}
        {/* ========================================================================= */}
        <div className="bg-[#111317] rounded-xl border border-[#1F2228] overflow-hidden shadow-lg">
          {/* Card Header */}
          <div className="px-4 py-3 bg-[#16181F] border-b border-[#1F2228] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 rounded text-xs font-mono font-bold text-indigo-300">
                v{selectedVersionNumber}
              </span>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Prompt Template (Read-Only)
              </h2>
              {selectedVersion?.note && (
                <span className="text-xs text-slate-400 italic">
                  — "{selectedVersion.note}"
                </span>
              )}
            </div>

            {/* Read-Only Variables Pill Summary & Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1 text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  {mandatoryCount} Mandatory (#)
                </span>
                <span className="flex items-center gap-1 text-blue-300 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  {optionalCount} Optional
                </span>
              </div>

              {onOpenDetailsModal && (
                <button
                  onClick={onOpenDetailsModal}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs flex items-center gap-1 ml-2 cursor-pointer"
                  title="Open Details Modal to modify prompt template"
                >
                  <span>Edit in Details</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Read-Only Prompt Text Body with Colored Tokens */}
          <div className="p-4 bg-[#0D0F13] font-mono text-sm leading-relaxed text-[#CBD5E1] whitespace-pre-wrap max-h-56 overflow-y-auto border-b border-[#1F2228]">
            {promptTokens.length > 0 ? (
              promptTokens.map((token, idx) => {
                if (token.type === 'text') {
                  return <span key={idx}>{token.content}</span>;
                }
                const isMandatory = token.required;
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md text-xs font-bold font-mono border align-baseline ${
                      isMandatory
                        ? 'bg-red-950/70 text-red-300 border-red-500/60 shadow-sm'
                        : 'bg-blue-950/70 text-blue-300 border-blue-500/60 shadow-sm'
                    }`}
                    title={isMandatory ? 'Mandatory variable (Required)' : 'Optional variable'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isMandatory ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>{isMandatory ? `#${token.varName}` : token.varName}</span>
                    <span className="text-[10px] opacity-75">
                      ({isMandatory ? 'Mandatory' : 'Optional'})
                    </span>
                  </span>
                );
              })
            ) : (
              <span className="text-slate-500 italic">No prompt text defined for version v{selectedVersionNumber}.</span>
            )}
          </div>

          {/* Variables Schema Ribbon */}
          <div className="px-4 py-2.5 bg-[#121419] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Detected Variables:
              </span>
              {detectedVariables.length > 0 ? (
                detectedVariables.map((v) => (
                  <span
                    key={v.name}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                      v.required
                        ? 'bg-red-950/40 text-red-300 border-red-500/40'
                        : 'bg-blue-950/40 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${v.required ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span className="font-bold">{v.required ? `#${v.name}` : v.name}</span>
                    <span className="text-[9px] uppercase font-sans font-bold opacity-75">
                      {v.required ? 'Mandatory' : 'Optional'}
                    </span>
                    {v.defaultValue && (
                      <span className="text-slate-400 text-[10px] italic">={v.defaultValue}</span>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-[11px] italic">No variables required.</span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span>Red = Mandatory (#)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Blue = Optional</span>
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LOWER SECTION: SAMPLE RUNS (Variable Inputs + Output & Latency Metrics)    */}
        {/* ========================================================================= */}
        <div className="bg-[#111317] rounded-xl border border-[#1F2228] overflow-hidden shadow-lg space-y-0">
          {/* Sample Runs Header Strip: Tab list + Model switcher + Add/Delete controls */}
          <div className="px-4 py-3 bg-[#16181F] border-b border-[#1F2228] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-white uppercase tracking-wider mr-1">
                Sample Runs:
              </span>
              {testCases.map((tc, idx) => (
                <button
                  key={tc.id || idx}
                  onClick={() => setActiveSampleIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeSampleIndex === idx
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[#1C1E26] text-slate-300 hover:text-white hover:bg-[#252833] border border-[#2B2E38]'
                  }`}
                >
                  {tc.name || `Sample Run #${idx + 1}`}
                </button>
              ))}
              <button
                onClick={handleAddSampleRun}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1C1E26] hover:bg-[#252833] text-slate-300 hover:text-white rounded-lg border border-[#2B2E38] text-xs font-medium transition-colors cursor-pointer"
                title="Add new sample test case"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sample</span>
              </button>
            </div>

            {/* Model Selector for this Sample Run */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Run with Model:</span>
              <select
                value={sampleModelOverride || activeVersionModel}
                onChange={(e) => setSampleModelOverride(e.target.value)}
                className="bg-[#1C1E26] text-xs text-blue-300 font-semibold px-2.5 py-1 rounded-lg border border-[#2B2E38] outline-none cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#14161C] text-white">
                    {m.name}
                  </option>
                ))}
              </select>

              {testCases.length > 1 && (
                <button
                  onClick={() => handleDeleteSampleRun(activeSampleIndex)}
                  className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer text-xs ml-2"
                  title="Delete this sample run"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Run</span>
                </button>
              )}
            </div>
          </div>

          {/* Two-Column Grid: Left Variable Inputs | Right Output & Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1F2228] bg-[#0D0F13]">
            {/* LEFT COLUMN (5 Cols): Variable Inputs */}
            <div className="lg:col-span-5 p-4 md:p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Input Variables
                  </h3>
                  {missingMandatory.length > 0 && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Missing {missingMandatory.length} mandatory input{missingMandatory.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {detectedVariables.length > 0 ? (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {detectedVariables.map((v) => {
                      const isMandatory = v.required;
                      const val = activeTestCase?.variables?.[v.name] || '';
                      const isFilled = val.trim() !== '';

                      return (
                        <div key={v.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <label className={`font-mono flex items-center gap-1.5 ${
                              isMandatory ? 'text-red-400 font-bold' : 'text-blue-300 font-medium'
                            }`}>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isMandatory ? 'bg-red-400' : 'bg-blue-400'}`} />
                              <span>{isMandatory ? `#${v.name}` : v.name}</span>
                              <span className="text-[10px] text-slate-500 font-sans">
                                {isMandatory ? '(Mandatory)' : '(Optional)'}
                              </span>
                            </label>

                            {isMandatory && !isFilled && (
                              <span className="text-[10px] text-red-400 font-medium">
                                * Required
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleUpdateSampleVar(v.name, e.target.value)}
                            placeholder={
                              v.defaultValue
                                ? `Default: ${v.defaultValue}`
                                : isMandatory
                                ? '🔴 Enter mandatory value...'
                                : '🔵 Enter optional value...'
                            }
                            className={`w-full px-3 py-2 bg-[#14161C] border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                              isMandatory
                                ? isFilled
                                  ? 'border-red-500/40 focus:border-red-500'
                                  : 'border-red-500/60 focus:border-red-500 bg-red-950/10'
                                : 'border-[#2B2E38] focus:border-blue-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-[#14161C] rounded-lg border border-[#1F2228] text-xs text-slate-400 italic text-center">
                    No variables detected in prompt template. Click "Run Sample" to execute prompt as written.
                  </div>
                )}
              </div>

              {/* Run Sample Action Button (Large & Clear) */}
              <div className="pt-3 border-t border-[#1F2228]">
                <button
                  onClick={handleExecuteActiveSample}
                  disabled={isRunning || !canRun}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer ${
                    isRunning
                      ? 'bg-blue-800 text-blue-200 cursor-not-allowed'
                      : !canRun
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating with {sampleModelOverride || activeVersionModel}...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Sample (⌘ + Enter)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN (7 Cols): Model Output & Latency / Cost Metrics */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              {/* Output Header */}
              <div className="px-4 py-2.5 bg-[#14161C] border-b border-[#1F2228] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Model Output
                  </span>
                  {isRunning && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      streaming tokens...
                    </span>
                  )}
                </div>

                {output && (
                  <button
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white rounded bg-[#1C1E26] hover:bg-[#252833] border border-[#2B2E38] transition-colors cursor-pointer"
                    title="Copy output to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {/* Latency & Token Metrics Bar (if run executed) */}
              {metrics && (
                <div className="px-4 py-2 bg-[#16181F] border-b border-[#1F2228] grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-[#111317] p-1.5 rounded border border-[#1F2228]">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Latency</span>
                    </div>
                    <div className="text-xs font-bold text-white font-mono">{metrics.latencyMs}ms</div>
                  </div>

                  <div className="bg-[#111317] p-1.5 rounded border border-[#1F2228]">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-sky-400" />
                      <span>Prompt</span>
                    </div>
                    <div className="text-xs font-bold text-sky-300 font-mono">{metrics.promptTokens}t</div>
                  </div>

                  <div className="bg-[#111317] p-1.5 rounded border border-[#1F2228]">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Output</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-300 font-mono">{metrics.outputTokens}t</div>
                  </div>

                  <div className="bg-[#111317] p-1.5 rounded border border-[#1F2228]">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <DollarSign className="w-3 h-3 text-indigo-400" />
                      <span>Est. Cost</span>
                    </div>
                    <div className="text-xs font-bold text-indigo-300 font-mono">
                      ${(metrics.estimatedCostUsd || 0).toFixed(5)}
                    </div>
                  </div>
                </div>
              )}

              {/* Output Content Window */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-wrap min-h-[220px]">
                {error ? (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-lg text-rose-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Run Error</span>
                    </div>
                    <p>{error}</p>
                  </div>
                ) : output ? (
                  output
                ) : (
                  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                    <Bot className="w-8 h-8 opacity-30 text-blue-400" />
                    <p className="text-xs text-slate-400">
                      Click "Run Sample" to execute prompt v{selectedVersionNumber} on {sampleModelOverride || activeVersionModel}.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Evaluates response quality, streaming tokens, latency, and costs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
