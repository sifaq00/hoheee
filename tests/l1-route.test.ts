import { describe, it, expect } from "vitest";
import { POST } from "../app/api/l1/route";

describe("POST /api/l1 validation", () => {
  it("400s invalid mint without LLM spend", async () => {
    const res = await POST(new Request("http://x/api/l1", { method: "POST", body: JSON.stringify({ mint: "xxx" }) }));
    expect(res.status).toBe(400);
  });

  it("400s malformed body", async () => {
    const res = await POST(new Request("http://x/api/l1", { method: "POST", body: "not-json{" }));
    expect(res.status).toBe(400);
  });
});
