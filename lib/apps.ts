import { viralPresetCatalog } from "./presets";

export type UsecaseApp = {
  id: string;
  title: string;
  description: string;
  studio: string;
  art: string;
  group: string;
  /** Optional link to an externally hosted Comfy shared app. Bosonfield never hosts the runtime. */
  comfyAppUrl?: string;
  prompt?: string;
  negativePrompt?: string;
  promptObserved?: boolean;
};

export const usecaseAppsCatalog: UsecaseApp[] = [
  ["Create Image", "Turn a prompt into a polished image", "Image", "image", "Create"],
  ["Animate Image", "Bring a still frame to life", "Video", "video", "Motion"],
  ["Product Ad", "Build a campaign from one product shot", "Marketing", "marketing", "Ads"],
  ["AI Influencer", "Create consistent persona content", "AI Influencer", "character", "Identity"],
  ["Vibe Motion", "Transfer movement and camera energy", "Vibe Motion", "video", "Motion"],
  ["Recast Subject", "Change the subject while keeping the scene", "Recast", "character", "Identity"],
  ["Lip Sync", "Sync a face to a voice track", "Audio", "audio", "Audio"],
  ["Explainer", "Turn a concept into visual scenes", "Explainer", "explainer", "Stories"],
  ["Clip Highlights", "Find and shape the best moments", "Clipping", "video", "Video"],
  ["Cinema Shot", "Compose a cinematic shot plan", "Cinema", "cinema", "Stories"],
  ["Workflow Builder", "Chain approved ComfyUI graph steps", "Workflows", "workflow", "Tools"],
  ["Design Board", "Move from brief to visual system", "Design Agent", "design", "Tools"],
  ["Edit Image", "Change a selected part of an image", "Image", "image", "Image"],
  ["Draw to Edit", "Turn a rough mark into a directed edit", "Image", "image", "Image"],
  ["Upscale Image", "Bring a finished image to a cleaner resolution", "Image", "image", "Enhance"],
  ["Multi Reference", "Combine several visual references in one brief", "Image", "image", "Image"],
  ["Fashion Factory", "Build a styled fashion look from references", "Image", "character", "Style"],
  ["Soul ID", "Create a consistent character identity", "Image", "character", "Identity"],
  ["Create Video", "Turn a prompt or still into motion", "Video", "video", "Motion"],
  ["Motion Control", "Direct camera energy with a motion reference", "Vibe Motion", "video", "Motion"],
  ["Talking Avatar", "Pair a face with a voice track", "Audio", "audio", "Audio"],
  ["Video Upscale", "Enhance an existing video output", "Video", "video", "Enhance"],
  ["Product Placement", "Place a product into a directed scene", "Marketing", "marketing", "Ads"],
  ["Shorts Builder", "Shape a short-form cut from source media", "Shorts", "video", "Video"],
].map(([title, description, studio, art, group]) => ({
  id: `app_${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  description,
  studio,
  art,
  group,
}));

/** Every Higgsfield viral example has a first-class Bosonfield app contract. */
export const viralPresetAppsCatalog: UsecaseApp[] = viralPresetCatalog.map((preset) => ({
  id: `app_viral_${preset.id.replace(/^preset_/, "")}`,
  title: preset.name,
  description: `${preset.category} viral preset app powered by a Comfy workflow contract`,
  studio: "Video",
  art: "video",
  group: "Viral Presets",
  comfyAppUrl: preset.comfyAppUrl,
  prompt: preset.promptSpec.positive,
  negativePrompt: preset.promptSpec.negative,
  promptObserved: preset.promptSpec.observed,
}));

type AppRuntime = typeof globalThis & { __bosonfieldCustomApps?: UsecaseApp[] };
const runtime = globalThis as AppRuntime;
export const customApps = runtime.__bosonfieldCustomApps ?? (runtime.__bosonfieldCustomApps = []);

export function allUsecaseApps() {
  return [...usecaseAppsCatalog, ...viralPresetAppsCatalog, ...customApps];
}

export function appById(id: string) {
  return allUsecaseApps().find((app) => app.id === id);
}
