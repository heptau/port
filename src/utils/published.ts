export function isPublished(data: { draft?: boolean; date: Date }): boolean {
  if (data.draft) return false;
  if (import.meta.env.PUBLIC_PREVIEW === 'true') return true;
  return data.date <= new Date();
}
