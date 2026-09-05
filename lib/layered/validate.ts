export const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Strip leaked <tool_call>...</tool_call> XML blocks from final reports.
export function stripToolCallXml(text: string): string {
  return text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
