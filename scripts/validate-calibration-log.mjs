import { readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const allowOpenLatest = args.has("--allow-open-latest");
const logPath = args.has("--file")
  ? process.argv[process.argv.indexOf("--file") + 1]
  : "CALIBRATION_LOG.md";

const requiredInlineFields = [
  "Task ID:",
  "Project:",
  "Agent / Model:",
  "Date:",
  "Workspace / Repo:",
  "User-stated work window:",
  "Actual start time:",
  "Actual end time:",
  "Actual elapsed minutes:",
];

const requiredSections = [
  "## Task Objective",
  "## Pre-Task Estimate",
  "## Planned Attack",
  "## Work Performed",
  "## Ambition / Autonomy Log",
  "## Verification",
  "## Result",
  "## Estimate vs Actual",
  "## Calibration Lesson",
  "## Capability Lesson",
  "## Next Five Blind Spots",
];

const log = readFileSync(logPath, "utf8");
const entries = log
  .split(/^# CALIBRATION LOG ENTRY\s*$/m)
  .slice(1)
  .map((entry) => entry.trim())
  .filter(Boolean);

const failures = [];

if (!entries.length) {
  failures.push("no calibration entries found");
}

entries.forEach((entry, index) => {
  const label = `entry ${index + 1}`;
  const isLatest = index === entries.length - 1;
  requiredInlineFields.forEach((field) => {
    if (!entry.includes(field)) failures.push(`${label}: missing ${field}`);
  });
  requiredSections.forEach((section) => {
    if (!entry.includes(section)) failures.push(`${label}: missing ${section}`);
  });
  const hasUnresolvedPlaceholder =
    /\b(?:TBD|OPEN)\b/.test(entry) || /filled at close/i.test(entry);
  if (hasUnresolvedPlaceholder && !(allowOpenLatest && isLatest)) {
    failures.push(`${label}: contains unresolved handoff placeholder`);
  }
});

if (failures.length) {
  console.error("Calibration log validation: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Calibration log validation: PASS (${entries.length} entries${
    allowOpenLatest ? ", latest may be open" : ""
  })`,
);
