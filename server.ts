import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Supported model mapping (LiteLLM Aliases -> Actual Google Gemini models)
let customRegisteredModels: any[] = [];

const MODEL_MAPPING: Record<string, string> = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-3.7-flash": "gemini-3.7-flash",
  "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
  "gpt-4o": "gemini-2.5-flash",
  "gpt-4o-mini": "gemini-2.5-flash",
  "gpt-4": "gemini-2.5-pro",
  "gpt-3.5-turbo": "gemini-2.5-flash",
  "claude-3-7-sonnet": "gemini-2.5-pro",
  "claude-3-5-sonnet": "gemini-2.5-pro",
  "claude-3-haiku": "gemini-2.5-flash",
  "gemini-flash": "gemini-2.5-flash",
  "gemini-pro": "gemini-2.5-pro",
};

function resolveModel(inputModel?: string): string {
  if (!inputModel) return "gemini-3.7-flash";
  const normalized = inputModel.toLowerCase().trim();
  
  // Check custom registry first
  const custom = customRegisteredModels.find(m => m.id.toLowerCase() === normalized || m.name.toLowerCase() === normalized);
  if (custom && custom.actualModel) {
    return MODEL_MAPPING[custom.actualModel.toLowerCase()] || custom.actualModel;
  }

  return MODEL_MAPPING[normalized] || "gemini-3.7-flash";
}

// In-memory Gateway Analytics & Log Store
interface GatewayLogRecord {
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

const gatewayLogs: GatewayLogRecord[] = [];

// Seed Prompts Store
let storedPrompts: any[] = [
  {
    id: 'support-triage-v1',
    title: 'Customer Ticket Triage & Intent Classifier',
    description: 'Classifies inbound customer tickets, determines sentiment, urgency, and extracts key entities in JSON.',
    stage: 'Deployed',
    model: 'gemini-3.7-flash',
    systemInstruction: `You are an expert customer operations AI. Analyze the incoming customer ticket and respond in valid JSON matching this schema:
{
  "category": "Billing" | "Technical" | "Account" | "Feedback" | "General",
  "urgency": "Low" | "Medium" | "High" | "Critical",
  "sentiment": "Positive" | "Neutral" | "Frustrated" | "Angry",
  "summary": "1-sentence summary",
  "suggested_action": "Immediate action step for agent",
  "escalate_to_tier_2": boolean
}`,
    userPrompt: `Customer Name: {{customer_name}}
Account Tier: {{account_tier}}
Message:
"{{ticket_message}}"`,
    mode: 'freeform',
    fewShotExamples: [
      {
        id: 'ex-1',
        input: 'Customer Name: John Doe\nAccount Tier: Enterprise\nMessage:\n"Our production API is failing with 500 errors since 20 minutes ago. We are losing transactions!"',
        output: '{\n  "category": "Technical",\n  "urgency": "Critical",\n  "sentiment": "Frustrated",\n  "summary": "Production API throwing 500 errors causing transaction loss.",\n  "suggested_action": "Check gateway telemetry and alert on-call engineer immediately.",\n  "escalate_to_tier_2": true\n}',
      },
    ],
    testCases: [
      {
        id: 'tc-1',
        name: 'Urgent Payment Failure',
        variables: {
          customer_name: 'Sarah Connor',
          account_tier: 'Pro',
          ticket_message: 'My card was charged twice for the annual renewal. Please refund the duplicate $240 charge immediately.',
        },
        status: 'idle',
      },
      {
        id: 'tc-2',
        name: 'Feature Request Inquiry',
        variables: {
          customer_name: 'Alex Rivera',
          account_tier: 'Starter',
          ticket_message: 'Hi team, do you have plans to support webhook integrations with Discord? Love the product so far!',
        },
        status: 'idle',
      },
      {
        id: 'tc-3',
        name: 'Critical Security Warning',
        variables: {
          customer_name: 'Security Admin',
          account_tier: 'Enterprise',
          ticket_message: 'We noticed unusual login attempts from unexpected IP ranges on our SSO tenant. Need audit logs ASAP.',
        },
        status: 'idle',
      },
    ],
    config: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      stopSequences: [],
    },
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now(),
    endpointSlug: 'support-triage-v1',
    tags: ['Customer Ops', 'JSON Mode', 'Triage'],
  },
  {
    id: 'sql-query-generator',
    title: 'Natural Language to Postgres SQL Generator',
    description: 'Generates secure, optimized PostgreSQL queries with explanations and safety guards.',
    stage: 'Tune',
    model: 'gemini-2.5-pro',
    systemInstruction: `You are a PostgreSQL database specialist. Convert the natural language request into clean, standard SQL.
Always follow safe practices:
- Use parameterized placeholder formatting ($1, $2) where appropriate
- Always add LIMIT 100 by default unless explicitly asked for aggregations or full exports
- Provide a concise 1-2 sentence explanation of the query index usage.`,
    userPrompt: `Database Schema:
{{schema_definition}}

User Question:
"{{user_question}}"`,
    mode: 'freeform',
    fewShotExamples: [],
    testCases: [
      {
        id: 'tc-sql-1',
        name: 'Top 5 Customers by Revenue',
        variables: {
          schema_definition: 'CREATE TABLE customers (id INT, name VARCHAR, created_at TIMESTAMP);\nCREATE TABLE orders (id INT, customer_id INT, total_amount DECIMAL, status VARCHAR);',
          user_question: 'Who are the top 5 customers by total completed order spending this month?',
        },
        status: 'idle',
      },
      {
        id: 'tc-sql-2',
        name: 'Churn Detection Filter',
        variables: {
          schema_definition: 'CREATE TABLE subscriptions (id INT, user_id INT, status VARCHAR, last_active_at TIMESTAMP);',
          user_question: 'Find all active users who have not had any activity in the last 30 days.',
        },
        status: 'idle',
      },
    ],
    config: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: 'text/plain',
      stopSequences: [],
    },
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now(),
    endpointSlug: 'sql-query-generator',
    tags: ['Database', 'Coding', 'SQL'],
  },
  {
    id: 'product-copywriter',
    title: 'High-Converting E-Commerce Copywriter',
    description: 'Generates engaging marketing headlines, feature bullet points, and social ad copy for products.',
    stage: 'Details',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are an elite direct-response e-commerce copywriter. Craft compelling, benefit-focused marketing copy with high emotional resonance and punchy clarity. Avoid buzzwords and clichés.`,
    userPrompt: `Product Name: {{product_name}}
Target Audience: {{target_audience}}
Key Features: {{key_features}}
Tone of Voice: {{tone}}

Please output:
1. 3 Catchy Headlines
2. 3 Benefit-driven Bullet Points (Format: **Benefit Header**: Explanation)
3. 1 Instagram Ad caption with CTA and 3 relevant hashtags`,
    mode: 'freeform',
    fewShotExamples: [],
    testCases: [
      {
        id: 'tc-copy-1',
        name: 'Ergonomic Desk Chair',
        variables: {
          product_name: 'AeroSpine Ergonomic Chair',
          target_audience: 'Remote software engineers and designers working 8+ hours a day',
          key_features: 'Breathable mesh, lumbar tracking dynamic support, 4D armrests, rollerblade wheels',
          tone: 'Modern, punchy, confident and wellness-minded',
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
    createdAt: Date.now() - 3600000 * 72,
    updatedAt: Date.now(),
    endpointSlug: 'product-copywriter',
    tags: ['Marketing', 'Copywriting', 'Creative'],
  },
  {
    id: 'code-review-security',
    title: 'Automated Code Security & Vulnerability Auditor',
    description: 'Audits pull request diffs for OWASP vulnerabilities, secret leaks, and memory safety issues.',
    stage: 'Deployed',
    model: 'gemini-3.7-flash',
    systemInstruction: `You are a Senior Principal Security Engineer. Inspect the provided code snippet or git diff for security vulnerabilities (CWE/OWASP), hardcoded secrets, injection vectors, and concurrency risks. Respond with severity rankings (CRITICAL, HIGH, MEDIUM, LOW) and exact code remediation.`,
    userPrompt: `Programming Language: {{language}}
Repository: {{repo_name}}
Pull Request Diff:
\`\`\`
{{code_diff}}
\`\`\``,
    mode: 'freeform',
    fewShotExamples: [],
    testCases: [],
    config: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'text/plain',
      stopSequences: [],
    },
    createdAt: Date.now() - 3600000 * 96,
    updatedAt: Date.now() - 3600000 * 12,
    endpointSlug: 'code-review-security',
    tags: ['Security', 'DevSecOps', 'Code Review'],
  },
];

// Helper to interpolate variables in template with support for optional, defaults, and mandatory markers
const VARIABLE_EXTRACT_REGEX = /\{\{\s*([a-zA-Z0-9_]+)([\*\?])?(?:=([^}]+))?\s*\}\}/g;

function renderTemplate(
  template: string,
  variables: Record<string, string> = {},
  variableDefs: Array<{ name: string; required: boolean; defaultValue?: string }> = []
): string {
  if (!template) return '';
  const defsMap = new Map<string, { name: string; required: boolean; defaultValue?: string }>();
  if (variableDefs) {
    variableDefs.forEach((d) => defsMap.set(d.name, d));
  }

  return template.replace(VARIABLE_EXTRACT_REGEX, (_match, name, modifier, defaultInTag) => {
    const def = defsMap.get(name);
    const fallbackVal = defaultInTag !== undefined ? defaultInTag.trim() : def?.defaultValue;
    const userVal = variables[name];
    const hasUserVal = userVal !== undefined && userVal !== null && userVal !== '';

    if (hasUserVal) {
      return userVal;
    }
    if (fallbackVal !== undefined && fallbackVal !== '') {
      return fallbackVal;
    }
    // If optional without default, return empty string
    if (modifier === '?' || (def && !def.required)) {
      return '';
    }
    // Return placeholder if missing mandatory
    return `{{${name}}}`;
  });
}

// Estimate tokens roughly (approx 4 chars per token)
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // CORS headers for LiteLLM proxy callers
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-goog-api-key");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Lazy Gemini Client
  let aiClient: GoogleGenAI | null = null;
  function getAI(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // ----------------------------------------------------
  // API Routes
  // ----------------------------------------------------

  // 1. Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // 2. Stored Prompts CRUD
  app.get("/api/prompts", (_req, res) => {
    res.json({ prompts: storedPrompts });
  });

  // 2b. Custom Model Registry CRUD
  app.get("/api/models", (_req, res) => {
    res.json({ customModels: customRegisteredModels });
  });

  app.post("/api/models", (req, res) => {
    const newModel = {
      ...req.body,
      id: req.body.id || `custom-${Date.now().toString(36)}`,
      isCustom: true,
      createdAt: Date.now(),
    };
    customRegisteredModels.push(newModel);
    res.status(201).json({ model: newModel, customModels: customRegisteredModels });
  });

  app.delete("/api/models/:id", (req, res) => {
    const { id } = req.params;
    customRegisteredModels = customRegisteredModels.filter((m) => m.id !== id);
    res.json({ success: true, customModels: customRegisteredModels });
  });

  app.post("/api/prompts", (req, res) => {
    const newPrompt = {
      ...req.body,
      id: req.body.id || `prompt-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      endpointSlug: req.body.endpointSlug || `prompt-${Date.now().toString(36)}`,
    };
    storedPrompts.unshift(newPrompt);
    res.status(201).json({ prompt: newPrompt });
  });

  app.put("/api/prompts/:id", (req, res) => {
    const { id } = req.params;
    const index = storedPrompts.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Prompt not found" });
      return;
    }
    storedPrompts[index] = {
      ...storedPrompts[index],
      ...req.body,
      updatedAt: Date.now(),
    };
    res.json({ prompt: storedPrompts[index] });
  });

  app.delete("/api/prompts/:id", (req, res) => {
    const { id } = req.params;
    storedPrompts = storedPrompts.filter((p) => p.id !== id);
    res.json({ success: true });
  });

  // 3. Playground Generation & Streaming (`/api/generate`)
  app.post("/api/generate", async (req: Request, res: Response) => {
    const startTime = Date.now();
    const {
      promptId,
      promptTitle,
      model = "gemini-3.7-flash",
      systemInstruction = "",
      userPrompt = "",
      variables = {},
      variableDefinitions = [],
      fewShotExamples = [],
      config = {},
      stream = false,
      source = "Playground",
    } = req.body;

    const requestedModel = model;
    const actualModel = resolveModel(model);

    try {
      const ai = getAI();

      // Assemble content with few-shot examples if present
      let finalPrompt = renderTemplate(userPrompt, variables, variableDefinitions);
      let contents: any[] = [];

      if (fewShotExamples && fewShotExamples.length > 0) {
        for (const ex of fewShotExamples) {
          if (ex.input) {
            contents.push({ role: "user", parts: [{ text: ex.input }] });
          }
          if (ex.output) {
            contents.push({ role: "model", parts: [{ text: ex.output }] });
          }
        }
        contents.push({ role: "user", parts: [{ text: finalPrompt }] });
      } else {
        contents = [finalPrompt];
      }

      // Configure SDK options
      const genConfig: any = {
        temperature: config.temperature !== undefined ? Number(config.temperature) : 0.7,
        topP: config.topP !== undefined ? Number(config.topP) : 0.95,
        maxOutputTokens: config.maxOutputTokens ? Number(config.maxOutputTokens) : 2048,
      };

      if (systemInstruction && systemInstruction.trim()) {
        genConfig.systemInstruction = systemInstruction.trim();
      }

      if (config.responseMimeType) {
        genConfig.responseMimeType = config.responseMimeType;
      }

      if (config.stopSequences && Array.isArray(config.stopSequences) && config.stopSequences.length > 0) {
        genConfig.stopSequences = config.stopSequences.filter(Boolean);
      }

      if (config.thinkingLevel && actualModel.startsWith("gemini-3")) {
        if (config.thinkingLevel === "HIGH") genConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        else if (config.thinkingLevel === "LOW") genConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        else if (config.thinkingLevel === "MINIMAL" && actualModel !== "gemini-3.1-pro-preview") {
          genConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        }
      }

      const promptEstimatedTokens = estimateTokens(systemInstruction + " " + finalPrompt);

      // Handle Streaming
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const streamResponse = await ai.models.generateContentStream({
          model: actualModel,
          contents: contents.length === 1 ? contents[0] : { parts: contents },
          config: genConfig,
        });

        let fullText = "";
        let firstTokenTime: number | null = null;

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text || "";
          if (chunkText) {
            if (firstTokenTime === null) {
              firstTokenTime = Date.now() - startTime;
            }
            fullText += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
          }
        }

        const totalTime = Date.now() - startTime;
        const outputEstimatedTokens = estimateTokens(fullText);

        const metrics = {
          latencyMs: totalTime,
          timeToFirstTokenMs: firstTokenTime || totalTime,
          promptTokens: promptEstimatedTokens,
          outputTokens: outputEstimatedTokens,
          totalTokens: promptEstimatedTokens + outputEstimatedTokens,
          actualModel,
          requestedModel,
        };

        // Record Gateway Log
        gatewayLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          promptId,
          promptTitle: promptTitle || "Playground Run",
          timestamp: Date.now(),
          method: "POST",
          path: "/api/generate",
          modelRequested: requestedModel,
          modelExecuted: actualModel,
          status: 200,
          latencyMs: totalTime,
          promptTokens: promptEstimatedTokens,
          outputTokens: outputEstimatedTokens,
          source: source as any,
        });

        res.write(`data: ${JSON.stringify({ done: true, metrics, fullText })}\n\n`);
        res.end();
        return;
      }

      // Non-streaming execution
      const response = await ai.models.generateContent({
        model: actualModel,
        contents: contents.length === 1 ? contents[0] : { parts: contents },
        config: genConfig,
      });

      const outputText = response.text || "";
      const totalTime = Date.now() - startTime;
      const outputEstimatedTokens = estimateTokens(outputText);

      const metrics = {
        latencyMs: totalTime,
        promptTokens: promptEstimatedTokens,
        outputTokens: outputEstimatedTokens,
        totalTokens: promptEstimatedTokens + outputEstimatedTokens,
        actualModel,
        requestedModel,
      };

      // Record Gateway Log
      gatewayLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        promptId,
        promptTitle: promptTitle || "Playground Run",
        timestamp: Date.now(),
        method: "POST",
        path: "/api/generate",
        modelRequested: requestedModel,
        modelExecuted: actualModel,
        status: 200,
        latencyMs: totalTime,
        promptTokens: promptEstimatedTokens,
        outputTokens: outputEstimatedTokens,
        source: source as any,
      });

      res.json({
        text: outputText,
        metrics,
      });
    } catch (err: any) {
      const totalTime = Date.now() - startTime;
      const errorMessage = err?.message || "Generation error occurred";

      gatewayLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        promptId,
        promptTitle: promptTitle || "Failed Run",
        timestamp: Date.now(),
        method: "POST",
        path: "/api/generate",
        modelRequested: requestedModel,
        modelExecuted: actualModel,
        status: 500,
        latencyMs: totalTime,
        promptTokens: 0,
        outputTokens: 0,
        source: source as any,
      });

      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
        res.end();
      }
    }
  });

  // 4. Model Comparison Arena (`/api/compare`)
  app.post("/api/compare", async (req: Request, res: Response) => {
    const {
      modelA = "gemini-3.7-flash",
      modelB = "gemini-3.1-pro-preview",
      systemInstruction = "",
      userPrompt = "",
      variables = {},
      variableDefinitions = [],
      config = {},
    } = req.body;

    const runModel = async (modelName: string) => {
      const startTime = Date.now();
      const actualModel = resolveModel(modelName);
      const promptText = renderTemplate(userPrompt, variables, variableDefinitions);
      const promptEstimatedTokens = estimateTokens(systemInstruction + " " + promptText);

      try {
        const ai = getAI();
        const genConfig: any = {
          temperature: config.temperature !== undefined ? Number(config.temperature) : 0.7,
          topP: config.topP !== undefined ? Number(config.topP) : 0.95,
          maxOutputTokens: config.maxOutputTokens ? Number(config.maxOutputTokens) : 2048,
        };

        if (systemInstruction && systemInstruction.trim()) {
          genConfig.systemInstruction = systemInstruction.trim();
        }
        if (config.responseMimeType) {
          genConfig.responseMimeType = config.responseMimeType;
        }

        const response = await ai.models.generateContent({
          model: actualModel,
          contents: promptText,
          config: genConfig,
        });

        const outputText = response.text || "";
        const latencyMs = Date.now() - startTime;
        const outputTokens = estimateTokens(outputText);

        return {
          model: modelName,
          actualModel,
          text: outputText,
          latencyMs,
          promptTokens: promptEstimatedTokens,
          outputTokens,
          totalTokens: promptEstimatedTokens + outputTokens,
          success: true,
        };
      } catch (err: any) {
        return {
          model: modelName,
          actualModel,
          text: "",
          latencyMs: Date.now() - startTime,
          promptTokens: promptEstimatedTokens,
          outputTokens: 0,
          totalTokens: promptEstimatedTokens,
          error: err?.message || "Failed to execute",
          success: false,
        };
      }
    };

    try {
      const [resultA, resultB] = await Promise.all([runModel(modelA), runModel(modelB)]);
      res.json({ resultA, resultB });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Comparison failed" });
    }
  });

  // 5. Batch Test Matrix Runner (`/api/batch-test`)
  app.post("/api/batch-test", async (req: Request, res: Response) => {
    const {
      promptId,
      promptTitle,
      model = "gemini-3.7-flash",
      systemInstruction = "",
      userPrompt = "",
      variableDefinitions = [],
      testCases = [],
      config = {},
    } = req.body;

    const actualModel = resolveModel(model);
    const ai = getAI();

    const results = await Promise.all(
      testCases.map(async (tc: any) => {
        const startTime = Date.now();
        const promptText = renderTemplate(userPrompt, tc.variables || {}, variableDefinitions);
        const promptEstimatedTokens = estimateTokens(systemInstruction + " " + promptText);

        try {
          const genConfig: any = {
            temperature: config.temperature !== undefined ? Number(config.temperature) : 0.7,
            topP: config.topP !== undefined ? Number(config.topP) : 0.95,
            maxOutputTokens: config.maxOutputTokens ? Number(config.maxOutputTokens) : 2048,
          };
          if (systemInstruction && systemInstruction.trim()) {
            genConfig.systemInstruction = systemInstruction.trim();
          }
          if (config.responseMimeType) {
            genConfig.responseMimeType = config.responseMimeType;
          }

          const response = await ai.models.generateContent({
            model: actualModel,
            contents: promptText,
            config: genConfig,
          });

          const outputText = response.text || "";
          const latencyMs = Date.now() - startTime;
          const outputTokens = estimateTokens(outputText);

          return {
            id: tc.id,
            status: "success",
            lastRun: {
              output: outputText,
              latencyMs,
              promptTokens: promptEstimatedTokens,
              outputTokens,
              timestamp: Date.now(),
            },
          };
        } catch (err: any) {
          return {
            id: tc.id,
            status: "failed",
            lastRun: {
              output: "",
              latencyMs: Date.now() - startTime,
              promptTokens: promptEstimatedTokens,
              outputTokens: 0,
              timestamp: Date.now(),
              error: err?.message || "Execution error",
            },
          };
        }
      })
    );

    // Record to gateway logs
    gatewayLogs.unshift({
      id: `log-${Date.now()}`,
      promptId,
      promptTitle: promptTitle || "Batch Test Matrix",
      timestamp: Date.now(),
      method: "POST",
      path: "/api/batch-test",
      modelRequested: model,
      modelExecuted: actualModel,
      status: 200,
      latencyMs: results.reduce((acc, r) => acc + (r.lastRun?.latencyMs || 0), 0),
      promptTokens: results.reduce((acc, r) => acc + (r.lastRun?.promptTokens || 0), 0),
      outputTokens: results.reduce((acc, r) => acc + (r.lastRun?.outputTokens || 0), 0),
      source: "Batch Runner",
    });

    res.json({ testCases: results });
  });

  // 6. Dedicated Prompt Endpoint (`POST /api/v1/prompts/:id/run` or `/api/v1/prompts/:slug/run`)
  app.post(["/api/v1/prompts/:id/run", "/api/v1/prompts/:slug"], async (req: Request, res: Response) => {
    const startTime = Date.now();
    const promptParam = req.params.id || req.params.slug;
    const prompt = storedPrompts.find((p) => p.id === promptParam || p.endpointSlug === promptParam);

    if (!prompt) {
      res.status(404).json({
        error: `Prompt '${promptParam}' not found in registry.`,
        availableEndpoints: storedPrompts.map((p) => p.id),
      });
      return;
    }

    const {
      variables = {},
      override_model,
      override_temperature,
      override_system,
      stream = false,
    } = req.body;

    const requestedModel = override_model || prompt.model || "gemini-3.7-flash";
    const actualModel = resolveModel(requestedModel);

    try {
      const ai = getAI();
      const finalSystem = override_system !== undefined ? override_system : prompt.systemInstruction;
      const finalPrompt = renderTemplate(prompt.userPrompt, variables, prompt.variables || []);

      const genConfig: any = {
        temperature: override_temperature !== undefined ? Number(override_temperature) : prompt.config?.temperature ?? 0.7,
        topP: prompt.config?.topP ?? 0.95,
        maxOutputTokens: prompt.config?.maxOutputTokens ?? 2048,
      };

      if (finalSystem && finalSystem.trim()) {
        genConfig.systemInstruction = finalSystem.trim();
      }
      if (prompt.config?.responseMimeType) {
        genConfig.responseMimeType = prompt.config.responseMimeType;
      }
      if (prompt.config?.stopSequences && prompt.config.stopSequences.length > 0) {
        genConfig.stopSequences = prompt.config.stopSequences;
      }

      const promptEstimatedTokens = estimateTokens((finalSystem || "") + " " + finalPrompt);

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const streamResponse = await ai.models.generateContentStream({
          model: actualModel,
          contents: finalPrompt,
          config: genConfig,
        });

        let fullText = "";
        for await (const chunk of streamResponse) {
          const chunkText = chunk.text || "";
          if (chunkText) {
            fullText += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
          }
        }

        const totalTime = Date.now() - startTime;
        const outputTokens = estimateTokens(fullText);

        gatewayLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          promptId: prompt.id,
          promptTitle: prompt.title,
          timestamp: Date.now(),
          method: "POST",
          path: `/api/v1/prompts/${prompt.id}/run`,
          modelRequested: requestedModel,
          modelExecuted: actualModel,
          status: 200,
          latencyMs: totalTime,
          promptTokens: promptEstimatedTokens,
          outputTokens,
          source: "API Endpoint",
        });

        res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
        res.end();
        return;
      }

      const response = await ai.models.generateContent({
        model: actualModel,
        contents: finalPrompt,
        config: genConfig,
      });

      const outputText = response.text || "";
      const totalTime = Date.now() - startTime;
      const outputTokens = estimateTokens(outputText);

      gatewayLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        promptId: prompt.id,
        promptTitle: prompt.title,
        timestamp: Date.now(),
        method: "POST",
        path: `/api/v1/prompts/${prompt.id}/run`,
        modelRequested: requestedModel,
        modelExecuted: actualModel,
        status: 200,
        latencyMs: totalTime,
        promptTokens: promptEstimatedTokens,
        outputTokens,
        source: "API Endpoint",
      });

      res.json({
        id: `litellm-${Date.now()}`,
        prompt_id: prompt.id,
        prompt_title: prompt.title,
        model: requestedModel,
        routed_model: actualModel,
        response: outputText,
        usage: {
          prompt_tokens: promptEstimatedTokens,
          completion_tokens: outputTokens,
          total_tokens: promptEstimatedTokens + outputTokens,
        },
        latency_ms: totalTime,
      });
    } catch (err: any) {
      const totalTime = Date.now() - startTime;
      gatewayLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        promptId: prompt.id,
        promptTitle: prompt.title,
        timestamp: Date.now(),
        method: "POST",
        path: `/api/v1/prompts/${prompt.id}/run`,
        modelRequested: requestedModel,
        modelExecuted: actualModel,
        status: 500,
        latencyMs: totalTime,
        promptTokens: 0,
        outputTokens: 0,
        source: "API Endpoint",
      });

      res.status(500).json({ error: err?.message || "Failed to execute prompt endpoint" });
    }
  });

  // 7. OpenAI / LiteLLM Compatible Chat Completions Gateway (`POST /v1/chat/completions` & `/api/v1/chat/completions`)
  app.post(["/v1/chat/completions", "/api/v1/chat/completions"], async (req: Request, res: Response) => {
    const startTime = Date.now();
    const {
      model = "gemini-3.7-flash",
      messages = [],
      temperature = 0.7,
      top_p = 0.95,
      max_tokens = 2048,
      stream = false,
      response_format,
    } = req.body;

    const requestedModel = model;
    const actualModel = resolveModel(requestedModel);

    try {
      const ai = getAI();

      // Extract system message and user/assistant messages
      let systemInstruction = "";
      const contents: any[] = [];

      for (const msg of messages) {
        if (msg.role === "system") {
          systemInstruction += (systemInstruction ? "\n" : "") + msg.content;
        } else if (msg.role === "user") {
          contents.push({ role: "user", parts: [{ text: msg.content }] });
        } else if (msg.role === "assistant") {
          contents.push({ role: "model", parts: [{ text: msg.content }] });
        }
      }

      const genConfig: any = {
        temperature: Number(temperature),
        topP: Number(top_p),
        maxOutputTokens: Number(max_tokens),
      };

      if (systemInstruction) {
        genConfig.systemInstruction = systemInstruction;
      }
      if (response_format?.type === "json_object") {
        genConfig.responseMimeType = "application/json";
      }

      const promptEstimatedTokens = estimateTokens(JSON.stringify(messages));

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const streamResponse = await ai.models.generateContentStream({
          model: actualModel,
          contents: contents.length === 1 ? contents[0] : { parts: contents },
          config: genConfig,
        });

        const createdId = `chatcmpl-${Date.now()}`;
        let fullText = "";

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text || "";
          if (chunkText) {
            fullText += chunkText;
            const openAiChunk = {
              id: createdId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: requestedModel,
              choices: [
                {
                  index: 0,
                  delta: { content: chunkText },
                  finish_reason: null,
                },
              ],
            };
            res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
          }
        }

        // Send final chunk
        const finalChunk = {
          id: createdId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: requestedModel,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        };
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();

        const totalTime = Date.now() - startTime;
        const outputTokens = estimateTokens(fullText);

        gatewayLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          promptTitle: "OpenAI Proxy Chat",
          timestamp: Date.now(),
          method: "POST",
          path: "/v1/chat/completions",
          modelRequested: requestedModel,
          modelExecuted: actualModel,
          status: 200,
          latencyMs: totalTime,
          promptTokens: promptEstimatedTokens,
          outputTokens,
          source: "OpenAI Proxy",
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: actualModel,
        contents: contents.length === 1 ? contents[0] : { parts: contents },
        config: genConfig,
      });

      const outputText = response.text || "";
      const totalTime = Date.now() - startTime;
      const outputTokens = estimateTokens(outputText);

      gatewayLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        promptTitle: "OpenAI Proxy Chat",
        timestamp: Date.now(),
        method: "POST",
        path: "/v1/chat/completions",
        modelRequested: requestedModel,
        modelExecuted: actualModel,
        status: 200,
        latencyMs: totalTime,
        promptTokens: promptEstimatedTokens,
        outputTokens,
        source: "OpenAI Proxy",
      });

      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: outputText,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: promptEstimatedTokens,
          completion_tokens: outputTokens,
          total_tokens: promptEstimatedTokens + outputTokens,
        },
      });
    } catch (err: any) {
      const totalTime = Date.now() - startTime;
      gatewayLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        promptTitle: "OpenAI Proxy Failed",
        timestamp: Date.now(),
        method: "POST",
        path: "/v1/chat/completions",
        modelRequested: requestedModel,
        modelExecuted: actualModel,
        status: 500,
        latencyMs: totalTime,
        promptTokens: 0,
        outputTokens: 0,
        source: "OpenAI Proxy",
      });

      res.status(500).json({
        error: {
          message: err?.message || "Failed to process chat completion",
          type: "server_error",
          code: 500,
        },
      });
    }
  });

  // 8. Gateway Analytics & Logs (`GET /api/gateway/stats`)
  app.get("/api/gateway/stats", (_req, res) => {
    const totalRequests = gatewayLogs.length;
    const totalPromptTokens = gatewayLogs.reduce((acc, l) => acc + l.promptTokens, 0);
    const totalOutputTokens = gatewayLogs.reduce((acc, l) => acc + l.outputTokens, 0);
    const avgLatency = totalRequests > 0 ? Math.round(gatewayLogs.reduce((acc, l) => acc + l.latencyMs, 0) / totalRequests) : 0;
    const successCount = gatewayLogs.filter((l) => l.status === 200).length;
    const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;

    res.json({
      stats: {
        totalRequests,
        totalPromptTokens,
        totalOutputTokens,
        totalTokens: totalPromptTokens + totalOutputTokens,
        avgLatencyMs: avgLatency,
        successRate,
      },
      recentLogs: gatewayLogs.slice(0, 100),
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LiteLLM & AI Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
