import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Search,
  X,
  Check,
  Globe,
  Tag,
  ArrowRight
} from 'lucide-react';
import { PromptDraft } from '../types';

interface PromptLibraryModalProps {
  prompts: PromptDraft[];
  currentPromptId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: PromptDraft) => void;
  onNewPrompt: () => void;
  onDeletePrompt: (id: string) => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  prompts,
  currentPromptId,
  isOpen,
  onClose,
  onSelectPrompt,
  onNewPrompt,
  onDeletePrompt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredPrompts = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#0D0F13] border border-[#2A2D35] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-[#1F2228] flex items-center justify-between bg-[#16181D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Prompt Registry & Endpoints</h3>
              <p className="text-[11px] text-slate-400">Select or create prompts with instant endpoints</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewPrompt();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Prompt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1F2228] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#1F2228] bg-[#0A0A0B]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prompts by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16181D] text-xs text-white pl-9 pr-3 py-2 rounded-lg border border-[#2A2D35] focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Prompt List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-[#0A0A0B]">
          {filteredPrompts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No prompts match your search query.
            </div>
          ) : (
            filteredPrompts.map((p) => {
              const isActive = p.id === currentPromptId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPrompt(p);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'bg-blue-600/10 border-blue-500/50 text-white'
                      : 'bg-[#0D0F13] hover:bg-[#16181D] border-[#1F2228] text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{p.title}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400 font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </div>

                    {prompts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePrompt(p.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1F2228] text-[10px] text-slate-500 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-semibold">{p.model}</span>
                      <span>•</span>
                      <span>{p.testCases?.length || 0} sample tests</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.tags?.map((t) => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-[#16181D] text-slate-400 border border-[#2A2D35]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
