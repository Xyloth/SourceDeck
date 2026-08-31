import { createServer } from "node:http";
import { createSidecarSecurity } from "./sidecar-security.mjs";

const host = process.env.SOURCEDECK_SPEECH_HOST ?? "127.0.0.1";
const port = Number(process.env.SOURCEDECK_SPEECH_PORT ?? 4317);
const model = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";
const apiKey = process.env.OPENAI_API_KEY;
const maxBodyBytes = Number(process.env.SOURCEDECK_SPEECH_MAX_BYTES ?? 25_000_000);
const sidecarSecurity = createSidecarSecurity();

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.byteLength;
      if (size > maxBodyBytes) {
        reject(new Error(`audio payload exceeds ${maxBodyBytes} bytes`));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  if (sidecarSecurity.handlePreflight(request, response)) return;
  if (request.method === "GET" && request.url === "/session") {
    sidecarSecurity.issueSession(request, response);
    return;
  }
  if (request.method === "GET" && request.url === "/health") {
    sidecarSecurity.writeJson(request, response, 200, {
      ok: true,
      format: "sourcedeck.speech-sidecar.v1",
      model,
      hasApiKey: Boolean(apiKey),
      maxBodyBytes,
    });
    return;
  }
  if (request.url !== "/transcribe" || request.method !== "POST") {
    sidecarSecurity.writeJson(request, response, 404, { error: "not_found" });
    return;
  }
  if (!sidecarSecurity.authorizeOperation(request, response)) return;
  if (!apiKey) {
    sidecarSecurity.writeJson(request, response, 503, {
      error: "missing_openai_api_key",
      detail: "Set OPENAI_API_KEY before running npm run speech:sidecar.",
    });
    return;
  }
  try {
    const body = await readBody(request);
    if (!body.byteLength) {
      sidecarSecurity.writeJson(request, response, 400, { error: "empty_audio" });
      return;
    }
    const contentType = request.headers["content-type"] || "audio/webm";
    const form = new FormData();
    form.append("model", model);
    form.append(
      "prompt",
      "Transcribe a SourceDeck evidence search query. Preserve names, dates, contract terms, uptime metrics, vendors, and document references.",
    );
    form.append("file", new Blob([body], { type: contentType }), "sourcedeck-voice.webm");
    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      sidecarSecurity.writeJson(request, response, upstream.status, {
        error: "transcription_failed",
        detail: text,
      });
      return;
    }
    const payload = JSON.parse(text);
    sidecarSecurity.writeJson(request, response, 200, { text: payload.text ?? "" });
  } catch (error) {
    sidecarSecurity.writeJson(request, response, 500, {
      error: "speech_sidecar_error",
      detail: error instanceof Error ? error.message : "unknown error",
    });
  }
});

server.listen(port, host, () => {
  console.log(
    `SourceDeck speech sidecar listening on http://${host}:${port}/transcribe using ${model}`,
  );
  console.log("Browser operations require a trusted Origin and a per-process sidecar session.");
});
