/** Reading and simple marking are free. Everything else needs Pro. */
export const FREE_FEATURES = ['read', 'switchTranslation', 'search', 'cleanMode', 'simpleMark'] as const;

export const PRO_FEATURES = [
  'notes',
  'customCategories',
  'compareTranslations',
  'readingPlan',
  'sync',
  'shareVerse',
  'snapshot',
  'studyLayers',
  'create',
  'templates',
  'pulpit',
  'projection',
  'recording',
  'liveClass',
  'pdf',
  'appleWatch',
] as const;

/** Never gated: people keep access to what they already made. */
export const ALWAYS_AVAILABLE = ['viewOwnContent', 'exportOwnContent'] as const;

export type Feature =
  | (typeof FREE_FEATURES)[number]
  | (typeof PRO_FEATURES)[number]
  | (typeof ALWAYS_AVAILABLE)[number];

export function canUse(feature: Feature, isPro: boolean): boolean {
  return isPro || !(PRO_FEATURES as readonly Feature[]).includes(feature);
}
