// Keep in sync with LICENSE_PLATFORM_VERSIONS in apps/api/src/schemas/customer.schema.ts
export const LICENSE_PLATFORM_VERSIONS = [
  '4.1',
  '5.2',
  '5.2.1',
  '5.2.2',
  '5.2.3',
  '5.2.4',
  '5.2.5',
  '5.2.6',
  '5.2.7',
  '5.2.8',
  '5.2.9',
  '5.3',
  '5.4',
  '5.5',
  '5.6',
  '5.7',
  '5.8',
  '5.9',
  '6.1',
] as const;

// Curated list for the checklist UI — the API accepts any strings here (up to
// 50, 80 chars each), so a customer running something not listed can still be
// recorded via the free-text "Other" field rather than being blocked.
export const AI_MODEL_GROUPS: { vendor: string; models: string[] }[] = [
  {
    vendor: 'Claude (Anthropic)',
    models: [
      'Claude Opus 4.8',
      'Claude Sonnet 5',
      'Claude Haiku 4.5',
      'Claude Fable 5',
      'Claude Opus 4.1',
      'Claude 3.7 Sonnet',
      'Claude 3.5 Sonnet',
      'Claude 3.5 Haiku',
      'Claude 3 Opus',
    ],
  },
  {
    vendor: 'OpenAI',
    models: [
      'GPT-5.1',
      'GPT-5',
      'GPT-4.1',
      'GPT-4o',
      'GPT-4o mini',
      'o3',
      'o4-mini',
      'GPT-4 Turbo',
      'GPT-3.5 Turbo',
    ],
  },
  {
    vendor: 'Gemini (Google)',
    models: [
      'Gemini 3 Pro',
      'Gemini 2.5 Pro',
      'Gemini 2.5 Flash',
      'Gemini 2.0 Flash',
      'Gemini 1.5 Pro',
      'Gemini 1.5 Flash',
    ],
  },
  {
    vendor: 'On-prem / open source',
    models: [
      'Llama 4',
      'Llama 3.3',
      'Llama 3.1',
      'Mistral Large',
      'Mixtral 8x22B',
      'DeepSeek V3',
      'DeepSeek R1',
      'Qwen 2.5',
      'Command R+',
      'Falcon 180B',
    ],
  },
];

export const ALL_CURATED_MODELS = new Set(AI_MODEL_GROUPS.flatMap((g) => g.models));
