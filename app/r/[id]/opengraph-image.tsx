import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { parseDecision } from "@/lib/decision";
import { loadReport } from "@/lib/layered/supabase";

// Node.js runtime (default): reads runs/[id].json from disk at build time.
// Edge runtime cannot use node:fs, so Edge is not an option here.
export const alt = "Aries token research report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function readField(id: string): Promise<{
  symbol: string;
  name: string;
  rating: string;
  confidence: string;
}> {
  const fallback = { symbol: "?", name: "?", rating: "?", confidence: "?" };
  try {
    const dbRow = await loadReport(id);
    if (dbRow) {
      const parsed = parseDecision(dbRow.decision);
      return {
        symbol: dbRow.token.symbol || "?",
        name: dbRow.token.name || "?",
        rating: parsed.rating ?? "?",
        confidence: parsed.confidence ?? "?",
      };
    }
  } catch {
    // fall through to file
  }
  try {
    const run = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "runs", `${id}.json`), "utf8")
    ) as {
      token?: { name?: unknown; symbol?: unknown };
      decision?: unknown;
    };
    const decision = typeof run.decision === "string" ? run.decision : "";
    // Same RATING:/CONFIDENCE: parsing as DecisionCard (via shared lib).
    const parsed = parseDecision(decision);
    return {
      symbol:
        typeof run.token?.symbol === "string" && run.token.symbol
          ? run.token.symbol
          : "?",
      name:
        typeof run.token?.name === "string" && run.token.name
          ? run.token.name
          : "?",
      rating: parsed.rating ?? "?",
      confidence: parsed.confidence ?? "?",
    };
  } catch {
    return fallback;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { symbol, name, rating, confidence } = await readField(id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0a0a0a",
          color: "#e5e5e5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: "bold" }}>
          {symbol} ({name})
        </div>
        <div style={{ display: "flex", marginTop: "32px", fontSize: 40 }}>
          <div style={{ marginRight: "48px" }}>RATING: {rating}</div>
          <div>CONFIDENCE: {confidence}</div>
        </div>
        <div style={{ marginTop: "48px", fontSize: 28, color: "#a1a1aa" }}>
          AI token research — not financial advice
        </div>
      </div>
    ),
    { ...size }
  );
}
