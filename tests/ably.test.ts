import { describe, it, expect, vi, beforeEach } from "vitest";
import { channelName, createAblyPublisher } from "../lib/progress/ably";

function calls(): Array<[unknown, { body?: unknown } | undefined]> {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls as Array<
    [unknown, { body?: unknown } | undefined]
  >;
}

beforeEach(() => {
  vi.stubEnv("ABLY_API_KEY", "appId.keyId:keySecret");
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  })) as unknown as typeof fetch;
});

describe("channelName", () => {
  it("scopes channel per run", () => {
    expect(channelName("r1")).toBe("run:r1");
  });
});

describe("createAblyPublisher", () => {
  it("publishes each event immediately via Ably REST", async () => {
    const pub = createAblyPublisher("r1");
    await pub.publish({ type: "agent_start", agent: "onchain" });
    expect(calls().length).toBe(1);
    expect(String(calls()[0][0])).toBe("https://rest.ably.io/channels/run%3Ar1/messages");
    const body = JSON.parse(String(calls()[0][1]?.body ?? "null"));
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].name).toBe("agent_start");
    expect(body.messages[0].data.agent).toBe("onchain");
    expect(typeof body.messages[0].data.ts).toBe("string");
  });

  it("publishes terminal status as job_status", async () => {
    const pub = createAblyPublisher("r1");
    await pub.setStatus("done");
    const body = JSON.parse(String(calls()[0][1]?.body ?? "null"));
    expect(body.messages[0].name).toBe("job_status");
    expect(body.messages[0].data.status).toBe("done");
  });

  it("is silent without key and never throws when down", async () => {
    vi.stubEnv("ABLY_API_KEY", "");
    const pub = createAblyPublisher("r1");
    await pub.publish({ type: "agent_start", agent: "news" });
    expect(calls().length).toBe(0);
    vi.stubEnv("ABLY_API_KEY", "appId.keyId:keySecret");
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("down"));
    await expect(pub.publish({ type: "agent_start", agent: "news" })).resolves.toBeUndefined();
  });
});
