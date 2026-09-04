export interface ParsedDecision {
  rating: string | null;
  confidence: string | null;
  risks: string[];
  executiveSummary: string | null;
  thesis: string | null;
}

// Accept `-`/`*` bullets and `1.` numbered markers; fall back to raw lines
// when the section has no list markers so risks never silently vanish.
function parseRisks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^KEY RISKS:\s*$/.test(l));
  if (start === -1) return [];
  const body: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/^(?:EXECUTIVE SUMMARY|INVESTMENT THESIS|RATING:|CONFIDENCE:)/.test(l)) break;
    if (l.trim()) body.push(l.trim());
  }
  const listed = body.filter((l) => /^(?:[-*]|\d+\.)\s+/.test(l));
  const src = listed.length > 0 ? listed : body;
  return src.map((l) => l.replace(/^(?:[-*]|\d+\.)\s*/, "").trim()).filter(Boolean);
}

// Parse PM markdown headers; nulls when headers missing (caller falls back).
export function parseDecision(markdown: string): ParsedDecision {
  const rating = markdown.match(/^RATING:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const confidence = markdown.match(/^CONFIDENCE:\s*(.+)$/m)?.[1]?.trim() ?? null;

  const risks = parseRisks(markdown);

  const summaryMatch = markdown.match(/^EXECUTIVE SUMMARY\s*\n([\s\S]*?)(?=^INVESTMENT THESIS|\Z)/m);
  const thesisMatch = markdown.match(/^INVESTMENT THESIS\s*\n([\s\S]*)$/m);
  return {
    rating,
    confidence,
    risks,
    executiveSummary: summaryMatch?.[1]?.trim() || null,
    thesis: thesisMatch?.[1]?.trim() || null,
  };
}
