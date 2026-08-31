import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, MainNavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ParametersSidebar } from './components/ParametersSidebar';
import { PromptEditor } from './components/PromptEditor';
import { GatewayDashboard } from './components/GatewayDashboard';
import { UsecasesLanding } from './components/UsecasesLanding';
import { AdminSettings } from './components/AdminSettings';
import { GetCodeModal } from './components/GetCodeModal';
import { PromptLibraryModal } from './components/PromptLibraryModal';
import { NewUsecaseModal } from './components/NewUsecaseModal';
import { UsecaseDetailsModal } from './components/UsecaseDetailsModal';
import { INITIAL_PROMPTS } from './data/templates';
import { AVAILABLE_MODELS } from './data/models';
import {
  PromptDraft,
  PromptConfig,
  GenerationMetrics,
  UsecaseStage,
  UserRole,
  ViewMode,
  ThemeMode,
  ModelInfo,
} from './types';

export default function App() {
  // Theme State (dark / light)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nash_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  // Sync theme to localStorage and DOM element
  useEffect(() => {
    localStorage.setItem('nash_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Prompts State
  const [prompts, setPrompts] = useState<PromptDraft[]>(() => {
    const saved = localStorage.getItem('litellm_prompts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse local prompts', e);
      }
    }
    return INITIAL_PROMPTS;
  });

  // Models State (Built-in + Custom registered)
  const [models, setModels] = useState<ModelInfo[]>(() => {
    const saved = localStorage.getItem('litellm_custom_models');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customIds = new Set(parsed.map((m: ModelInfo) => m.id));
          const builtIn = AVAILABLE_MODELS.filter((m) => !customIds.has(m.id));
          return [...builtIn, ...parsed];
        }
      } catch (e) {
        console.error('Failed to parse local models', e);
      }
    }
    return AVAILABLE_MODELS;
  });

  const [currentPromptId, setCurrentPromptId] = useState<string>(() => {
    return prompts[0]?.id || 'support-triage-v1';
  });

  // Navigation & Role states (starts with landing page 'usecases')
  const [activeTab, setActiveTab] = useState<MainNavTab>('usecases');
  const [viewMode, setViewMode] = useState<ViewMode>('new');
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [isNavCollapsed, setIsNavCollapsed] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals
  const [isGetCodeOpen, setIsGetCodeOpen] = useState(false);
  const [getCodeTargetPrompt, setGetCodeTargetPrompt] = useState<PromptDraft | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const [isNewUsecaseModalOpen, setIsNewUsecaseModalOpen] = useState(false);
  const [duplicateTargetPrompt, setDuplicateTargetPrompt] = useState<PromptDraft | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsTargetPrompt, setDetailsTargetPrompt] = useState<PromptDraft | null>(null);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState<GenerationMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Current prompt object
  const currentPrompt = prompts.find((p) => p.id === currentPromptId) || prompts[0] || INITIAL_PROMPTS[0];

  // Sync prompts to localStorage
  useEffect(() => {
    localStorage.setItem('litellm_prompts', JSON.stringify(prompts));
  }, [prompts]);

  // Sync custom models to localStorage
  useEffect(() => {
    const customOnly = models.filter((m) => m.isCustom);
    localStorage.setItem('litellm_custom_models', JSON.stringify(customOnly));
  }, [models]);

  // Fetch prompts and custom models from backend on mount
  useEffect(() => {
    fetch('/api/prompts')
      .then((res) => res.json())
      .then((data) => {
        if (data.prompts && data.prompts.length > 0) {
          setPrompts(data.prompts);
        }
      })
      .catch((err) => console.log('Server prompts fetch error:', err));

    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.customModels && data.customModels.length > 0) {
          setModels((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newCustoms = data.customModels.filter((m: ModelInfo) => !existingIds.has(m.id));
            return [...prev, ...newCustoms];
          });
        }
      })
      .catch((err) => console.log('Server models fetch error:', err));
  }, []);

  // Update prompt helper
  const handleUpdatePrompt = (partial: Partial<PromptDraft>, targetId?: string) => {
    const idToUpdate = targetId || currentPrompt.id;
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === idToUpdate
          ? {
              ...p,
              ...partial,
              updatedAt: Date.now(),
            }
          : p
      )
    );
  };

  // Open Details & Versions Modal
  const handleOpenDetailsModal = (promptToInspect?: PromptDraft) => {
    setDetailsTargetPrompt(promptToInspect || currentPrompt);
    setIsDetailsModalOpen(true);
  };

  // Update specific prompt stage
  const handleUpdatePromptStage = (promptId: string, stage: UsecaseStage) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? {
              ...p,
              stage,
              updatedAt: Date.now(),
            }
          : p
      )
    );
  };

  // Update specific prompt model
  const handleUpdatePromptModel = (promptId: string, modelId: string) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? {
              ...p,
              model: modelId,
              updatedAt: Date.now(),
            }
          : p
      )
    );
  };

  // Toggle sample runs approval for a prompt (Admin control)
  const handleToggleSampleRuns = (promptId: string, enabled: boolean) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? {
              ...p,
              sampleRunsEnabled: enabled,
              updatedAt: Date.now(),
            }
          : p
      )
    );
  };

  // Update prompt config helper
  const handleUpdateConfig = (configPartial: Partial<PromptConfig>) => {
    handleUpdatePrompt({
      config: {
        ...currentPrompt.config,
        ...configPartial,
      },
    });
  };

  // Save prompt to server
  const handleSavePrompt = async () => {
    try {
      await fetch(`/api/prompts/${currentPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPrompt),
      });
    } catch (e) {
      console.error('Failed to save to server', e);
    }
  };

  // Add new prompt (created from Modal or Blank)
  const handleNewPrompt = (newUsecaseOrStage?: PromptDraft | UsecaseStage) => {
    if (typeof newUsecaseOrStage === 'object' && newUsecaseOrStage !== null) {
      const created = newUsecaseOrStage as PromptDraft;
      setPrompts((prev) => [created, ...prev]);
      setCurrentPromptId(created.id);
      setOutput('');
      setMetrics(null);
      setError(null);
      setActiveTab('playground');
      return;
    }

    const initialStage: UsecaseStage = typeof newUsecaseOrStage === 'string' ? newUsecaseOrStage : 'Details';
    const newId = `usecase-${Date.now()}`;
    const newPrompt: PromptDraft = {
      id: newId,
      title: 'Customer Inquiry Responder',
      description: 'Single prompt template with # mandatory variables and LiteLLM proxy endpoint.',
      model: 'gemini-2.5-flash',
      stage: initialStage,
      userPrompt: 'You are a helpful support specialist. Respond to customer query: {{#customer_query}}\nPriority: {{priority=Normal}}\nContext: {{context}}',
      mode: 'freeform',
      variables: [
        {
          name: 'customer_query',
          description: 'Mandatory customer query',
          required: true,
          exampleValue: 'Where can I find the invoices for last quarter?',
        },
        {
          name: 'priority',
          description: 'Priority level',
          required: false,
          defaultValue: 'Normal',
        },
        {
          name: 'context',
          description: 'Optional account metadata',
          required: false,
        },
      ],
      collaborators: ['rahul.forms@gmail.com'],
      sampleRunsEnabled: false,
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          prompt: 'You are a helpful support specialist. Respond to customer query: {{#customer_query}}\nPriority: {{priority=Normal}}\nContext: {{context}}',
          model: 'gemini-2.5-flash',
          variables: [
            {
              name: 'customer_query',
              description: 'Mandatory customer query',
              required: true,
              exampleValue: 'Where can I find the invoices for last quarter?',
            },
            {
              name: 'priority',
              description: 'Priority level',
              required: false,
              defaultValue: 'Normal',
            },
            {
              name: 'context',
              description: 'Optional account metadata',
              required: false,
            },
          ],
          createdAt: Date.now(),
          author: 'rahul.forms@gmail.com',
          note: 'Initial prompt draft',
        },
      ],
      fewShotExamples: [],
      testCases: [
        {
          id: `tc-${Date.now()}`,
          name: 'Sample Run #1',
          variables: {
            customer_query: 'How do I upgrade my billing tier to enterprise?',
            priority: 'High',
          },
          status: 'idle',
        },
      ],
      config: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'text/plain',
        stopSequences: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      endpointSlug: newId,
      tags: ['Customer Support', 'Production'],
    };

    setPrompts((prev) => [newPrompt, ...prev]);
    setCurrentPromptId(newId);
    setOutput('');
    setMetrics(null);
    setError(null);
    setActiveTab('playground');
  };

  // Open blank new usecase modal
  const handleOpenNewUsecaseModal = () => {
    setDuplicateTargetPrompt(null);
    setIsNewUsecaseModalOpen(true);
  };

  // Duplicate prompt - opens NewUsecaseModal with details pre-filled and name ending in -copy
  const handleDuplicatePrompt = (promptId: string) => {
    const source = prompts.find((p) => p.id === promptId);
    if (!source) return;

    setDuplicateTargetPrompt(source);
    setIsNewUsecaseModalOpen(true);
  };

  // Delete prompt
  const handleDeletePrompt = (id: string) => {
    const remaining = prompts.filter((p) => p.id !== id);
    if (remaining.length > 0) {
      setPrompts(remaining);
      if (currentPromptId === id) {
        setCurrentPromptId(remaining[0].id);
      }
    }
  };

  // Select Prompt and jump to tab
  const handleSelectPrompt = (promptId: string, tab: MainNavTab = 'playground') => {
    setCurrentPromptId(promptId);
    setActiveTab(tab);
  };

  // Add Custom Model (Admin)
  const handleAddModel = async (newModel: ModelInfo) => {
    setModels((prev) => [...prev, newModel]);
    try {
      await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModel),
      });
    } catch (e) {
      console.error('Failed to sync model to backend', e);
    }
  };

  // Delete Custom Model (Admin)
  const handleDeleteModel = async (modelId: string) => {
    setModels((prev) => prev.filter((m) => m.id !== modelId));
    try {
      await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete model from backend', e);
    }
  };

  // Toggle user role
  const handleToggleRole = () => {
    setUserRole((prev) => (prev === 'admin' ? 'member' : 'admin'));
  };

  // Execute Prompt (Streaming via SSE)
  const handleRun = async (
    customVariables?: Record<string, string>,
    modelOverride?: string,
    promptOverride?: string
  ) => {
    if (isRunning) return;

    setIsRunning(true);
    setError(null);
    setOutput('');
    setMetrics(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const runVariables = customVariables || currentPrompt.testCases?.[0]?.variables || {};
    const modelToUse = modelOverride || currentPrompt.model;
    const promptToUse = promptOverride !== undefined ? promptOverride : currentPrompt.userPrompt;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          promptId: currentPrompt.id,
          promptTitle: currentPrompt.title,
          model: modelToUse,
          userPrompt: promptToUse,
          variables: runVariables,
          fewShotExamples: currentPrompt.fewShotExamples,
          config: currentPrompt.config,
          stream: true,
          source: 'Playground',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable response stream received.');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setOutput(accumulatedText);
              }
              if (parsed.metrics) {
                setMetrics(parsed.metrics);
              }
              if (parsed.error) {
                setError(parsed.error);
              }
            } catch (e) {
              // Ignore partial parse
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err?.message || 'Execution failed');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
    }
  };

  // Add output as test case
  const handleAddAsTestCase = (vars: Record<string, string>, outStr: string) => {
    const newTC = {
      id: `tc-${Date.now()}`,
      name: `Sample Run #${(currentPrompt.testCases?.length || 0) + 1}`,
      variables: vars,
      status: 'success' as const,
      lastRun: {
        output: outStr,
        latencyMs: metrics?.latencyMs || 450,
        promptTokens: metrics?.promptTokens || 120,
        outputTokens: metrics?.outputTokens || 80,
        timestamp: Date.now(),
      },
    };

    handleUpdatePrompt({
      testCases: [...(currentPrompt.testCases || []), newTC],
    });
  };

  // Add output as few shot example
  const handleAddAsFewShot = (inStr: string, outStr: string) => {
    const newEx = {
      id: `ex-${Date.now()}`,
      input: inStr,
      output: outStr,
    };
    handleUpdatePrompt({
      fewShotExamples: [...(currentPrompt.fewShotExamples || []), newEx],
    });
  };

  // Open Get Code Modal helper
  const handleOpenGetCode = (prompt: PromptDraft) => {
    setGetCodeTargetPrompt(prompt);
    setIsGetCodeOpen(true);
  };

  // Global Keyboard shortcut for Run (Cmd+Enter or Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (activeTab === 'playground') {
          e.preventDefault();
          handleRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPrompt, isRunning, activeTab]);

  const isPromptEditorTab = activeTab === 'playground';

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0B] text-[#E2E8F0] overflow-hidden font-sans select-none">
      {/* Expandable / Collapsible Google AI Studio Style Sidebar */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setIsNavCollapsed(!isNavCollapsed)}
        onNewPrompt={handleOpenNewUsecaseModal}
        userRole={userRole}
        onToggleRole={handleToggleRole}
        usecasesCount={prompts.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentPrompt={currentPrompt}
          onUpdatePrompt={handleUpdatePrompt}
          onSavePrompt={handleSavePrompt}
          onOpenPromptList={() => setIsPromptListOpen(true)}
          onNewPrompt={handleOpenNewUsecaseModal}
          onGetCode={() => handleOpenGetCode(currentPrompt)}
          onRun={() => handleRun()}
          onStop={handleStop}
          isRunning={isRunning}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          models={models}
          userRole={userRole}
          onToggleRole={handleToggleRole}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Active Tab View */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* 1. Landing Page: All Use Cases */}
            {activeTab === 'usecases' && (
              <UsecasesLanding
                prompts={prompts}
                models={models}
                viewMode={viewMode}
                userRole={userRole}
                onToggleRole={handleToggleRole}
                onToggleViewMode={setViewMode}
                onSelectPrompt={handleSelectPrompt}
                onUpdatePromptStage={handleUpdatePromptStage}
                onUpdatePromptModel={handleUpdatePromptModel}
                onToggleSampleRuns={handleToggleSampleRuns}
                onNewPrompt={handleNewPrompt}
                onDuplicatePrompt={handleDuplicatePrompt}
                onDeletePrompt={handleDeletePrompt}
                onOpenGetCode={handleOpenGetCode}
                onOpenDetailsModal={handleOpenDetailsModal}
              />
            )}

            {/* 2. Sample Runs: Prompt Drafting with Single Prompt Area, # Variables, Versioning, Sample Runs & Latency */}
            {activeTab === 'playground' && (
              <PromptEditor
                prompt={currentPrompt}
                models={models}
                userRole={userRole}
                onToggleRole={handleToggleRole}
                onUpdatePrompt={handleUpdatePrompt}
                output={output}
                metrics={metrics}
                isRunning={isRunning}
                error={error}
                onRun={handleRun}
                onAddAsTestCase={handleAddAsTestCase}
                onAddAsFewShot={handleAddAsFewShot}
                onOpenGetCode={() => handleOpenGetCode(currentPrompt)}
                onOpenDetailsModal={() => handleOpenDetailsModal(currentPrompt)}
              />
            )}

            {/* 3. API Gateway & Telemetry */}
            {activeTab === 'gateway' && (
              <GatewayDashboard
                prompts={prompts}
                currentPrompt={currentPrompt}
                onSelectPrompt={(p) => {
                  setCurrentPromptId(p.id);
                  setActiveTab('playground');
                }}
              />
            )}

            {/* 4. Settings & Model Registry (Admin Only) */}
            {activeTab === 'settings' && (
              <AdminSettings
                userRole={userRole}
                onToggleRole={handleToggleRole}
                models={models}
                onAddModel={handleAddModel}
                onDeleteModel={handleDeleteModel}
              />
            )}
          </main>

          {/* Right Parameters Sidebar (Visible during prompt editing/tuning) */}
          {isPromptEditorTab && (
            <ParametersSidebar
              prompt={currentPrompt}
              onUpdatePrompt={handleUpdatePrompt}
              onUpdateConfig={handleUpdateConfig}
              isOpen={isSidebarOpen}
            />
          )}
        </div>
      </div>

      {/* Details & Prompt Versions Modal */}
      <UsecaseDetailsModal
        prompt={detailsTargetPrompt || currentPrompt}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsTargetPrompt(null);
        }}
        onSavePrompt={(updated) => {
          handleUpdatePrompt(updated, updated.id);
        }}
        onUpdatePrompt={(partial) => {
          const targetId = (detailsTargetPrompt || currentPrompt).id;
          handleUpdatePrompt(partial, targetId);
        }}
        onSelectPromptForSampleRuns={(promptId) => {
          setCurrentPromptId(promptId);
          setActiveTab('playground');
        }}
        onOpenDeploy={(p) => {
          setGetCodeTargetPrompt(p);
          setIsGetCodeOpen(true);
        }}
        models={models}
        userRole={userRole}
      />

      {/* Get Code & API Endpoint Modal (Shows Token Latency Info & Drop-in SDKs) */}
      <GetCodeModal
        prompt={getCodeTargetPrompt || currentPrompt}
        isOpen={isGetCodeOpen}
        onClose={() => {
          setIsGetCodeOpen(false);
          setGetCodeTargetPrompt(null);
        }}
      />

      {/* Saved Prompts Library Modal */}
      <PromptLibraryModal
        prompts={prompts}
        currentPromptId={currentPrompt.id}
        isOpen={isPromptListOpen}
        onClose={() => setIsPromptListOpen(false)}
        onSelectPrompt={(p) => setCurrentPromptId(p.id)}
        onNewPrompt={() => {
          setIsPromptListOpen(false);
          handleOpenNewUsecaseModal();
        }}
        onDeletePrompt={handleDeletePrompt}
      />

      {/* Add New / Duplicate Usecase Modal */}
      <NewUsecaseModal
        isOpen={isNewUsecaseModalOpen}
        onClose={() => {
          setIsNewUsecaseModalOpen(false);
          setDuplicateTargetPrompt(null);
        }}
        onSubmit={(newDraft) => {
          handleNewPrompt(newDraft);
          setIsNewUsecaseModalOpen(false);
          setDuplicateTargetPrompt(null);
        }}
        models={models}
        userRole={userRole}
        initialData={duplicateTargetPrompt}
      />
    </div>
  );
}
