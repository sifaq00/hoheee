export function newRunId(): string {
  return crypto.randomUUID();
}
export function isRunId(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{1,64}$/i.test(s);
}
