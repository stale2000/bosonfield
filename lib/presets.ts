import { promptForPreset, type ViralPromptSpec } from "./viral-prompts";
import { localComfyAppLinks } from "./local-comfy-app-links";

export type ViralPreset = {
  id: string;
  name: string;
  category: "Motion" | "Transform" | "Cinematic";
  premium: boolean;
  workflowId: "video-motion" | "video-vibe-motion" | "viral-earth-zoom" | "viral-float-spin" | "viral-sticker-peel" | "viral-ice-statue" | "viral-sketch-to-fabric";
  graphId?: "viral-earth-zoom" | "viral-float-spin" | "viral-sticker-peel" | "viral-ice-statue" | "viral-sketch-to-fabric";
  /** Optional externally hosted Comfy App/Hub URL; Bosonfield never hosts the preset runtime. */
  comfyAppUrl?: string;
  /** Viral video presets are image-to-video apps; the reference photo is a required app input. */
  imageInput: true;
  promptSpec: ViralPromptSpec;
  defaults: { presetId: string; mode: "Viral preset"; duration: number; ratio: "9:16" | "16:9" };
};

const names = [
  "Earth Zoom", "Float Spin", "Sticker Peel", "Selfie Twin", "Cardboard Cutout", "Moonwalk", "Sketch to Fabric", "Orbit 360", "Fairytale Castle", "Elevate", "Action Figure", "Mighty Fighter", "Blue Depth", "Orbital Presence", "Ice Statue", "CGI Breakdown", "Drown in Music", "Baseball Game", "Drift Racing", "Football Invader", "Summer Haze", "Kung Fu Hit", "Final Serve", "Android Assemble", "3D Render", "Storm Giant", "Zombie Dance", "Golf Major", "2000s Paparazzi", "Candid Paparazzi", "Race Track", "Nightline", "Free Fall", "Red Carpet", "Clay Figurine", "Neon City", "Soul Fighter", "Tuscan Yoga", "Apex Hunter", "In the Dark", "Red Thread", "Exit the Dream", "Ending Fairy", "Dragon Fantasy", "Fan Meeting", "Night Vision", "Office CCTV", "Race Winner", "Casual Monster Slayer", "Wrestle", "Magic Spell", "Animal Chase", "Earth Zoom Out", "Earth Zoom In", "Arena Zero", "Superfast Flight", "Disintegration", "Sword and Sorcery", "Still World", "Face Punch", "Animal Ride", "Me and Pet Transformation",
];

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export const viralPresetCatalog: ViralPreset[] = names.map((name, index) => ({
  id: `preset_${slugify(name)}`,
  name,
  category: index % 3 === 0 ? "Transform" : index % 3 === 1 ? "Motion" : "Cinematic",
  premium: index % 7 === 0,
  workflowId: name === "Sketch to Fabric" ? "viral-sketch-to-fabric" : index % 3 === 1 ? "video-motion" : "video-vibe-motion",
  graphId: name === "Earth Zoom" ? "viral-earth-zoom" : name === "Float Spin" ? "viral-float-spin" : name === "Sticker Peel" ? "viral-sticker-peel" : name === "Ice Statue" ? "viral-ice-statue" : name === "Sketch to Fabric" ? "viral-sketch-to-fabric" : undefined,
  comfyAppUrl: localComfyAppLinks[`preset_${slugify(name)}`],
  imageInput: true,
  promptSpec: promptForPreset(name),
  defaults: { presetId: name, mode: "Viral preset", duration: index % 2 === 0 ? 5 : 8, ratio: "9:16" },
}));
