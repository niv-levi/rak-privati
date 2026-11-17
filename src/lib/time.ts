/** Server-side time helpers (kept outside components so render functions stay pure). */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
