import { releaseReservation } from "./_credits";

export type DryAsset = {
  id: string;
  name: string;
  kind: "image" | "video" | "audio" | "reference";
  mimeType: string;
  state: "ready" | "uploading";
  visibility: "private";
  sizeBytes: number;
  previewUrl: string | null;
  createdAt: string;
  provenance?: { jobId: string; workflowId: string; workflowVersion: number; inputs: Record<string, unknown> };
};

export type DryScene = {
  id: string;
  title: string;
  brief: string;
  order: number;
  status: "draft" | "ready";
  assetIds: string[];
};

export type DryProject = {
  id: string;
  name: string;
  brief: string;
  status: "draft" | "active";
  visibility: "private" | "unlisted" | "public";
  scenes: DryScene[];
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type DryJob = {
  id: string;
  workflowId: string;
  workflowVersion: number;
  inputs: Record<string, unknown>;
  state: "queued" | "running" | "complete" | "failed" | "cancelled";
  createdAt: number;
  outputs: string[];
  comfyPromptId?: string;
  outputFiles?: import("../../lib/comfy-adapter").ComfyOutputFile[];
};

const initialDryAssets: DryAsset[] = [
  {
    id: "asset_dry_image_01",
    name: "Untitled field study",
    kind: "image",
    mimeType: "image/png",
    state: "ready",
    visibility: "private",
    sizeBytes: 0,
    previewUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "asset_dry_video_01",
    name: "Orbit portrait",
    kind: "video",
    mimeType: "video/mp4",
    state: "ready",
    visibility: "private",
    sizeBytes: 0,
    previewUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

type DryRuntime = typeof globalThis & { __bosonfieldDryAssets?: DryAsset[]; __bosonfieldDeletedAssetIds?: Set<string> };
const runtime = globalThis as DryRuntime;
export const dryAssets = runtime.__bosonfieldDryAssets ?? (runtime.__bosonfieldDryAssets = initialDryAssets);
export const deletedDryAssetIds = runtime.__bosonfieldDeletedAssetIds ?? (runtime.__bosonfieldDeletedAssetIds = new Set<string>());

const initialDryProjects: DryProject[] = [
  {
    id: "project_dry_01",
    name: "The quiet machine",
    brief: "A small world in motion.",
    status: "active",
    visibility: "private",
    scenes: [
      { id: "scene_dry_01", title: "Opening field", brief: "Establish the quiet machine in the blue field.", order: 0, status: "draft", assetIds: ["asset_dry_image_01"] },
    ],
    assetIds: ["asset_dry_image_01"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "project_dry_public_01",
    name: "Blue field study",
    brief: "A measured camera move through a quiet synthetic landscape.",
    status: "active",
    visibility: "public",
    scenes: [
      { id: "scene_dry_public_01", title: "Wide opening", brief: "Start wide, then drift toward the subject.", order: 0, status: "ready", assetIds: ["asset_dry_image_01"] },
    ],
    assetIds: ["asset_dry_image_01"],
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];
type DryProjectRuntime = typeof globalThis & { __bosonfieldDryProjects?: DryProject[] };
const projectRuntime = globalThis as DryProjectRuntime;
export const dryProjects = projectRuntime.__bosonfieldDryProjects ?? (projectRuntime.__bosonfieldDryProjects = initialDryProjects);

type DryJobRuntime = typeof globalThis & { __bosonfieldDryJobs?: Map<string, DryJob> };
const jobRuntime = globalThis as DryJobRuntime;
export const dryJobs = jobRuntime.__bosonfieldDryJobs ?? (jobRuntime.__bosonfieldDryJobs = new Map<string, DryJob>());

export function ensureDryJob(id: string) {
  const existing = dryJobs.get(id);
  if (existing) return existing;
  const job: DryJob = { id, workflowId: "image-basic", workflowVersion: 1, inputs: {}, state: "queued", createdAt: Date.now(), outputs: [] };
  dryJobs.set(id, job);
  return job;
}

export function materializeDryJob(job: DryJob) {
  if (job.state === "cancelled") return job;
  const age = Date.now() - job.createdAt;
  if (age >= 900 && job.inputs.simulateFailure === true) {
    job.state = "failed";
    if (typeof job.inputs.reservationId === "string") releaseReservation(job.inputs.reservationId);
    return job;
  }
  if (age >= 900) {
    job.state = "complete";
    if (!job.outputs.length) {
      const kind = job.workflowId.startsWith("audio") ? "audio" : job.workflowId.includes("video") || job.workflowId.includes("campaign") || job.workflowId.includes("explainer") || job.workflowId.includes("cinema") || job.workflowId.includes("influencer") ? "video" : "image";
      const assetId = stableDryId("asset", job.id);
      job.outputs.push(assetId);
      if (!dryAssets.some((asset) => asset.id === assetId)) dryAssets.push({ id: assetId, name: String(job.inputs.label ?? "Dry generation"), kind, mimeType: kind === "image" ? "image/png" : kind === "video" ? "video/mp4" : "audio/wav", state: "ready", visibility: "private", sizeBytes: 0, previewUrl: null, createdAt: new Date(job.createdAt).toISOString(), provenance: { jobId: job.id, workflowId: job.workflowId, workflowVersion: job.workflowVersion, inputs: job.inputs } });
      const extension = kind === "image" ? "png" : kind === "video" ? "mp4" : "wav";
      job.outputFiles = [{ nodeId: "dry-output", filename: `${assetId}.${extension}`, subfolder: "", type: "output", url: `/api/assets/${encodeURIComponent(assetId)}/download` }];
    }
  } else if (age >= 250) job.state = "running";
  return job;
}

/** Persist configured Comfy history files in the same Library contract as dry outputs. */
export function materializeComfyOutputs(job: DryJob, files: readonly import("../../lib/comfy-adapter").ComfyOutputFile[]) {
  for (const file of files) {
    const assetId = stableDryId("asset", `${job.id}:${file.nodeId}:${file.type}:${file.subfolder}:${file.filename}`);
    if (!job.outputs.includes(assetId)) job.outputs.push(assetId);
    if (dryAssets.some((asset) => asset.id === assetId)) continue;
    const extension = file.filename.split(".").pop()?.toLowerCase() ?? "";
    const kind = /^(mp4|webm|mov|mkv)$/.test(extension) ? "video" : /^(wav|mp3|flac|ogg|m4a)$/.test(extension) ? "audio" : "image";
    dryAssets.push({
      id: assetId,
      name: file.filename,
      kind,
      mimeType: kind === "video" ? "video/mp4" : kind === "audio" ? "audio/wav" : "image/png",
      state: "ready",
      visibility: "private",
      sizeBytes: 0,
      previewUrl: file.url,
      createdAt: new Date(job.createdAt).toISOString(),
      provenance: { jobId: job.id, workflowId: job.workflowId, workflowVersion: job.workflowVersion, inputs: job.inputs },
    });
  }
}

export function stableDryId(prefix: string, value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_dry_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function invalid(message: string) {
  return Response.json({ error: { code: "INPUT_INVALID", message } }, { status: 400 });
}
