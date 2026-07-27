import { dryJobs } from "../../../_dry-data";
import { adapterMode, comfyBaseUrl, ComfyUIHttpAdapter } from "../../../../../lib/comfy-adapter";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = dryJobs.get(id);
  if (!job?.comfyPromptId) return Response.json({ error: { code: "JOB_OUTPUT_NOT_FOUND", message: "No configured Comfy output is attached to this job" } }, { status: 404 });
  if (adapterMode() !== "comfyui" || !comfyBaseUrl()) return Response.json({ error: { code: "WORKER_NOT_CONFIGURED", message: "ComfyUI is not configured" } }, { status: 409 });
  const params = new URL(request.url).searchParams;
  const filename = params.get("filename")?.trim();
  const subfolder = params.get("subfolder")?.trim() ?? "";
  const type = params.get("type")?.trim() || "output";
  const validSubfolder = !subfolder || (subfolder.length <= 512 && subfolder.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".." && /^[a-zA-Z0-9._-]+$/.test(segment)));
  if (!filename || filename.length > 512 || !/^[a-zA-Z0-9._-]+$/.test(filename) || !validSubfolder || !/^[a-zA-Z0-9_-]+$/.test(type)) return Response.json({ error: { code: "INPUT_INVALID", message: "Invalid Comfy output reference" } }, { status: 400 });
  // Only proxy files that Comfy reported for this job; otherwise this endpoint
  // becomes an authenticated arbitrary-file reader on the configured worker.
  const knownOutput = job.outputFiles?.some((file) => file.filename === filename && file.subfolder === subfolder && file.type === type);
  if (!knownOutput) return Response.json({ error: { code: "JOB_OUTPUT_NOT_FOUND", message: "Output is not attached to this job" } }, { status: 404 });
  try {
    const response = await new ComfyUIHttpAdapter(comfyBaseUrl()!).view(filename, subfolder, type);
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    if (contentType) headers.set("content-type", contentType);
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("cache-control", "private, max-age=60");
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return Response.json({ error: { code: "WORKER_UNAVAILABLE", message: error instanceof Error ? error.message : "Comfy output unavailable" } }, { status: 503 });
  }
}
