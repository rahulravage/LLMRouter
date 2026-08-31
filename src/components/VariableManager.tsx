import React, { useState } from 'react';
import { Braces, Plus, Check, Trash2, HelpCircle, Asterisk, Sparkles, Sliders } from 'lucide-react';
import { PromptVariable } from '../types';

interface VariableManagerProps {
  variables: PromptVariable[];
  onUpdateVariable: (name: string, partial: Partial<PromptVariable>) => void;
  onAddVariable: (name: string, required: boolean, defaultValue?: string) => void;
  onRemoveVariableFromPrompt?: (name: string) => void;
  onInsertIntoPrompt: (tag: string) => void;
}

export const VariableManager: React.FC<VariableManagerProps> = ({
  variables,
  onUpdateVariable,
  onAddVariable,
  onInsertIntoPrompt,
}) => {
  const [varNameInput, setVarNameInput] = useState('');
  const [varRequiredInput, setVarRequiredInput] = useState(true);
  const [varDefaultInput, setVarDefaultInput] = useState('');

  const handleCreateAndInsert = () => {
    if (!varNameInput.trim()) return;
    const cleanName = varNameInput.trim().replace(/[^a-zA-Z0-9_]/g, '_');

    let tag = `{{${cleanName}}}`;
    if (!varRequiredInput && varDefaultInput.trim()) {
      tag = `{{${cleanName}=${varDefaultInput.trim()}}}`;
    } else if (!varRequiredInput) {
      tag = `{{${cleanName}?}}`;
    }

    onAddVariable(cleanName, varRequiredInput, varDefaultInput.trim() || undefined);
    onInsertIntoPrompt(tag);
    setVarNameInput('');
    setVarDefaultInput('');
    setVarRequiredInput(true);
  };

  return (
    <div className="bg-[#0D0F13] border border-[#1F2228] rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Braces className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Prompt Variables Schema ({variables.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Define mandatory and optional variables with defaults and descriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
            * Mandatory: {variables.filter((v) => v.required).length}
          </span>
          <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
            ? Optional: {variables.filter((v) => !v.required).length}
          </span>
        </div>
      </div>

      {/* Quick Add Variable Bar */}
      <div className="p-3 rounded-lg bg-[#16181D] border border-[#2A2D35] space-y-2.5">
        <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
          <span>Add New Variable to Template</span>
          <span className="text-[10px] text-slate-500">Syntax: {`{{name}}`} (Req), {`{{name?}}`} (Opt), {`{{name=val}}`}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="variable_name (e.g. topic)"
              value={varNameInput}
              onChange={(e) => setVarNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndInsert()}
              className="w-full bg-[#0D0F13] text-xs font-mono text-white px-2.5 py-1.5 rounded border border-[#2A2D35] focus:border-amber-500/60 outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="sm:col-span-3 flex items-center bg-[#0D0F13] rounded border border-[#2A2D35] p-1">
            <button
              type="button"
              onClick={() => setVarRequiredInput(true)}
              className={`flex-1 text-[10px] font-semibold py-1 rounded transition-colors ${
                varRequiredInput
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              * Mandatory
            </button>
            <button
              type="button"
              onClick={() => setVarRequiredInput(false)}
              className={`flex-1 text-[10px] font-semibold py-1 rounded transition-colors ${
                !varRequiredInput
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ? Optional
            </button>
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Fallback default (optional)"
              value={varDefaultInput}
              disabled={varRequiredInput}
              onChange={(e) => setVarDefaultInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndInsert()}
              className="w-full bg-[#0D0F13] text-xs font-mono text-white px-2.5 py-1.5 rounded border border-[#2A2D35] focus:border-teal-500/60 outline-none disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-slate-600"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleCreateAndInsert}
              disabled={!varNameInput.trim()}
              className="w-full h-full flex items-center justify-center gap-1 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded px-2 py-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Insert
            </button>
          </div>
        </div>
      </div>

      {/* Variables List / Table */}
      {variables.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-[#2A2D35] bg-[#0A0A0B]/40">
          <Braces className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
          <p className="text-xs text-slate-400">No variables detected in prompt yet.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Type <code className="text-amber-400">{`{{var_name}}`}</code> in the template or use the creator above.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {variables.map((v) => (
            <div
              key={v.name}
              className="p-3 rounded-lg bg-[#16181D] border border-[#1F2228] flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[#2A2D35] transition-colors"
            >
              {/* Variable Identification */}
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-amber-300 bg-[#0A0A0B] px-2.5 py-1 rounded border border-[#2A2D35]">
                  {`{{${v.name}}}`}
                </span>

                {/* Requirement Toggle Button */}
                <button
                  type="button"
                  onClick={() => onUpdateVariable(v.name, { required: !v.required })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border transition-all ${
                    v.required
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                      : 'bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25'
                  }`}
                  title="Click to toggle Mandatory / Optional status"
                >
                  {v.required ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Mandatory
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                      Optional
                    </>
                  )}
                </button>
              </div>

              {/* Default Value & Actions */}
              <div className="flex items-center gap-2">
                {!v.required ? (
                  <div className="flex items-center gap-1.5 bg-[#0D0F13] px-2 py-1 rounded border border-[#2A2D35]">
                    <span className="text-[10px] text-slate-400 font-mono">Default:</span>
                    <input
                      type="text"
                      placeholder="None (empty)"
                      value={v.defaultValue || ''}
                      onChange={(e) => onUpdateVariable(v.name, { defaultValue: e.target.value })}
                      className="bg-transparent text-[11px] font-mono text-teal-200 outline-none w-28 placeholder:text-slate-600"
                    />
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 italic">
                    Must be provided at run time
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onInsertIntoPrompt(`{{${v.name}}}`)}
                  className="px-2 py-1 text-[10px] font-medium bg-[#1F2228] hover:bg-[#2A2D35] text-slate-200 rounded border border-[#2A2D35] transition-colors"
                  title="Insert tag into prompt cursor"
                >
                  Insert Tag
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
