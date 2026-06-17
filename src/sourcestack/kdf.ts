// Centralized PBKDF2 key-derivation policy for every passphrase-wrapped custody primitive
// (packet signing key, source-vault blobs, encrypted JSON envelopes).
//
// Production derivations use the default. Both encrypt and decrypt reject anything below the
// floor, so a stored blob cannot downgrade key strength to make an offline brute-force cheap
// (e.g. a tampered or hostile blob claiming iterations:1).
export const PBKDF2_DEFAULT_ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
export const PBKDF2_MIN_ITERATIONS = 100_000; // honest hard floor; rejects downgrade attacks
// Ceiling: PBKDF2 cost is linear in the iteration count, so a hostile or corrupt blob claiming a
// huge value would make decrypt hang (a denial-of-service). Reject anything above this, well clear
// of the 600k production default. Enforced on both encrypt and decrypt by assertPbkdf2Iterations.
export const PBKDF2_MAX_ITERATIONS = 10_000_000;

export function assertPbkdf2Iterations(iterations: number): number {
  if (!Number.isInteger(iterations) || iterations < PBKDF2_MIN_ITERATIONS) {
    throw new Error(
      `PBKDF2 iterations ${iterations} are below the minimum floor of ${PBKDF2_MIN_ITERATIONS}`,
    );
  }
  if (iterations > PBKDF2_MAX_ITERATIONS) {
    throw new Error(
      `PBKDF2 iterations ${iterations} exceed the maximum of ${PBKDF2_MAX_ITERATIONS}`,
    );
  }
  return iterations;
}
