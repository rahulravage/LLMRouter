export type UsecaseStage = 'Details' | 'Tune' | 'Deployed';
export type UserRole = 'admin' | 'member';
export type ViewMode = 'new' | 'classic';
export type ThemeMode = 'dark' | 'light';

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'Google Gemini' | 'LiteLLM Proxy' | 'Custom Provider';
  actualModel: string;
  description: string;
  contextWindow: number;
  maxOutput: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  speed: 'Ultra Fast' | 'Fast' | 'Balanced' | 'Deep Reasoning';
  category: 'Gemini Native' | 'OpenAI Alias' | 'Anthropic Alias' | 'Custom Registered';
  supportsThinking?: boolean;
  isCustom?: boolean;
  endpointUrl?: string;
  createdAt?: number;
}

export interface PromptVariable {
  name: string;
  required: boolean; // Mandatory (#) vs Optional
  defaultValue?: string;
  exampleValue?: string;
  description?: string;
}

export interface PromptVersion {
  versionNumber: number;
  prompt: string; // Unified single prompt
  model: string;
  variables: PromptVariable[];
  createdAt: number;
  author: string;
  note?: string;
}

export interface PromptConfig {
  temperature: number;
  topP: number;
  topK?: number;
  maxOutputTokens: number;
  thinkingLevel?: 'HIGH' | 'LOW' | 'MINIMAL';
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: string;
  stopSequences: string[];
}

export interface FewShotExample {
  id: string;
  input: string;
  output: string;
}

export interface TestCase {
  id: string;
  name: string;
  variables: Record<string, string>;
  modelOverride?: string;
  expectedOutput?: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRun?: {
    output: string;
    latencyMs: number;
    promptTokens: number;
    outputTokens: number;
    timestamp: number;
    modelUsed?: string;
    error?: string;
  };
}

export interface PromptDraft {
  id: string;
  title: string; // Usecase Name
  description?: string;
  stage: UsecaseStage;
  model: string; // LLM Model Name
  systemInstruction?: string;
  userPrompt: string; // Single prompt area
  mode: 'freeform' | 'fewshot' | 'chat';
  variables?: PromptVariable[];
  collaborators?: string[];
  sampleRunsEnabled?: boolean; // Admin enablement control
  versions?: PromptVersion[]; // Prompt versioning history
  currentVersion?: number;
  fewShotExamples?: FewShotExample[];
  testCases?: TestCase[];
  config: PromptConfig;
  createdAt: number;
  updatedAt: number;
  endpointSlug: string;
  tags?: string[];
}

export interface GenerationMetrics {
  latencyMs: number;
  timeToFirstTokenMs?: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface GatewayLog {
  id: string;
  promptId?: string;
  promptTitle?: string;
  timestamp: number;
  method: string;
  path: string;
  modelRequested: string;
  modelExecuted: string;
  status: number;
  latencyMs: number;
  promptTokens: number;
  outputTokens: number;
  source: 'Playground' | 'API Endpoint' | 'OpenAI Proxy' | 'Batch Runner';
}

