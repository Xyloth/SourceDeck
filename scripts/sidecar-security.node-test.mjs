import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedSidecarOrigin, tokensMatch } from "./sidecar-security.mjs";

test("accepts shipped and loopback SourceDeck origins", () => {
  assert.equal(isTrustedSidecarOrigin("https://sourcedeck.vercel.app"), true);
  assert.equal(isTrustedSidecarOrigin("http://127.0.0.1:5173"), true);
  assert.equal(isTrustedSidecarOrigin("http://localhost:4318"), true);
  assert.equal(isTrustedSidecarOrigin("https://preview.example", ["https://preview.example"]), true);
});

test("rejects arbitrary, opaque, and lookalike origins", () => {
  assert.equal(isTrustedSidecarOrigin("https://attacker.example"), false);
  assert.equal(isTrustedSidecarOrigin("null"), false);
  assert.equal(isTrustedSidecarOrigin("http://127.0.0.1.attacker.example"), false);
  assert.equal(isTrustedSidecarOrigin(undefined), false);
});

test("compares sidecar capability tokens without prefix acceptance", () => {
  assert.equal(tokensMatch("correct-token", "correct-token"), true);
  assert.equal(tokensMatch("correct", "correct-token"), false);
  assert.equal(tokensMatch(undefined, "correct-token"), false);
});
