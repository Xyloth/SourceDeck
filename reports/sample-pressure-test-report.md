# SourceDeck Case Folder Pressure Test

Folder: sample-records
Workspace JSON: reports/sample-workspace.json
Generated: 6/16/2026, 8:09:18 PM

## Extraction Results

- Exhibit A: agreement-language-sample.txt - Indexed, 1 page(s), 280 chars. 280 text characters indexed by local preloader. Original file vaulted as sha256:befbaa46a588d06e8209c9b22dd176bd97462556c22d7ac7ee283840883a4451.
- Exhibit B: vendor-status-notice-excerpt.txt - Indexed, 1 page(s), 557 chars. 557 text characters indexed by local preloader. Original file vaulted as sha256:b296d73851453fbed2cb602eb8cafb50de75758f6cb1af6061a4afdf86b02ab8.

## Workspace Built

- Documents: 2
- Evidence cards: 8
- Issue maps: 3
- Timeline entries: 1
- Missing-record rows: 1
- Needs review documents: 0
- OCR sidecar documents: 0

## Strongest Preloader Cards

- Medium / Service level agreement / Exhibit A: Service levels will increase as tolerated and review will occur at a later date.
- Medium / Service level agreement / Exhibit B: the deliverables required by the Master Services Agreement were completed.
- Medium / Service level agreement / Exhibit B: The team will continue to review capacity and gradually increase service levels as
- Low / Service level agreement / Exhibit A: The vendor will gradually increase service levels as appropriate.
- Low / Support escalation / Exhibit B: Acme Corp requested uptime logs and incident records to verify whether
- Low / Uptime data / Exhibit B: Because of the intensive focus on a separate platform migration, the team has not been
- Low / Uptime data / Exhibit B: able to deliver the contracted reporting work this quarter.
- Low / Service level agreement / Exhibit B: support tier could not be provided at this time.

## Build Gaps Exposed

- OCR is required for scanned PDFs before the behavior-data PDFs become live searchable.
- Image-only DOCX/chart files also need OCR or image extraction before they become quote-searchable.
- Browser import supports DOCX/PDF/text; legacy DOC extraction is available through this local Node preloader.
- Local preloader evidence cards are cited review candidates, not verified packet evidence. Open each card in SourceDeck and verify the source span before packet export.
- Highlighted PDF export still needs true overlay generation against source pages, especially after OCR.
- Evidence cards should support human-confirmed page numbers for Word files because raw DOCX extraction does not preserve page layout.