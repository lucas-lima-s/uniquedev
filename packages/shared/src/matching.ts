export function normalizeDescription(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function descriptionMatchesPattern(description: string, pattern: string): boolean {
  const haystack = normalizeDescription(description);
  const needle = normalizeDescription(pattern);
  return needle.length > 0 && haystack.includes(needle);
}

export function matchingCategoryRule<T extends { pattern: string; priority: number }>(
  description: string,
  rules: T[],
): T | undefined {
  const matches = rules.filter((rule) => descriptionMatchesPattern(description, rule.pattern));
  matches.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return right.pattern.length - left.pattern.length;
  });
  return matches[0];
}

export function matchingRecurringEntry<T extends { matchPattern: string | null }>(
  description: string,
  entries: T[],
): T | undefined {
  return entries.find(
    (entry) =>
      entry.matchPattern !== null && descriptionMatchesPattern(description, entry.matchPattern),
  );
}
