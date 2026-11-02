import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..", "..");
const claimsPath = path.join(root, "claims.json");

async function claimsHash(): Promise<string> {
  return createHash("sha256").update(await fs.readFile(claimsPath)).digest("hex");
}

async function main(command: string): Promise<void> {
  if (command === "check-claims" || command === "commit-thesis") {
    console.log(JSON.stringify({ claims_hash: await claimsHash(), file: "claims.json" }, null, 2));
    return;
  }
  if (command === "verify" || command === "prove") {
    const claims = JSON.parse(await fs.readFile(claimsPath, "utf8")) as { claims?: unknown[] };
    console.log(JSON.stringify({ ok: Array.isArray(claims.claims), claims: claims.claims?.length ?? 0, claims_hash: await claimsHash() }, null, 2));
    return;
  }
  if (command === "snapshot" || command === "attest") {
    console.log(JSON.stringify({ status: "configuration_required", message: "Set public data source credentials/endpoints before producing an attestation." }));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

await main(process.argv[2] ?? "verify");
