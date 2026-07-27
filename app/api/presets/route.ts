import catalog from "../../../workflows/manifests/catalog.json";
import { viralPresetCatalog } from "../../../lib/presets";
import { isExternalComfyUrl } from "../../../lib/external-links";
import { isVerifiedPresetLink, showcaseLinks } from "../../../lib/showcase-links";
import { presets as adminPresets } from "../admin/presets/route";

const links = showcaseLinks("presets");

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const capability = params.get("capability");
  const kind = params.get("kind");
  const workflowById = new Map(catalog.map((workflow) => [workflow.id, workflow]));
  const workflowPresets = catalog.filter((workflow) => !capability || workflow.capability === capability).map((workflow) => { const configuredUrl = links.get(`preset_${workflow.id}`); return { id: `preset_${workflow.id}`, workflowId: workflow.id, title: workflow.label, status: workflow.status, defaults: {}, visibleControls: workflow.inputs, catalogPath: `/?preset=${encodeURIComponent(`preset_${workflow.id}`)}`, sharePath: `/api/share/presets/${encodeURIComponent(`preset_${workflow.id}`)}`, comfyAppUrl: isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null, kind: "workflow" }; });
  const viralPresets = viralPresetCatalog.filter((preset) => !capability || workflowById.get(preset.workflowId)?.capability === capability).map((preset) => { const configuredUrl = links.get(preset.id) ?? preset.comfyAppUrl; const catalogPath = `/?preset=${encodeURIComponent(preset.id)}`; const sharePath = `/api/share/presets/${encodeURIComponent(preset.id)}`; const workflowUrl = isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null; const verified = isVerifiedPresetLink(preset.id, configuredUrl); const workflowReady = Boolean(preset.graphId); return { ...preset, catalogPath, sharePath, workflowUrl, launchUrl: verified ? sharePath : catalogPath, comfyAppUrl: verified ? workflowUrl : null, title: preset.name, status: verified ? "dry-validated" : workflowUrl || workflowReady ? "needs-publish" : "needs-link", kind: "viral", visibleControls: ["sourceAssetId", "prompt"], workflowReady }; });
  const customPresets = adminPresets.filter((preset) => !capability || preset.capability === capability).map((preset) => { const configuredUrl = links.get(preset.id); return { ...preset, title: preset.name, catalogPath: `/?preset=${encodeURIComponent(preset.id)}`, sharePath: `/api/share/presets/${encodeURIComponent(preset.id)}`, comfyAppUrl: isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null, kind: "admin" }; });
  return Response.json({ mode: "dry-run", presets: kind === "workflow" ? workflowPresets : kind === "viral" ? viralPresets : kind === "admin" ? customPresets : [...viralPresets, ...workflowPresets, ...customPresets] });
}
