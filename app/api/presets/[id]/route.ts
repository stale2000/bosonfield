import catalog from "../../../../workflows/manifests/catalog.json";
import { viralPresetCatalog } from "../../../../lib/presets";
import { isExternalComfyUrl } from "../../../../lib/external-links";
import { isVerifiedPresetLink, showcaseLinks } from "../../../../lib/showcase-links";
import { presets as adminPresets } from "../../admin/presets/route";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const preset = viralPresetCatalog.find((entry) => entry.id === id);
  const adminPreset = adminPresets.find((entry) => entry.id === id);
  const workflow = catalog.find((entry) => `preset_${entry.id}` === id);
  const links = showcaseLinks("presets");
  if (adminPreset) { const configuredUrl = links.get(id); return Response.json({ mode: "dry-run", preset: { ...adminPreset, title: adminPreset.name, catalogPath: `/?preset=${encodeURIComponent(id)}`, sharePath: `/api/share/presets/${encodeURIComponent(id)}`, comfyAppUrl: isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null, kind: "admin" } }); }
  if (preset) { const configuredUrl = links.get(preset.id) ?? preset.comfyAppUrl; const workflowUrl = isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null; const comfyAppUrl = isVerifiedPresetLink(preset.id, configuredUrl) ? workflowUrl : null; const catalogPath = `/?preset=${encodeURIComponent(preset.id)}`; const workflowReady = Boolean(preset.graphId); return Response.json({ mode: "dry-run", preset: { ...preset, catalogPath, sharePath: `/api/share/presets/${encodeURIComponent(preset.id)}`, workflowUrl, launchUrl: comfyAppUrl ? `/api/share/presets/${encodeURIComponent(preset.id)}` : workflowUrl ?? catalogPath, comfyAppUrl, title: preset.name, status: comfyAppUrl ? "dry-validated" : workflowUrl || workflowReady ? "needs-publish" : "needs-link", kind: "viral", workflowReady } }); }
  if (workflow) { const configuredUrl = links.get(id); return Response.json({ mode: "dry-run", preset: { id, workflowId: workflow.id, title: workflow.label, status: workflow.status, defaults: {}, visibleControls: workflow.inputs, catalogPath: `/?preset=${encodeURIComponent(id)}`, sharePath: `/api/share/presets/${encodeURIComponent(id)}`, comfyAppUrl: isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null, kind: "workflow" } }); }
  return Response.json({ error: { code: "PRESET_NOT_FOUND", message: "Unknown preset" } }, { status: 404 });
}
