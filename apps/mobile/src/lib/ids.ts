let counter = 0;

/** Unique across devices, because items sync by id. */
export const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
