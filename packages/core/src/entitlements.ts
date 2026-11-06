/**
 * Reading, simple marking, copying and sharing verses are free. Everything else needs Pro.
 * People who follow a class or belong to a community do not pay; the teacher or leader does.
 */
export const FREE_FEATURES = ['read', 'switchTranslation', 'search', 'cleanMode', 'simpleMark', 'copyVerse', 'shareVerse', 'notes'] as const;

export const PRO_FEATURES = [
  'customCategories',
  'compareTranslations',
  'readingPlan',
  'sync',
  'snapshot',
  'studyLayers',
  'create',
  'templates',
  'pulpit',
  'projection',
  'recording',
  'liveClass',
  'createCommunity',
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
