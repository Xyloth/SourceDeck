import { detectPromptInjection, type PromptInjectionFinding } from "./promptInjection";

export type ImportTrustState = "trusted_for_suggestion" | "quarantined_prompt_injection";

export type ImportTrustDecision = {
  state: ImportTrustState;
  canAutoSuggestEvidence: boolean;
  findings: PromptInjectionFinding[];
  warning: string;
  tags: string[];
};

export function decideImportTrust(extractedText: string): ImportTrustDecision {
  const findings = detectPromptInjection(extractedText);
  if (!findings.length) {
    return {
      state: "trusted_for_suggestion",
      canAutoSuggestEvidence: true,
      findings,
      warning: "",
      tags: [],
    };
  }
  return {
    state: "quarantined_prompt_injection",
    canAutoSuggestEvidence: false,
    findings,
    warning: `Security review: ${findings.length} possible source-borne instruction${
      findings.length === 1 ? "" : "s"
    } detected. Source text is evidence, never instruction. Automatic evidence suggestions were skipped for this record.`,
    tags: ["Prompt injection flagged", "Auto-suggest quarantined"],
  };
}
