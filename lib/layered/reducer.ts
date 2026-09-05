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
};

export type LayeredAction =
  | { type: "START"; mint: string }
  | { type: "L1_OK"; token: L1Result["token"]; symbol: string; reports: L1Result["reports"] }
  | { type: "L2_OK"; debate: DebateTurn[] }
  | { type: "L3_OK"; risks: L3Result["risks"] }
  | { type: "L4_OK"; decision: string; shareId: string }
  | { type: "FAIL"; step: NonNullable<LayeredState["failedStep"]>; message: string }
  | { type: "RETRY" }
  | { type: "RESET" };

export function layeredReducer(s: LayeredState, a: LayeredAction): LayeredState {
  switch (a.type) {
    case "START":
      return { ...initialLayeredState, step: "l1", mint: a.mint };
    case "L1_OK":
      return { ...s, step: "l2", token: a.token, symbol: a.symbol, reports: a.reports, error: null };
    case "L2_OK":
      return { ...s, step: "l3", debate: a.debate, error: null };
    case "L3_OK":
      return { ...s, step: "l4", risks: a.risks, error: null };
    case "L4_OK":
      return { ...s, step: "done", decision: a.decision, shareId: a.shareId, error: null };
    case "FAIL":
      return { ...s, step: "error", failedStep: a.step, error: a.message };
    case "RETRY":
      return s.failedStep ? { ...s, step: s.failedStep, failedStep: null, error: null } : s;
    case "RESET":
      return initialLayeredState;
  }
}
