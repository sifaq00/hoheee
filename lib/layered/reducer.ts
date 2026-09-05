import type { DebateTurn, L1Result, L3Result, LayerError } from "./types";

export type LayerStep = "idle" | "l1" | "l2" | "l3" | "l4" | "done" | "error";

export interface LayeredState {
  step: LayerStep;
  mint: string;
  token: L1Result["token"] | null;
  symbol: string;
  reports: L1Result["reports"] | null;
  debate: DebateTurn[];
  risks: L3Result["risks"] | null;
  decision: string | null;
  shareId: string | null;
  failedStep: Exclude<LayerStep, "error" | "idle" | "done"> | null;
  error: string | null;
  note: string | null;
  chains: { l1?: string; l2?: string; l3?: string };
  liveToken: L1Result["token"] | null;
  liveSymbol: string;
  liveReports: Partial<L1Result["reports"]>;
  l1Errors: LayerError[];
}

export const initialLayeredState: LayeredState = {
  step: "idle",
  mint: "",
  token: null,
  symbol: "",
  reports: null,
  debate: [],
  risks: null,
  decision: null,
  shareId: null,
  failedStep: null,
  error: null,
  note: null,
  chains: {},
  liveToken: null,
  liveSymbol: "",
  liveReports: {},
  l1Errors: [],
};

export type LayeredAction =
  | { type: "START"; mint: string }
  | { type: "L1_OK"; token: L1Result["token"]; symbol: string; reports: L1Result["reports"]; chain: string; errors: LayerError[] }
  | { type: "L2_OK"; debate: DebateTurn[]; chain: string }
  | { type: "L3_OK"; risks: L3Result["risks"]; chain: string }
  | { type: "L4_OK"; decision: string; shareId: string }
  | { type: "FAIL"; step: NonNullable<LayeredState["failedStep"]>; message: string }
  | { type: "NOTE"; note: string }
  | { type: "L1_TOKEN"; token: L1Result["token"]; symbol: string }
  | { type: "L1_REPORT"; agent: keyof L1Result["reports"]; report: string }
  | { type: "L2_TURN"; turn: DebateTurn }
  | { type: "RETRY" }
  | { type: "RESET" };

export function layeredReducer(s: LayeredState, a: LayeredAction): LayeredState {
  switch (a.type) {
    case "START":
      return { ...initialLayeredState, step: "l1", mint: a.mint };
    case "L1_OK":
      return { ...s, step: "l2", token: a.token, symbol: a.symbol, reports: a.reports, error: null, note: null, chains: { l1: a.chain }, l1Errors: a.errors };
    case "L2_OK":
      // Live turns already appended via L2_TURN; keep them to avoid doubles.
      return { ...s, step: "l3", debate: s.debate.length > 0 ? s.debate : a.debate, error: null, note: null, chains: { ...s.chains, l2: a.chain } };
    case "L3_OK":
      return { ...s, step: "l4", risks: a.risks, error: null, note: null, chains: { ...s.chains, l3: a.chain } };
    case "L4_OK":
      return { ...s, step: "done", decision: a.decision, shareId: a.shareId, error: null, note: null };
    case "FAIL":
      return { ...s, step: "error", failedStep: a.step, error: a.message };
    case "NOTE":
      return { ...s, note: a.note };
    case "L1_TOKEN":
      return { ...s, liveToken: a.token, liveSymbol: a.symbol };
    case "L1_REPORT":
      return { ...s, liveReports: { ...s.liveReports, [a.agent]: a.report } };
    case "L2_TURN":
      return { ...s, debate: [...s.debate, a.turn] };
    case "RETRY":
      if (!s.failedStep) return s;
      // Fresh L2 run re-streams turns; fresh L1 re-streams reports. Drop stale partials.
      return {
        ...s,
        step: s.failedStep,
        debate: s.failedStep === "l2" ? [] : s.debate,
        liveToken: s.failedStep === "l1" ? null : s.liveToken,
        liveSymbol: s.failedStep === "l1" ? "" : s.liveSymbol,
        liveReports: s.failedStep === "l1" ? {} : s.liveReports,
        failedStep: null,
        error: null,
        note: null,
      };
    case "RESET":
      return initialLayeredState;
  }
}
