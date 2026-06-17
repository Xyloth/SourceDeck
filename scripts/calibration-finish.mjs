const [start] = process.argv.slice(2);

if (!start) {
  console.error("Usage: node scripts/calibration-finish.mjs <start-iso>");
  process.exit(1);
}

const startMs = Date.parse(start);
const finishDate = new Date();
const timezoneOffsetMinutes = -finishDate.getTimezoneOffset();
const offsetSign = timezoneOffsetMinutes >= 0 ? "+" : "-";
const offsetHours = String(Math.floor(Math.abs(timezoneOffsetMinutes) / 60)).padStart(2, "0");
const offsetMinutes = String(Math.abs(timezoneOffsetMinutes) % 60).padStart(2, "0");
const finish = `${finishDate.getFullYear()}-${String(finishDate.getMonth() + 1).padStart(
  2,
  "0",
)}-${String(finishDate.getDate()).padStart(2, "0")}T${String(
  finishDate.getHours(),
).padStart(2, "0")}:${String(finishDate.getMinutes()).padStart(2, "0")}:${String(
  finishDate.getSeconds(),
).padStart(2, "0")}.${String(finishDate.getMilliseconds()).padStart(
  3,
  "0",
)}${offsetSign}${offsetHours}:${offsetMinutes}`;
const finishMs = Date.parse(finish);

if (!Number.isFinite(startMs)) {
  console.error("Start must be a parseable ISO timestamp.");
  process.exit(1);
}

const elapsedMs = finishMs - startMs;
const elapsedMinutes = Number((elapsedMs / 60000).toFixed(2));

console.log(
  JSON.stringify(
    {
      start,
      finish,
      elapsedMs,
      elapsedMinutes,
      markdown: `- Finish time: ${finish}\n- Actual elapsed time: ${elapsedMinutes.toFixed(
        2,
      )} minutes (computed by \`npm run calibration:finish -- ${start}\`).`,
    },
    null,
    2,
  ),
);
