// app/lib/format.ts
// Small formatting helpers.

// Shows a saved project date in Romanian format.
// New projects store an ISO date. Older projects may store plain text,
// so if the date cannot be parsed we just return the original text.
export function formatProjectDate(savedDate: string): string {
  const parsedDate = new Date(savedDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return savedDate;
  }
  return parsedDate.toLocaleDateString('ro-RO');
}