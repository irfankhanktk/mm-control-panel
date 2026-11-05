/**
 * Some accounts were saved with Swagger's placeholder text ("<string> <string>") as their name.
 * Show the email instead of that.
 */
export function cleanDisplayName(fullName: string | null | undefined, fallback: string): string {
  const name = (fullName ?? "").trim();
  if (!name || /<\s*string\s*>/i.test(name)) return fallback;
  return name;
}
