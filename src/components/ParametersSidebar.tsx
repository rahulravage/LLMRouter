import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Info,
  Cpu,
  BrainCircuit,
  FileCode,
  Plus,
  X,
  Zap,
  HelpCircle
} from 'lucide-react';
import { PromptConfig, PromptDraft } from '../types';
import { AVAILABLE_MODELS } from '../data/models';

interface ParametersSidebarProps {
  prompt: PromptDraft;
  onUpdatePrompt: (partial: Partial<PromptDraft>) => void;
  onUpdateConfig: (configPartial: Partial<PromptConfig>) => void;
  isOpen: boolean;
}

export const ParametersSidebar: React.FC<ParametersSidebarProps> = ({
  prompt,
  onUpdatePrompt,
  onUpdateConfig,
  isOpen,
}) => {
  const [stopSeqInput, setStopSeqInput] = useState('');
  const [showJsonSchemaHelp, setShowJsonSchemaHelp] = useState(false);

  if (!isOpen) return null;

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === prompt.model) || AVAILABLE_MODELS[0];
  const config = prompt.config;

  const handleAddStopSequence = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (('key' in e && e.key === 'Enter') || e.type === 'click') {
      if (stopSeqInput.trim() && !config.stopSequences.includes(stopSeqInput.trim())) {
        onUpdateConfig({
          stopSequences: [...config.stopSequences, stopSeqInput.trim()],
        });
        setStopSeqInput('');
      }
    }
  };

  const handleRemoveStopSequence = (seq: string) => {
    onUpdateConfig({
      stopSequences: config.stopSequences.filter((s) => s !== seq),
    });
  };

  return (
    <aside className="w-80 md:w-84 bg-[#0D0F13] border-l border-[#1F2228] flex flex-col h-full overflow-y-auto shrink-0 select-none text-slate-200 text-xs">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#1F2228] flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm text-slate-100">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span>Run Settings</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-[#1F2228] text-slate-400 border border-[#2A2D35]">
          {currentModel.provider}
        </span>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Model Card & Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
            <span>Model Selection</span>
            <span className="text-[10px] text-blue-400 font-mono">LiteLLM Router</span>
          </label>
          <div className="space-y-1.5">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => onUpdatePrompt({ model: model.id })}
                className={`w-full p-2.5 rounded-lg text-left border transition-all ${
                  prompt.model === model.id
                    ? 'bg-blue-900/20 border-blue-500/50 text-white'
                    : 'bg-[#16181D] hover:bg-[#1F2228] border-[#2A2D35] text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${prompt.model === model.id ? 'bg-blue-400' : 'bg-slate-500'}`}></span>
                    {model.name}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0A0A0B] text-slate-400 border border-[#1F2228]">
                    {model.speed}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {model.description}
                </p>
                <div className="mt-2 pt-1.5 border-t border-[#1F2228] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>In: ${model.inputPricePerMillion}/1M</span>
                  <span>Out: ${model.outputPricePerMillion}/1M</span>
                  <span>{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Temperature */}
        <div className="space-y-2 pt-2 border-t border-[#1F2228]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <span>Temperature</span>
            </label>
            <span className="font-mono text-blue-400 font-semibold">{config.temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={config.temperature}
            onChange={(e) => onUpdateConfig({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-blue-600 bg-[#1F2228] rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0 (Precise / Code)</span>
            <span>1.0 (Balanced)</span>
            <span>2.0 (Creative)</span>
          </div>
        </div>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Top P</label>
            <span className="font-mono text-blue-400 font-semibold">{config.topP.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.topP}
            onChange={(e) => onUpdateConfig({ topP: parseFloat(e.target.value) })}
            className="w-full accent-blue-600 bg-[#1F2228] rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0 (Narrow)</span>
            <span>0.95 (Default)</span>
            <span>1.0 (All tokens)</span>
          </div>
        </div>

        {/* Thinking Level (Gemini 3 series feature) */}
        {currentModel.supportsThinking && (
          <div className="space-y-2 pt-2 border-t border-[#1F2228]">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                Thinking Level
              </span>
              <span className="text-[10px] text-purple-400 font-mono">Gemini 3</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0A0A0B] p-1 rounded-lg border border-[#1F2228]">
              {(['MINIMAL', 'LOW', 'HIGH'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onUpdateConfig({ thinkingLevel: lvl })}
                  className={`py-1.5 text-[11px] font-medium rounded transition-all ${
                    (config.thinkingLevel || 'HIGH') === lvl
                      ? 'bg-[#1F2228] text-white border border-[#2A2D35] shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              Controls reasoning tokens allocated before final response synthesis.
            </p>
          </div>
        )}

        {/* Max Output Tokens */}
        <div className="space-y-2 pt-2 border-t border-[#1F2228]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Max Output Tokens</label>
            <span className="font-mono text-blue-400 font-semibold">{config.maxOutputTokens}</span>
          </div>
          <input
            type="range"
            min="256"
            max="8192"
            step="256"
            value={config.maxOutputTokens}
            onChange={(e) => onUpdateConfig({ maxOutputTokens: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 bg-[#1F2228] rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>256</span>
            <span>2048</span>
            <span>8192</span>
          </div>
        </div>

        {/* Output Format (Text vs JSON) */}
        <div className="space-y-2 pt-2 border-t border-[#1F2228]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              Output Format
            </label>
            <button
              onClick={() => setShowJsonSchemaHelp(!showJsonSchemaHelp)}
              className="text-slate-400 hover:text-slate-200"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-[#0A0A0B] p-1 rounded-lg border border-[#1F2228]">
            <button
              onClick={() => onUpdateConfig({ responseMimeType: 'text/plain' })}
              className={`py-1.5 text-xs font-medium rounded transition-all ${
                config.responseMimeType !== 'application/json'
                  ? 'bg-[#1F2228] text-white border border-[#2A2D35] shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Plain Text
            </button>
            <button
              onClick={() => onUpdateConfig({ responseMimeType: 'application/json' })}
              className={`py-1.5 text-xs font-medium rounded transition-all ${
                config.responseMimeType === 'application/json'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JSON Mode
            </button>
          </div>

          {showJsonSchemaHelp && (
            <div className="p-2.5 rounded bg-[#16181D] border border-[#2A2D35] text-[11px] text-slate-400 leading-relaxed">
              When JSON Mode is enabled, the model guarantees syntax-valid JSON output. Make sure your system prompt defines the expected keys.
            </div>
          )}
        </div>

        {/* Stop Sequences */}
        <div className="space-y-2 pt-2 border-t border-[#1F2228]">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Stop Sequences</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="e.g. END, ###"
              value={stopSeqInput}
              onChange={(e) => setStopSeqInput(e.target.value)}
              onKeyDown={handleAddStopSequence}
              className="flex-1 bg-[#16181D] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddStopSequence}
              className="px-2.5 py-1.5 bg-[#1F2228] hover:bg-[#2A2D35] text-slate-200 rounded border border-[#2A2D35]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {config.stopSequences.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {config.stopSequences.map((seq) => (
                <span
                  key={seq}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16181D] text-slate-300 border border-[#2A2D35] text-[11px] font-mono"
                >
                  {seq}
                  <button
                    onClick={() => handleRemoveStopSequence(seq)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* LiteLLM Unified Endpoint Summary */}
        <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 space-y-1.5 text-[11px]">
          <div className="font-semibold text-blue-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>LiteLLM Proxy Ready</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Every change saved updates your live endpoint. Pass <code className="text-blue-300 font-mono text-[10px]">override_model</code> to dynamically test any mapped LLM.
          </p>
        </div>
      </div>
    </aside>
  );
};
