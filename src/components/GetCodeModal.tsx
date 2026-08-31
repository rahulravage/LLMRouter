import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  Terminal,
  FileCode,
  Globe,
  Zap,
  Sparkles,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { PromptDraft } from '../types';
import { AVAILABLE_MODELS } from '../data/models';

interface GetCodeModalProps {
  prompt: PromptDraft;
  isOpen: boolean;
  onClose: () => void;
}

export const GetCodeModal: React.FC<GetCodeModalProps> = ({ prompt, isOpen, onClose }) => {
  const [selectedTab, setSelectedTab] = useState<'curl_prompt' | 'curl_openai' | 'python_openai' | 'python_genai' | 'js_fetch'>('curl_prompt');
  const [copied, setCopied] = useState(false);
  const [overrideModel, setOverrideModel] = useState(prompt.model);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const promptEndpointUrl = `${currentOrigin}/api/v1/prompts/${prompt.id}/run`;
  const openAiProxyUrl = `${currentOrigin}/v1/chat/completions`;

  // Sample variable payload
  const sampleVariables = prompt.testCases?.[0]?.variables || {};

  const getCurlPromptCode = () => {
    return `curl -X POST "${promptEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "variables": ${JSON.stringify(sampleVariables, null, 4).replace(/\n/g, '\n    ')},
    "override_model": "${overrideModel}"
  }'`;
  };

  const getCurlOpenAICode = () => {
    return `curl -X POST "${openAiProxyUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ANY_KEY_OR_EMPTY" \\
  -d '{
    "model": "${overrideModel}",
    "messages": [
      ${prompt.systemInstruction ? `{"role": "system", "content": ${JSON.stringify(prompt.systemInstruction)}},` : ''}
      {"role": "user", "content": "Hello! Please process this request."}
    ],
    "temperature": ${prompt.config.temperature},
    "max_tokens": ${prompt.config.maxOutputTokens}
  }'`;
  };

  const getPythonOpenAICode = () => {
    return `# LiteLLM / OpenAI SDK Drop-in Replacement
# pip install openai

from openai import OpenAI

# Point client directly to your deployed LiteLLM Gateway
client = OpenAI(
    base_url="${currentOrigin}/v1",
    api_key="litellm-proxy-key" # or any string
)

response = client.chat.completions.create(
    model="${overrideModel}", # Can easily switch to any model (gemini-3.7-flash, gpt-4o, claude-3-5-sonnet)
    messages=[
        ${prompt.systemInstruction ? `{"role": "system", "content": """${prompt.systemInstruction.replace(/"""/g, '\\"\\"\\"')}"""},` : ''}
        {"role": "user", "content": "Execute prompt task"}
    ],
    temperature=${prompt.config.temperature},
    max_tokens=${prompt.config.maxOutputTokens}
)

print(response.choices[0].message.content)`;
  };

  const getPythonGenAICode = () => {
    return `# Google GenAI Python SDK
# pip install google-genai

from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="${prompt.model}",
    contents="""${prompt.userPrompt.replace(/"""/g, '\\"\\"\\"')}""",
    config=types.GenerateContentConfig(
        ${prompt.systemInstruction ? `system_instruction="""${prompt.systemInstruction.replace(/"""/g, '\\"\\"\\"')}""",` : ''}
        temperature=${prompt.config.temperature},
        top_p=${prompt.config.topP},
        max_output_tokens=${prompt.config.maxOutputTokens},
        ${prompt.config.responseMimeType === 'application/json' ? `response_mime_type="application/json",` : ''}
    )
)

print(response.text)`;
  };

  const getJsFetchCode = () => {
    return `// Call your dedicated Prompt Endpoint in Node.js or Browser
const response = await fetch("${promptEndpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    variables: ${JSON.stringify(sampleVariables, null, 4).replace(/\n/g, '\n    ')},
    override_model: "${overrideModel}" // Optional: switch model on the fly
  }),
});

const data = await response.json();
console.log("Model used:", data.routed_model);
console.log("Response:", data.response);`;
  };

  const getSnippet = () => {
    switch (selectedTab) {
      case 'curl_prompt':
        return getCurlPromptCode();
      case 'curl_openai':
        return getCurlOpenAICode();
      case 'python_openai':
        return getPythonOpenAICode();
      case 'python_genai':
        return getPythonGenAICode();
      case 'js_fetch':
        return getJsFetchCode();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#0D0F13] border border-[#2A2D35] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1F2228] flex items-center justify-between bg-[#16181D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                API Endpoint & NASH Gateway Code
              </h3>
              <p className="text-[11px] text-slate-400">
                Ready-to-use production API endpoints for <span className="text-blue-300 font-mono font-semibold">{prompt.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1F2228] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Model Switcher Banner */}
        <div className="px-5 py-3 bg-[#0A0A0B] border-b border-[#1F2228] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Target Execution Model in Code:</span>
          </div>

          <select
            value={overrideModel}
            onChange={(e) => setOverrideModel(e.target.value)}
            className="bg-[#16181D] text-xs text-white border border-[#2A2D35] rounded px-3 py-1 outline-none font-semibold"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 bg-[#0D0F13] border-b border-[#1F2228] flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedTab('curl_prompt')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              selectedTab === 'curl_prompt'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            cURL (Prompt Endpoint)
          </button>
          <button
            onClick={() => setSelectedTab('python_openai')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              selectedTab === 'python_openai'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Python (LiteLLM / OpenAI)
          </button>
          <button
            onClick={() => setSelectedTab('js_fetch')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              selectedTab === 'js_fetch'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-yellow-400" />
            Node.js / Fetch
          </button>
          <button
            onClick={() => setSelectedTab('curl_openai')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              selectedTab === 'curl_openai'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            cURL (/v1/chat/completions)
          </button>
          <button
            onClick={() => setSelectedTab('python_genai')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              selectedTab === 'python_genai'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Python (@google/genai)
          </button>
        </div>

        {/* Code Snippet Box */}
        <div className="p-5 flex-1 overflow-y-auto bg-[#0A0A0B] relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400">
              {selectedTab === 'curl_prompt'
                ? 'Dedicated Endpoint with automatic variable templating'
                : selectedTab === 'python_openai'
                ? 'LiteLLM unified proxy using standard OpenAI library'
                : 'Copy and paste into your application'}
            </span>
            <button
              onClick={handleCopy}
              id="btn-copy-modal-code"
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#1F2228] hover:bg-[#2A2D35] text-slate-200 rounded border border-[#2A2D35] transition-colors font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-[#16181D] border border-[#1F2228] text-xs font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed select-text">
            {getSnippet()}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1F2228] bg-[#0D0F13] flex items-center justify-between text-xs text-slate-400">
          <span>LiteLLM Proxy Engine Active • Express Gateway</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F2228] hover:bg-[#2A2D35] text-white rounded-lg transition-colors font-medium border border-[#2A2D35]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
