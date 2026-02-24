export function parseRepoInput(raw: string): { owner: string; name: string } | null {
  const parts = raw.trim().split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0].trim(), name: parts[1].trim() };
}
