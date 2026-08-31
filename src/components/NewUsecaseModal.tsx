import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Cpu,
  Hash,
  HelpCircle,
  Plus,
  Trash2,
  Users,
  Check,
  Zap,
  Info,
  ShieldCheck,
  Bot,
  Sliders,
  Play,
  Copy,
} from 'lucide-react';
import { PromptDraft, ModelInfo, PromptVariable, UserRole, UsecaseStage, TestCase } from '../types';
import { extractVariablesFromTemplate, formatVariableTag } from '../utils/variableParser';

interface NewUsecaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newUsecase: PromptDraft) => void;
  models: ModelInfo[];
  userRole: UserRole;
  initialStage?: UsecaseStage;
  initialData?: PromptDraft | null;
}

const DEFAULT_PROMPT_TEMPLATE = `Analyze the following incoming customer request and provide a structured classification:

Customer ID: {{#customer_id}}
Customer Tier: {{tier=Standard}}
Subject: {{#subject}}
Message:
"{{#message_body}}"

Instructions:
1. Classify the intent (Billing, Technical Support, Feature Request, Inquiry).
2. Rate urgency from Low to Critical.
3. Suggest the optimal response action.`;

export const NewUsecaseModal: React.FC<NewUsecaseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  models,
  userRole,
  initialStage = 'Details',
  initialData = null,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return models[0]?.id || 'gemini-3.7-flash';
  });
  const [promptText, setPromptText] = useState(DEFAULT_PROMPT_TEMPLATE);
  
  // Custom variable overrides
  const [customVariables, setCustomVariables] = useState<PromptVariable[]>([]);
  
  // Collaborators
  const [collaborators, setCollaborators] = useState<string[]>(['rahul.forms@gmail.com']);
  const [collaboratorInput, setCollaboratorInput] = useState('');

  // Quick variable adder
  const [newVarName, setNewVarName] = useState('');
  const [newVarIsMandatory, setNewVarIsMandatory] = useState(true);
  const [newVarDefault, setNewVarDefault] = useState('');
  const [newVarExample, setNewVarExample] = useState('');

  // Reset or pre-fill state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const rawTitle = initialData.title || 'Untitled Use Case';
        const formattedTitle = rawTitle.endsWith('-copy') ? `${rawTitle}` : `${rawTitle}-copy`;
        setTitle(formattedTitle);
        setDescription(initialData.description || '');
        setSelectedModel(initialData.model || models[0]?.id || 'gemini-3.7-flash');
        const userPrompt = initialData.userPrompt || DEFAULT_PROMPT_TEMPLATE;
        setPromptText(userPrompt);

        const initialVars =
          initialData.variables && initialData.variables.length > 0
            ? initialData.variables
            : extractVariablesFromTemplate(userPrompt, []);
        setCustomVariables(initialVars);

        setCollaborators(
          initialData.collaborators && initialData.collaborators.length > 0
            ? initialData.collaborators
            : ['rahul.forms@gmail.com']
        );
      } else {
        setTitle('');
        setDescription('');
        setSelectedModel(models[0]?.id || 'gemini-3.7-flash');
        setPromptText(DEFAULT_PROMPT_TEMPLATE);
        setCustomVariables(extractVariablesFromTemplate(DEFAULT_PROMPT_TEMPLATE, []));
        setCollaborators(['rahul.forms@gmail.com']);
      }
      setCollaboratorInput('');
      setNewVarName('');
      setNewVarDefault('');
      setNewVarExample('');
      setNewVarIsMandatory(true);
    }
  }, [isOpen, initialData, models]);

  // Sync extracted variables whenever promptText changes during editing
  useEffect(() => {
    if (isOpen && !initialData) {
      const extracted = extractVariablesFromTemplate(promptText, customVariables);
      setCustomVariables(extracted);
    }
  }, [promptText, isOpen, initialData]);

  // Selected model details
  const currentModelInfo = useMemo(() => {
    return models.find((m) => m.id === selectedModel) || models[0];
  }, [models, selectedModel]);

  if (!isOpen) return null;

  const handleAddCollaborator = (emailToAdd?: string) => {
    const email = (emailToAdd || collaboratorInput).trim();
    if (!email) return;
    if (!collaborators.includes(email)) {
      setCollaborators([...collaborators, email]);
    }
    setCollaboratorInput('');
  };

  const handleRemoveCollaborator = (email: string) => {
    setCollaborators(collaborators.filter((c) => c !== email));
  };

  const handleAddVariableToPrompt = () => {
    if (!newVarName.trim()) return;
    const isPrefixedWithHash = newVarName.trim().startsWith('#');
    const isMandatory = isPrefixedWithHash || newVarIsMandatory;
    const cleanName = newVarName.trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9_]/g, '_');
    if (!cleanName) return;

    const tag = formatVariableTag(cleanName, isMandatory, newVarDefault);

    // Append to prompt text
    setPromptText((prev) => `${prev.trim()}\n${cleanName}: ${tag}`);

    // Add to definitions
    const newDef: PromptVariable = {
      name: cleanName,
      required: isMandatory,
      defaultValue: newVarDefault || undefined,
      exampleValue: newVarExample || undefined,
    };

    setCustomVariables((prev) => {
      const filtered = prev.filter((v) => v.name !== cleanName);
      return [...filtered, newDef];
    });

    setNewVarName('');
    setNewVarDefault('');
    setNewVarExample('');
    setNewVarIsMandatory(true);
  };

  const handleToggleVariableRequired = (varName: string) => {
    setCustomVariables((prev) =>
      prev.map((v) => (v.name === varName ? { ...v, required: !v.required } : v))
    );

    // Update in prompt text syntax
    const targetVar = customVariables.find((v) => v.name === varName);
    if (targetVar) {
      const willBeMandatory = !targetVar.required;
      const oldTagRegex = new RegExp(`\\{\\{\\s*#?${varName}(?:=([^}]+))?\\s*\\}\\}`, 'g');
      setPromptText((prev) =>
        prev.replace(oldTagRegex, (_match, defVal) => {
          return formatVariableTag(varName, willBeMandatory, defVal);
        })
      );
    }
  };

  const handleUpdateVariableField = (varName: string, field: keyof PromptVariable, val: string) => {
    setCustomVariables((prev) =>
      prev.map((v) => (v.name === varName ? { ...v, [field]: val } : v))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const usecaseId = `usecase-${Date.now()}`;
    const cleanPrompt = promptText.trim();
    const finalVariables = extractVariablesFromTemplate(cleanPrompt, customVariables);

    // Initial test case sample input
    let initialTestCases: TestCase[] = [];
    if (initialData?.testCases && initialData.testCases.length > 0) {
      initialTestCases = initialData.testCases.map((tc, idx) => ({
        ...tc,
        id: `tc-${Date.now()}-${idx}`,
        status: 'idle',
      }));
    } else {
      const sampleRunVars: Record<string, string> = {};
      finalVariables.forEach((v) => {
        sampleRunVars[v.name] = v.exampleValue || v.defaultValue || (v.required ? `Sample ${v.name}` : '');
      });
      initialTestCases = [
        {
          id: `sample-1`,
          name: 'Sample Run #1',
          variables: sampleRunVars,
          status: 'idle',
        },
      ];
    }

    const newUsecase: PromptDraft = {
      id: usecaseId,
      title: title.trim(),
      description: description.trim() || `AI Use Case using ${currentModelInfo?.name || selectedModel}`,
      stage: (initialData?.stage || initialStage || 'Details') as UsecaseStage,
      model: selectedModel,
      userPrompt: cleanPrompt,
      systemInstruction: initialData?.systemInstruction || '', // Single prompt area constraint - unified
      mode: 'freeform',
      variables: finalVariables,
      collaborators: collaborators.length > 0 ? collaborators : ['rahul.forms@gmail.com'],
      sampleRunsEnabled: initialData ? initialData.sampleRunsEnabled : (userRole === 'admin'), // Admin automatically enables, member requires admin approval
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          prompt: cleanPrompt,
          model: selectedModel,
          variables: finalVariables,
          createdAt: Date.now(),
          author: collaborators[0] || 'rahul.forms@gmail.com',
          note: initialData ? `Duplicated from "${initialData.title}"` : 'Initial usecase draft created',
        },
      ],
      fewShotExamples: initialData?.fewShotExamples || [],
      testCases: initialTestCases,
      config: initialData?.config || {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      endpointSlug: usecaseId,
      tags: initialData?.tags || ['New', initialStage || 'Details'],
    };

    onSubmit(newUsecase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#111114] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden text-[#E2E8F0]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] bg-[#16161A]">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-br ${initialData ? 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400' : 'from-indigo-500/20 to-sky-500/20 border-indigo-500/30 text-indigo-400'} border rounded-xl`}>
              {initialData ? <Copy className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {initialData ? 'Duplicate AI Use Case' : 'Add New AI Use Case'}
              </h2>
              <p className="text-xs text-[#94A3B8]">
                {initialData
                  ? 'Details pre-filled from existing usecase. Customize prompt template, variables, or model before creating.'
                  : 'Define use case name, single prompt template, # mandatory variables, LLM model, and collaborators.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Row 1: Usecase Name & LLM Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Usecase Name */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                Usecase Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Customer Support Intent Classifier"
                className="w-full px-3.5 py-2.5 bg-[#1A1A1E] border border-[#2E2E33] focus:border-indigo-500 rounded-xl text-sm text-white placeholder-[#64748B] focus:outline-none transition-colors"
              />
            </div>

            {/* Select LLM Model */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                Select LLM Model <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1A1A1E] border border-[#2E2E33] focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none appearance-none cursor-pointer pr-10"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider}) {m.isCustom ? '★ Custom' : ''}
                    </option>
                  ))}
                </select>
                <Cpu className="absolute right-3 top-3 w-4 h-4 text-[#64748B] pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#94A3B8]">
                <span className="px-1.5 py-0.5 bg-[#27272A] rounded text-[#E2E8F0] font-mono">
                  {currentModelInfo?.id}
                </span>
                <span>• {currentModelInfo?.speed}</span>
                <span>• {((currentModelInfo?.contextWindow || 0) / 1000).toFixed(0)}k context</span>
              </div>
            </div>
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
              Description / Business Objective
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Automatically triages inbound email tickets and determines customer priority."
              className="w-full px-3.5 py-2 bg-[#1A1A1E] border border-[#2E2E33] focus:border-indigo-500 rounded-xl text-sm text-white placeholder-[#64748B] focus:outline-none transition-colors"
            />
          </div>

          {/* Single Prompt Area (NO separate box for system instructions!) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                <span>Prompt Template</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] lowercase font-normal">
                  single unified prompt area
                </span>
              </label>
              <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                <span className="text-red-400 font-mono font-medium">🔴 Red (#) = Mandatory</span>
                <span>•</span>
                <span className="text-blue-400 font-mono">🔵 Blue = Optional</span>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={8}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Enter prompt instructions with variables. Use {{#var_name}} or #var_name for Mandatory variables and {{var_name}} for Optional variables..."
                className="w-full p-4 bg-[#141417] border border-[#2E2E33] focus:border-indigo-500 rounded-xl text-sm font-mono text-[#E2E8F0] placeholder-[#64748B] focus:outline-none leading-relaxed transition-colors resize-y"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#64748B]">
              Tip: Use <code className="text-red-400 bg-[#27272A] px-1 rounded">&#123;&#123;#variable_name&#125;&#125;</code> or <code className="text-red-400 bg-[#27272A] px-1 rounded">#variable_name</code> for <strong className="text-red-400">Mandatory (Red)</strong> variables and <code className="text-blue-400 bg-[#27272A] px-1 rounded">&#123;&#123;variable_name&#125;&#125;</code> for <strong className="text-blue-400">Optional (Blue)</strong> variables.
            </p>
          </div>

          {/* Variables Manager (Identified by #) */}
          <div className="bg-[#16161A] border border-[#27272A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Template Variables ({customVariables.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#94A3B8]">
                <span className="text-red-400 font-bold">{customVariables.filter((v) => v.required).length} Mandatory (Red #)</span>, <span className="text-blue-400 font-bold">{customVariables.filter((v) => !v.required).length} Optional (Blue)</span>
              </span>
            </div>

            {/* Quick Add Variable Bar with Live Toggle */}
            <div className="flex flex-wrap items-center gap-2 bg-[#1C1C22] p-2.5 rounded-lg border border-[#2E2E33]">
              <input
                type="text"
                value={newVarName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewVarName(val);
                  if (val.startsWith('#')) {
                    setNewVarIsMandatory(true);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariableToPrompt())}
                placeholder="Variable name e.g. #test or user_query"
                className="flex-1 min-w-[140px] px-2.5 py-1.5 bg-[#141417] border border-[#33333A] rounded text-xs text-white placeholder-[#64748B] focus:outline-none"
              />
              
              {/* Mandatory (Red) / Optional (Blue) Selector Toggle */}
              <div className="flex items-center bg-[#101014] p-0.5 rounded-lg border border-[#282830] text-xs">
                <button
                  type="button"
                  onClick={() => setNewVarIsMandatory(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                    newVarIsMandatory
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Mandatory (#)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewVarIsMandatory(false)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                    !newVarIsMandatory
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Optional</span>
                </button>
              </div>

              <input
                type="text"
                value={newVarExample}
                onChange={(e) => setNewVarExample(e.target.value)}
                placeholder="Sample Value"
                className="w-28 px-2.5 py-1.5 bg-[#141417] border border-[#33333A] rounded text-xs text-white placeholder-[#64748B] focus:outline-none"
              />

              <button
                type="button"
                onClick={handleAddVariableToPrompt}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  newVarIsMandatory
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Insert Tag
              </button>
            </div>

            {/* Detected Variables List */}
            {customVariables.length > 0 ? (
              <div className="space-y-2 mt-2">
                {customVariables.map((v) => (
                  <div
                    key={v.name}
                    className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-[#1A1A1E] border rounded-lg text-xs ${
                      v.required ? 'border-red-500/30' : 'border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-semibold">
                        {v.required ? `#${v.name}` : v.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleVariableRequired(v.name)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                          v.required
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                        title="Click to toggle Mandatory (Red #) vs Optional (Blue)"
                      >
                        {v.required ? '🔴 # Mandatory' : '🔵 Optional'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end max-w-sm">
                      <input
                        type="text"
                        value={v.exampleValue || ''}
                        onChange={(e) => handleUpdateVariableField(v.name, 'exampleValue', e.target.value)}
                        placeholder="Sample run value"
                        className="w-44 px-2 py-1 bg-[#141417] border border-[#2E2E33] rounded text-[11px] text-white placeholder-[#64748B]"
                      />
                      <span className="text-[10px] font-mono text-indigo-400 bg-[#27272A] px-1.5 py-0.5 rounded">
                        {formatVariableTag(v.name, v.required)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-[#64748B]">
                No variables detected in prompt. Add <code className="text-amber-400">&#123;&#123;#var&#125;&#125;</code> above to create variables.
              </div>
            )}
          </div>

          {/* Collaborators Section */}
          <div className="bg-[#16161A] border border-[#27272A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Add Collaborators ({collaborators.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#94A3B8]">
                Team members who can view, tune, and test this use case
              </span>
            </div>

            {/* Input to Add Collaborator */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={collaboratorInput}
                onChange={(e) => setCollaboratorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCollaborator())}
                placeholder="Enter collaborator email (e.g. teammate@company.com)"
                className="flex-1 px-3 py-2 bg-[#1A1A1E] border border-[#2E2E33] rounded-xl text-xs text-white placeholder-[#64748B] focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddCollaborator()}
                className="px-3.5 py-2 bg-[#27272A] hover:bg-[#33333A] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#94A3B8]">
              <span className="text-[11px]">Quick team:</span>
              {['rahul.forms@gmail.com', 'sarah.engineer@ai.corp', 'alex.ops@ai.corp', 'lead.reviewer@ai.corp'].map((suggest) => (
                <button
                  type="button"
                  key={suggest}
                  onClick={() => handleAddCollaborator(suggest)}
                  className="px-2 py-0.5 bg-[#1F1F24] hover:bg-[#2A2A32] text-[#CBD5E1] border border-[#33333A] rounded-full text-[11px] transition-colors"
                >
                  + {suggest}
                </button>
              ))}
            </div>

            {/* Current Collaborators Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {collaborators.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded-full text-xs"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-500/30 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {email[0]}
                  </div>
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCollaborator(email)}
                    className="hover:text-rose-400 transition-colors ml-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Sample Runs Enablement Notice */}
          <div className="flex items-start gap-3 p-3.5 bg-[#18181D] border border-[#2E2E33] rounded-xl text-xs text-[#94A3B8]">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#E2E8F0]">
                Admin Sample Runs Activation
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                {userRole === 'admin'
                  ? 'As an Administrator, sample runs will be automatically enabled upon submission.'
                  : 'As a Normal User, this use case will be created in Draft/Details stage. An Administrator can enable sample runs with 1 click.'}
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272A] bg-[#16161A]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-modal-submit-usecase"
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-5 py-2.5 ${
                initialData
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 shadow-indigo-500/20'
              } text-white font-medium rounded-xl text-xs shadow-lg transition-all cursor-pointer`}
            >
              {initialData ? <Copy className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {initialData ? 'Create Duplicated Use Case' : 'Submit & Open Use Case'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
