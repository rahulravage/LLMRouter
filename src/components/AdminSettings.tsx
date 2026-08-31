import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Cpu,
  Zap,
  Globe,
  Sliders,
  DollarSign,
  Search,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Bot
} from 'lucide-react';
import { UserRole, ModelInfo } from '../types';

interface AdminSettingsProps {
  userRole: UserRole;
  onToggleRole: () => void;
  models: ModelInfo[];
  onAddModel: (model: ModelInfo) => void;
  onDeleteModel: (modelId: string) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  userRole,
  onToggleRole,
  models,
  onAddModel,
  onDeleteModel,
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'roles' | 'gateway'>('models');
  const [searchModel, setSearchModel] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New model form state
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newProvider, setNewProvider] = useState<'Google Gemini' | 'LiteLLM Proxy' | 'Custom Provider'>('LiteLLM Proxy');
  const [newActualModel, setNewActualModel] = useState('gemini-3.7-flash');
  const [newDescription, setNewDescription] = useState('');
  const [newContextWindow, setNewContextWindow] = useState(1048576);
  const [newMaxOutput, setNewMaxOutput] = useState(8192);
  const [newInputPrice, setNewInputPrice] = useState(0.15);
  const [newOutputPrice, setNewOutputPrice] = useState(0.60);
  const [newSpeed, setNewSpeed] = useState<'Ultra Fast' | 'Fast' | 'Balanced' | 'Deep Reasoning'>('Ultra Fast');
  const [newSupportsThinking, setNewSupportsThinking] = useState(true);

  // Test Model state
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Handle Add model submit
  const handleCreateNewModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) return;

    const id = newModelId.trim() || newModelName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const createdModel: ModelInfo = {
      id,
      name: newModelName.trim(),
      provider: newProvider,
      actualModel: newActualModel,
      description: newDescription.trim() || `Custom LLM registered in NASH Gateway (${newProvider})`,
      contextWindow: Number(newContextWindow) || 1048576,
      maxOutput: Number(newMaxOutput) || 8192,
      inputPricePerMillion: Number(newInputPrice) || 0.15,
      outputPricePerMillion: Number(newOutputPrice) || 0.60,
      speed: newSpeed,
      category: 'Custom Registered',
      supportsThinking: newSupportsThinking,
      isCustom: true,
      createdAt: Date.now(),
    };

    onAddModel(createdModel);
    setIsAddModalOpen(false);

    // Reset
    setNewModelName('');
    setNewModelId('');
    setNewDescription('');
  };

  // Test custom model live
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: newActualModel,
          userPrompt: 'Respond with "Model connection verified successfully!" and your model name.',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus(`Success! Response: "${data.text?.trim()}" (Latency: ${data.metrics?.latencyMs}ms)`);
      } else {
        setTestStatus(`Error: ${data.error || 'Failed to verify model'}`);
      }
    } catch (e: any) {
      setTestStatus(`Network error: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Filter models
  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.id.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.category.toLowerCase().includes(searchModel.toLowerCase())
  );

  // If user is not Admin, show permission guard
  if (userRole !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0B] p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0D0F13] border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Admin Role Required</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              The Settings and Model Registry section is restricted to administrative roles. Your current active role is{' '}
              <span className="font-semibold text-slate-200 capitalize">Member</span>.
            </p>
          </div>

          <div className="p-3 bg-[#16181D] rounded-xl border border-[#1F2228] text-left text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Admin Capabilities</span>
            </div>
            <p className="text-[11px]">
              • Add, configure, and register new LLM models & aliases<br />
              • Manage API rate limits, tokens, and routing overrides<br />
              • View global gateway security and billing telemetry
            </p>
          </div>

          <button
            onClick={onToggleRole}
            id="btn-switch-to-admin"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Switch to Admin Role</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-16 border-b border-[#1F2228] bg-[#0D0F13] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">Admin Console & Model Registry</h1>
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Admin Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Register new LLM models, configure LiteLLM routing, and manage gateway settings.
            </p>
          </div>
        </div>

        {/* Tab Navigation & Add Model */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#16181D] p-1 rounded-lg border border-[#1F2228]">
            <button
              onClick={() => setActiveTab('models')}
              id="tab-admin-models"
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'models'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Model Registry ({models.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              id="tab-admin-roles"
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'roles'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Role Controls
            </button>
          </div>

          {activeTab === 'models' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              id="btn-admin-add-model"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add LLM Model</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'models' && (
          <div className="space-y-6">
            {/* Search & Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D0F13] p-4 rounded-xl border border-[#1F2228]">
              <div className="flex items-center gap-3">
                <div className="relative min-w-[280px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search registered models, providers, aliases..."
                    value={searchModel}
                    onChange={(e) => setSearchModel(e.target.value)}
                    className="w-full bg-[#16181D] text-xs text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-[#1F2228] focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>
                  Showing <strong className="text-white">{filteredModels.length}</strong> of{' '}
                  <strong className="text-white">{models.length}</strong> models
                </span>
              </div>
            </div>

            {/* Models Table */}
            <div className="bg-[#0D0F13] rounded-xl border border-[#1F2228] overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F2228] bg-[#121418] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4 min-w-[220px]">Model Name & Alias</th>
                      <th className="py-3.5 px-4 min-w-[150px]">Provider / Category</th>
                      <th className="py-3.5 px-4 min-w-[150px]">Backend Target</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Context / Output</th>
                      <th className="py-3.5 px-4 min-w-[120px]">Pricing (1M Tokens)</th>
                      <th className="py-3.5 px-4 min-w-[100px]">Speed</th>
                      <th className="py-3.5 px-4 text-right min-w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2228] text-xs">
                    {filteredModels.map((m) => (
                      <tr key={m.id} className="hover:bg-[#16181D]/80 transition-colors">
                        {/* Name & ID */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200">{m.name}</span>
                              {m.isCustom && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  Custom
                                </span>
                              )}
                              {m.supportsThinking && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  Thinking
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{m.id}</span>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{m.description}</p>
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-300 font-medium">{m.provider}</span>
                            <span className="text-[10px] text-slate-400">{m.category}</span>
                          </div>
                        </td>

                        {/* Actual backend model */}
                        <td className="py-3 px-4 align-top">
                          <span className="text-[11px] font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/20">
                            {m.actualModel}
                          </span>
                        </td>

                        {/* Context & Output */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col text-[11px] text-slate-400">
                            <span>Ctx: {(m.contextWindow / 1000).toFixed(0)}k</span>
                            <span>Max: {(m.maxOutput / 1000).toFixed(0)}k</span>
                          </div>
                        </td>

                        {/* Pricing */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col text-[10px] font-mono text-slate-400">
                            <span>In: ${m.inputPricePerMillion.toFixed(2)}</span>
                            <span>Out: ${m.outputPricePerMillion.toFixed(2)}</span>
                          </div>
                        </td>

                        {/* Speed */}
                        <td className="py-3 px-4 align-top">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                              m.speed === 'Ultra Fast'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : m.speed === 'Fast'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {m.speed}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 align-top text-right">
                          {m.isCustom ? (
                            <button
                              onClick={() => onDeleteModel(m.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors"
                              title="Delete custom model"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">Built-in</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#0D0F13] p-6 rounded-xl border border-[#1F2228] space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">Active Role Switcher & Testing</h2>
              <p className="text-xs text-slate-400">
                You can toggle between roles to simulate how Members vs Administrators experience the interface.
              </p>

              <div className="flex items-center justify-between p-4 bg-[#16181D] rounded-xl border border-[#1F2228]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                    {userRole === 'admin' ? 'A' : 'M'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white capitalize">Current Role: {userRole}</div>
                    <div className="text-[11px] text-slate-400">
                      {userRole === 'admin'
                        ? 'Full administrative permissions enabled.'
                        : 'Standard developer / prompt engineer access.'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onToggleRole}
                  id="btn-role-switch-tab"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                >
                  Switch to {userRole === 'admin' ? 'Member' : 'Admin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD NEW MODEL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0D0F13] border border-[#2A2D35] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#1F2228] flex items-center justify-between bg-[#121418]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Register New LLM Model / Proxy
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewModel} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Model Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gemini 3.5 Ultra (Preview), Llama-3.3-70B-Instruct"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  required
                  className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Model ID / Alias Slug
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. llama-3.3-70b"
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] focus:border-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Provider
                  </label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as any)}
                    className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] focus:border-blue-500 outline-none"
                  >
                    <option value="Google Gemini">Google Gemini</option>
                    <option value="LiteLLM Proxy">LiteLLM Proxy</option>
                    <option value="Custom Provider">Custom Provider</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Target Backend Model Engine
                </label>
                <select
                  value={newActualModel}
                  onChange={(e) => setNewActualModel(e.target.value)}
                  className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] focus:border-blue-500 outline-none font-mono"
                >
                  <option value="gemini-3.7-flash">gemini-3.7-flash (Hybrid Reasoning Workhorse)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Flagship Complex Reasoning)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra Fast Multimodal)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (State of the Art STEM)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Cost-Optimized Speed)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Context Window (tokens)
                  </label>
                  <input
                    type="number"
                    value={newContextWindow}
                    onChange={(e) => setNewContextWindow(Number(e.target.value))}
                    className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    value={newMaxOutput}
                    onChange={(e) => setNewMaxOutput(Number(e.target.value))}
                    className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Speed / Latency Category
                  </label>
                  <select
                    value={newSpeed}
                    onChange={(e) => setNewSpeed(e.target.value as any)}
                    className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] outline-none"
                  >
                    <option value="Ultra Fast">Ultra Fast</option>
                    <option value="Fast">Fast</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Deep Reasoning">Deep Reasoning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Input Price / 1M ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInputPrice}
                    onChange={(e) => setNewInputPrice(Number(e.target.value))}
                    className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Description / Documentation
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe model use case and routing notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#16181D] text-slate-200 px-3 py-2 rounded-lg border border-[#2A2D35] outline-none"
                />
              </div>

              {/* Test verification */}
              <div className="p-3 bg-[#16181D] rounded-xl border border-[#2A2D35] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">Live Connection Test</span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-2.5 py-1 bg-[#1F2228] hover:bg-[#2A2D35] text-slate-200 text-[11px] rounded border border-[#2A2D35] transition-colors flex items-center gap-1"
                  >
                    {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-400" />}
                    <span>Test Model</span>
                  </button>
                </div>
                {testStatus && (
                  <div className="text-[10px] font-mono text-slate-300 bg-[#0D0F13] p-2 rounded border border-[#2A2D35] break-words">
                    {testStatus}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2228]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#1F2228] hover:bg-[#2A2D35] text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-add-model"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                >
                  Register Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
