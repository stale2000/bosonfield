import { isExternalComfyUrl } from "./external-links";
import { localComfyAppLinks } from "./local-comfy-app-links";

type LinkKind = "apps" | "presets";
const showcaseLinkRevision = "2026-07-26-cloud-app-mode-v2";
// Durable fallback for the published Comfy Cloud shares. Runtime PATCHes are
// useful during local curation, but must not be the only source of links.
const defaultPresetLinks: Record<string, string> = {
  "preset_earth-zoom": "https://cloud.comfy.org/?share=ed04a5119f2b",
  "preset_float-spin": "https://cloud.comfy.org/?share=acff0561888a",
  "preset_sticker-peel": "https://cloud.comfy.org/?share=8187173ab139",
  "preset_selfie-twin": "https://cloud.comfy.org/?share=51d1efd0eb02",
  "preset_cardboard-cutout": "https://cloud.comfy.org/?share=b7545154ec6f",
  // The Moonwalk share currently opens the Float Spin graph; do not expose
  // that stale target as Moonwalk until Comfy publishes the matching app.
  // No Sketch-to-Fabric link until Comfy publishes the matching app. The
  // previously assigned share (4b4b7222cc04) opens Earth Zoom, so keeping it
  // here makes the card launch the wrong workflow.
  "preset_orbit-360": "https://cloud.comfy.org/?share=8f6c36d315a0",
  "preset_fairytale-castle": "https://cloud.comfy.org/?share=3e36179d9048",
  "preset_elevate": "https://cloud.comfy.org/?share=47cfd283f3d3",
  "preset_action-figure": "https://cloud.comfy.org/?share=2fbd48657c9f",
  "preset_mighty-fighter": "https://cloud.comfy.org/?share=4625dd40cbe3",
  "preset_blue-depth": "https://cloud.comfy.org/?share=2c97c474672b",
  "preset_orbital-presence": "https://cloud.comfy.org/?share=8f5b517ef6ad",
  "preset_ice-statue": "https://cloud.comfy.org/?share=b63c2c6a693c",
  "preset_sketch-to-fabric": "https://cloud.comfy.org/?share=674f97d9c785",
  "preset_cgi-breakdown": "https://cloud.comfy.org/?share=e8926c97fb11",
  "preset_drown-in-music": "https://cloud.comfy.org/?share=98154e375396",
  "preset_baseball-game": "https://cloud.comfy.org/?share=1ec66504197e",
  "preset_drift-racing": "https://cloud.comfy.org/?share=db5626ee92f5",
  "preset_football-invader": "https://cloud.comfy.org/?share=4f629030eba0",
  "preset_summer-haze": "https://cloud.comfy.org/?share=6a5ab63c44ce",
  "preset_kung-fu-hit": "https://cloud.comfy.org/?share=c1ff08d374a7",
  "preset_final-serve": "https://cloud.comfy.org/?share=e7f880a1e32c",
  "preset_android-assemble": "https://cloud.comfy.org/?share=9afebef4c52a",
  "preset_3d-render": "https://cloud.comfy.org/?share=b526ac79c0bc",
  "preset_storm-giant": "https://cloud.comfy.org/?share=a73896f98ae8",
  "preset_zombie-dance": "https://cloud.comfy.org/?share=2431179752ba",
  "preset_golf-major": "https://cloud.comfy.org/?share=e487ac294012",
  "preset_2000s-paparazzi": "https://cloud.comfy.org/?share=ed83dd8b3f43",
  "preset_candid-paparazzi": "https://cloud.comfy.org/?share=f302c8a489cb",
  "preset_race-track": "https://cloud.comfy.org/?share=720647846443",
  "preset_nightline": "https://cloud.comfy.org/?share=65f5b0a11cee",
  "preset_free-fall": "https://cloud.comfy.org/?share=aee47e701a66",
  "preset_red-carpet": "https://cloud.comfy.org/?share=a3bf7dd07b07",
  "preset_clay-figurine": "https://cloud.comfy.org/?share=b9babbd26f41",
  "preset_neon-city": "https://cloud.comfy.org/?share=756c5adbe97a",
  "preset_soul-fighter": "https://cloud.comfy.org/?share=c15440241b11",
  "preset_tuscan-yoga": "https://cloud.comfy.org/?share=43b3a6bcf42e",
  "preset_apex-hunter": "https://cloud.comfy.org/?share=1d6703698086",
  "preset_in-the-dark": "https://cloud.comfy.org/?share=b9bb97e2c2d8",
  "preset_red-thread": "https://cloud.comfy.org/?share=191d48786814",
  "preset_exit-the-dream": "https://cloud.comfy.org/?share=4e5eee38190c",
  "preset_ending-fairy": "https://cloud.comfy.org/?share=25a3c2bf3d9d",
  "preset_dragon-fantasy": "https://cloud.comfy.org/?share=adeb9084bdbc",
  "preset_fan-meeting": "https://cloud.comfy.org/?share=1184030a3784",
  "preset_night-vision": "https://cloud.comfy.org/?share=1f3332987a2b",
  "preset_office-cctv": "https://cloud.comfy.org/?share=53f6c1131edb",
  "preset_race-winner": "https://cloud.comfy.org/?share=bf0c63779328",
  "preset_casual-monster-slayer": "https://cloud.comfy.org/?share=b9eed06f1d35",
  "preset_wrestle": "https://cloud.comfy.org/?share=11520d7866ea",
  "preset_magic-spell": "https://cloud.comfy.org/?share=281786e4f185",
  "preset_animal-chase": "https://cloud.comfy.org/?share=0049ed2a6ae2",
  "preset_earth-zoom-out": "https://cloud.comfy.org/?share=b250a65f3e4d",
  "preset_earth-zoom-in": "https://cloud.comfy.org/?share=8ef42264c123",
  "preset_arena-zero": "https://cloud.comfy.org/?share=9355624943cb",
  "preset_superfast-flight": "https://cloud.comfy.org/?share=0ffe3fa35b4d",
  "preset_disintegration": "https://cloud.comfy.org/?share=d44b96d8d2a7",
  "preset_sword-and-sorcery": "https://cloud.comfy.org/?share=6bd5bda0a08f",
  "preset_still-world": "https://cloud.comfy.org/?share=4cdf771178d6",
  "preset_face-punch": "https://cloud.comfy.org/?share=1e9f5ac642e7",
  "preset_animal-ride": "https://cloud.comfy.org/?share=955252c74034",
  "preset_me-and-pet-transformation": "https://cloud.comfy.org/?share=22acb5dbe07c",
};
type LinkRuntime = typeof globalThis & { __bosonfieldShowcaseLinks?: Partial<Record<LinkKind, Map<string, string>>>; __bosonfieldShowcaseSeeded?: Partial<Record<LinkKind, string>> };

const runtime = globalThis as LinkRuntime;

function envKey(kind: LinkKind) {
  return kind === "apps" ? "BOSONFIELD_COMFY_APP_LINKS" : "BOSONFIELD_COMFY_PRESET_LINKS";
}

function configuredLinks(kind: LinkKind) {
  const links = runtime.__bosonfieldShowcaseLinks ?? (runtime.__bosonfieldShowcaseLinks = {});
  const seeded = runtime.__bosonfieldShowcaseSeeded ?? (runtime.__bosonfieldShowcaseSeeded = {});
  const map = links[kind] ?? (links[kind] = new Map());
  if (seeded[kind] !== showcaseLinkRevision) {
    if (kind === "presets") for (const [id, url] of Object.entries(defaultPresetLinks)) map.set(id, url);
    // Local development links open the installed App View directly. They take
    // precedence over older Cloud workflow shares, which do not guarantee the
    // image-upload app form.
    if (kind === "presets") for (const [id, url] of Object.entries(localComfyAppLinks)) map.set(id, url);
    try {
      const buildEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
      const value = JSON.parse(process.env[envKey(kind)] ?? buildEnv?.[envKey(kind)] ?? "{}") as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [id, url] of Object.entries(value)) if (isExternalComfyUrl(url)) map.set(id, url.trim());
      }
    } catch {
      // Invalid optional showcase configuration leaves the dry catalog usable.
    }
    seeded[kind] = showcaseLinkRevision;
  }
  return map;
}

export function showcaseLinks(kind: LinkKind) {
  return configuredLinks(kind);
}

// Every catalog item has a cloned App View bundle with Source image + Prompt.
const verifiedPresetIds = new Set(Object.keys(localComfyAppLinks));

export function isVerifiedPresetLink(id: string, url: unknown): url is string {
  return verifiedPresetIds.has(id) && isExternalComfyUrl(url);
}
