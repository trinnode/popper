import assert from "node:assert/strict";
import test from "node:test";
import { countStatuses, evaluateClaim, sha256 } from "./index.js";

test("hashes and evaluates deterministically", () => {
  assert.equal(sha256("popper"), "59a6978d251daa612141b5f772874311ce30f55607290638dd8f0d2f3ff55af1");
  const result = evaluateClaim({ id: "tvl", threshold: { min: 100 } }, 120, "snapshot", new Date("2026-11-02T00:00:00Z"));
  assert.equal(result.status, "HOLDING");
  assert.deepEqual(countStatuses([result]), { PENDING: 0, HOLDING: 1, AT_RISK: 0, FALSIFIED: 0 });
});
