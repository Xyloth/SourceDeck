import { describe, expect, it } from "vitest";
import {
  PLAINTEXT_SOURCE_TEXT_NOT_PERSISTED_REASON,
  sanitizeCaseStoreForLocalStorage,
  sanitizeWorkspaceDocumentForLocalStorage,
} from "./workspacePrivacy";

describe("browser workspace privacy", () => {
  it("removes extracted text, page text, and the plaintext durable artifact", () => {
    const sanitized = sanitizeWorkspaceDocumentForLocalStorage({
      id: "doc-1",
      extractedText: "private contract text",
      pageTexts: [{ page: 1, text: "private contract text" }],
      sourceArtifact: { payload: { data: "private contract text" } },
      sourceArtifactVerified: true,
    });

    expect(sanitized.extractedText).toBeUndefined();
    expect(sanitized.pageTexts).toBeUndefined();
    expect(sanitized.sourceArtifact).toBeUndefined();
    expect(sanitized.sourceArtifactVerified).toBe(false);
    expect(sanitized.sourceArtifactFailure).toBe(
      PLAINTEXT_SOURCE_TEXT_NOT_PERSISTED_REASON,
    );
    expect(JSON.stringify(sanitized)).not.toContain("private contract text");
  });

  it("does not mutate the live in-memory document", () => {
    const document = { extractedText: "session text", pageTexts: [{ text: "session text" }] };

    sanitizeWorkspaceDocumentForLocalStorage(document);

    expect(document.extractedText).toBe("session text");
    expect(document.pageTexts).toEqual([{ text: "session text" }]);
  });

  it("does not duplicate the session-only warning on repeated sanitization", () => {
    const once = sanitizeWorkspaceDocumentForLocalStorage({
      extractedText: "session text",
      warning: "Existing warning.",
    });
    const twice = sanitizeWorkspaceDocumentForLocalStorage({
      ...once,
      extractedText: "session text restored in memory",
    });

    expect(
      twice.warning?.split(PLAINTEXT_SOURCE_TEXT_NOT_PERSISTED_REASON).length,
    ).toBe(2);
  });

  it("redacts plaintext artifacts from the persisted case store", () => {
    const store = {
      caseId: "case-1",
      createdAt: "2026-08-31T00:00:00.000Z",
      artifacts: {
        "artifact-1": {
          id: "artifact-1",
          contentHash: `sha256:${"a".repeat(64)}` as const,
          mediaType: "application/json",
          byteLength: 14,
          createdAt: "2026-08-31T00:00:00.000Z",
          payload: { encoding: "utf8" as const, data: "private source" },
          metadata: {},
        },
      },
      events: [],
    };

    const sanitized = sanitizeCaseStoreForLocalStorage(store);

    expect(sanitized?.artifacts["artifact-1"].payload.data).toBe("");
    expect(JSON.stringify(sanitized)).not.toContain("private source");
    expect(store.artifacts["artifact-1"].payload.data).toBe("private source");
  });
});
