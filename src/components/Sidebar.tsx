import React from 'react';
import {
  FolderKanban,
  Play,
  Globe,
  Settings,
  Shield,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Cpu,
  Sun,
  Moon,
} from 'lucide-react';
import { UserRole, ThemeMode } from '../types';

export type MainNavTab = 'usecases' | 'playground' | 'gateway' | 'settings';

interface SidebarProps {
  currentTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewPrompt: () => void;
  userRole: UserRole;
  onToggleRole: () => void;
  usecasesCount: number;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onNewPrompt,
  userRole,
  onToggleRole,
  usecasesCount,
  theme = 'dark',
  onToggleTheme,
}) => {
  const navItems = [
    {
      id: 'usecases' as MainNavTab,
      label: 'Use Cases & Prompts',
      icon: FolderKanban,
      badge: usecasesCount > 0 ? String(usecasesCount) : undefined,
      description: 'Landing page overview & stage tracking',
      color: 'text-blue-400',
    },
    {
      id: 'playground' as MainNavTab,
      label: 'Sample Runs',
      icon: Play,
      description: 'Prompt variables, drafting & sample runs',
      color: 'text-cyan-400',
    },
    {
      id: 'gateway' as MainNavTab,
      label: 'API Gateway & Logs',
      icon: Globe,
      description: 'Unified LLM proxy endpoints & telemetry',
      color: 'text-emerald-400',
    },
  ];

  return (
    <aside
      className={`bg-[#0D0F13] border-r border-[#1F2228] flex flex-col justify-between transition-all duration-200 select-none z-20 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & New Button */}
      <div className="flex flex-col">
        {/* Brand & Toggle bar */}
        <div className="h-14 border-b border-[#1F2228] flex items-center justify-between px-3.5">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-blue-500/20">
                N
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                  NASH
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-blue-900/40 text-blue-400 rounded border border-blue-500/20 font-bold">
                    STUDIO
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 truncate">AI Studio & LLM Gateway</span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white mx-auto shadow-md shadow-blue-500/20">
              N
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            id="btn-sidebar-collapse-toggle"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#1F2228] rounded-md transition-colors ml-auto cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick New Prompt Action */}
        <div className="p-3">
          <button
            onClick={onNewPrompt}
            id="btn-sidebar-new-usecase"
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer ${
              isCollapsed ? 'px-0 justify-center' : ''
            }`}
            title="Create New Use Case / Prompt"
          >
            <Plus className="w-4 h-4" />
            {!isCollapsed && <span>New Use Case</span>}
          </button>
        </div>

        {/* Navigation List */}
        <div className="px-2 space-y-1">
          <div className={`px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
            {!isCollapsed ? 'Workspace' : '•••'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#1F2228] text-white shadow-sm border border-[#2A2D35]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#16181D]'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`${isActive ? item.color : 'text-slate-400 group-hover:text-slate-300'}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 text-left flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#2A2D35] text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1F2228] text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-[#2A2D35]">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Admin & Settings & Role Switcher & Theme */}
      <div className="p-2 border-t border-[#1F2228] space-y-2">
        {/* Theme Toggle Button in Sidebar */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            id="btn-sidebar-theme-toggle"
            className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#16181D] transition-colors cursor-pointer group relative"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            {!isCollapsed && (
              <div className="flex-1 text-left flex items-center justify-between min-w-0">
                <span className="truncate">Theme</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1F2228] text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-[#2A2D35]">
                Theme: {theme === 'dark' ? 'Dark' : 'Light'}
              </div>
            )}
          </button>
        )}

        {/* Settings / Model Registry item */}
        <button
          id="sidebar-nav-settings"
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative cursor-pointer ${
            currentTab === 'settings'
              ? 'bg-[#1F2228] text-white border border-[#2A2D35]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#16181D]'
          }`}
          title={isCollapsed ? 'Settings & Model Registry' : undefined}
        >
          <div className={`${currentTab === 'settings' ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
            <Settings className="w-4 h-4 shrink-0" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 text-left flex items-center justify-between min-w-0">
              <span className="truncate">Settings & Registry</span>
              {userRole === 'admin' ? (
                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Admin
                </span>
              ) : (
                <Lock className="w-3 h-3 text-slate-500" />
              )}
            </div>
          )}

          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1F2228] text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-[#2A2D35]">
              Settings & Model Registry {userRole !== 'admin' && '(Admin Only)'}
            </div>
          )}
        </button>

        {/* Role Toggle Strip */}
        {!isCollapsed ? (
          <div className="p-2 bg-[#16181D] rounded-lg border border-[#1F2228] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  userRole === 'admin' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-400'
                }`}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-slate-200 truncate">
                  Role: <span className="capitalize">{userRole}</span>
                </span>
                <span className="text-[9px] text-slate-400 truncate">
                  {userRole === 'admin' ? 'Full Registry Access' : 'Read-only Settings'}
                </span>
              </div>
            </div>

            <button
              onClick={onToggleRole}
              id="btn-toggle-user-role"
              className="text-[10px] px-2 py-1 bg-[#1F2228] hover:bg-[#2A2D35] text-slate-300 hover:text-white rounded border border-[#2A2D35] transition-colors cursor-pointer"
              title="Switch role between Admin and Member"
            >
              Switch
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleRole}
            id="btn-toggle-user-role-collapsed"
            className="w-full flex justify-center py-2 text-slate-400 hover:text-white hover:bg-[#16181D] rounded-lg transition-colors group relative cursor-pointer"
            title={`Role: ${userRole} (Click to switch)`}
          >
            {userRole === 'admin' ? (
              <Shield className="w-4 h-4 text-emerald-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-slate-400" />
            )}
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1F2228] text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-[#2A2D35]">
              Role: <span className="capitalize">{userRole}</span> (Click to switch)
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

