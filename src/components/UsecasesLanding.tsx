import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Search,
  Plus,
  ArrowUpDown,
  Sparkles,
  Layers,
  Activity,
  Globe,
  ChevronDown,
  Check,
  Copy,
  Trash2,
  Code2,
  Play,
  Bot,
  Hash,
  GitCommit,
  Edit3,
} from 'lucide-react';
import { PromptDraft, UsecaseStage, ViewMode, ModelInfo, UserRole } from '../types';
import { NewUsecaseModal } from './NewUsecaseModal';

interface UsecasesLandingProps {
  prompts: PromptDraft[];
  models: ModelInfo[];
  viewMode: ViewMode;
  userRole: UserRole;
  onToggleRole: () => void;
  onToggleViewMode: (mode: ViewMode) => void;
  onSelectPrompt: (promptId: string, tab?: 'playground' | 'fewshot' | 'compare' | 'testmatrix' | 'gateway') => void;
  onUpdatePromptStage: (promptId: string, stage: UsecaseStage) => void;
  onUpdatePromptModel: (promptId: string, modelId: string) => void;
  onToggleSampleRuns: (promptId: string, enabled: boolean) => void;
  onNewPrompt: (newUsecase: PromptDraft) => void;
  onDuplicatePrompt: (promptId: string) => void;
  onDeletePrompt: (promptId: string) => void;
  onOpenGetCode: (prompt: PromptDraft) => void;
  onOpenDetailsModal?: (prompt: PromptDraft) => void;
}

export const UsecasesLanding: React.FC<UsecasesLandingProps> = ({
  prompts,
  models,
  viewMode,
  userRole,
  onToggleRole,
  onToggleViewMode,
  onSelectPrompt,
  onUpdatePromptStage,
  onUpdatePromptModel,
  onToggleSampleRuns,
  onNewPrompt,
  onDuplicatePrompt,
  onDeletePrompt,
  onOpenGetCode,
  onOpenDetailsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | UsecaseStage>('ALL');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'versions' | 'stage' | 'model'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeStageDropdown, setActiveStageDropdown] = useState<string | null>(null);
  const [activeModelDropdown, setActiveModelDropdown] = useState<string | null>(null);

  // Filter & Sort
  const filteredPrompts = useMemo(() => {
    return prompts
      .filter((p) => {
        const matchesStage = stageFilter === 'ALL' || p.stage === stageFilter;
        const matchesSearch =
          searchQuery === '' ||
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
          p.collaborators?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStage && matchesSearch;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'updatedAt') {
          comp = (a.updatedAt || 0) - (b.updatedAt || 0);
        } else if (sortBy === 'title') {
          comp = a.title.localeCompare(b.title);
        } else if (sortBy === 'versions') {
          const countA = a.versions?.length || 1;
          const countB = b.versions?.length || 1;
          comp = countA - countB;
        } else if (sortBy === 'stage') {
          comp = (a.stage || 'Details').localeCompare(b.stage || 'Details');
        } else if (sortBy === 'model') {
          comp = a.model.localeCompare(b.model);
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [prompts, stageFilter, searchQuery, sortBy, sortOrder]);

  const STAGES: { id: UsecaseStage; label: string; desc: string; color: string; badgeBg: string; borderColor: string }[] = [
    {
      id: 'Details',
      label: 'Details',
      desc: 'Prompt drafting & # variable schema',
      color: 'text-sky-400',
      badgeBg: 'bg-sky-500/10 text-sky-400',
      borderColor: 'border-sky-500/30',
    },
    {
      id: 'Tune',
      label: 'Tune',
      desc: 'Few-shot & sample runs test matrices',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400',
      borderColor: 'border-amber-500/30',
    },
    {
      id: 'Deployed',
      label: 'Deployed',
      desc: 'Live LiteLLM proxy endpoint & usage',
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400',
      borderColor: 'border-emerald-500/30',
    },
  ];

  const getStageInfo = (stage?: UsecaseStage) => {
    return STAGES.find((s) => s.id === stage) || STAGES[0];
  };

  const getModelDisplayName = (modelId: string) => {
    const match = models.find((m) => m.id === modelId);
    return match ? match.name : modelId;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-hidden text-[#E2E8F0]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* SHIFTED TO TOP: 3 Lifecycle & Workflow Cards (Card 1, 2, 3) */}
        {viewMode === 'new' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center font-mono text-[10px] border border-sky-500/20 font-bold">
                  1
                </span>
                Details Stage
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add use case name, single prompt template, mandatory <code className="text-amber-300 font-mono">{'{{#var}}'}</code> and optional variables <code className="text-sky-300 font-mono">{'{{var}}'}</code>, select LLM model, and add collaborators.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center font-mono text-[10px] border border-amber-500/20 font-bold">
                  2
                </span>
                Admin Sample Runs & Tuning
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Admin enables sample runs. Normal users try sample runs across different registered models with prompt versioning (v1, v2, rollback) and token/latency analysis.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center font-mono text-[10px] border border-emerald-500/20 font-bold">
                  3
                </span>
                Deploy & Usage Examples
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deploy with 1 click to get a production LiteLLM proxy endpoint. Inspect usage examples in cURL, Python, Node.js with token telemetry and latency tracking.
              </p>
            </div>
          </div>
        )}

        {/* Filter Bar: Stage Tabs + Search + Sorters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0D0F13] p-3 rounded-xl border border-[#1F2228]">
          {/* Stage Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStageFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                stageFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#1F2228]'
              }`}
            >
              All ({prompts.length})
            </button>
            {STAGES.map((stg) => (
              <button
                key={stg.id}
                onClick={() => setStageFilter(stg.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  stageFilter === stg.id
                    ? `${stg.badgeBg} border ${stg.borderColor} font-semibold shadow-sm`
                    : 'text-slate-400 hover:text-white hover:bg-[#1F2228]'
                }`}
              >
                <span>{stg.label}</span>
                <span className="text-[10px] font-mono opacity-80">
                  ({prompts.filter((p) => p.stage === stg.id).length})
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-search-usecases"
                placeholder="Search use cases, tags, collaborators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16181D] text-xs text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-[#1F2228] focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#16181D] px-2 py-1 rounded-lg border border-[#1F2228]">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
              >
                <option value="updatedAt" className="bg-[#16181D] text-slate-200">
                  Last Updated
                </option>
                <option value="title" className="bg-[#16181D] text-slate-200">
                  Usecase Name
                </option>
                <option value="versions" className="bg-[#16181D] text-slate-200">
                  # of Versions
                </option>
                <option value="stage" className="bg-[#16181D] text-slate-200">
                  Stage
                </option>
                <option value="model" className="bg-[#16181D] text-slate-200">
                  Model Name
                </option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:text-white text-slate-400 rounded cursor-pointer"
                title="Toggle Sort Order"
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* PRIMARY USECASES SUMMARY TABLE */}
        <div className="bg-[#0D0F13] rounded-xl border border-[#1F2228] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F2228] bg-[#121418] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[220px]">Usecase Name</th>
                  <th className="py-3.5 px-4 min-w-[130px]"># of Versions</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Active Version & LLM Model</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Stage</th>
                  <th className="py-3.5 px-4 text-right min-w-[260px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2228] text-xs">
                {filteredPrompts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-sm font-medium text-slate-300">No use cases match your filter</p>
                      <p className="text-xs text-slate-500 mt-1">Try resetting the stage filter or creating a new use case.</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStageFilter('ALL');
                        }}
                        className="mt-3 px-3 py-1.5 bg-[#1F2228] hover:bg-[#2A2D35] text-slate-300 text-xs rounded-md border border-[#2A2D35] cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPrompts.map((p) => {
                    const stageInfo = getStageInfo(p.stage);
                    const isStageOpen = activeStageDropdown === p.id;
                    const totalVersions = Math.max(1, p.versions?.length || 1);
                    const currentVersionNum = p.currentVersion || (p.versions && p.versions.length > 0 ? p.versions[p.versions.length - 1].versionNumber : 1);

                    return (
                      <tr
                        key={p.id}
                        id={`row-usecase-${p.id}`}
                        className="hover:bg-[#16181D]/80 transition-colors group"
                      >
                        {/* COLUMN 1: Usecase Name (just the name nothing else) */}
                        <td className="py-3.5 px-4 align-middle">
                          <button
                            onClick={() => onSelectPrompt(p.id, 'playground')}
                            id={`link-usecase-${p.id}`}
                            className="font-semibold text-sm text-slate-200 hover:text-blue-400 text-left transition-colors truncate max-w-sm block cursor-pointer"
                            title="Open in Studio"
                          >
                            {p.title}
                          </button>
                        </td>

                        {/* COLUMN 2: # of Versions */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#16181D] border border-[#2A2D35] rounded-lg text-xs font-mono text-slate-300 font-medium">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{totalVersions} {totalVersions === 1 ? 'version' : 'versions'}</span>
                          </span>
                        </td>

                        {/* COLUMN 3: Active Version & Associated LLM Model */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="px-2 py-1 bg-indigo-500/15 border border-indigo-500/30 rounded-lg text-xs font-mono font-bold text-indigo-300 shrink-0"
                              title={`Active Version: v${currentVersionNum}`}
                            >
                              v{currentVersionNum}
                            </span>
                            <div className="relative flex-1 max-w-[190px]">
                              <select
                                value={p.model}
                                onChange={(e) => onUpdatePromptModel(p.id, e.target.value)}
                                id={`select-model-dropdown-${p.id}`}
                                className="px-2.5 py-1 rounded-lg bg-[#16181D] hover:bg-[#1F2228] border border-[#2A2D35] text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-none transition-colors w-full cursor-pointer truncate"
                                title={`Active model associated with v${currentVersionNum}`}
                              >
                                {models.map((m) => (
                                  <option key={m.id} value={m.id} className="bg-[#141418] text-white">
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 4: Stage (Interactive Dropdown: Details | Tune | Deployed) */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="relative">
                            <button
                              onClick={() => {
                                setActiveStageDropdown(isStageOpen ? null : p.id);
                                setActiveModelDropdown(null);
                              }}
                              id={`btn-stage-dropdown-${p.id}`}
                              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${stageInfo.badgeBg} ${stageInfo.borderColor} hover:brightness-110`}
                              title="Click to update usecase lifecycle stage"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                <span>{stageInfo.label}</span>
                              </div>
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>

                            {/* Stage Selector Popover */}
                            {isStageOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setActiveStageDropdown(null)}
                                />
                                <div className="absolute left-0 mt-1 w-52 bg-[#0D0F13] border border-[#2A2D35] rounded-xl shadow-2xl p-1.5 z-40">
                                  <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                    Change Stage
                                  </div>
                                  {STAGES.map((stg) => (
                                    <button
                                      key={stg.id}
                                      onClick={() => {
                                        onUpdatePromptStage(p.id, stg.id);
                                        setActiveStageDropdown(null);
                                      }}
                                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start justify-between hover:bg-[#1F2228] transition-colors cursor-pointer ${
                                        p.stage === stg.id ? 'bg-[#1F2228] text-white font-medium' : 'text-slate-300'
                                      }`}
                                    >
                                      <div>
                                        <div className={`text-xs font-semibold ${stg.color}`}>{stg.label}</div>
                                        <div className="text-[10px] text-slate-500">{stg.desc}</div>
                                      </div>
                                      {p.stage === stg.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        {/* COLUMN 5: Actions (Sample Run, Details, Usage, Duplicate, Delete) */}
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Jump to Sample Run */}
                            <button
                              onClick={() => onSelectPrompt(p.id, 'playground')}
                              id={`btn-sample-run-${p.id}`}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Select prompt version and run sample runs"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Sample Run</span>
                            </button>

                            {/* 2. Open Details & Prompt Versions Manager */}
                            {onOpenDetailsModal && (
                              <button
                                onClick={() => onOpenDetailsModal(p)}
                                id={`btn-details-modal-${p.id}`}
                                className="px-2.5 py-1.5 text-xs font-medium bg-[#16181D] hover:bg-[#1F2228] text-indigo-300 hover:text-white rounded-lg border border-[#2A2D35] hover:border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Edit Details, Select Model & Maintain Prompt Versions"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Details</span>
                              </button>
                            )}

                            {/* 3. See Usage Example */}
                            <button
                              onClick={() => onOpenGetCode(p)}
                              id={`btn-usage-example-${p.id}`}
                              className="px-2.5 py-1.5 text-xs font-medium bg-[#16181D] hover:bg-[#1F2228] text-slate-300 hover:text-white rounded-lg border border-[#2A2D35] transition-all flex items-center gap-1.5 cursor-pointer"
                              title="See Usage Example (cURL, Python, Node.js)"
                            >
                              <Code2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Usage</span>
                            </button>

                            {/* 4. Copy / Duplicate */}
                            <button
                              onClick={() => onDuplicatePrompt(p.id)}
                              id={`btn-duplicate-row-${p.id}`}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1F2228] rounded-lg transition-colors cursor-pointer"
                              title="Copy / Duplicate Use Case"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* 5. Delete */}
                            {prompts.length > 1 && (
                              <button
                                onClick={() => onDeletePrompt(p.id)}
                                id={`btn-delete-row-${p.id}`}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Delete Use Case"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
