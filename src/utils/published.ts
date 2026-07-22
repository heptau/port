export function isPublished(data: { draft?: boolean }): boolean {
  if (data.draft) return false;
  if (import.meta.env.PUBLIC_PREVIEW === 'true') return true;
  return true;
}
