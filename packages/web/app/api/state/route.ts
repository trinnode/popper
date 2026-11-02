import { NextResponse } from "next/server";
import {
  countStatuses,
  computeStatusFromResults,
  loadPopperState,
} from "@/lib/popper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadPopperState();
    const claims = state.claims?.claims ?? [];

    return NextResponse.json({
      commit: state.chain.commit,
      results: state.results,
      manifest: state.manifest,
      claims: {
        thesis: state.claims?.thesis ?? null,
        author: state.claims?.author ?? null,
        version: state.claims?.version ?? null,
        commit_deadline: state.claims?.commit_deadline ?? null,
        claims_hash: state.claimsHash,
        count: claims.length,
        items: claims.map((c) => ({
          id: c.id,
          title: c.title,
          metric: c.metric,
          source: c.source,
          threshold: c.threshold,
          measurement_window: c.measurement_window ?? null,
          status: computeStatusFromResults(c.id, state.results).status,
        })),
        counts: countStatuses(claims, state.results),
      },
      chain: {
        connected: state.chain.connected,
        contract_id: state.chain.contractId,
        error: state.chain.error ?? null,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "state_unavailable",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
