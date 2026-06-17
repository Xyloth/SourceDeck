const spreadsheetFormulaPrefix = /^[\s\uFEFF]*[=+\-@]/;

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function neutralizeSpreadsheetFormula(value: unknown) {
  const text = String(value ?? "");
  return spreadsheetFormulaPrefix.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${neutralizeSpreadsheetFormula(value).replaceAll('"', '""')}"`;
}
