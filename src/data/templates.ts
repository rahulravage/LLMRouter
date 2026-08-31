import { PromptDraft } from '../types';

export const INITIAL_PROMPTS: PromptDraft[] = [
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
Account Tier: {{account_tier=Standard}}
Priority Flag: {{priority_override?}}
Message:
"{{ticket_message}}"`,
    mode: 'freeform',
    variables: [
      {
        name: 'customer_name',
        required: true,
        description: 'Full name or handle of the customer filing the ticket',
      },
      {
        name: 'account_tier',
        required: false,
        defaultValue: 'Standard',
        description: 'Customer subscription tier (e.g. Free, Standard, Pro, Enterprise)',
      },
      {
        name: 'priority_override',
        required: false,
        defaultValue: '',
        description: 'Optional internal escalation override flag',
      },
      {
        name: 'ticket_message',
        required: true,
        description: 'Raw inbound support message body',
      },
    ],
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
        name: 'Sample #1: Urgent Payment Failure',
        variables: {
          customer_name: 'Sarah Connor',
          account_tier: 'Pro',
          priority_override: 'HIGH_VIP',
          ticket_message: 'My card was charged twice for the annual renewal. Please refund the duplicate $240 charge immediately.',
        },
        status: 'idle',
      },
      {
        id: 'tc-2',
        name: 'Sample #2: Feature Request (Default Tier)',
        variables: {
          customer_name: 'Alex Rivera',
          account_tier: 'Standard',
          priority_override: '',
          ticket_message: 'Hi team, do you have plans to support webhook integrations with Discord? Love the product so far!',
        },
        status: 'idle',
      },
      {
        id: 'tc-3',
        name: 'Sample #3: Critical Security Warning',
        variables: {
          customer_name: 'Security Admin',
          account_tier: 'Enterprise',
          priority_override: 'CRITICAL',
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
"{{user_question}}"

Target Dialect: {{sql_dialect=PostgreSQL 16}}
Optimization Goal: {{optimization_goal?}}`,
    mode: 'freeform',
    variables: [
      {
        name: 'schema_definition',
        required: true,
        description: 'DDL or schema table definitions',
      },
      {
        name: 'user_question',
        required: true,
        description: 'Natural language query request',
      },
      {
        name: 'sql_dialect',
        required: false,
        defaultValue: 'PostgreSQL 16',
        description: 'Target database engine and version',
      },
      {
        name: 'optimization_goal',
        required: false,
        defaultValue: '',
        description: 'Specific performance or indexing goal',
      },
    ],
    fewShotExamples: [],
    testCases: [
      {
        id: 'tc-sql-1',
        name: 'Sample #1: Top 5 Customers by Revenue',
        variables: {
          schema_definition: 'CREATE TABLE customers (id INT, name VARCHAR, created_at TIMESTAMP);\nCREATE TABLE orders (id INT, customer_id INT, total_amount DECIMAL, status VARCHAR);',
          user_question: 'Who are the top 5 customers by total completed order spending this month?',
          sql_dialect: 'PostgreSQL 16',
          optimization_goal: 'Use index on orders(customer_id, created_at)',
        },
        status: 'idle',
      },
      {
        id: 'tc-sql-2',
        name: 'Sample #2: Churn Detection Filter',
        variables: {
          schema_definition: 'CREATE TABLE subscriptions (id INT, user_id INT, status VARCHAR, last_active_at TIMESTAMP);',
          user_question: 'Find all active users who have not had any activity in the last 30 days.',
          sql_dialect: 'PostgreSQL 16',
          optimization_goal: '',
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
    updatedAt: Date.now() - 3600000 * 2,
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
Tone of Voice: {{tone=Modern & Confident}}
Call to Action: {{cta?}}

Please output:
1. 3 Catchy Headlines
2. 3 Benefit-driven Bullet Points (Format: **Benefit Header**: Explanation)
3. 1 Social Media Ad caption with CTA`,
    mode: 'freeform',
    variables: [
      {
        name: 'product_name',
        required: true,
        description: 'Name of the product or item',
      },
      {
        name: 'target_audience',
        required: true,
        description: 'Primary customer persona',
      },
      {
        name: 'key_features',
        required: true,
        description: 'Specs, dimensions, or distinguishing features',
      },
      {
        name: 'tone',
        required: false,
        defaultValue: 'Modern & Confident',
        description: 'Brand voice and emotional tone',
      },
      {
        name: 'cta',
        required: false,
        defaultValue: 'Shop Now',
        description: 'Specific call to action button text',
      },
    ],
    fewShotExamples: [],
    testCases: [
      {
        id: 'tc-copy-1',
        name: 'Sample #1: Ergonomic Desk Chair',
        variables: {
          product_name: 'AeroSpine Ergonomic Chair',
          target_audience: 'Remote software engineers and designers working 8+ hours a day',
          key_features: 'Breathable mesh, lumbar tracking dynamic support, 4D armrests, rollerblade wheels',
          tone: 'Modern & Confident',
          cta: 'Upgrade Your Workspace',
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
    updatedAt: Date.now() - 3600000 * 5,
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
    userPrompt: `Programming Language: {{language=TypeScript}}
Repository: {{repo_name}}
Pull Request Diff:
\`\`\`
{{code_diff}}
\`\`\`

Review Focus: {{focus_areas?}}`,
    mode: 'freeform',
    variables: [
      { name: 'language', required: false, defaultValue: 'TypeScript', description: 'Primary codebase language' },
      { name: 'repo_name', required: true, description: 'GitHub repository or service name' },
      { name: 'code_diff', required: true, description: 'Git diff patch or code block' },
      { name: 'focus_areas', required: false, defaultValue: 'OWASP Top 10 & API Auth', description: 'Specific audit areas' },
    ],
    fewShotExamples: [],
    testCases: [
      {
        id: 'tc-sec-1',
        name: 'Sample #1: SQL Injection Vector',
        variables: {
          language: 'TypeScript',
          repo_name: 'acme/auth-service',
          code_diff: 'const query = `SELECT * FROM users WHERE email = \'${req.body.email}\'`;',
          focus_areas: 'SQL Injection',
        },
        status: 'idle',
      },
    ],
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
  {
    id: 'clinical-note-summarizer',
    title: 'EHR Clinical Encounter Summarizer',
    description: 'Summarizes doctor-patient transcriptions into SOAP (Subjective, Objective, Assessment, Plan) format.',
    stage: 'Tune',
    model: 'claude-3-7-sonnet',
    systemInstruction: `You are a certified Medical Scribe AI. Extract clinical findings from doctor-patient conversation transcripts into structured SOAP notes. Maintain clinical precision and medical terminologies.`,
    userPrompt: `Patient Age/Gender: {{patient_demographics}}
Encounter Type: {{encounter_type=Follow-up}}
Audio Transcript:
"{{transcript}}"`,
    mode: 'freeform',
    variables: [
      { name: 'patient_demographics', required: true, description: 'e.g. 54M, 28F' },
      { name: 'encounter_type', required: false, defaultValue: 'Follow-up', description: 'Type of clinical visit' },
      { name: 'transcript', required: true, description: 'Doctor-patient conversation dialog' },
    ],
    fewShotExamples: [],
    testCases: [
      {
        id: 'tc-med-1',
        name: 'Sample #1: Hypertension Check',
        variables: {
          patient_demographics: '58yo Male',
          encounter_type: 'Quarterly Checkup',
          transcript: 'Doctor: How have your morning readings been? Patient: Averaging 138 over 88 with Lisinopril.',
        },
        status: 'idle',
      },
    ],
    config: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: 'text/plain',
      stopSequences: [],
    },
    createdAt: Date.now() - 3600000 * 120,
    updatedAt: Date.now() - 3600000 * 20,
    endpointSlug: 'clinical-note-summarizer',
    tags: ['Healthcare', 'SOAP Notes', 'NLP'],
  },
];
