import type { DebateTurn, L1Result, L3Result } from "./types";

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
};

export type LayeredAction =
  | { type: "START"; mint: string }
  | { type: "L1_OK"; token: L1Result["token"]; symbol: string; reports: L1Result["reports"] }
  | { type: "L2_OK"; debate: DebateTurn[] }
  | { type: "L3_OK"; risks: L3Result["risks"] }
  | { type: "L4_OK"; decision: string; shareId: string }
  | { type: "FAIL"; step: NonNullable<LayeredState["failedStep"]>; message: string }
  | { type: "NOTE"; note: string }
  | { type: "L2_TURN"; turn: DebateTurn }
  | { type: "RETRY" }
  | { type: "RESET" };

export function layeredReducer(s: LayeredState, a: LayeredAction): LayeredState {
  switch (a.type) {
    case "START":
      return { ...initialLayeredState, step: "l1", mint: a.mint };
    case "L1_OK":
      return { ...s, step: "l2", token: a.token, symbol: a.symbol, reports: a.reports, error: null, note: null };
    case "L2_OK":
      // Live turns already appended via L2_TURN; keep them to avoid doubles.
      return { ...s, step: "l3", debate: s.debate.length > 0 ? s.debate : a.debate, error: null, note: null };
    case "L3_OK":
      return { ...s, step: "l4", risks: a.risks, error: null, note: null };
    case "L4_OK":
      return { ...s, step: "done", decision: a.decision, shareId: a.shareId, error: null, note: null };
    case "FAIL":
      return { ...s, step: "error", failedStep: a.step, error: a.message };
    case "NOTE":
      return { ...s, note: a.note };
    case "L2_TURN":
      return { ...s, debate: [...s.debate, a.turn] };
    case "RETRY":
      if (!s.failedStep) return s;
      // Fresh L2 run re-streams turns; drop stale partials.
      return { ...s, step: s.failedStep, debate: s.failedStep === "l2" ? [] : s.debate, failedStep: null, error: null, note: null };
    case "RESET":
      return initialLayeredState;
  }
}
