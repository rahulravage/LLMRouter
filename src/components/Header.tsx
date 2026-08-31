import React, { useState } from 'react';
import {
  Sparkles,
  Code2,
  Play,
  Square,
  FolderOpen,
  Plus,
  Save,
  Check,
  Globe,
  Sliders,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Bot,
  Sun,
  Moon,
} from 'lucide-react';
import { PromptDraft, ModelInfo, UserRole, ViewMode, ThemeMode } from '../types';

interface HeaderProps {
  currentPrompt: PromptDraft;
  onUpdatePrompt: (partial: Partial<PromptDraft>) => void;
  onSavePrompt: () => void;
  onOpenPromptList: () => void;
  onNewPrompt: () => void;
  onGetCode: () => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  activeTab: 'usecases' | 'playground' | 'gateway' | 'settings';
  setActiveTab: (tab: any) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  models: ModelInfo[];
  userRole: UserRole;
  onToggleRole: () => void;
  viewMode?: ViewMode;
  onToggleViewMode?: (mode: ViewMode) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPrompt,
  onUpdatePrompt,
  onSavePrompt,
  onOpenPromptList,
  onNewPrompt,
  onGetCode,
  onRun,
  onStop,
  isRunning,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  models,
  userRole,
  onToggleRole,
  viewMode = 'new',
  onToggleViewMode,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentPrompt.title);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const selectedModel = models.find((m) => m.id === currentPrompt.model) || models[0];

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      onUpdatePrompt({ title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveClick = () => {
    onSavePrompt();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const isPromptEditorTab = activeTab === 'playground';

  return (
    <header className="h-14 bg-[#0D0F13] border-b border-[#1F2228] flex items-center justify-between px-3 md:px-5 shrink-0 z-30 select-none relative">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Back / Navigation Breadcrumbs */}
        <button
          onClick={() => setActiveTab('usecases')}
          id="btn-header-back-usecases"
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-[#1F2228] rounded-md transition-colors shrink-0 cursor-pointer"
          title="Back to Use Cases Landing"
        >
          <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium hidden sm:inline">Use Cases</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

        {isPromptEditorTab ? (
          /* Editable Prompt Title */
          <div className="flex items-center gap-2 min-w-0 max-w-[180px] sm:max-w-[260px] md:max-w-md">
            {isEditingTitle ? (
              <input
                type="text"
                id="input-prompt-title-edit"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setTitleInput(currentPrompt.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="bg-[#16181D] text-white text-xs font-medium px-2.5 py-1 rounded border border-blue-500 outline-none w-full"
              />
            ) : (
              <button
                onClick={() => {
                  setTitleInput(currentPrompt.title);
                  setIsEditingTitle(true);
                }}
                id="btn-edit-prompt-title"
                className="text-left font-semibold text-xs text-slate-200 hover:text-blue-300 truncate transition-colors cursor-pointer"
                title="Click to rename prompt"
              >
                {currentPrompt.title}
              </button>
            )}

            {/* Stage badge */}
            <span
              className={`hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded font-medium shrink-0 ${
                currentPrompt.stage === 'Deployed'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : currentPrompt.stage === 'Tune'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              {currentPrompt.stage || 'Details'}
            </span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-200 truncate">
            {activeTab === 'usecases'
              ? 'All Use Cases'
              : activeTab === 'gateway'
              ? 'API Gateway & Live Telemetry'
              : 'Admin Console & Model Registry'}
          </span>
        )}
      </div>

      {/* Middle Top: Classic / New View Toggle (for Usecases tab) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        {activeTab === 'usecases' && onToggleViewMode && (
          <div className="flex items-center bg-[#16181D] p-1 rounded-lg border border-[#1F2228] shadow-sm">
            <button
              onClick={() => onToggleViewMode('classic')}
              id="toggle-view-classic"
              className={`px-3.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'classic'
                  ? 'bg-[#2A2D35] text-white shadow-sm font-semibold border border-[#3E424D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => onToggleViewMode('new')}
              id="toggle-view-new"
              className={`px-3.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'new'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-blue-200" />
              New View
            </button>
          </div>
        )}
      </div>

      {/* Right: Actions, Role Badge & Controls */}
      <div className="flex items-center gap-2.5">
        {isPromptEditorTab ? (
          <>
            {/* Quick Model Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                id="btn-model-selector-header"
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium bg-[#1F2228] hover:bg-[#2A2D35] text-slate-200 border border-[#2A2D35] rounded-md transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[110px] md:max-w-[140px] truncate">{selectedModel?.name || currentPrompt.model}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isModelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsModelDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-64 bg-[#0D0F13] border border-[#2A2D35] rounded-lg shadow-xl py-1 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-[#1F2228] flex items-center justify-between">
                      <span>Select Model / Proxy</span>
                      <span className="font-mono text-slate-500">{models.length} models</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onUpdatePrompt({ model: model.id });
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-start justify-between hover:bg-[#1F2228] transition-colors cursor-pointer ${
                            currentPrompt.model === model.id ? 'bg-blue-900/20 text-blue-400' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-medium flex items-center gap-1.5">
                              <span>{model.name}</span>
                              {model.isCustom && (
                                <span className="text-[9px] px-1 bg-purple-500/20 text-purple-400 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">{model.provider} • {model.speed}</div>
                          </div>
                          {currentPrompt.model === model.id && (
                            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Get Code / API Endpoint Button */}
            <button
              onClick={onGetCode}
              id="btn-get-code-header"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1F2228] hover:bg-[#2A2D35] text-slate-200 hover:text-white border border-[#2A2D35] rounded-md transition-colors cursor-pointer"
              title="Get API Endpoint & SDK Code"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Get Code</span>
            </button>

            {/* Save Prompt */}
            <button
              onClick={handleSaveClick}
              id="btn-save-prompt-header"
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1F2228] rounded-md border border-transparent hover:border-[#1F2228] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Save prompt"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline text-emerald-400">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">Save</span>
                </>
              )}
            </button>

            {/* Run / Stop Button */}
            {isRunning ? (
              <button
                onClick={onStop}
                id="btn-stop-execution"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors shadow-sm animate-pulse cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={onRun}
                id="btn-run-prompt"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors shadow-sm cursor-pointer"
                title="Execute Prompt (Ctrl+Enter)"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
                <kbd className="hidden lg:inline text-[10px] bg-blue-700/60 px-1 py-0.2 rounded font-mono">⌘↵</kbd>
              </button>
            )}

            {/* Toggle Parameters Sidebar */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              id="btn-toggle-parameters-sidebar"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSidebarOpen ? 'text-blue-400 bg-blue-900/20 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-[#1F2228]'
              }`}
              title="Model Parameters"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Theme Toggle in Header */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                id="btn-header-theme-toggle-editor"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#1F2228] transition-colors cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            )}
          </>
        ) : (
          /* Top Right on Landing / Overview: Theme Toggle, Role Badge, and Single Add New Usecase Button */
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                id="btn-header-theme-toggle"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-[#16181D] hover:bg-[#1F2228] border border-[#2A2D35] transition-colors cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>
            )}

            {/* User Role Indicator / Switcher */}
            <button
              onClick={onToggleRole}
              id="btn-header-role-badge"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                userRole === 'admin'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20'
              }`}
              title="Role (Click to switch between Admin and Normal User)"
            >
              {userRole === 'admin' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Role: Admin</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Role: Normal User</span>
                </>
              )}
            </button>

            {/* Single Add New Usecase Button */}
            <button
              onClick={onNewPrompt}
              id="btn-header-new-prompt-quick"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Usecase</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


