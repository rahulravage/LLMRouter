import { PromptVariable } from '../types';

// Regex to detect:
// 1. {{#var}} -> Mandatory variable identified by '#' prefix
// 2. {{var}} -> Optional variable
// 3. {{var*}} -> Mandatory variable
// 4. {{var?}} -> Optional variable
// 5. {{#var=default}} or {{var=default}} -> With default value
export const BRACED_VARIABLE_REGEX = /\{\{\s*(#)?([a-zA-Z0-9_]+)([\*\?])?(?:=([^}]+))?\s*\}\}/g;

// Regex to detect standalone #var (e.g. #test, #customer_id, #input_text) when not inside curly braces
// Excludes markdown headers by requiring word character immediately after '#'
export const HASHTAG_VARIABLE_REGEX = /(?<![\w{])#([a-zA-Z][a-zA-Z0-9_]*)\b(?!\}|\s*[a-zA-Z0-9_]*\s*})/g;

// Combined extraction regex for template variable detection
export const VARIABLE_EXTRACT_REGEX = /\{\{\s*(#)?([a-zA-Z0-9_]+)([\*\?])?(?:=([^}]+))?\s*\}\}/g;

/**
 * Formats a variable name into the proper template tag string with # for mandatory
 */
export function formatVariableTag(name: string, isMandatory: boolean, defaultValue?: string): string {
  const clean = name.trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9_]/g, '_');
  const prefix = isMandatory ? '#' : '';
  const def = defaultValue !== undefined && defaultValue !== '' ? `=${defaultValue}` : '';
  return `{{${prefix}${clean}${def}}}`;
}

/**
 * Color metadata for inline variable representation
 * Red = Mandatory (#)
 * Blue = Optional
 */
export interface VariableColorTheme {
  isMandatory: boolean;
  label: string;
  prefix: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  dotColor: string;
  hoverBg: string;
}

export function getVariableColorTheme(isMandatory: boolean): VariableColorTheme {
  if (isMandatory) {
    return {
      isMandatory: true,
      label: 'Mandatory',
      prefix: '#',
      textColor: 'text-red-400',
      bgColor: 'bg-red-950/40',
      borderColor: 'border-red-500/40',
      badgeClass: 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25',
      dotColor: 'bg-red-500',
      hoverBg: 'hover:bg-red-500/20',
    };
  }
  return {
    isMandatory: false,
    label: 'Optional',
    prefix: '',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-500/40',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25',
    dotColor: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-500/20',
  };
}

/**
 * Token for inline rendered prompt text
 */
export interface PromptToken {
  type: 'text' | 'variable';
  content: string;
  varName?: string;
  required?: boolean;
  rawTag?: string;
  defaultValue?: string;
}

/**
 * Tokenizes a prompt string into plain text and variable badges for inline rendering
 */
export function tokenizePrompt(template: string, variableDefs: PromptVariable[] = []): PromptToken[] {
  if (!template) return [];

  const defsMap = new Map<string, PromptVariable>();
  variableDefs.forEach((d) => defsMap.set(d.name, d));

  const tokens: PromptToken[] = [];
  let lastIndex = 0;

  // Regex matching braced variables {{#var}} and {{var}}
  const bracedRegex = /\{\{\s*(#)?([a-zA-Z0-9_]+)([\*\?])?(?:=([^}]+))?\s*\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = bracedRegex.exec(template)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: template.substring(lastIndex, match.index),
      });
    }

    const hashPrefix = match[1] === '#';
    const rawName = match[2];
    const modifier = match[3];
    const defaultVal = match[4]?.trim();

    const def = defsMap.get(rawName);
    const isRequired =
      hashPrefix || modifier === '*'
        ? true
        : modifier === '?'
        ? false
        : def
        ? def.required
        : hashPrefix;

    tokens.push({
      type: 'variable',
      content: match[0],
      varName: rawName,
      required: isRequired,
      rawTag: match[0],
      defaultValue: defaultVal || def?.defaultValue,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining trailing text
  if (lastIndex < template.length) {
    tokens.push({
      type: 'text',
      content: template.substring(lastIndex),
    });
  }

  return tokens;
}

/**
 * Extracts and returns normalized PromptVariable definitions from prompt templates.
 */
export function extractVariablesFromTemplate(
  template: string,
  existingDefs?: PromptVariable[]
): PromptVariable[] {
  if (!template) return [];

  const existingMap = new Map<string, PromptVariable>();
  if (existingDefs) {
    existingDefs.forEach((d) => existingMap.set(d.name, d));
  }

  const foundMap = new Map<string, PromptVariable>();

  // 1. Match braced {{#var}} and {{var}}
  const bracedMatches = Array.from(template.matchAll(BRACED_VARIABLE_REGEX));
  for (const match of bracedMatches) {
    const hashPrefix = match[1] === '#';
    const rawName = match[2];
    const modifier = match[3]; // '*' or '?'
    const defaultVal = match[4] !== undefined ? match[4].trim() : undefined;

    let isRequired = false;
    if (hashPrefix || modifier === '*') {
      isRequired = true;
    } else if (modifier === '?') {
      isRequired = false;
    } else if (existingMap.has(rawName)) {
      isRequired = existingMap.get(rawName)!.required;
    } else if (defaultVal !== undefined) {
      isRequired = false;
    } else {
      isRequired = hashPrefix;
    }

    const existing = existingMap.get(rawName);
    const resolvedDefault = defaultVal !== undefined ? defaultVal : existing?.defaultValue;

    foundMap.set(rawName, {
      name: rawName,
      required: isRequired,
      defaultValue: resolvedDefault,
      exampleValue: existing?.exampleValue || '',
      description: existing?.description || '',
    });
  }

  // 2. Match standalone #var_name (e.g. #test) if not already detected
  const hashtagMatches = Array.from(template.matchAll(HASHTAG_VARIABLE_REGEX));
  for (const match of hashtagMatches) {
    const rawName = match[1];
    if (!foundMap.has(rawName)) {
      const existing = existingMap.get(rawName);
      // If user typed standalone #test, default to mandatory unless user toggled in existing map
      const isRequired = existing ? existing.required : true;

      foundMap.set(rawName, {
        name: rawName,
        required: isRequired,
        defaultValue: existing?.defaultValue,
        exampleValue: existing?.exampleValue || '',
        description: existing?.description || '',
      });
    }
  }

  return Array.from(foundMap.values());
}

/**
 * Interpolates variables into a template with support for defaults and requirement checking.
 */
export function substituteTemplate(
  template: string,
  values: Record<string, string> = {},
  variableDefs: PromptVariable[] = []
): { rendered: string; missingMandatory: string[]; usedDefaults: Record<string, string> } {
  if (!template) return { rendered: '', missingMandatory: [], usedDefaults: {} };

  const defsMap = new Map<string, PromptVariable>();
  variableDefs.forEach((d) => defsMap.set(d.name, d));

  const missingMandatory: string[] = [];
  const usedDefaults: Record<string, string> = {};

  // First replace braced variables {{#var}} and {{var}}
  let rendered = template.replace(
    BRACED_VARIABLE_REGEX,
    (_fullMatch, hashPrefix, name, modifier, defaultInTag) => {
      const def = defsMap.get(name);
      const isRequired =
        hashPrefix === '#' || modifier === '*'
          ? true
          : modifier === '?'
          ? false
          : def
          ? def.required
          : false;

      const fallbackVal = defaultInTag !== undefined ? defaultInTag.trim() : def?.defaultValue;
      const userVal = values[name];
      const hasUserVal = userVal !== undefined && userVal !== null && userVal.trim() !== '';

      if (hasUserVal) {
        return userVal;
      }

      if (fallbackVal !== undefined && fallbackVal !== '') {
        usedDefaults[name] = fallbackVal;
        return fallbackVal;
      }

      if (isRequired) {
        missingMandatory.push(name);
        return `{{#${name}}}`; // Keep placeholder
      }

      // Optional and empty without default -> replace with empty string
      return '';
    }
  );

  // Next, replace standalone #var when var is defined in variableDefs and user provided value
  defsMap.forEach((def, varName) => {
    const hashtagRegex = new RegExp(`(?<![\\w{])#${varName}\\b(?!\\}|\\s*[a-zA-Z0-9_]*\\s*})`, 'g');
    if (hashtagRegex.test(rendered)) {
      const userVal = values[varName];
      const hasUserVal = userVal !== undefined && userVal !== null && userVal.trim() !== '';
      if (hasUserVal) {
        rendered = rendered.replace(hashtagRegex, userVal);
      } else if (def.defaultValue !== undefined && def.defaultValue !== '') {
        usedDefaults[varName] = def.defaultValue;
        rendered = rendered.replace(hashtagRegex, def.defaultValue);
      } else if (def.required) {
        missingMandatory.push(varName);
      } else {
        rendered = rendered.replace(hashtagRegex, '');
      }
    }
  });

  return {
    rendered,
    missingMandatory: Array.from(new Set(missingMandatory)),
    usedDefaults,
  };
}


