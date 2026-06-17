const [start, finish] = process.argv.slice(2);

if (!start || !finish) {
  console.error("Usage: node scripts/calibration-elapsed.mjs <start-iso> <finish-iso>");
  process.exit(1);
}

const startMs = Date.parse(start);
const finishMs = Date.parse(finish);

if (!Number.isFinite(startMs) || !Number.isFinite(finishMs)) {
  console.error("Both start and finish must be parseable ISO timestamps.");
  process.exit(1);
}

const elapsedMs = finishMs - startMs;
const elapsedMinutes = elapsedMs / 60000;

console.log(
  JSON.stringify(
    {
      start,
      finish,
      elapsedMs,
      elapsedMinutes: Number(elapsedMinutes.toFixed(2)),
    },
    null,
    2,
  ),
);
