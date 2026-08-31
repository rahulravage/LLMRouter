import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  GitCommit,
  Bot,
  Users,
  Hash,
  Check,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Save,
  ArrowRight,
  ShieldCheck,
  Play,
  Code2,
} from 'lucide-react';
import { PromptDraft, ModelInfo, PromptVariable, PromptVersion, UsecaseStage, UserRole } from '../types';
import { extractVariablesFromTemplate, formatVariableTag } from '../utils/variableParser';

interface UsecaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptDraft;
  models: ModelInfo[];
  userRole: UserRole;
  onSavePrompt?: (updated: PromptDraft) => void;
  onUpdatePrompt?: (partial: Partial<PromptDraft>) => void;
  onSelectPromptForSampleRuns?: (promptId: string) => void;
  onOpenDeploy?: (prompt: PromptDraft) => void;
}

export const UsecaseDetailsModal: React.FC<UsecaseDetailsModalProps> = ({
  isOpen,
  onClose,
  prompt,
  models,
  userRole,
  onSavePrompt,
  onUpdatePrompt,
  onSelectPromptForSampleRuns,
  onOpenDeploy,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'versions'>('details');

  // Form state
  const [title, setTitle] = useState(prompt.title);
  const [description, setDescription] = useState(prompt.description || '');
  const [selectedModel, setSelectedModel] = useState(prompt.model || models[0]?.id || 'gemini-3.7-flash');
  const [stage, setStage] = useState<UsecaseStage>(prompt.stage || 'Details');
  const [userPrompt, setUserPrompt] = useState(prompt.userPrompt || '');
  const [collaborators, setCollaborators] = useState<string[]>(prompt.collaborators || ['rahul.forms@gmail.com']);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [sampleRunsEnabled, setSampleRunsEnabled] = useState(!!prompt.sampleRunsEnabled);

  // Versions state
  const [versions, setVersions] = useState<PromptVersion[]>(() => {
    if (prompt.versions && prompt.versions.length > 0) {
      return prompt.versions;
    }
    return [
      {
        versionNumber: 1,
        prompt: prompt.userPrompt || '',
        model: prompt.model || 'gemini-3.7-flash',
        variables: prompt.variables || [],
        createdAt: prompt.createdAt || Date.now(),
        author: prompt.collaborators?.[0] || 'rahul.forms@gmail.com',
        note: 'Initial prompt template draft',
      },
    ];
  });
  const [currentVersion, setCurrentVersion] = useState<number>(prompt.currentVersion || 1);

  // New version creation state
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [newVersionNote, setNewVersionNote] = useState('');
  const [newVersionPrompt, setNewVersionPrompt] = useState('');
  const [newVersionModel, setNewVersionModel] = useState(prompt.model || models[0]?.id || 'gemini-3.7-flash');

  // Sync state when prompt changes
  useEffect(() => {
    if (isOpen) {
      setTitle(prompt.title);
      setDescription(prompt.description || '');
      setSelectedModel(prompt.model || models[0]?.id || 'gemini-3.7-flash');
      setStage(prompt.stage || 'Details');
      setUserPrompt(prompt.userPrompt || '');
      setCollaborators(prompt.collaborators || ['rahul.forms@gmail.com']);
      setSampleRunsEnabled(!!prompt.sampleRunsEnabled);
      const initialVers =
        prompt.versions && prompt.versions.length > 0
          ? prompt.versions
          : [
              {
                versionNumber: 1,
                prompt: prompt.userPrompt || '',
                model: prompt.model || 'gemini-3.7-flash',
                variables: prompt.variables || [],
                createdAt: prompt.createdAt || Date.now(),
                author: prompt.collaborators?.[0] || 'rahul.forms@gmail.com',
                note: 'Initial prompt template draft',
              },
            ];
      setVersions(initialVers);
      setCurrentVersion(prompt.currentVersion || initialVers[initialVers.length - 1]?.versionNumber || 1);
      setIsCreatingNewVersion(false);
    }
  }, [isOpen, prompt, models]);

  // Detected variables from current prompt text
  const detectedVariables: PromptVariable[] = useMemo(() => {
    return extractVariablesFromTemplate(userPrompt, prompt.variables);
  }, [userPrompt, prompt.variables]);

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

  // Save changes to use case
  const handleSaveDetails = () => {
    const updated: PromptDraft = {
      ...prompt,
      title: title.trim() || 'Untitled Use Case',
      description: description.trim(),
      model: selectedModel,
      stage,
      userPrompt,
      variables: detectedVariables,
      collaborators,
      sampleRunsEnabled,
      versions,
      currentVersion,
      updatedAt: Date.now(),
    };
    if (onSavePrompt) {
      onSavePrompt(updated);
    } else if (onUpdatePrompt) {
      onUpdatePrompt(updated);
    }
    onClose();
  };

  // Commit a new version (v2, v3...)
  const handleCommitNewVersion = () => {
    const promptTextToSave = newVersionPrompt.trim() || userPrompt;
    const modelToSave = newVersionModel || selectedModel;
    const nextVerNumber = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 1;
    const extractedVars = extractVariablesFromTemplate(promptTextToSave, []);

    const newVer: PromptVersion = {
      versionNumber: nextVerNumber,
      prompt: promptTextToSave,
      model: modelToSave,
      variables: extractedVars,
      createdAt: Date.now(),
      author: collaborators[0] || 'rahul.forms@gmail.com',
      note: newVersionNote.trim() || `Version ${nextVerNumber} update`,
    };

    const updatedVersions = [...versions, newVer];
    setVersions(updatedVersions);
    setCurrentVersion(nextVerNumber);
    setUserPrompt(promptTextToSave);
    setSelectedModel(modelToSave);

    setIsCreatingNewVersion(false);
    setNewVersionNote('');
    setNewVersionPrompt('');

    // Also persist immediately
    const updatedDraft: PromptDraft = {
      ...prompt,
      title: title.trim() || prompt.title,
      description: description.trim(),
      model: modelToSave,
      userPrompt: promptTextToSave,
      variables: extractedVars,
      versions: updatedVersions,
      currentVersion: nextVerNumber,
      updatedAt: Date.now(),
    };
    if (onSavePrompt) {
      onSavePrompt(updatedDraft);
    } else if (onUpdatePrompt) {
      onUpdatePrompt(updatedDraft);
    }
  };

  // Set active version
  const handleSetActiveVersion = (ver: PromptVersion) => {
    setCurrentVersion(ver.versionNumber);
    setUserPrompt(ver.prompt);
    setSelectedModel(ver.model);

    const updatedDraft: PromptDraft = {
      ...prompt,
      userPrompt: ver.prompt,
      model: ver.model,
      variables: ver.variables,
      currentVersion: ver.versionNumber,
      updatedAt: Date.now(),
    };
    if (onSavePrompt) {
      onSavePrompt(updatedDraft);
    } else if (onUpdatePrompt) {
      onUpdatePrompt(updatedDraft);
    }
  };

  // Delete older version
  const handleDeleteVersion = (versionNum: number) => {
    if (versions.length <= 1) return;
    const updated = versions.filter((v) => v.versionNumber !== versionNum);
    setVersions(updated);
    if (currentVersion === versionNum) {
      const fallback = updated[updated.length - 1];
      if (fallback) {
        setCurrentVersion(fallback.versionNumber);
        setUserPrompt(fallback.prompt);
        setSelectedModel(fallback.model);
      }
    }
  };

  const handleStartNewVersion = () => {
    setNewVersionPrompt(userPrompt);
    setNewVersionModel(selectedModel);
    setNewVersionNote('');
    setIsCreatingNewVersion(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111114] border border-[#27272A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] bg-[#16161A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  {title || 'Use Case Details & Version Management'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v{currentVersion} Active
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Configure usecase metadata, select LLM model, single prompt template, and maintain prompt versions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSelectPromptForSampleRuns && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectPromptForSampleRuns(prompt.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition-all cursor-pointer shadow-sm"
                title="Open sample runs tester"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Sample Runs</span>
              </button>
            )}
            {onOpenDeploy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeploy(prompt);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C22] hover:bg-[#2A2A35] text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-[#2E2E38] transition-all cursor-pointer shadow-sm"
                title="Get API endpoints & see usage code"
              >
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Deploy & API</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-[#202024] bg-[#141418]">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Details & Prompt Template</span>
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'versions'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
            <span>Prompt Versions ({versions.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' && (
            <>
              {/* Row 1: Name, Stage & LLM Model Dropdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Usecase Name */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                    Usecase Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Customer Support Classifier"
                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[#2E2E33] focus:border-blue-500 rounded-xl text-xs text-white placeholder-[#64748B] focus:outline-none"
                  />
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                    Lifecycle Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as UsecaseStage)}
                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[#2E2E33] focus:border-blue-500 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Details">Details (Drafting)</option>
                    <option value="Tune">Tune (Active Testing)</option>
                    <option value="Deployed">Deployed (Live Production)</option>
                  </select>
                </div>

                {/* LLM Model Selection: Clean Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                    LLM Model (Dropdown) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[#2E2E33] focus:border-blue-500 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                  Description / Business Objective
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Categorizes incoming customer inquiries and provides actionable tags"
                  className="w-full px-3 py-2 bg-[#1A1A1E] border border-[#2E2E33] focus:border-blue-500 rounded-xl text-xs text-white placeholder-[#64748B] focus:outline-none"
                />
              </div>

              {/* Prompt Template (Single Prompt Area) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                    <span>Prompt Template</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px]">
                      active v{currentVersion}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                    <span className="text-amber-400 font-mono font-medium"># = Mandatory</span>
                    <span>•</span>
                    <span className="text-sky-400 font-mono">No # = Optional</span>
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Enter prompt template with variables using {{#mandatory_var}} or {{optional_var}}..."
                  className="w-full p-3.5 bg-[#141417] border border-[#2E2E33] focus:border-blue-500 rounded-xl text-xs font-mono text-[#E2E8F0] placeholder-[#64748B] focus:outline-none leading-relaxed resize-y"
                />
              </div>

              {/* Detected Variables Bar */}
              <div className="bg-[#16161A] border border-[#27272A] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-white">
                      Template Variables ({detectedVariables.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">
                    <span className="text-red-400 font-bold">{detectedVariables.filter((v) => v.required).length} Mandatory (Red #)</span>, <span className="text-blue-400 font-bold">{detectedVariables.filter((v) => !v.required).length} Optional (Blue)</span>
                  </span>
                </div>
                {detectedVariables.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map((v) => (
                      <span
                        key={v.name}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
                          v.required
                            ? 'bg-red-950/40 text-red-300 border-red-500/40'
                            : 'bg-blue-950/40 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${v.required ? 'bg-red-400' : 'bg-blue-400'}`} />
                        <span className="font-bold">{v.required ? `#${v.name}` : v.name}</span>
                        <span className="text-[9px] uppercase opacity-70">
                          {v.required ? '(Mandatory)' : '(Optional)'}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B]">
                    No variables detected. Add <code className="text-red-400 font-mono">&#123;&#123;#variable_name&#125;&#125;</code> or <code className="text-red-400 font-mono">#variable_name</code> to create variables.
                  </p>
                )}
              </div>

              {/* Collaborators */}
              <div className="bg-[#16161A] border border-[#27272A] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-semibold text-white">Collaborators ({collaborators.length})</span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">Users with edit and tuning permissions</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={collaboratorInput}
                    onChange={(e) => setCollaboratorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCollaborator())}
                    placeholder="teammate@company.com"
                    className="flex-1 px-3 py-1.5 bg-[#1A1A1E] border border-[#2E2E33] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCollaborator()}
                    className="px-3 py-1.5 bg-[#27272A] hover:bg-[#33333A] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {collaborators.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded-full text-xs"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(email)}
                        className="hover:text-rose-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Versions Tab: Maintain Prompt Versions */}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Prompt Version Management</h3>
                  <p className="text-xs text-[#94A3B8]">
                    Track iterations, commit new prompt versions, and rollback or select versions for sample runs.
                  </p>
                </div>
                {!isCreatingNewVersion && (
                  <button
                    type="button"
                    onClick={handleStartNewVersion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Version</span>
                  </button>
                )}
              </div>

              {/* Create New Version Drawer / Form */}
              {isCreatingNewVersion && (
                <div className="bg-[#18181D] border border-indigo-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
                      <GitCommit className="w-4 h-4" />
                      Commit Version v{versions.length + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewVersion(false)}
                      className="text-xs text-[#94A3B8] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#CBD5E1] mb-1 font-medium">
                        Version Note / Change Summary <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newVersionNote}
                        onChange={(e) => setNewVersionNote(e.target.value)}
                        placeholder="e.g. Added customer sentiment and JSON schema constraints"
                        className="w-full px-3 py-1.5 bg-[#141417] border border-[#2E2E33] focus:border-indigo-500 rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#CBD5E1] mb-1 font-medium">
                        Model for this Version
                      </label>
                      <select
                        value={newVersionModel}
                        onChange={(e) => setNewVersionModel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#141417] border border-[#2E2E33] focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                      >
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.provider})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#CBD5E1] mb-1 font-medium">
                      Prompt Template for v{versions.length + 1}
                    </label>
                    <textarea
                      rows={5}
                      value={newVersionPrompt}
                      onChange={(e) => setNewVersionPrompt(e.target.value)}
                      placeholder="Prompt text for this version..."
                      className="w-full p-2.5 bg-[#141417] border border-[#2E2E33] focus:border-indigo-500 rounded-lg text-xs font-mono text-white placeholder-[#64748B] focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewVersion(false)}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#33333A] text-slate-300 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitNewVersion}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs shadow-md transition-colors"
                    >
                      Save Version v{versions.length + 1}
                    </button>
                  </div>
                </div>
              )}

              {/* Version History Cards */}
              <div className="space-y-3">
                {versions.map((ver) => {
                  const isActive = ver.versionNumber === currentVersion;
                  return (
                    <div
                      key={ver.versionNumber}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                          : 'bg-[#16161A] border-[#27272A] hover:border-[#383840]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#202028] border border-[#2E2E38] rounded-lg text-xs font-mono font-bold text-white">
                            <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                            v{ver.versionNumber}
                          </span>

                          {isActive ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              Active Prompt
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetActiveVersion(ver)}
                              className="px-2 py-0.5 bg-[#27272A] hover:bg-indigo-600 text-slate-300 hover:text-white rounded-md text-[10px] transition-colors cursor-pointer"
                            >
                              Set as Active
                            </button>
                          )}

                          <span className="text-xs text-[#94A3B8] font-medium">
                            {ver.note || `Version ${ver.versionNumber}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
                          <span className="flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-blue-400" />
                            {ver.model}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </span>

                          {versions.length > 1 && !isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVersion(ver.versionNumber)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Delete version"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Prompt preview snippet */}
                      <pre className="p-3 bg-[#111114] border border-[#202024] rounded-lg text-[11px] font-mono text-[#CBD5E1] whitespace-pre-wrap line-clamp-3 leading-relaxed">
                        {ver.prompt}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272A] bg-[#16161A]">
          <span className="text-xs text-[#94A3B8]">
            {activeTab === 'details' ? 'All changes update usecase template and parameters' : 'Versions are synced across sample runs'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#27272A] hover:bg-[#33333A] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDetails}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
