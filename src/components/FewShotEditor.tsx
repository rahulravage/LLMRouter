import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Send,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { PromptDraft, FewShotExample } from '../types';

interface FewShotEditorProps {
  prompt: PromptDraft;
  onUpdatePrompt: (partial: Partial<PromptDraft>) => void;
  onRun: () => void;
  isRunning: boolean;
}

export const FewShotEditor: React.FC<FewShotEditorProps> = ({
  prompt,
  onUpdatePrompt,
  onRun,
  isRunning,
}) => {
  const [testInput, setTestInput] = useState('');
  const examples = prompt.fewShotExamples || [];

  const handleAddExample = () => {
    const newEx: FewShotExample = {
      id: `ex-${Date.now()}`,
      input: '',
      output: '',
    };
    onUpdatePrompt({
      fewShotExamples: [...examples, newEx],
    });
  };

  const handleUpdateExample = (id: string, field: 'input' | 'output', value: string) => {
    const updated = examples.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex));
    onUpdatePrompt({ fewShotExamples: updated });
  };

  const handleDeleteExample = (id: string) => {
    const updated = examples.filter((ex) => ex.id !== id);
    onUpdatePrompt({ fewShotExamples: updated });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-y-auto p-4 md:p-6 text-slate-200">
      {/* Header Banner */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F2228]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Structured Few-Shot Prompt Design
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Provide sample Input → Output pairs to teach the model formatting, tone, and deterministic behavior.
            </p>
          </div>

          <button
            onClick={handleAddExample}
            id="btn-add-few-shot-example"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Example Pair
          </button>
        </div>

        {/* Examples List */}
        {examples.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-[#2A2D35] text-center bg-[#0D0F13] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-900/20 flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No few-shot examples yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add example pairs to provide in-context learning. The model uses these examples to deduce patterns before answering the user prompt.
            </p>
            <button
              onClick={handleAddExample}
              className="px-3 py-1.5 text-xs font-medium bg-[#1F2228] hover:bg-[#2A2D35] text-indigo-300 rounded-md border border-[#2A2D35] transition-colors"
            >
              Add First Example
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {examples.map((ex, index) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-3 relative group transition-all hover:border-[#2A2D35]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-500/20">
                    Example #{index + 1}
                  </span>
                  <button
                    onClick={() => handleDeleteExample(ex.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Remove example"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <span>User Input (Example)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Translate to French: The sun is shining today."
                      value={ex.input}
                      onChange={(e) => handleUpdateExample(ex.id, 'input', e.target.value)}
                      className="w-full bg-[#16181D] text-[#E2E8F0] text-xs font-mono p-3 rounded-lg border border-[#2A2D35] focus:border-indigo-500 outline-none resize-y leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <span>Target Model Output (Example)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Le soleil brille aujourd'hui."
                      value={ex.output}
                      onChange={(e) => handleUpdateExample(ex.id, 'output', e.target.value)}
                      className="w-full bg-[#16181D] text-[#E2E8F0] text-xs font-mono p-3 rounded-lg border border-[#2A2D35] focus:border-emerald-500 outline-none resize-y leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Test of Few-shot prompt */}
        <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Active Prompt Formulation
            </h3>
            <span className="text-[11px] text-slate-400">
              {examples.length} examples included in context
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            When you run this prompt, the backend automatically interleaves these {examples.length} example pairs into the chat history turn before the user prompt.
          </p>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Run Few-Shot In Playground
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
