export function normalizeForFuzzy(text: string): string {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how'
  ]);

  let normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .toLowerCase()
    .trim();

  normalized = normalized.replace(/[^\w\s]/g, '');

  const words = normalized
    .split(/\s+/)
    .filter(word => word.length > 0 && !commonWords.has(word));

  return words.join(' ');
}
