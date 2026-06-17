import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  verifySourceStackForensicBundle,
  type SourceStackForensicBundle,
} from "../src/sourcestack";

const [bundlePath] = process.argv.slice(2);

if (!bundlePath) {
  console.error("Usage: npm run bundle:verify -- <bundle.json>");
  process.exit(1);
}

const resolvedPath = path.resolve(bundlePath);
let bundle: SourceStackForensicBundle;

try {
  bundle = JSON.parse(await readFile(resolvedPath, "utf8")) as SourceStackForensicBundle;
} catch (error) {
  console.error(
    `SourceStack bundle verification failed: ${
      error instanceof Error ? error.message : "could not read bundle"
    }`,
  );
  process.exit(1);
}

const verification = await verifySourceStackForensicBundle(bundle);

if (verification.ok) {
  console.log("SourceStack bundle verification: PASS");
  console.log(`Graph hash: ${verification.graphHash}`);
  console.log(`Bundle hash: ${verification.bundleHash}`);
  console.log(
    `Evidence signoffs: ${bundle.counts?.evidenceSignoffs ?? 0} (${bundle.counts?.staleEvidenceSignoffs ?? 0} stale)`,
  );
  console.log(`Packet manifests: ${bundle.counts?.packetManifests ?? 0}`);
} else {
  console.error("SourceStack bundle verification: FAIL");
  verification.failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}
