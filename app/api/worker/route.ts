import { adapterMode, comfyBaseUrl, ComfyUIHttpAdapter, DryComfyAdapter } from "../../../lib/comfy-adapter";

const capabilityNames = ["features", "system_stats", "object_info", "models", "workflow_templates"] as const;
type Capability = typeof capabilityNames[number];

export async function GET(request: Request) {
  const mode = adapterMode();
  const dry = new DryComfyAdapter();
  const capability = new URL(request.url).searchParams.get("capability") as Capability | null;
  if (capability) {
    if (!capabilityNames.includes(capability)) {
      return Response.json({ error: { code: "CAPABILITY_NOT_FOUND", message: `Unsupported ComfyUI capability: ${capability}` } }, { status: 404 });
    }
    try {
      if (mode === "comfyui") {
        const adapter = new ComfyUIHttpAdapter(comfyBaseUrl()!);
        const value = capability === "features" ? await adapter.features()
          : capability === "system_stats" ? await adapter.systemStats()
            : capability === "object_info" ? await adapter.objectInfo(new URL(request.url).searchParams.get("node") ?? undefined)
              : capability === "models" ? await adapter.models()
                : await adapter.workflowTemplates();
        return Response.json({ mode, capability, value });
      }
      const value = capability === "features" ? dry.features()
        : capability === "system_stats" ? dry.systemStats()
        : capability === "object_info" ? dry.objectInfo()
        : capability === "models" ? dry.models()
          : dry.workflowTemplates();
      return Response.json({ mode, capability, value });
    } catch (error) {
      return Response.json({ mode, capability, error: { code: "CAPABILITY_UNAVAILABLE", message: error instanceof Error ? error.message : "ComfyUI capability unavailable" } }, { status: 503 });
    }
  }
  if (mode === "comfyui") {
    try {
      const queue = await new ComfyUIHttpAdapter(comfyBaseUrl()!).queueStatus();
      return Response.json({ mode, configured: true, healthy: true, capabilities: ["prompt", "queue", "history", "events", "interrupt"], queue, message: "ComfyUI worker is reachable." });
    } catch (error) {
      return Response.json({ mode, configured: true, healthy: false, capabilities: ["prompt", "queue", "history", "events", "interrupt"], queue: null, error: { code: "WORKER_UNAVAILABLE", message: error instanceof Error ? error.message : "ComfyUI worker is unreachable" }, message: "ComfyUI endpoint is configured but unavailable." }, { status: 503 });
    }
  }
  return Response.json({
    mode,
    configured: false,
    healthy: true,
    capabilities: ["prompt", "queue", "history", "events", "interrupt"],
    queue: mode === "dry-run" ? dry.queueStatus() : null,
    message: mode === "dry-run" ? "No ComfyUI worker configured; dry-run adapter is active." : "ComfyUI endpoint configured; use an authenticated probe before enabling workloads.",
  });
}
