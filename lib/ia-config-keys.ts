export const IA_CONFIG_KEYS = [
  'system_prompt',
  'album_instructions',
  'standard_instructions',
  'few_shot_examples',
] as const

export type IaConfigKey = (typeof IA_CONFIG_KEYS)[number]
