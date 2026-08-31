import React, { useState, useEffect } from 'react';
import {
  Globe,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Send,
  Terminal,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PromptDraft, GatewayLog } from '../types';
import { AVAILABLE_MODELS } from '../data/models';

interface GatewayDashboardProps {
  prompts: PromptDraft[];
  currentPrompt: PromptDraft;
  onSelectPrompt: (p: PromptDraft) => void;
}

export const GatewayDashboard: React.FC<GatewayDashboardProps> = ({
  prompts,
  currentPrompt,
  onSelectPrompt,
}) => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalPromptTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    successRate: 100,
  });
  const [logs, setLogs] = useState<GatewayLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Live Gateway Tester State
  const [testEndpoint, setTestEndpoint] = useState<'prompt_endpoint' | 'openai_proxy'>('prompt_endpoint');
  const [testModel, setTestModel] = useState(currentPrompt.model);
  const [testPayload, setTestPayload] = useState(
    JSON.stringify({ variables: currentPrompt.testCases?.[0]?.variables || {} }, null, 2)
  );
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gateway/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleRunTestRequest = async () => {
    setTestLoading(true);
    setTestResponse(null);

    const startTime = Date.now();
    try {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(testPayload);
      } catch {
        throw new Error('Invalid JSON in Request Payload');
      }

      if (testEndpoint === 'prompt_endpoint') {
        const res = await fetch(`/api/v1/prompts/${currentPrompt.id}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...parsedBody,
            override_model: testModel,
          }),
        });
        const data = await res.json();
        setTestResponse({
          status: res.status,
          statusText: res.statusText,
          timeMs: Date.now() - startTime,
          data,
        });
      } else {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: 'user', content: 'Test message through LiteLLM proxy' }],
          }),
        });
        const data = await res.json();
        setTestResponse({
          status: res.status,
          statusText: res.statusText,
          timeMs: Date.now() - startTime,
          data,
        });
      }

      fetchStats();
    } catch (err: any) {
      setTestResponse({
        status: 500,
        statusText: 'Client Error',
        timeMs: Date.now() - startTime,
        data: { error: err?.message || 'Failed to send request' },
      });
    } finally {
      setTestLoading(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-y-auto p-4 md:p-6 text-slate-200 space-y-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2228]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              LiteLLM Gateway & API Control Plane
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitor traffic, test live endpoints, and route API calls seamlessly across models.
            </p>
          </div>

          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#16181D] hover:bg-[#1F2228] text-slate-300 rounded-md border border-[#2A2D35] transition-colors self-start sm:self-auto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Total API Requests
            </div>
            <div className="text-xl font-bold text-white font-mono">{stats.totalRequests}</div>
            <div className="text-[10px] text-emerald-400">{stats.successRate}% Success Rate</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Total Tokens Handled
            </div>
            <div className="text-xl font-bold text-white font-mono">{stats.totalTokens.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-mono">
              {stats.totalPromptTokens} in / {stats.totalOutputTokens} out
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Avg Router Latency
            </div>
            <div className="text-xl font-bold text-white font-mono">{stats.avgLatencyMs} ms</div>
            <div className="text-[10px] text-slate-500">End-to-end response time</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0F13] border border-[#1F2228] space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Active Prompt Endpoints
            </div>
            <div className="text-xl font-bold text-white font-mono">{prompts.length}</div>
            <div className="text-[10px] text-blue-400">All available for REST calls</div>
          </div>
        </div>

        {/* Live Endpoint Tester */}
        <div className="p-5 rounded-2xl bg-[#0D0F13] border border-[#1F2228] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Live Endpoint Simulator</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Direct In-Browser HTTP Execution
            </span>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Select Route</label>
              <select
                value={testEndpoint}
                onChange={(e: any) => setTestEndpoint(e.target.value)}
                className="w-full bg-[#16181D] text-xs text-white border border-[#2A2D35] rounded px-3 py-1.5 outline-none font-mono"
              >
                <option value="prompt_endpoint">POST /api/v1/prompts/{currentPrompt.id}/run</option>
                <option value="openai_proxy">POST /v1/chat/completions (OpenAI Compatible)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Target Model / Alias</label>
              <select
                value={testModel}
                onChange={(e) => setTestModel(e.target.value)}
                className="w-full bg-[#16181D] text-xs text-white border border-[#2A2D35] rounded px-3 py-1.5 outline-none font-semibold"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunTestRequest}
                disabled={testLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors shadow-sm disabled:opacity-50"
              >
                {testLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Test Request</span>
              </button>
            </div>
          </div>

          {/* Request Payload Editor & Response Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">Request Body (JSON):</span>
              <textarea
                rows={6}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full bg-[#16181D] text-xs font-mono text-[#E2E8F0] p-3 rounded-lg border border-[#2A2D35] focus:border-teal-500 outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span>Response Output:</span>
                {testResponse && (
                  <span className={`font-mono font-semibold ${testResponse.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    HTTP {testResponse.status} ({testResponse.timeMs}ms)
                  </span>
                )}
              </div>
              <div className="w-full bg-[#16181D] text-xs font-mono text-[#E2E8F0] p-3 rounded-lg border border-[#2A2D35] min-h-[135px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {testResponse ? (
                  JSON.stringify(testResponse.data, null, 2)
                ) : (
                  <span className="text-slate-500">Click "Send Test Request" to see server response</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Gateway Traffic Logs */}
        <div className="p-5 rounded-2xl bg-[#0D0F13] border border-[#1F2228] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recent Gateway Traffic & Routing Logs
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Real-time Stream</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-[#1F2228] text-[11px] text-slate-400 bg-[#16181D]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Route / Endpoint</th>
                  <th className="py-2.5 px-3">Model Requested</th>
                  <th className="py-2.5 px-3">Executed Model</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tokens</th>
                  <th className="py-2.5 px-3 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2228]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No gateway traffic recorded yet. Run a prompt in the playground or execute an API call.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#16181D]/60 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#0A0A0B] text-slate-300 border border-[#2A2D35]">
                          {log.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-blue-300 font-semibold truncate max-w-[180px]">
                        {log.path}
                      </td>
                      <td className="py-2.5 px-3 text-purple-300 truncate max-w-[130px]">
                        {log.modelRequested}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[130px]">
                        {log.modelExecuted}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === 200 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                        {log.promptTokens + log.outputTokens}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-300 font-semibold">
                        {log.latencyMs}ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
